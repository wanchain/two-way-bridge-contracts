# SUI Bridge Project

This repository contains the SUI cross-chain bridge contracts and related components.

## Project Structure

The project is organized into the following main directories:

### `bridge/`

Contains the SUI cross-chain bridge contract code. This is the core component that handles cross-chain asset transfers between SUI and other blockchains.

### `tokens/`

Contains the code for creating new Wrapped Tokens on SUI. When a new token needs to be supported by the bridge, the scripts in this directory are used to create the corresponding Wrapped Token. After creation, these tokens need to be registered with the bridge contract.

### `scripts/`

Contains utility scripts for various operations, including creating new Wrapped Tokens. These scripts are used when adding support for new tokens to the bridge.

### `sui_cctp_contracts/`

Contains the SUI implementation of Circle's Cross-Chain Transfer Protocol (CCTP) contracts and the fee management module. The fee management module is shared between the CCTP and SUI cross-chain bridge contracts.

## Build, Test, and Deploy Instructions

### Prerequisites

- [Sui CLI](https://docs.sui.io/build/install)
- [Node.js](https://nodejs.org/) (for running scripts)

### Building the Project

To build the SUI bridge contracts:

```bash
# Navigate to the project directory
cd bridge

# Build the contracts
sui move build
```

### Running Tests

To run the test suite:

```bash
# Run all tests
sui move test

# Run tests for a specific module
sui move test --filter <module_name>
```

### Deployment

To deploy the contracts to the SUI network:

```bash
# Deploy to devnet
sui client publish --gas-budget 100000000 --json

# Deploy to testnet
sui client publish --gas-budget 100000000 --json --network testnet

# Deploy to mainnet
sui client publish --gas-budget 100000000 --json --network mainnet

# Upgrade
sui client upgrade --upgrade-capability 0x3010420c9896f7d98e421b0ac65f7d1c73612a18905956d647ef100a6e1463bb
```


### Adding New Wrapped Tokens

To add support for a new token:

1. Use the scripts in the `scripts/` directory to create a new Wrapped Token:

```bash
# Example command
./scripts/create_token.sh usdt USDT 6 "Wrapped USDT by Wanchain"
```

## Fee Management

The fee management module in `sui_cctp_contracts/` is used by both the CCTP and SUI bridge contracts. It handles the collection and distribution of transaction fees for cross-chain transfers.

## Core Modules

The bridge contract consists of three core modules:

### Admin Module (`bridge/sources/admin.move`)

The Admin module manages role-based access control for the bridge system.

**Key Features:**
- Role management with four distinct roles: Owner, Admin, Oracle, and Operator
- Role-based permission checks for critical operations
- Secure role transfer functionality

**Main Interfaces:**
- `assert_owner(admin: &Admin, ctx: &TxContext)`: Verifies the caller is the owner
- `assert_admin(admin: &Admin, ctx: &TxContext)`: Verifies the caller is the owner or admin
- `assert_oracle(admin: &Admin, ctx: &TxContext)`: Verifies the caller is the oracle
- `assert_operator(admin: &Admin, ctx: &TxContext)`: Verifies the caller is the operator
- `set_owner(admin: &mut Admin, new_owner: address, ctx: &mut TxContext)`: Transfers ownership
- `set_admin(admin: &mut Admin, new_admin: address, ctx: &mut TxContext)`: Sets a new admin
- `set_oracle(admin: &mut Admin, new_oracle: address, ctx: &mut TxContext)`: Sets a new oracle
- `set_operator(admin: &mut Admin, new_operator: address, ctx: &mut TxContext)`: Sets a new operator

### Oracle Module (`bridge/sources/oracle.move`)

The Oracle module manages Storeman Group (SMG) information and signature verification for cross-chain operations.

**Key Features:**
- Management of Storeman Group (SMG) information
- Signature verification for cross-chain messages
- Time-based validation of SMG operations

**Main Interfaces:**
- `add_smg_info(admin: &Admin, oracle_storage: &mut OracleStorage, smg_id: vector<u8>, gpk: vector<u8>, status: u8, start_time: u64, end_time: u64, hash_type: u8, ctx: &mut TxContext)`: Adds or updates SMG information
- `update_smg_status(admin: &Admin, oracle_storage: &mut OracleStorage, smg_id: vector<u8>, new_status: u8, ctx: &mut TxContext)`: Updates an SMG's status
- `verify_signature(oracle_storage: &OracleStorage, clock: &Clock, smg_id: vector<u8>, message_body: vector<u8>, signature: vector<u8>)`: Verifies a signature against an SMG's public key

### Cross Module (`bridge/sources/cross.move`)

The Cross module implements the core cross-chain token bridge functionality.

**Key Features:**
- Token pair management for cross-chain mappings
- Treasury cap management for wrapped tokens
- Cross-chain token locking, burning, minting, and releasing
- Transaction deduplication to prevent replay attacks

**Main Interfaces:**
- Token Pair Management:
  - `add_token_pair(registry: &mut TokenPairRegistry, admin_cap: &admin::Admin, token_pair_id: u64, sui_token_address: vector<u8>, sui_token_type: u8, external_chain_id: u64, external_token_address: vector<u8>, ctx: &mut TxContext)`: Adds a new token pair
  - `update_token_pair(registry: &mut TokenPairRegistry, admin_cap: &admin::Admin, token_pair_id: u64, sui_token_address: vector<u8>, sui_token_type: u8, external_chain_id: u64, external_token_address: vector<u8>, is_active: bool, ctx: &mut TxContext)`: Updates a token pair

- Cross-Chain Operations:
  - `user_lock<CoinType>(registry: &TokenPairRegistry, vault: &mut TokenVault, fee_config: &FeeConfig, token_pair_id: u64, amount: u64, fee: Coin<SUI>, ctx: &mut TxContext)`: Locks tokens for cross-chain transfer
  - `user_burn<CoinType>(registry: &TokenPairRegistry, treasury_caps_registry: &mut TreasuryCapsRegistry, fee_config: &FeeConfig, token_pair_id: u64, amount: u64, fee: Coin<SUI>, ctx: &mut TxContext)`: Burns wrapped tokens for cross-chain transfer
  - `smg_mint<CoinType>(registry: &TokenPairRegistry, treasury_caps_registry: &mut TreasuryCapsRegistry, processed_tx: &mut ProcessedTransactions, oracle_storage: &oracle::OracleStorage, pause_config: &PauseConfig, foundation_config: &FoundationConfig, clock: &Clock, unique_id: vector<u8>, smg_id: vector<u8>, token_pair_id: u64, to_account: address, amount: u64, serviceFee: u64, signature: vector<u8>, ctx: &mut TxContext)`: Mints tokens from cross-chain transfer
  - `smg_release<CoinType>(registry: &TokenPairRegistry, vault: &mut TokenVault, processed_tx: &mut ProcessedTransactions, oracle_storage: &oracle::OracleStorage, pause_config: &PauseConfig, foundation_config: &FoundationConfig, clock: &Clock, unique_id: vector<u8>, smg_id: vector<u8>, token_pair_id: u64, to_account: address, amount: u64, serviceFee: u64, signature: vector<u8>, ctx: &mut TxContext)`: Releases locked tokens from cross-chain transfer

# Testnet Deployment

## Bridge 
```
{
  // Bridge Package ID
  PACKAGE_ID: '0x807b861d3f1541c63af22fcb8bcf4c3676e8e08ddcd03f926173082ecd50ca1c',
  
  ADMIN: {
    OBJECT_ID: '0x315e0c5ed8cbbc1e6a953bc609f7406fbea6662182b644c3f718f800b0013c24',
  },
  
  ORACLE: {
    OBJECT_ID: '0xb01c1e8aabca72d3965ad412383b0744aadd00ef8b370550389fe2c1a9f51df0',
  },
  
  CROSS: {
    TOKEN_PAIR_REGISTRY: '0x30533ef51c6677e98c4b6fb34692cc1815441da8c21b883a5378898b3f5278a5',
    TREASURY_CAPS_REGISTRY: '0x2543677f6fa5285f26cc12054d18f931533234cdcff6962f7d15587f68301008',
    TOKEN_VAULT: '0x293436029852130e0bfded157423994dee7099daa0e4cd1c071e2601ea91616a',
    PROCESSED_TRANSACTIONS: '0x10f1882d85484c9a74ca8409df5515a88d26c5531882f9e30a19c2a88486d742',
    FOUNDATION_CONFIG: '0x9aa84658fc57584463bec49e4554efc54647caca9b781e995d2dbcc7373509dd',
    PAUSE_CONFIG: '0x6d185c83534d08f227580b8c0210061ce5c324056e8ceca64664179ffd4e048a',
  },
  
  // FeeConfig
  FEE_CONFIG: {
    OBJECT_ID: '0x5273632246b772b26a1c48692c97a77d0dcafe0bcc87d601073c2961b7cf8338',
  },
  
  // USDT Token
  USDT: {
    PACKAGE_ID: '0xd85f837bfa9d361e0ffe7ece35d96e5667b605aa0599e322c46a39048d04a0ab',
    TREASURY_CAP: '0x0d89e60fd7c11b6becb4d13f082f5e0115f80e1245555b2a201736b282ac63f2',
    METADATA: '0x3d7a9562c823fc443cc293484020de21bd6069e9fe435714c1628695bdc5c7d0',
  },
}
```


