use clap::Parser;
use ethers::utils::keccak256;
use hex::encode;
use indicatif::{ProgressBar, ProgressStyle};

use rand::Rng;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Factory address (CREATE2 deployer)
    #[arg(short, long)]
    factory: String,

    /// Bytecode hash of the contract to deploy
    #[arg(short, long)]
    bytecode_hash: String,

    /// Pattern to search for (e.g., "777" for addresses ending with 777)
    #[arg(short, long)]
    pattern: String,
    
    /// Suffix pattern to search for (used with --prefix for combined matching)
    #[arg(long)]
    suffix: Option<String>,

    /// Contract name for output
    #[arg(short, long)]
    contract_name: String,

    /// Number of threads to use
    #[arg(short, long, default_value = "8")]
    threads: usize,

    /// Search at the beginning of address instead of end (or use with --suffix for combined matching)
    #[arg(long)]
    prefix: bool,

    /// Output file for results
    #[arg(short, long, default_value = "vanity_result.json")]
    output: String,
}

#[derive(Serialize, Deserialize)]
struct VanityResult {
    contract_name: String,
    factory: String,
    bytecode_hash: String,
    pattern: String,
    salt: String,
    address: String,
    attempts: u64,
    duration_seconds: f64,
    timestamp: String,
}

fn main() {
    let args = Args::parse();
    
    println!("🔍 Vanity Address Generator for CREATE2 Deployments");
    println!("Factory: {}", args.factory);
    println!("Bytecode Hash: {}", args.bytecode_hash);
    if let Some(ref suffix_pattern) = args.suffix {
        println!("Prefix Pattern: {}", args.pattern);
        println!("Suffix Pattern: {}", suffix_pattern);
        println!("Searching for combined prefix + suffix match...\n");
    } else {
        println!("Pattern: {}", args.pattern);
        println!("Searching for {} match...\n", if args.prefix { "prefix" } else { "suffix" });
    }
    println!("Contract: {}", args.contract_name);
    println!("Threads: {}", args.threads);

    let factory_bytes = hex::decode(args.factory.trim_start_matches("0x"))
        .expect("Invalid factory address");
    
    let bytecode_hash_bytes = hex::decode(args.bytecode_hash.trim_start_matches("0x"))
        .expect("Invalid bytecode hash");

    let pattern = args.pattern.to_lowercase();
    let suffix_pattern = args.suffix.as_ref().map(|s| s.to_lowercase());
    let counter = Arc::new(AtomicU64::new(0));
    let found = Arc::new(AtomicU64::new(0));
    
    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::default_spinner()
            .template("{spinner:.green} [{elapsed_precise}] {msg}")
            .unwrap(),
    );

    let start_time = Instant::now();
    
    let result = (0..args.threads)
        .into_par_iter()
        .map(|_| {
            let mut rng = rand::thread_rng();
            let factory_bytes = factory_bytes.clone();
            let bytecode_hash_bytes = bytecode_hash_bytes.clone();
            let pattern = pattern.clone();
            let suffix_pattern = suffix_pattern.clone();
            let counter = counter.clone();
            let found = found.clone();
            
            loop {
                let attempts = counter.fetch_add(1, Ordering::Relaxed);
                
                if attempts % 10000 == 0 {
                    pb.set_message(format!("Attempts: {} | Rate: {:.0}/s", 
                        attempts, 
                        attempts as f64 / start_time.elapsed().as_secs_f64()
                    ));
                }
                
                if found.load(Ordering::Relaxed) > 0 {
                    return None;
                }
                
                // Generate random salt
                let salt: [u8; 32] = rng.gen();
                
                // Calculate CREATE2 address
                let address = calculate_create2_address(&factory_bytes, &salt, &bytecode_hash_bytes);
                let address_hex = encode(&address);
                
                // Check if address matches pattern
                let matches = if let Some(ref suffix_pat) = suffix_pattern {
                    // Combined prefix + suffix matching
                    address_hex.starts_with(&pattern) && address_hex.ends_with(suffix_pat)
                } else if args.prefix {
                    address_hex.starts_with(&pattern)
                } else {
                    address_hex.ends_with(&pattern)
                };
                
                if matches {
                    found.store(1, Ordering::Relaxed);
                    return Some((salt, address, attempts + 1));
                }
            }
            
            // This should never be reached due to the infinite loop
            // but included for completeness
            None
        })
        .find_any(|x| x.is_some())
        .flatten();

    pb.finish_with_message("Search completed!");

    match result {
        Some((salt, address, attempts)) => {
            let duration = start_time.elapsed().as_secs_f64();
            
            println!("\n🎉 FOUND VANITY ADDRESS!");
            println!("Address: 0x{}", encode(&address));
            println!("Salt: 0x{}", encode(&salt));
            println!("Attempts: {}", attempts);
            println!("Duration: {:.2} seconds", duration);
            println!("Rate: {:.0} attempts/second", attempts as f64 / duration);
            
            let pattern_str = if let Some(ref suffix) = args.suffix {
                format!("{}...{}", args.pattern, suffix)
            } else {
                args.pattern.clone()
            };
            
            let result = VanityResult {
                contract_name: args.contract_name,
                factory: args.factory,
                bytecode_hash: args.bytecode_hash,
                pattern: pattern_str,
                salt: format!("0x{}", encode(&salt)),
                address: format!("0x{}", encode(&address)),
                attempts,
                duration_seconds: duration,
                timestamp: chrono::Utc::now().to_rfc3339(),
            };
            
            match std::fs::write(&args.output, serde_json::to_string_pretty(&result).unwrap()) {
                Ok(_) => println!("Results saved to: {}", args.output),
                Err(e) => eprintln!("Failed to save results: {}", e),
            }
        }
        None => {
            println!("\n❌ No vanity address found. Try with a shorter pattern or more threads.");
        }
    }
}

fn calculate_create2_address(factory: &[u8], salt: &[u8], bytecode_hash: &[u8]) -> [u8; 20] {
    let mut data = Vec::new();
    data.push(0xff);
    data.extend_from_slice(factory);
    data.extend_from_slice(salt);
    data.extend_from_slice(bytecode_hash);
    
    let hash = keccak256(&data);
    let mut address = [0u8; 20];
    address.copy_from_slice(&hash[12..]);
    address
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_create2_calculation() {
        // Test with known values
        let factory = hex::decode("AA28020DDA6b954D16208eccF873D79AC6533833").unwrap();
        let salt = hex::decode("8b1e85e5301fe0d9fe499daa95956af04e5d37eeee55aa914f2a514ef517239c").unwrap();
        let bytecode_hash = hex::decode("48be50edf860a051d9ebfb6b24debfb68012a8243d1d21d8b04ec630622c8337").unwrap();
        
        let address = calculate_create2_address(&factory, &salt, &bytecode_hash);
        let address_hex = encode(&address);
        
        println!("Calculated address: 0x{}", address_hex);
        assert!(address_hex.ends_with("777"));
    }
} 