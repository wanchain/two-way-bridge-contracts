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
sui client publish
[warning] Client/Server api version mismatch, client api version : 1.47.1, server api version : 1.48.1
[Note]: Dependency sources are no longer verified automatically during publication and upgrade. You can pass the `--verify-deps` option if you would like to verify them as part of publication or upgrade.
UPDATING GIT DEPENDENCY https://github.com/MystenLabs/sui.git
INCLUDING DEPENDENCY Bridge
INCLUDING DEPENDENCY SuiSystem
INCLUDING DEPENDENCY cctp_helper
INCLUDING DEPENDENCY Sui
INCLUDING DEPENDENCY MoveStdlib
BUILDING sui_bridge_contracts
Skipping dependency verification
Transaction Digest: DbKTC5VHcsMk1fKzknro1yVxegnHeqPv9NpNSLVeoxkX
╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Data                                                                                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                   │
│ Gas Owner: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                │
│ Gas Budget: 96285600 MIST                                                                                    │
│ Gas Price: 1000 MIST                                                                                         │
│ Gas Payment:                                                                                                 │
│  ┌──                                                                                                         │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                    │
│  │ Version: 206482966                                                                                        │
│  │ Digest: ABqRC2wSSBw6KDBrzpHagKJ2pDBQXhprGFWVYVwzQmE9                                                      │
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
│    kSEZ6Oae89DPzEFzDQ8TsJq43Y/i+8fa5/DhrcrrGaTGc/lJeJ6sACpvPaJcACtLcIevrL0+1nSiITfTdTNiAw==                  │
│                                                                                                              │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Effects                                                                               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Digest: DbKTC5VHcsMk1fKzknro1yVxegnHeqPv9NpNSLVeoxkX                                              │
│ Status: Success                                                                                   │
│ Executed Epoch: 728                                                                               │
│                                                                                                   │
│ Created Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0x1ea85a71fc4ee11cbe8b1ae57bb3b06fc024336fef680493978b8d88da91c1c6                         │
│  │ Owner: Shared( 206482967 )                                                                     │
│  │ Version: 206482967                                                                             │
│  │ Digest: 7FJmNJ6gNptu75jxLvRhw6kR979hcjpQnUJgcvHqvxoU                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x2562e8676228628f4349754865f6f2d457e885997cba71fb7d764b8c53783a6a                         │
│  │ Owner: Immutable                                                                               │
│  │ Version: 1                                                                                     │
│  │ Digest: RZa3BWpWn4z6eFDcQkRhkKMCAeWM2KBhy642ot6V3jz                                            │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x2858c2e257f8df2551656fd0e5a53b131527329a1eee1d97959296ef7424b26e                         │
│  │ Owner: Shared( 206482967 )                                                                     │
│  │ Version: 206482967                                                                             │
│  │ Digest: EF77kvrcGvmVXLPVWg7gr6NmHXFGHDaLPteEEnvaXZJF                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x49df5a1155a5283d449f5e2a515480f0814df898068efe41bbafe4891a39fde7                         │
│  │ Owner: Shared( 206482967 )                                                                     │
│  │ Version: 206482967                                                                             │
│  │ Digest: 7XJVE6t2MeYjUhZE7ioMYzEtXDno3VR4CQTjGVYsfLuz                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x6a5353a9d918f3796c1bc5b3b772146b68aaac2c2d18b5de96a616934d5244b1                         │
│  │ Owner: Shared( 206482967 )                                                                     │
│  │ Version: 206482967                                                                             │
│  │ Digest: AREaxAKiDerbi5XxcoUcpg4PwQG5DRjPeHrtNSZdoMmG                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x6c05f707c086c0616579ff1270c560a930ed6206047c807d8e6cf94976f35db2                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 206482967                                                                             │
│  │ Digest: 3q4wt92TKM6jxe46g4At2a9XHDVefLDkteDEfVM4pwFT                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xb2d2a1ca56d5cdbedbaadf7583d6403f96c09b25a1b43d79c8acb93c41db4e6d                         │
│  │ Owner: Shared( 206482967 )                                                                     │
│  │ Version: 206482967                                                                             │
│  │ Digest: 9MjMsG789HdqW2VsiN7ouCTh5Cn6LM9fUFmY2zmHAEZL                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xb484a99730935d8e8eeeb843538c36e81bdeb98cf1cad0be562fa85e83457989                         │
│  │ Owner: Shared( 206482967 )                                                                     │
│  │ Version: 206482967                                                                             │
│  │ Digest: Fn8oezhrUUxsjZox2kziTjB2fPuwbSDSPTZUemszQcb5                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xc05f19767b0198321a8ef49bcafcfc55d1dea868766807accce3149bbc5ee2c4                         │
│  │ Owner: Shared( 206482967 )                                                                     │
│  │ Version: 206482967                                                                             │
│  │ Digest: 9cSEwisYjfuJ4sLX8RAQiAoJe8Z1dyRw8rDJfKEtc9Yh                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xe5cb0c6e0cd34a448012d0023bf0e74c3bc0fc4138f52dc97935d0a6b786afe3                         │
│  │ Owner: Shared( 206482967 )                                                                     │
│  │ Version: 206482967                                                                             │
│  │ Digest: Ag4orKC4543Rt1Fj693DHEmCBbTM5fegnQm713NBkh1U                                           │
│  └──                                                                                              │
│ Mutated Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 206482967                                                                             │
│  │ Digest: 96d176AP4y8G1M9UypME9gK2FzQfMyywZZR6TeqHBjHd                                           │
│  └──                                                                                              │
│ Gas Object:                                                                                       │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 206482967                                                                             │
│  │ Digest: 96d176AP4y8G1M9UypME9gK2FzQfMyywZZR6TeqHBjHd                                           │
│  └──                                                                                              │
│ Gas Cost Summary:                                                                                 │
│    Storage Cost: 94285600 MIST                                                                    │
│    Computation Cost: 1000000 MIST                                                                 │
│    Storage Rebate: 978120 MIST                                                                    │
│    Non-refundable Storage Fee: 9880 MIST                                                          │
│                                                                                                   │
│ Transaction Dependencies:                                                                         │
│    2KKFDYfXCwBWaS1e3i4gLnjW1DsQoWqYQMb4SVBZFQR2                                                   │
│    DAXHSJRDTaWXx7KVH37eugMwxA7WAthps6jMowdvy3Za                                                   │
│    Dr1L1kGPc7zUZ6BCxW1A34XnxZGgYjYq2epdYuUtCaDh                                                   │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
╭─────────────────────────────╮
│ No transaction block events │
╰─────────────────────────────╯

╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                                                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                                                                 │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x1ea85a71fc4ee11cbe8b1ae57bb3b06fc024336fef680493978b8d88da91c1c6                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 206482967 )                                                                                    │
│  │ ObjectType: 0x2562e8676228628f4349754865f6f2d457e885997cba71fb7d764b8c53783a6a::admin::Admin                  │
│  │ Version: 206482967                                                                                            │
│  │ Digest: 7FJmNJ6gNptu75jxLvRhw6kR979hcjpQnUJgcvHqvxoU                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x2858c2e257f8df2551656fd0e5a53b131527329a1eee1d97959296ef7424b26e                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 206482967 )                                                                                    │
│  │ ObjectType: 0x2562e8676228628f4349754865f6f2d457e885997cba71fb7d764b8c53783a6a::cross::TreasuryCapsRegistry   │
│  │ Version: 206482967                                                                                            │
│  │ Digest: EF77kvrcGvmVXLPVWg7gr6NmHXFGHDaLPteEEnvaXZJF                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x49df5a1155a5283d449f5e2a515480f0814df898068efe41bbafe4891a39fde7                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 206482967 )                                                                                    │
│  │ ObjectType: 0x2562e8676228628f4349754865f6f2d457e885997cba71fb7d764b8c53783a6a::cross::PauseConfig            │
│  │ Version: 206482967                                                                                            │
│  │ Digest: 7XJVE6t2MeYjUhZE7ioMYzEtXDno3VR4CQTjGVYsfLuz                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x6a5353a9d918f3796c1bc5b3b772146b68aaac2c2d18b5de96a616934d5244b1                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 206482967 )                                                                                    │
│  │ ObjectType: 0x2562e8676228628f4349754865f6f2d457e885997cba71fb7d764b8c53783a6a::cross::TokenPairRegistry      │
│  │ Version: 206482967                                                                                            │
│  │ Digest: AREaxAKiDerbi5XxcoUcpg4PwQG5DRjPeHrtNSZdoMmG                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x6c05f707c086c0616579ff1270c560a930ed6206047c807d8e6cf94976f35db2                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                 │
│  │ ObjectType: 0x2::package::UpgradeCap                                                                          │
│  │ Version: 206482967                                                                                            │
│  │ Digest: 3q4wt92TKM6jxe46g4At2a9XHDVefLDkteDEfVM4pwFT                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xb2d2a1ca56d5cdbedbaadf7583d6403f96c09b25a1b43d79c8acb93c41db4e6d                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 206482967 )                                                                                    │
│  │ ObjectType: 0x2562e8676228628f4349754865f6f2d457e885997cba71fb7d764b8c53783a6a::cross::FoundationConfig       │
│  │ Version: 206482967                                                                                            │
│  │ Digest: 9MjMsG789HdqW2VsiN7ouCTh5Cn6LM9fUFmY2zmHAEZL                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xb484a99730935d8e8eeeb843538c36e81bdeb98cf1cad0be562fa85e83457989                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 206482967 )                                                                                    │
│  │ ObjectType: 0x2562e8676228628f4349754865f6f2d457e885997cba71fb7d764b8c53783a6a::oracle::OracleStorage         │
│  │ Version: 206482967                                                                                            │
│  │ Digest: Fn8oezhrUUxsjZox2kziTjB2fPuwbSDSPTZUemszQcb5                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xc05f19767b0198321a8ef49bcafcfc55d1dea868766807accce3149bbc5ee2c4                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 206482967 )                                                                                    │
│  │ ObjectType: 0x2562e8676228628f4349754865f6f2d457e885997cba71fb7d764b8c53783a6a::cross::ProcessedTransactions  │
│  │ Version: 206482967                                                                                            │
│  │ Digest: 9cSEwisYjfuJ4sLX8RAQiAoJe8Z1dyRw8rDJfKEtc9Yh                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xe5cb0c6e0cd34a448012d0023bf0e74c3bc0fc4138f52dc97935d0a6b786afe3                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 206482967 )                                                                                    │
│  │ ObjectType: 0x2562e8676228628f4349754865f6f2d457e885997cba71fb7d764b8c53783a6a::cross::TokenVault             │
│  │ Version: 206482967                                                                                            │
│  │ Digest: Ag4orKC4543Rt1Fj693DHEmCBbTM5fegnQm713NBkh1U                                                          │
│  └──                                                                                                             │
│ Mutated Objects:                                                                                                 │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                 │
│  │ ObjectType: 0x2::coin::Coin<0x2::sui::SUI>                                                                    │
│  │ Version: 206482967                                                                                            │
│  │ Digest: 96d176AP4y8G1M9UypME9gK2FzQfMyywZZR6TeqHBjHd                                                          │
│  └──                                                                                                             │
│ Published Objects:                                                                                               │
│  ┌──                                                                                                             │
│  │ PackageID: 0x2562e8676228628f4349754865f6f2d457e885997cba71fb7d764b8c53783a6a                                 │
│  │ Version: 1                                                                                                    │
│  │ Digest: RZa3BWpWn4z6eFDcQkRhkKMCAeWM2KBhy642ot6V3jz                                                           │
│  │ Modules: admin, cross, oracle                                                                                 │
│  └──                                                                                                             │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Balance Changes                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──                                                                                              │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ CoinType: 0x2::sui::SUI                                                                        │
│  │ Amount: -94307480                                                                              │
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


