#!/bin/bash
# Script to create a new token package

# Check parameters
if [ $# -lt 4 ]; then
    echo "Usage: $0 <token_name> <token_symbol> <decimals> <description>"
    echo "Example: $0 usdt USDT 6 \"Tether USD\""
    exit 1
fi

# Parameters
TOKEN_NAME=$1
TOKEN_SYMBOL=$2
DECIMALS=$3
DESCRIPTION=$4
TOKEN_FULL_NAME=$5
if [ -z "$TOKEN_FULL_NAME" ]; then
    TOKEN_FULL_NAME=$TOKEN_SYMBOL
fi

# Check if token name contains invalid characters for Move package
if [[ "$TOKEN_NAME" =~ [^[:alnum:]_] ]]; then
    echo "Error: Token name '$TOKEN_NAME' contains invalid characters."
    echo "Only alphanumeric characters and underscores are allowed for Move package names."
    exit 1
fi

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Create directories
TOKEN_DIR="$PROJECT_ROOT/tokens/${TOKEN_NAME}"
mkdir -p "$TOKEN_DIR"
mkdir -p "$TOKEN_DIR/sources"

# Copy templates
cp -r "$PROJECT_ROOT/tokens/template/Move.toml" "$TOKEN_DIR/"
cp -r "$PROJECT_ROOT/tokens/template/sources/token.move" "$TOKEN_DIR/sources/${TOKEN_NAME}.move"

# Replace names
sed -i '' "s/TOKEN_NAME/${TOKEN_NAME}/g" "$TOKEN_DIR/Move.toml"
sed -i '' "s/TOKEN_NAME/${TOKEN_NAME}/g" "$TOKEN_DIR/sources/${TOKEN_NAME}.move"
sed -i '' "s/TOKEN_SYMBOL/${TOKEN_SYMBOL}/g" "$TOKEN_DIR/sources/${TOKEN_NAME}.move"
sed -i '' "s/TOKEN_FULL_NAME/${TOKEN_FULL_NAME}/g" "$TOKEN_DIR/sources/${TOKEN_NAME}.move"
sed -i '' "s/DECIMALS/${DECIMALS}/g" "$TOKEN_DIR/sources/${TOKEN_NAME}.move"
sed -i '' "s/TOKEN_DESCRIPTION/${DESCRIPTION}/g" "$TOKEN_DIR/sources/${TOKEN_NAME}.move"

# Build
cd "$TOKEN_DIR"
sui move build

echo "Token package created successfully: ${TOKEN_NAME}"
echo "Location: $TOKEN_DIR"
echo "To deploy this token package, run:"
echo "cd \"$TOKEN_DIR\" && sui client publish --gas-budget 100000000"
