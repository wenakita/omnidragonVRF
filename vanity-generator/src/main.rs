use clap::{Arg, Command};
use ethers::types::{Address, H256};
use ethers::utils::keccak256;
use indicatif::{ProgressBar, ProgressStyle};
use rand::Rng;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json;
use std::fs;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;

#[derive(Serialize, Deserialize, Debug)]
struct VanityResult {
    address: String,
    salt: String,
    attempts: u64,
    time_seconds: f64,
    contract_name: String,
    bytecode_hash: String,
    factory_address: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct VanityOutput {
    network: String,
    timestamp: String,
    factory: String,
    registry: VanityResult,
    omnidragon: VanityResult,
}

// CREATE2 address computation
fn compute_create2_address(factory: &Address, salt: &H256, bytecode_hash: &H256) -> Address {
    let mut data = Vec::new();
    data.push(0xff);
    data.extend_from_slice(factory.as_bytes());
    data.extend_from_slice(salt.as_bytes());
    data.extend_from_slice(bytecode_hash.as_bytes());
    
    let hash = keccak256(&data);
    Address::from_slice(&hash[12..])
}

// Check if address matches vanity pattern
fn is_vanity_address(address: &Address, prefix: &str, suffix: &str) -> bool {
    let addr_str = format!("{:x}", address).to_lowercase();
    let prefix_lower = prefix.to_lowercase();
    let prefix_clean = prefix_lower.trim_start_matches("0x");
    let suffix_lower = suffix.to_lowercase();
    
    addr_str.starts_with(prefix_clean) && addr_str.ends_with(&suffix_lower)
}

// Generate random salt
fn generate_salt() -> H256 {
    let mut rng = rand::thread_rng();
    let mut bytes = [0u8; 32];
    rng.fill(&mut bytes);
    H256::from(bytes)
}

// Find vanity address using parallel processing
fn find_vanity_address(
    factory: &Address,
    bytecode_hash: &H256,
    prefix: &str,
    suffix: &str,
    max_attempts: u64,
    contract_name: &str,
) -> Option<VanityResult> {
    let start_time = Instant::now();
    let attempts = Arc::new(AtomicU64::new(0));
    let found = Arc::new(AtomicU64::new(0));
    
    println!("🔍 Searching for vanity address for {}...", contract_name);
    println!("Pattern: {}...{}", prefix, suffix);
    println!("Factory: {:?}", factory);
    println!("Bytecode Hash: {:?}", bytecode_hash);
    println!("Max Attempts: {}", max_attempts);
    
    let pb = ProgressBar::new(max_attempts);
    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({per_sec}) {msg}")
            .unwrap()
            .progress_chars("#>-"),
    );
    
    // Use parallel processing with rayon
    let result = (0..max_attempts)
        .into_par_iter()
        .map(|_| {
            let current_attempts = attempts.fetch_add(1, Ordering::Relaxed);
            
            if current_attempts % 10000 == 0 {
                pb.set_position(current_attempts);
                let elapsed = start_time.elapsed().as_secs_f64();
                let rate = current_attempts as f64 / elapsed;
                pb.set_message(format!("{:.0} attempts/sec", rate));
            }
            
            let salt = generate_salt();
            let address = compute_create2_address(factory, &salt, bytecode_hash);
            
            if is_vanity_address(&address, prefix, suffix) {
                found.store(1, Ordering::Relaxed);
                return Some((address, salt, current_attempts + 1));
            }
            
            None
        })
        .find_any(|x| x.is_some())
        .flatten();
    
    pb.finish_with_message("Search completed");
    
