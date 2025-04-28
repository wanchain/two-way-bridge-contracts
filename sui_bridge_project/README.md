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
  - `smg_mint<CoinType>(treasury_caps_registry: &mut TreasuryCapsRegistry, processed_tx: &mut ProcessedTransactions, oracle_storage: &oracle::OracleStorage, clock: &Clock, unique_id: vector<u8>, smg_id: vector<u8>, token_pair_id: u64, to_account: address, amount: u64, signature: vector<u8>, ctx: &mut TxContext)`: Mints tokens from cross-chain transfer
  - `smg_release<CoinType>(registry: &TokenPairRegistry, vault: &mut TokenVault, processed_tx: &mut ProcessedTransactions, oracle_storage: &oracle::OracleStorage, clock: &Clock, unique_id: vector<u8>, smg_id: vector<u8>, token_pair_id: u64, to_account: address, amount: u64, signature: vector<u8>, ctx: &mut TxContext)`: Releases locked tokens from cross-chain transfer

# Bridge Testnet Deployment

```

sui client publish
[warning] Client/Server api version mismatch, client api version : 1.47.1, server api version : 1.47.0
[Note]: Dependency sources are no longer verified automatically during publication and upgrade. You can pass the `--verify-deps` option if you would like to verify them as part of publication or upgrade.
UPDATING GIT DEPENDENCY https://github.com/MystenLabs/sui.git
INCLUDING DEPENDENCY Bridge
INCLUDING DEPENDENCY SuiSystem
INCLUDING DEPENDENCY cctp_helper
INCLUDING DEPENDENCY Sui
INCLUDING DEPENDENCY MoveStdlib
BUILDING sui_bridge_contracts
Skipping dependency verification
Transaction Digest: 4qHfrxAqUD1yW2khuTqcVbH9U4GoGCXM4e3jDf1ibTbH
╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Data                                                                                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                   │
│ Gas Owner: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                │
│ Gas Budget: 91543200 MIST                                                                                    │
│ Gas Price: 1000 MIST                                                                                         │
│ Gas Payment:                                                                                                 │
│  ┌──                                                                                                         │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                    │
│  │ Version: 92611827                                                                                         │
│  │ Digest: 42ZjfHAsJK3RxaVZfy9VvPePkqpnKQ25XdjKyCSM1VA6                                                      │
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
│    DF+GVYYIqMoHySO8F6QCads2rWVLLq+k2JTRDSFYHXe9YwIEg+/yMPQoh79j3Vvfd8S/tkpaBEm5Y1jzfbO3Cw==                  │
│                                                                                                              │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Effects                                                                               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Digest: 4qHfrxAqUD1yW2khuTqcVbH9U4GoGCXM4e3jDf1ibTbH                                              │
│ Status: Success                                                                                   │
│ Executed Epoch: 718                                                                               │
│                                                                                                   │
│ Created Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0x0e79627ae46708f8be4b4fd3cae5c42062fd67b3f380f19a55a291c0746b9f2f                         │
│  │ Owner: Shared( 92611828 )                                                                      │
│  │ Version: 92611828                                                                              │
│  │ Digest: rccjK3tJAtj9Sfn4vbFQXYvsSN5e6GvxCGF5WeT71YN                                            │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x1e0fa052db7b4890891ceb567b071a36bbf9f7437eadeac1351333610988298b                         │
│  │ Owner: Shared( 92611828 )                                                                      │
│  │ Version: 92611828                                                                              │
│  │ Digest: 2dn1xV5Aa4ux3KsEg8ZdGFmMUK4HJTMT8ipHwPhcpvx2                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x21a9120096642dd7eebe0b77814a662d2fff855f2a4c28837c078cfc0b340e0f                         │
│  │ Owner: Shared( 92611828 )                                                                      │
│  │ Version: 92611828                                                                              │
│  │ Digest: 6jLXZA4bvAPmDEWBvzEATnPrAub15Uon5ccF3Vpfbvbb                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x4a064f8513d60cb4300b8fd6c3b9f929c1281b91977f66e388813eeb590e4a0a                         │
│  │ Owner: Shared( 92611828 )                                                                      │
│  │ Version: 92611828                                                                              │
│  │ Digest: 3dQ3vLq8DMrLQkB5UsS3o3rMt88pJWfDgzDTutsRMqCP                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x683774ecd15c62f307d0bc7431da17a59d784a8babcba5e7b11ff60a79a5d2a0                         │
│  │ Owner: Shared( 92611828 )                                                                      │
│  │ Version: 92611828                                                                              │
│  │ Digest: Ez3Jytj1dkJmnKGk5JU2ibAEgfDWoGKuHCKrSdLep4M5                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x8aca38a9f00e8deec06803148a2687cd73a170309f9a89674406cc34a9c99f5b                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611828                                                                              │
│  │ Digest: AskkwyysZ8AfHmNy8QXdCfofiHXVFEWurTk9qstq6mym                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xb5bb538dd3ee73f7fbcdc61c6345366ac8e7ad99034ff2ed40398c6a9d7ba9c5                         │
│  │ Owner: Shared( 92611828 )                                                                      │
│  │ Version: 92611828                                                                              │
│  │ Digest: 4CUatuEwGs2trCCeKt6uyen7FJGgVmKiCXy9Kfe9CzjN                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xd1421600071bacc6412434a602e3924c5e983726cfe764f3cdcf1ced9d200334                         │
│  │ Owner: Immutable                                                                               │
│  │ Version: 1                                                                                     │
│  │ Digest: BAKFaHKQ1nJmCSfsSSAaawohVviageJwRUDmRF96FTjN                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xe44162b774679786268ece5021c7a2bfc6a538a12853b93457b4c0342ab60441                         │
│  │ Owner: Shared( 92611828 )                                                                      │
│  │ Version: 92611828                                                                              │
│  │ Digest: 422cyFH7BKsKCzKuRRw1cd8dPpSqj65HZyx2CedYN3F2                                           │
│  └──                                                                                              │
│ Mutated Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611828                                                                              │
│  │ Digest: 3yCQb1ry8jnULumZnaQnAtnB9Wuh2XYiFUE9sJjjjvNS                                           │
│  └──                                                                                              │
│ Gas Object:                                                                                       │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611828                                                                              │
│  │ Digest: 3yCQb1ry8jnULumZnaQnAtnB9Wuh2XYiFUE9sJjjjvNS                                           │
│  └──                                                                                              │
│ Gas Cost Summary:                                                                                 │
│    Storage Cost: 89543200 MIST                                                                    │
│    Computation Cost: 1000000 MIST                                                                 │
│    Storage Rebate: 978120 MIST                                                                    │
│    Non-refundable Storage Fee: 9880 MIST                                                          │
│                                                                                                   │
│ Transaction Dependencies:                                                                         │
│    2KKFDYfXCwBWaS1e3i4gLnjW1DsQoWqYQMb4SVBZFQR2                                                   │
│    7BhLYc9bUSFrZ8XmVR61sPe5qg2HqFYA1skbgJKQfUiD                                                   │
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
│  │ ObjectID: 0x0e79627ae46708f8be4b4fd3cae5c42062fd67b3f380f19a55a291c0746b9f2f                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611828 )                                                                                     │
│  │ ObjectType: 0xd1421600071bacc6412434a602e3924c5e983726cfe764f3cdcf1ced9d200334::oracle::OracleStorage         │
│  │ Version: 92611828                                                                                             │
│  │ Digest: rccjK3tJAtj9Sfn4vbFQXYvsSN5e6GvxCGF5WeT71YN                                                           │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x1e0fa052db7b4890891ceb567b071a36bbf9f7437eadeac1351333610988298b                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611828 )                                                                                     │
│  │ ObjectType: 0xd1421600071bacc6412434a602e3924c5e983726cfe764f3cdcf1ced9d200334::cross::FoundationConfig       │
│  │ Version: 92611828                                                                                             │
│  │ Digest: 2dn1xV5Aa4ux3KsEg8ZdGFmMUK4HJTMT8ipHwPhcpvx2                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x21a9120096642dd7eebe0b77814a662d2fff855f2a4c28837c078cfc0b340e0f                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611828 )                                                                                     │
│  │ ObjectType: 0xd1421600071bacc6412434a602e3924c5e983726cfe764f3cdcf1ced9d200334::cross::TokenPairRegistry      │
│  │ Version: 92611828                                                                                             │
│  │ Digest: 6jLXZA4bvAPmDEWBvzEATnPrAub15Uon5ccF3Vpfbvbb                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x4a064f8513d60cb4300b8fd6c3b9f929c1281b91977f66e388813eeb590e4a0a                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611828 )                                                                                     │
│  │ ObjectType: 0xd1421600071bacc6412434a602e3924c5e983726cfe764f3cdcf1ced9d200334::admin::Admin                  │
│  │ Version: 92611828                                                                                             │
│  │ Digest: 3dQ3vLq8DMrLQkB5UsS3o3rMt88pJWfDgzDTutsRMqCP                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x683774ecd15c62f307d0bc7431da17a59d784a8babcba5e7b11ff60a79a5d2a0                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611828 )                                                                                     │
│  │ ObjectType: 0xd1421600071bacc6412434a602e3924c5e983726cfe764f3cdcf1ced9d200334::cross::ProcessedTransactions  │
│  │ Version: 92611828                                                                                             │
│  │ Digest: Ez3Jytj1dkJmnKGk5JU2ibAEgfDWoGKuHCKrSdLep4M5                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x8aca38a9f00e8deec06803148a2687cd73a170309f9a89674406cc34a9c99f5b                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                 │
│  │ ObjectType: 0x2::package::UpgradeCap                                                                          │
│  │ Version: 92611828                                                                                             │
│  │ Digest: AskkwyysZ8AfHmNy8QXdCfofiHXVFEWurTk9qstq6mym                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xb5bb538dd3ee73f7fbcdc61c6345366ac8e7ad99034ff2ed40398c6a9d7ba9c5                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611828 )                                                                                     │
│  │ ObjectType: 0xd1421600071bacc6412434a602e3924c5e983726cfe764f3cdcf1ced9d200334::cross::TokenVault             │
│  │ Version: 92611828                                                                                             │
│  │ Digest: 4CUatuEwGs2trCCeKt6uyen7FJGgVmKiCXy9Kfe9CzjN                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xe44162b774679786268ece5021c7a2bfc6a538a12853b93457b4c0342ab60441                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611828 )                                                                                     │
│  │ ObjectType: 0xd1421600071bacc6412434a602e3924c5e983726cfe764f3cdcf1ced9d200334::cross::TreasuryCapsRegistry   │
│  │ Version: 92611828                                                                                             │
│  │ Digest: 422cyFH7BKsKCzKuRRw1cd8dPpSqj65HZyx2CedYN3F2                                                          │
│  └──                                                                                                             │
│ Mutated Objects:                                                                                                 │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                 │
│  │ ObjectType: 0x2::coin::Coin<0x2::sui::SUI>                                                                    │
│  │ Version: 92611828                                                                                             │
│  │ Digest: 3yCQb1ry8jnULumZnaQnAtnB9Wuh2XYiFUE9sJjjjvNS                                                          │
│  └──                                                                                                             │
│ Published Objects:                                                                                               │
│  ┌──                                                                                                             │
│  │ PackageID: 0xd1421600071bacc6412434a602e3924c5e983726cfe764f3cdcf1ced9d200334                                 │
│  │ Version: 1                                                                                                    │
│  │ Digest: BAKFaHKQ1nJmCSfsSSAaawohVviageJwRUDmRF96FTjN                                                          │
│  │ Modules: admin, cross, oracle                                                                                 │
│  └──                                                                                                             │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Balance Changes                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──                                                                                              │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ CoinType: 0x2::sui::SUI                                                                        │
│  │ Amount: -89565080                                                                              │
│  └──                                                                                              │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
```
