#!/usr/bin/env python3
"""
Helper script to extract bytecode hashes from Hardhat compilation artifacts
and generate vanity addresses for CREATE2 deployment.
"""

import json
import os
import hashlib
import subprocess
import sys
from pathlib import Path

def get_bytecode_hash(contract_name, artifacts_dir="../artifacts"):
    """Extract bytecode hash from Hardhat compilation artifacts."""
    contract_path = None
    
    # Search for the contract in artifacts
    for root, dirs, files in os.walk(artifacts_dir):
        if f"{contract_name}.json" in files:
            contract_path = os.path.join(root, f"{contract_name}.json")
            break
    
    if not contract_path:
        print(f"❌ Contract {contract_name} not found in artifacts")
        return None
    
    with open(contract_path, 'r') as f:
        artifact = json.load(f)
    
    bytecode = artifact['bytecode']
    if bytecode.startswith('0x'):
        bytecode = bytecode[2:]
    
    # Calculate keccak256 hash (using sha3_256 which is keccak256)
    bytecode_hash = hashlib.sha3_256(bytes.fromhex(bytecode)).hexdigest()
    
    return f"0x{bytecode_hash}"

def run_vanity_generator(factory_address, bytecode_hash, pattern, contract_name, threads=8):
    """Run the Rust vanity generator."""
    cmd = [
        "cargo", "run", "--release", "--",
        "-f", factory_address,
        "-b", bytecode_hash,
        "-p", pattern,
        "-c", contract_name,
        "-t", str(threads),
        "-o", f"vanity_{contract_name.lower()}.json"
    ]
    
    print(f"🚀 Running vanity generator for {contract_name}...")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=False)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Vanity generator failed: {e}")
        return False

def main():
    # Configuration
    FACTORY_ADDRESS = "0xAA28020DDA6b954D16208eccF873D79AC6533833"
    PATTERN = "777"  # Looking for addresses ending with 777
    THREADS = 8
    
    contracts = [
        "OmniDragonHybridRegistry",
        "omniDRAGON"
    ]
    
    print("🔍 CREATE2 Vanity Address Generator Helper")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists("../artifacts"):
        print("❌ Please run this script from the vanity-generator directory")
        print("   The parent directory should contain the 'artifacts' folder from Hardhat compilation")
        sys.exit(1)
    
    # Build the Rust project first
    print("🔧 Building Rust vanity generator...")
    try:
        subprocess.run(["cargo", "build", "--release"], check=True)
        print("✅ Rust project built successfully")
    except subprocess.CalledProcessError:
        print("❌ Failed to build Rust project")
        sys.exit(1)
    
    results = {}
    
    for contract in contracts:
        print(f"\n📋 Processing {contract}...")
        
        # Get bytecode hash
        bytecode_hash = get_bytecode_hash(contract)
        if not bytecode_hash:
            continue
        
        print(f"✅ Bytecode hash: {bytecode_hash}")
        
        # Run vanity generator
        if run_vanity_generator(FACTORY_ADDRESS, bytecode_hash, PATTERN, contract, THREADS):
            # Read the result
            result_file = f"vanity_{contract.lower()}.json"
            if os.path.exists(result_file):
                with open(result_file, 'r') as f:
                    results[contract] = json.load(f)
                print(f"✅ Vanity address generated for {contract}")
            else:
                print(f"❌ Result file not found for {contract}")
        else:
            print(f"❌ Failed to generate vanity address for {contract}")
    
    # Save combined results
    if results:
        combined_results = {
            "network": "multi-chain",
            "timestamp": results[list(results.keys())[0]]["timestamp"],
            "factory": FACTORY_ADDRESS,
            "contracts": results
        }
        
        with open("vanity_addresses_combined.json", 'w') as f:
            json.dump(combined_results, f, indent=2)
        
        print("\n🎉 Results Summary:")
        print("=" * 50)
        for contract, result in results.items():
            print(f"{contract}:")
            print(f"  Address: {result['address']}")
            print(f"  Salt: {result['salt']}")
            print(f"  Attempts: {result['attempts']}")
            print(f"  Duration: {result['duration_seconds']:.2f}s")
            print()
        
        print(f"📄 Combined results saved to: vanity_addresses_combined.json")
    else:
        print("❌ No vanity addresses were generated")

if __name__ == "__main__":
    main() 