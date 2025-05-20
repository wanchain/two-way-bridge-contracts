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

```
const TESTNET_CONFIG = {
  // Bridge Package ID
  PACKAGE_ID: '0xce50d003e44fd73faaa709eec4a8df69add4008d9bd20abe60b9adf12b40d211',

  UPGRADE_CAP_OBJECT_ID: '0x0075fb654ba4d960ad09455466b712cb7d75bf9adec270da9fbdaeae6814165b',

  SUI_CLOCK_OBJECT_ID: '0x6',

  // Admin模块
  ADMIN: {
    OBJECT_ID: '0x2f521801d4ac04fd59ac7c50e9e204b88b6f3acd86ec47420e8684c15ea42a88',
  },
  
  // Oracle模块
  ORACLE: {
    OBJECT_ID: '0x8eb9e0fbdbdbdbd021f8607a7db9ba6db485c081c57338ac4b1022db6e3db774',
  },
  
  // Cross模块
  CROSS: {
    TOKEN_PAIR_REGISTRY: '0x02c0e0227207a8f235d9d2c3b9f1283b77ab11075b4a67394c0ffc468ad33c2a',
    TREASURY_CAPS_REGISTRY: '0x32181edd6f432617e416df0798c0237b3b89d70f404e349ae1741c75fb8d4389',
    TOKEN_VAULT: '0x1344512cf15cb5188b4cb82b6c7db9b74b2728cd928507641604f72d33f4a3c1',
    PROCESSED_TRANSACTIONS: '0x74f540ef3a06427c86e141e5c254239b89b033c14138aeda46a65bab0ddfb3fc',
    FOUNDATION_CONFIG: '0x8f745e53441e3e15378a56cdf9ded70864aa32df66d40693fefcc893cdc880ad',
    PAUSE_CONFIG: '0x8c3a9123df483b8cde30528ed286ae89b9d4e38e7e1a2a5ae1aabc1ae80e3130',
  },
  
  // FeeConfig
  FEE_CONFIG: {
    OBJECT_ID: '0x5273632246b772b26a1c48692c97a77d0dcafe0bcc87d601073c2961b7cf8338',
    COLLECTOR_OBJECT_ID: '0xbdcf21edcbec352410280158a54be106f8c26e51f731d26b461b222187aff8ff',
  },
  
  // USDT Token
  USDT: {
    PACKAGE_ID: '0xdb4cac6375006db72fca799f949c8368a95c58a6b3212f1c34b09c53b8b15ecc',
    TREASURY_CAP: '0x57a5ecc65fc17104e37d71c8c6bf869318a00c4797b537db98452bcacb5352ca',
    METADATA: '0x7f8f3d8f436273972ef8e6830cfe5072bc460d7461237e59de9ab17bb0ab178d',
  },
  
  // USDC Token
  USDC: {
    PACKAGE_ID: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29',
    TREASURY_CAP: '0x8d4427f83cf489d1a236754426cce009bba388d8566baaf36948139990b4d51a',
    METADATA: '0x5a2d9b8a2cbea39a2ce6186a31031496dd02b3b3eef59b7962bd3e2f6ddd988f',
  },
};


```


