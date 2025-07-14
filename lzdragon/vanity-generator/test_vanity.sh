#!/bin/bash

# Test script for vanity address generator
echo "🧪 Testing Vanity Address Generator"
echo "=================================="

# Test with a simple pattern that should be found quickly
echo "Testing with pattern 'abc' (should be found quickly)..."

./target/release/vanity-generator \
    --factory 0xAA28020DDA6b954D16208eccF873D79AC6533833 \
    --bytecode-hash 0x48be50edf860a051d9ebfb6b24debfb68012a8243d1d21d8b04ec630622c8337 \
    --pattern abc \
    --contract-name TestContract \
    --threads 4 \
    --output test_result.json

echo ""
echo "✅ Test completed! Check test_result.json for results."

# Show the result if successful
if [ -f "test_result.json" ]; then
    echo ""
    echo "📄 Generated vanity address:"
    cat test_result.json | jq '.'
fi 