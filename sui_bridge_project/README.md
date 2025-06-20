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
  PACKAGE_ID: '0x011cad4611db93764613b6112150edf9b82c81bd230787d317b24e475f0313c5',

  UPGRADE_CAP_OBJECT_ID: '0x971493e948efea218cd51482d80e3fe55fba872df2462d063022ee47d9a3d00a',

  SUI_CLOCK_OBJECT_ID: '0x6',

  // Admin module
  ADMIN: {
    OBJECT_ID: '0x04e59504361b901796f119bfc0a89b90b132aceaea3d883f6ecf110b4e4fdbb0',
  },
  
  // Oracle module
  ORACLE: {
    OBJECT_ID: '0x2a24a4c7bf712b688a3df7044f0011d52bb44a4c076d561612d60d0a1f647ad1',
  },
  
  // Cross module
  CROSS: {
    TOKEN_PAIR_REGISTRY: '0x71b6dcd9e89c45d75c7cabf132830edaa7f8bc60b0c7160ad346b4c6909cc0e5',
    TREASURY_CAPS_REGISTRY: '0x296177fcd9033f68f23f29bf174c99801f972258f79c6d2797ad02c9c58a3859',
    TOKEN_VAULT: '0x6363633a4ecda3e5ab6f9daebcf2e824c9a757ea96b7a02f3c28fdd066d2efe3',
    PROCESSED_TRANSACTIONS: '0x4ad474e37ba1fe37bc7f782f669845fbc9ad7fb40b5110b5716c546a59b337f7',
    FOUNDATION_CONFIG: '0xaa724f7ea55b867d25309fee0193574aae96d1c59bb0c55fb74576f9297eb1de',
    PAUSE_CONFIG: '0x9ea237466947f53265c8f692f3ec2f1ea4676d7929bb158da7995aad7fc95b63',
  },
  
  // FeeConfig
  FEE_CONFIG: {
    OBJECT_ID: '0x5273632246b772b26a1c48692c97a77d0dcafe0bcc87d601073c2961b7cf8338',
    COLLECTOR_OBJECT_ID: '0xbdcf21edcbec352410280158a54be106f8c26e51f731d26b461b222187aff8ff',
  },
  
  // USDT Token
  USDT: {
    PACKAGE_ID: '0x9def5af34c5f949c3538ae5779ec0e6bfe70bdbea360c7926cfb9f86d1a5ed14',
    TREASURY_CAP: '0x7ae2858f1220995024bae85615cb4803fcd19325c77753dec60b465d4b585bff',
    METADATA: '0xd280aaaba898a5afa1f4c588e866fbfb6afb0dda965ce3af26a644a7975b4b7c',
  },
  
  // USDC Token
  USDC: {
    PACKAGE_ID: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29',
    TREASURY_CAP: '0x8d4427f83cf489d1a236754426cce009bba388d8566baaf36948139990b4d51a',
    METADATA: '0x5a2d9b8a2cbea39a2ce6186a31031496dd02b3b3eef59b7962bd3e2f6ddd988f',
  },
};


```


# Mainnet Deployment

```
const MAINNET_CONFIG = {
  // Bridge Package ID
  PACKAGE_ID: '0x1c8b984b5d896a916b356171ee7c48eb5b62d8685ffe8da6f5ac30cc1def8c6a',

  UPGRADE_CAP_OBJECT_ID: '0xe3d2d50aa68192f8c666cdd340b49f743f469a04a089730e8ba7db6d8fa9f091',

  SUI_CLOCK_OBJECT_ID: '0x6',

  // Admin module
  ADMIN: {
    OBJECT_ID: '0x76210fa68de097be761fd3c758628c64fc5b51f8a150dcba20474e2691f618cd',
  },
  
  // Oracle module
  ORACLE: {
    OBJECT_ID: '0x30e1529ff5b1bcaac4dcdc9095ea5a3562c6a26607e6b26b0dfd296ed230c2d1',
  },
  
  // Cross module
  CROSS: {
    TOKEN_PAIR_REGISTRY: '0x1706cef6192f49db4d5650eb93a912ae81694d0f8b90f591e6f489959829b987',
    TREASURY_CAPS_REGISTRY: '0xfd4426caebdca527d2c68c4f9864611a8298819d8f5bd3e494e2347b1dc2bf84',
    TOKEN_VAULT: '0xc22e2bf69d38889a92559f45fd8769838d98dfc85f9e42925c0cb34bd7da06c7',
    PROCESSED_TRANSACTIONS: '0xbfa60efaaa411e97444b7f1e51adb7616da36087b0b6c91bed25fae7a372a1ab',
    FOUNDATION_CONFIG: '0x8a47c0bcca85466f679a0f5b1e1e1ca0bed02a1ea33dad829fa22e8bfa97bf54',
    PAUSE_CONFIG: '0xfd6f639b37679637d77389038bcfad8e7a128122c18a9b0706d101670af21505',
  },
  
  // FeeConfig
  FEE_CONFIG: {
    OBJECT_ID: '0xbb93514a7e8774a4f9aca575793f766e3a21d0a936785129be4f99c0263e1d0f',
    COLLECTOR_OBJECT_ID: '0xc259516354cac6854e0b40b135a6eec493a55c03f1d865e9c4c4e74f69d8c4cf',
  },
  
  // USDT Token
  USDT: {
    PACKAGE_ID: '',
    TREASURY_CAP: '',
    METADATA: '',
  },
  
  // USDC Token
  USDC: {
    PACKAGE_ID: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7',
    TREASURY_CAP: '0x57d6725e7a8b49a7b2a612f6bd66ab5f39fc95332ca48be421c3229d514a6de7',
    METADATA: '0x69b7a7c3c200439c1b5f3b19d7d495d5966d5f08de66c69276152f8db3992ec6',
  },
};
```