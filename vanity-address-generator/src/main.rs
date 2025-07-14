use ethereum_types::{Address, H256};
use hex;
use keccak_hash::keccak;
use rayon::prelude::*;
use std::fs;
use std::time::Instant;
use clap::Parser;
use serde_json::Value;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Prefix to search for (without 0x)
    #[arg(short, long, default_value = "69")]
    prefix: String,
    
    /// Suffix to search for
    #[arg(short, long, default_value = "d777")]
    suffix: String,
    
    /// Number of threads to use
    #[arg(short, long, default_value_t = num_cpus::get())]
    threads: usize,
}

fn main() {
    let args = Args::parse();
    
    // Read the init code data
    let init_code_data = fs::read_to_string("dragon-init-code.json")
        .expect("Failed to read dragon-init-code.json");
    let init_code_json: Value = serde_json::from_str(&init_code_data)
        .expect("Failed to parse JSON");
    
    let factory_address_str = init_code_json["factoryAddress"]
        .as_str()
        .expect("Missing factoryAddress");
    let init_code_hash_str = init_code_json["initCodeHash"]
        .as_str()
        .expect("Missing initCodeHash");
    
    // Parse addresses and hashes
    let factory_address = factory_address_str
        .trim_start_matches("0x")
        .parse::<Address>()
        .expect("Invalid factory address");
    
    let init_code_hash = init_code_hash_str
        .trim_start_matches("0x")
        .parse::<H256>()
        .expect("Invalid init code hash");
    
    println!("CREATE2 Vanity Address Generator - omniDRAGON Token");
    println!("===================================================");
    println!("Factory: 0x{}", hex::encode(factory_address));
    println!("Init Code Hash: 0x{}", hex::encode(init_code_hash));
    println!("Target Prefix: 0x{}", args.prefix);
    println!("Target Suffix: {}", args.suffix);
    println!("Using {} threads", args.threads);
    println!();
    
    let start_time = Instant::now();
    let prefix_bytes = hex::decode(&args.prefix).expect("Invalid prefix hex");
    let suffix_bytes = hex::decode(&args.suffix).expect("Invalid suffix hex");
    
    // Generate random starting points for each thread
    let mut thread_starts = Vec::new();
    for _ in 0..args.threads {
        let mut start = [0u8; 32];
        rand::Rng::fill(&mut rand::thread_rng(), &mut start);
        thread_starts.push(H256::from(start));
    }
    
    // Search in parallel
    let found = thread_starts
        .par_iter()
        .map(|start_salt| search_from_salt(
            *start_salt,
            &factory_address,
            &init_code_hash,
            &prefix_bytes,
            &suffix_bytes,
        ))
        .find_any(|result| result.is_some())
        .and_then(|x| x);
    
    if let Some((salt, address)) = found {
        let duration = start_time.elapsed();
        println!("\n✅ FOUND VANITY ADDRESS!");
        println!("========================");
        println!("Address: 0x{}", hex::encode(address));
        println!("Salt: 0x{}", hex::encode(salt));
        println!("Time: {:.2} seconds", duration.as_secs_f64());
        
        // Save the result
        let result = serde_json::json!({
            "address": format!("0x{}", hex::encode(address)),
            "salt": format!("0x{}", hex::encode(salt)),
            "factoryAddress": factory_address_str,
            "initCodeHash": init_code_hash_str,
            "prefix": format!("0x{}", args.prefix),
            "suffix": args.suffix,
            "searchDuration": duration.as_secs_f64(),
        });
        
        fs::write("vanity-result.json", serde_json::to_string_pretty(&result).unwrap())
            .expect("Failed to write result");
        
        println!("\nResult saved to vanity-result.json");
    } else {
        println!("\nNo vanity address found. Try running longer or with different parameters.");
    }
}

fn search_from_salt(
    start_salt: H256,
    factory_address: &Address,
    init_code_hash: &H256,
    prefix_bytes: &[u8],
    suffix_bytes: &[u8],
) -> Option<(H256, Address)> {
    let mut salt = start_salt;
    let mut attempts = 0u64;
    
    loop {
        // Calculate CREATE2 address
        let address = calculate_create2_address(factory_address, &salt, init_code_hash);
        
        // Check if it matches our criteria
        let address_bytes = address.as_bytes();
        let matches_prefix = prefix_bytes.is_empty() || 
            address_bytes[..prefix_bytes.len()] == *prefix_bytes;
        let matches_suffix = suffix_bytes.is_empty() || 
            address_bytes[20 - suffix_bytes.len()..] == *suffix_bytes;
        
        if matches_prefix && matches_suffix {
            return Some((salt, address));
        }
        
        // Increment salt
        increment_h256(&mut salt);
        attempts += 1;
        
        // Print progress every million attempts
        if attempts % 1_000_000 == 0 {
            println!("Thread progress: {} million attempts", attempts / 1_000_000);
        }
        
        // Stop after 100 million attempts per thread
        if attempts > 100_000_000 {
            return None;
        }
    }
}

fn calculate_create2_address(factory: &Address, salt: &H256, init_code_hash: &H256) -> Address {
    let mut data = Vec::with_capacity(85);
    data.push(0xff);
    data.extend_from_slice(factory.as_bytes());
    data.extend_from_slice(salt.as_bytes());
    data.extend_from_slice(init_code_hash.as_bytes());
    
    let hash = keccak(&data);
    Address::from_slice(&hash.as_bytes()[12..])
}

fn increment_h256(value: &mut H256) {
    let bytes = value.as_bytes_mut();
    for i in (0..32).rev() {
        if bytes[i] == 255 {
            bytes[i] = 0;
        } else {
            bytes[i] += 1;
            break;
        }
    }
}