    if let Some((address, salt, attempt_count)) = result {
        let elapsed = start_time.elapsed().as_secs_f64();
        
        println!("🎉 Found vanity address for {}!", contract_name);
        println!("Address: {:?}", address);
        println!("Salt: {:?}", salt);
        println!("Attempts: {}", attempt_count);
        println!("Time: {:.2}s", elapsed);
        println!("Rate: {:.0} attempts/sec", attempt_count as f64 / elapsed);
        println!();
        
        Some(VanityResult {
            address: format!("{:?}", address),
            salt: format!("{:?}", salt),
            attempts: attempt_count,
            time_seconds: elapsed,
            contract_name: contract_name.to_string(),
            bytecode_hash: format!("{:?}", bytecode_hash),
            factory_address: format!("{:?}", factory),
        })
    } else {
        println!("❌ Could not find vanity address for {} after {} attempts", contract_name, max_attempts);
        None
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let matches = Command::new("OmniDragon Vanity Address Generator")
        .version("1.0")
        .author("akita")
        .about("Generate vanity addresses for omniDRAGON contracts using CREATE2")
        .arg(
            Arg::new("factory")
                .short('f')
                .long("factory")
                .value_name("ADDRESS")
                .help("CREATE2 factory address")
                .required(true),
        )
        .arg(
            Arg::new("registry-bytecode")
                .short('r')
                .long("registry-bytecode")
                .value_name("HASH")
                .help("Registry bytecode hash")
                .required(true),
        )
        .arg(
            Arg::new("omnidragon-bytecode")
                .short('o')
                .long("omnidragon-bytecode")
                .value_name("HASH")
                .help("omniDRAGON bytecode hash")
                .required(true),
        )
        .arg(
            Arg::new("prefix")
                .short('p')
                .long("prefix")
                .value_name("PREFIX")
                .help("Address prefix (e.g., 0x69)")
                .default_value("0x69"),
        )
        .arg(
            Arg::new("suffix")
                .short('s')
                .long("suffix")
                .value_name("SUFFIX")
                .help("Address suffix (e.g., d777)")
                .default_value("d777"),
        )
        .arg(
            Arg::new("max-attempts")
                .short('m')
                .long("max-attempts")
                .value_name("NUMBER")
                .help("Maximum attempts per contract")
                .default_value("10000000"),
        )
        .arg(
            Arg::new("network")
                .short('n')
                .long("network")
                .value_name("NETWORK")
                .help("Network name")
                .default_value("sonic"),
        )
        .get_matches();
    
    let factory_str = matches.get_one::<String>("factory").unwrap();
    let registry_bytecode_str = matches.get_one::<String>("registry-bytecode").unwrap();
    let omnidragon_bytecode_str = matches.get_one::<String>("omnidragon-bytecode").unwrap();
    let prefix = matches.get_one::<String>("prefix").unwrap();
    let suffix = matches.get_one::<String>("suffix").unwrap();
    let max_attempts: u64 = matches.get_one::<String>("max-attempts").unwrap().parse()?;
    let network = matches.get_one::<String>("network").unwrap();
    
    // Parse addresses and hashes
    let factory: Address = factory_str.parse()?;
    let registry_bytecode_hash: H256 = registry_bytecode_str.parse()?;
    let omnidragon_bytecode_hash: H256 = omnidragon_bytecode_str.parse()?;
    
    println!("🎯 OmniDragon Vanity Address Generator");
    println!("=====================================");
    println!("Network: {}", network);
    println!("Factory: {:?}", factory);
    println!("Pattern: {}...{}", prefix, suffix);
    println!("Max Attempts: {}", max_attempts);
    println!("Using {} CPU cores", rayon::current_num_threads());
    println!();
    
    // Find vanity address for Registry
    let registry_result = find_vanity_address(
        &factory,
        &registry_bytecode_hash,
        prefix,
        suffix,
        max_attempts,
        "OmniDragonHybridRegistry",
    );
    
    if registry_result.is_none() {
        println!("❌ Failed to find vanity address for Registry");
        return Ok(());
    }
    
    // Find vanity address for omniDRAGON
    let omnidragon_result = find_vanity_address(
        &factory,
        &omnidragon_bytecode_hash,
        prefix,
        suffix,
        max_attempts,
        "omniDRAGON",
    );
    
    if omnidragon_result.is_none() {
        println!("❌ Failed to find vanity address for omniDRAGON");
        return Ok(());
    }
    
    // Save results
    let output = VanityOutput {
        network: network.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        factory: format!("{:?}", factory),
        registry: registry_result.unwrap(),
        omnidragon: omnidragon_result.unwrap(),
    };
    
    let filename = format!("vanity-addresses-{}.json", network);
    let json = serde_json::to_string_pretty(&output)?;
    fs::write(&filename, json)?;
    
    println!("🎉 Vanity Address Generation Complete!");
    println!("=====================================");
    println!("Registry: {}", output.registry.address);
    println!("omniDRAGON: {}", output.omnidragon.address);
    println!("📄 Results saved to: {}", filename);
    println!();
    println!("🚀 Next Steps:");
    println!("1. Deploy contracts using these vanity addresses");
    println!("2. Update LayerZero configurations");
    println!("3. Configure cross-chain connections");
    
    Ok(())
} 