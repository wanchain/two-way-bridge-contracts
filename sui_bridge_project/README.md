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
╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Data                                                                                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                   │
│ Gas Owner: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                │
│ Gas Budget: 96118400 MIST                                                                                    │
│ Gas Price: 1000 MIST                                                                                         │
│ Gas Payment:                                                                                                 │
│  ┌──                                                                                                         │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                    │
│  │ Version: 92611847                                                                                         │
│  │ Digest: EZKuM19KwV2nsAAdrQ9ghZTb1AuSjtzoieMFpefZwL5d                                                      │
│  └──                                                                                                         │
│                                                                                                              │
│ Transaction Kind: Programmable                                                                               │
│ ╭──────────────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │ Input Objects                                                                                            │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ 0   Pure Arg: Type: address, Value: "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc" │ │
│ ╰──────────────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│ ╭─────────────────────────────────────────────────────────────────────────╮                                  │
│ │ Commands                                                                │                                  │
│ ├─────────────────────────────────────────────────────────────────────────┤                                  │
│ │ 0  Publish:                                                             │                                  │
│ │  ┌                                                                      │                                  │
│ │  │ Dependencies:                                                        │                                  │
│ │  │   0x0000000000000000000000000000000000000000000000000000000000000001 │                                  │
│ │  │   0x0000000000000000000000000000000000000000000000000000000000000002 │                                  │
│ │  │   0xbb06a0fa00fda53b18b82fa36abdfabdbbf53dbc42d51ea80065f8de10a25a87 │                                  │
│ │  └                                                                      │                                  │
│ │                                                                         │                                  │
│ │ 1  TransferObjects:                                                     │                                  │
│ │  ┌                                                                      │                                  │
│ │  │ Arguments:                                                           │                                  │
│ │  │   Result 0                                                           │                                  │
│ │  │ Address: Input  0                                                    │                                  │
│ │  └                                                                      │                                  │
│ ╰─────────────────────────────────────────────────────────────────────────╯                                  │
│                                                                                                              │
│ Signatures:                                                                                                  │
│    Xo1W//u5AtOTi5Q4FurbGmJWeyZ17Ia9niuigExbiDAv/qeTYub2U7Du6IJqDyrNkgzaFw17laWnfggWZYSwDA==                  │
│                                                                                                              │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Effects                                                                               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Digest: C5kkY9xVdCVkmxHmytTkm4jBynvtooLouddhnKCTw6at                                              │
│ Status: Success                                                                                   │
│ Executed Epoch: 726                                                                               │
│                                                                                                   │
│ Created Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0x055ef17bbc5ae1f50c0b16d6166f09b09393085080309df237376c6444da793f                         │
│  │ Owner: Shared( 92611848 )                                                                      │
│  │ Version: 92611848                                                                              │
│  │ Digest: DkjuZgJj5TA9Qv8JDePZFZd9Stxmm8ykGszM5hYbMdfy                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x171786b5ed62cbaafb2d04771e6c8f32a9abd94f1c9515c38aa0da74a53fe916                         │
│  │ Owner: Shared( 92611848 )                                                                      │
│  │ Version: 92611848                                                                              │
│  │ Digest: 21XZXJhcmymXBK9QAyE558TMiVqaaJgFY7cYv6vxGyLn                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x51ec3523cc19f1ea4bc7c28b706e34a4cc7caae16c7f815e136d98985c03dd5c                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611848                                                                              │
│  │ Digest: VnEDdAoqDXhDeLfwQno5wVKkabD3CKd4pncanR75i7h                                            │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x5df67891a012983c27b5d8190a90badb1043d1c7ad5d3974e5ecea265ce4dfb6                         │
│  │ Owner: Immutable                                                                               │
│  │ Version: 1                                                                                     │
│  │ Digest: 5ipLFg91nstVLFHVuVC7MZBJDcZZH1YZhvC93cqcM94x                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x8f3c6444769e44ade3acc3e5b7f212415415ee5c2da7d69042deb241a4e9b058                         │
│  │ Owner: Shared( 92611848 )                                                                      │
│  │ Version: 92611848                                                                              │
│  │ Digest: AZhEPT2AHDFgdB5WHxxqa5D5kipNBtYMBsCAE5T5GwSk                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xb1c62a6fb9f6d5ea707dec03d1bc7107888aaa2816f73d614c61d90dc8192b1f                         │
│  │ Owner: Shared( 92611848 )                                                                      │
│  │ Version: 92611848                                                                              │
│  │ Digest: 2Da2sjdUXxsE4hchEptYmwaepa6oCXeNYiWGWz9F3Rvr                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xbfe4dd5c4589c92df855f2d124c2e3b508bd2d67d5ec67107514eeafe7f05a06                         │
│  │ Owner: Shared( 92611848 )                                                                      │
│  │ Version: 92611848                                                                              │
│  │ Digest: DMevnrkjivB1QNDZFZNtQEbPADTtf3FPD4WLb2h1pKs7                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xc21ecacd7614303927540366becbef43f9a4f9349cf75c8a0b784289b698653a                         │
│  │ Owner: Shared( 92611848 )                                                                      │
│  │ Version: 92611848                                                                              │
│  │ Digest: 2oENy2g5kwaqzsHSehAFHVgDptRNHP9HNHvXgUJZheAo                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xd7f3e5e559da6d20e6613ed5f4b301eb32e1db227ebf62bee68d6796e40dcfad                         │
│  │ Owner: Shared( 92611848 )                                                                      │
│  │ Version: 92611848                                                                              │
│  │ Digest: 36TWhFY66uGn5bEG7wnm6wBywy2mnLuCThzW9PfhMXt3                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xdd6e0a43febb004d1dc09dcba0448050f06e5c3ea9e22513cc44edc7df33e683                         │
│  │ Owner: Shared( 92611848 )                                                                      │
│  │ Version: 92611848                                                                              │
│  │ Digest: 7jdne5GH1B24pCv5FYgvrY1vE8zwZfJoJiUV8yQqxWzW                                           │
│  └──                                                                                              │
│ Mutated Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611848                                                                              │
│  │ Digest: CJ2GDSM2abMK9LP7oJsD3NuawV8HhcM8juKJt2ZMFv6C                                           │
│  └──                                                                                              │
│ Gas Object:                                                                                       │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611848                                                                              │
│  │ Digest: CJ2GDSM2abMK9LP7oJsD3NuawV8HhcM8juKJt2ZMFv6C                                           │
│  └──                                                                                              │
│ Gas Cost Summary:                                                                                 │
│    Storage Cost: 94118400 MIST                                                                    │
│    Computation Cost: 1000000 MIST                                                                 │
│    Storage Rebate: 978120 MIST                                                                    │
│    Non-refundable Storage Fee: 9880 MIST                                                          │
│                                                                                                   │
│ Transaction Dependencies:                                                                         │
│    2KKFDYfXCwBWaS1e3i4gLnjW1DsQoWqYQMb4SVBZFQR2                                                   │
│    5eQ5ab4qeKswgceZaafPUvS9QKbRPWrBH82Vf4JHb42V                                                   │
│    DAXHSJRDTaWXx7KVH37eugMwxA7WAthps6jMowdvy3Za                                                   │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
╭─────────────────────────────╮
│ No transaction block events │
╰─────────────────────────────╯

╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                                                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                                                                 │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x055ef17bbc5ae1f50c0b16d6166f09b09393085080309df237376c6444da793f                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611848 )                                                                                     │
│  │ ObjectType: 0x5df67891a012983c27b5d8190a90badb1043d1c7ad5d3974e5ecea265ce4dfb6::oracle::OracleStorage         │
│  │ Version: 92611848                                                                                             │
│  │ Digest: DkjuZgJj5TA9Qv8JDePZFZd9Stxmm8ykGszM5hYbMdfy                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x171786b5ed62cbaafb2d04771e6c8f32a9abd94f1c9515c38aa0da74a53fe916                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611848 )                                                                                     │
│  │ ObjectType: 0x5df67891a012983c27b5d8190a90badb1043d1c7ad5d3974e5ecea265ce4dfb6::cross::PauseConfig            │
│  │ Version: 92611848                                                                                             │
│  │ Digest: 21XZXJhcmymXBK9QAyE558TMiVqaaJgFY7cYv6vxGyLn                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x51ec3523cc19f1ea4bc7c28b706e34a4cc7caae16c7f815e136d98985c03dd5c                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                 │
│  │ ObjectType: 0x2::package::UpgradeCap                                                                          │
│  │ Version: 92611848                                                                                             │
│  │ Digest: VnEDdAoqDXhDeLfwQno5wVKkabD3CKd4pncanR75i7h                                                           │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x8f3c6444769e44ade3acc3e5b7f212415415ee5c2da7d69042deb241a4e9b058                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611848 )                                                                                     │
│  │ ObjectType: 0x5df67891a012983c27b5d8190a90badb1043d1c7ad5d3974e5ecea265ce4dfb6::cross::TokenVault             │
│  │ Version: 92611848                                                                                             │
│  │ Digest: AZhEPT2AHDFgdB5WHxxqa5D5kipNBtYMBsCAE5T5GwSk                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xb1c62a6fb9f6d5ea707dec03d1bc7107888aaa2816f73d614c61d90dc8192b1f                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611848 )                                                                                     │
│  │ ObjectType: 0x5df67891a012983c27b5d8190a90badb1043d1c7ad5d3974e5ecea265ce4dfb6::cross::FoundationConfig       │
│  │ Version: 92611848                                                                                             │
│  │ Digest: 2Da2sjdUXxsE4hchEptYmwaepa6oCXeNYiWGWz9F3Rvr                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xbfe4dd5c4589c92df855f2d124c2e3b508bd2d67d5ec67107514eeafe7f05a06                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611848 )                                                                                     │
│  │ ObjectType: 0x5df67891a012983c27b5d8190a90badb1043d1c7ad5d3974e5ecea265ce4dfb6::cross::TreasuryCapsRegistry   │
│  │ Version: 92611848                                                                                             │
│  │ Digest: DMevnrkjivB1QNDZFZNtQEbPADTtf3FPD4WLb2h1pKs7                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xc21ecacd7614303927540366becbef43f9a4f9349cf75c8a0b784289b698653a                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611848 )                                                                                     │
│  │ ObjectType: 0x5df67891a012983c27b5d8190a90badb1043d1c7ad5d3974e5ecea265ce4dfb6::admin::Admin                  │
│  │ Version: 92611848                                                                                             │
│  │ Digest: 2oENy2g5kwaqzsHSehAFHVgDptRNHP9HNHvXgUJZheAo                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xd7f3e5e559da6d20e6613ed5f4b301eb32e1db227ebf62bee68d6796e40dcfad                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611848 )                                                                                     │
│  │ ObjectType: 0x5df67891a012983c27b5d8190a90badb1043d1c7ad5d3974e5ecea265ce4dfb6::cross::TokenPairRegistry      │
│  │ Version: 92611848                                                                                             │
│  │ Digest: 36TWhFY66uGn5bEG7wnm6wBywy2mnLuCThzW9PfhMXt3                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xdd6e0a43febb004d1dc09dcba0448050f06e5c3ea9e22513cc44edc7df33e683                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611848 )                                                                                     │
│  │ ObjectType: 0x5df67891a012983c27b5d8190a90badb1043d1c7ad5d3974e5ecea265ce4dfb6::cross::ProcessedTransactions  │
│  │ Version: 92611848                                                                                             │
│  │ Digest: 7jdne5GH1B24pCv5FYgvrY1vE8zwZfJoJiUV8yQqxWzW                                                          │
│  └──                                                                                                             │
│ Mutated Objects:                                                                                                 │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                 │
│  │ ObjectType: 0x2::coin::Coin<0x2::sui::SUI>                                                                    │
│  │ Version: 92611848                                                                                             │
│  │ Digest: CJ2GDSM2abMK9LP7oJsD3NuawV8HhcM8juKJt2ZMFv6C                                                          │
│  └──                                                                                                             │
│ Published Objects:                                                                                               │
│  ┌──                                                                                                             │
│  │ PackageID: 0x5df67891a012983c27b5d8190a90badb1043d1c7ad5d3974e5ecea265ce4dfb6                                 │
│  │ Version: 1                                                                                                    │
│  │ Digest: 5ipLFg91nstVLFHVuVC7MZBJDcZZH1YZhvC93cqcM94x                                                          │
│  │ Modules: admin, cross, oracle                                                                                 │
│  └──                                                                                                             │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Balance Changes                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──                                                                                              │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ CoinType: 0x2::sui::SUI                                                                        │
│  │ Amount: -94140280                                                                              │
│  └──                                                                                              │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
```

FeeConfig Object: 
  - 0x5273632246b772b26a1c48692c97a77d0dcafe0bcc87d601073c2961b7cf8338 (Shared)

## Wrapped USDT
```
sui client publish
[warning] Client/Server api version mismatch, client api version : 1.47.1, server api version : 1.47.0
[Note]: Dependency sources are no longer verified automatically during publication and upgrade. You can pass the `--verify-deps` option if you would like to verify them as part of publication or upgrade.
INCLUDING DEPENDENCY Bridge
INCLUDING DEPENDENCY SuiSystem
INCLUDING DEPENDENCY Sui
INCLUDING DEPENDENCY MoveStdlib
BUILDING USDT
Skipping dependency verification
Transaction Digest: FeQniaZFyXbk51NJZHd2fD7t9ugHNzkD1jjW1iL3uHLU
╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Data                                                                                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                   │
│ Gas Owner: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                │
│ Gas Budget: 15581200 MIST                                                                                    │
│ Gas Price: 1000 MIST                                                                                         │
│ Gas Payment:                                                                                                 │
│  ┌──                                                                                                         │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                    │
│  │ Version: 92611848                                                                                         │
│  │ Digest: CJ2GDSM2abMK9LP7oJsD3NuawV8HhcM8juKJt2ZMFv6C                                                      │
│  └──                                                                                                         │
│                                                                                                              │
│ Transaction Kind: Programmable                                                                               │
│ ╭──────────────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │ Input Objects                                                                                            │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ 0   Pure Arg: Type: address, Value: "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc" │ │
│ ╰──────────────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│ ╭─────────────────────────────────────────────────────────────────────────╮                                  │
│ │ Commands                                                                │                                  │
│ ├─────────────────────────────────────────────────────────────────────────┤                                  │
│ │ 0  Publish:                                                             │                                  │
│ │  ┌                                                                      │                                  │
│ │  │ Dependencies:                                                        │                                  │
│ │  │   0x0000000000000000000000000000000000000000000000000000000000000001 │                                  │
│ │  │   0x0000000000000000000000000000000000000000000000000000000000000002 │                                  │
│ │  └                                                                      │                                  │
│ │                                                                         │                                  │
│ │ 1  TransferObjects:                                                     │                                  │
│ │  ┌                                                                      │                                  │
│ │  │ Arguments:                                                           │                                  │
│ │  │   Result 0                                                           │                                  │
│ │  │ Address: Input  0                                                    │                                  │
│ │  └                                                                      │                                  │
│ ╰─────────────────────────────────────────────────────────────────────────╯                                  │
│                                                                                                              │
│ Signatures:                                                                                                  │
│    XykCpVPW2Wo1HdRXuS4qodludglHnsj/TwIsWM14OGIxDnh6UhAwLOxCcE1tW9lf98nvzKaLZyqau/Fj2mKZAQ==                  │
│                                                                                                              │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Effects                                                                               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Digest: FeQniaZFyXbk51NJZHd2fD7t9ugHNzkD1jjW1iL3uHLU                                              │
│ Status: Success                                                                                   │
│ Executed Epoch: 726                                                                               │
│                                                                                                   │
│ Created Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0x2d3c6bd92cace5f1780acc952de6be16da856e7a12899dc32fe51019192f04f9                         │
│  │ Owner: Immutable                                                                               │
│  │ Version: 1                                                                                     │
│  │ Digest: Egn7dLrKai2VfkmuWa7SwsdCa16oNyrSkihc8Awyq7q4                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x6d2df3a6ebf2843f6ad5da7eef2e20df5043601f83bdeaab5835ce85c9212f45                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611849                                                                              │
│  │ Digest: D7gRQN7Lw5dAzVdwmdG1GDHMKYSVRkU2724VjGHqxnot                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x7c44a1fb69d647259010337df9490c96e42a483dad15c39641dbaa3feae1844c                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611849                                                                              │
│  │ Digest: Ep2dL9vAkJoatpgTUiRn4Lj1G39U3JwvA2LYafFSe4uu                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xbf7ef53a1a903ee5be45e586d1e2e674011618b4295a985a1a6e9df075e710fa                         │
│  │ Owner: Shared( 92611849 )                                                                      │
│  │ Version: 92611849                                                                              │
│  │ Digest: EWQWnW3mZUgzeKoBDpTngJTv7hWUdLvxGf3MryJhnR1w                                           │
│  └──                                                                                              │
│ Mutated Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611849                                                                              │
│  │ Digest: DwqPLtezm2yKf2YSKRdm1X3tCKA1LvoLJiH2tcr4RGS1                                           │
│  └──                                                                                              │
│ Gas Object:                                                                                       │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611849                                                                              │
│  │ Digest: DwqPLtezm2yKf2YSKRdm1X3tCKA1LvoLJiH2tcr4RGS1                                           │
│  └──                                                                                              │
│ Gas Cost Summary:                                                                                 │
│    Storage Cost: 13581200 MIST                                                                    │
│    Computation Cost: 1000000 MIST                                                                 │
│    Storage Rebate: 978120 MIST                                                                    │
│    Non-refundable Storage Fee: 9880 MIST                                                          │
│                                                                                                   │
│ Transaction Dependencies:                                                                         │
│    2KKFDYfXCwBWaS1e3i4gLnjW1DsQoWqYQMb4SVBZFQR2                                                   │
│    C5kkY9xVdCVkmxHmytTkm4jBynvtooLouddhnKCTw6at                                                   │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
╭─────────────────────────────╮
│ No transaction block events │
╰─────────────────────────────╯

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                                                                        │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0x6d2df3a6ebf2843f6ad5da7eef2e20df5043601f83bdeaab5835ce85c9212f45                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                        │
│  │ ObjectType: 0x2::coin::TreasuryCap<0x2d3c6bd92cace5f1780acc952de6be16da856e7a12899dc32fe51019192f04f9::USDT::USDT>   │
│  │ Version: 92611849                                                                                                    │
│  │ Digest: D7gRQN7Lw5dAzVdwmdG1GDHMKYSVRkU2724VjGHqxnot                                                                 │
│  └──                                                                                                                    │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0x7c44a1fb69d647259010337df9490c96e42a483dad15c39641dbaa3feae1844c                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                        │
│  │ ObjectType: 0x2::package::UpgradeCap                                                                                 │
│  │ Version: 92611849                                                                                                    │
│  │ Digest: Ep2dL9vAkJoatpgTUiRn4Lj1G39U3JwvA2LYafFSe4uu                                                                 │
│  └──                                                                                                                    │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0xbf7ef53a1a903ee5be45e586d1e2e674011618b4295a985a1a6e9df075e710fa                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Shared( 92611849 )                                                                                            │
│  │ ObjectType: 0x2::coin::CoinMetadata<0x2d3c6bd92cace5f1780acc952de6be16da856e7a12899dc32fe51019192f04f9::USDT::USDT>  │
│  │ Version: 92611849                                                                                                    │
│  │ Digest: EWQWnW3mZUgzeKoBDpTngJTv7hWUdLvxGf3MryJhnR1w                                                                 │
│  └──                                                                                                                    │
│ Mutated Objects:                                                                                                        │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                        │
│  │ ObjectType: 0x2::coin::Coin<0x2::sui::SUI>                                                                           │
│  │ Version: 92611849                                                                                                    │
│  │ Digest: DwqPLtezm2yKf2YSKRdm1X3tCKA1LvoLJiH2tcr4RGS1                                                                 │
│  └──                                                                                                                    │
│ Published Objects:                                                                                                      │
│  ┌──                                                                                                                    │
│  │ PackageID: 0x2d3c6bd92cace5f1780acc952de6be16da856e7a12899dc32fe51019192f04f9                                        │
│  │ Version: 1                                                                                                           │
│  │ Digest: Egn7dLrKai2VfkmuWa7SwsdCa16oNyrSkihc8Awyq7q4                                                                 │
│  │ Modules: USDT                                                                                                        │
│  └──                                                                                                                    │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Balance Changes                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──                                                                                              │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ CoinType: 0x2::sui::SUI                                                                        │
│  │ Amount: -13603080                                                                              │
│  └──                                                                                              │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯

```


