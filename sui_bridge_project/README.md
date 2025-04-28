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
  - `smg_mint<CoinType>(treasury_caps_registry: &mut TreasuryCapsRegistry, processed_tx: &mut ProcessedTransactions, oracle_storage: &oracle::OracleStorage, clock: &Clock, unique_id: vector<u8>, smg_id: vector<u8>, token_pair_id: u64, to_account: address, amount: u64, signature: vector<u8>, ctx: &mut TxContext)`: Mints tokens from cross-chain transfer
  - `smg_release<CoinType>(registry: &TokenPairRegistry, vault: &mut TokenVault, processed_tx: &mut ProcessedTransactions, oracle_storage: &oracle::OracleStorage, clock: &Clock, unique_id: vector<u8>, smg_id: vector<u8>, token_pair_id: u64, to_account: address, amount: u64, signature: vector<u8>, ctx: &mut TxContext)`: Releases locked tokens from cross-chain transfer

# Testnet Deployment

## Bridge 
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
Transaction Digest: 4JU3e72F14CPdwUvJSdWMntFGnKWSfK1UdfCygggnmFy
╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Data                                                                                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                   │
│ Gas Owner: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                │
│ Gas Budget: 90137200 MIST                                                                                    │
│ Gas Price: 1000 MIST                                                                                         │
│ Gas Payment:                                                                                                 │
│  ┌──                                                                                                         │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                    │
│  │ Version: 92611833                                                                                         │
│  │ Digest: 8g14fTMUAjX7CcyxhSqj3X4x84fv4sQZzvadcxEt4vLA                                                      │
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
│    KzknZweoo/pcIhnRlUJjCIitbgigGFly2LCNcXi/s0NS3TNru64SNHRrzzQ0WbJTti+mu7ANUK1NJFxyFK/0Dg==                  │
│                                                                                                              │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Effects                                                                               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Digest: 4JU3e72F14CPdwUvJSdWMntFGnKWSfK1UdfCygggnmFy                                              │
│ Status: Success                                                                                   │
│ Executed Epoch: 718                                                                               │
│                                                                                                   │
│ Created Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0x0c1146e58a78f7571b9401baaa8a8aab4803de1ce13ce4bd8667e52a77e469cb                         │
│  │ Owner: Shared( 92611834 )                                                                      │
│  │ Version: 92611834                                                                              │
│  │ Digest: 9qwh2qqcupQYueEtiXQR9E2MarnPNFJHnTirbWpFBjmu                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x1eb827def4d18898cb31361f76ff79f019485f647ab7285fbeffa689970c9750                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611834                                                                              │
│  │ Digest: BQJYrbhMpnWmt9kar6aZxc8BUpVhA8BFyqkF5qvBM27i                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x2ec040c645a5c089c2f256be8b7e9c12b56190c635016c3aacda9f2e238e6f43                         │
│  │ Owner: Immutable                                                                               │
│  │ Version: 1                                                                                     │
│  │ Digest: Cyj1HKoXgN1M2Uu1AXokNPFckYYbTnNzo5XPeaVcELGz                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x51c98babda309119f8916382d33cb97a88be519062a2852e219b2d8a10521cf0                         │
│  │ Owner: Shared( 92611834 )                                                                      │
│  │ Version: 92611834                                                                              │
│  │ Digest: 765vNraSvbK1gk79oFRD9FEVhtiDziVZC1XemmvYmBDU                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x9a041d94a8ab946b31bcbc0c28f6300e1a866841d6ee4995d2cab33be399819a                         │
│  │ Owner: Shared( 92611834 )                                                                      │
│  │ Version: 92611834                                                                              │
│  │ Digest: CKLfS3JckJ3VWf9mM6reJqLPaTrLbsKhRdUcB12ri2Zx                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xac799dce4341abed33505f7a5f33d9f988a85c9e74e3a58cd451c8683411425d                         │
│  │ Owner: Shared( 92611834 )                                                                      │
│  │ Version: 92611834                                                                              │
│  │ Digest: 5rkrvw7yH7SEs62Qc3dHxnwmSQ8LPKUpe5KhzJEt5gxX                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xb62d91a4fc4ba6087df2196032fd13cc1cba3c9a083b4891e2821162d8eccbde                         │
│  │ Owner: Shared( 92611834 )                                                                      │
│  │ Version: 92611834                                                                              │
│  │ Digest: BiXQDu6dd2njRhQrrhBsD7SZarocjs71uzH79DGce2gG                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xcf80b92311d5333a0444dc5bfcd79dcb3f1a8f47e34e42d75c3d5e1b3d8acfcb                         │
│  │ Owner: Shared( 92611834 )                                                                      │
│  │ Version: 92611834                                                                              │
│  │ Digest: 6Jirrz9QX7H7SRuyk7PAWwFPcD6BXDjF4ExCoj2b6P2y                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xf33f2a910133a4bc3c303ebc22e90d98af5e2729d259148428902c789337aa8b                         │
│  │ Owner: Shared( 92611834 )                                                                      │
│  │ Version: 92611834                                                                              │
│  │ Digest: J5UMng54zpunSPV43UchL4cuqdAeSx9PZ9ApxGiwBqVg                                           │
│  └──                                                                                              │
│ Mutated Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611834                                                                              │
│  │ Digest: CsJ3BtYhDcrVLZK3nuHdo9jv9zvruj6mq76eX2nbez9p                                           │
│  └──                                                                                              │
│ Gas Object:                                                                                       │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611834                                                                              │
│  │ Digest: CsJ3BtYhDcrVLZK3nuHdo9jv9zvruj6mq76eX2nbez9p                                           │
│  └──                                                                                              │
│ Gas Cost Summary:                                                                                 │
│    Storage Cost: 88137200 MIST                                                                    │
│    Computation Cost: 1000000 MIST                                                                 │
│    Storage Rebate: 978120 MIST                                                                    │
│    Non-refundable Storage Fee: 9880 MIST                                                          │
│                                                                                                   │
│ Transaction Dependencies:                                                                         │
│    2KKFDYfXCwBWaS1e3i4gLnjW1DsQoWqYQMb4SVBZFQR2                                                   │
│    BpedZ3p9wAT4dDRRBiY5chGdZ38qGCeo9WX1PgHyWPFQ                                                   │
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
│  │ ObjectID: 0x0c1146e58a78f7571b9401baaa8a8aab4803de1ce13ce4bd8667e52a77e469cb                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611834 )                                                                                     │
│  │ ObjectType: 0x2ec040c645a5c089c2f256be8b7e9c12b56190c635016c3aacda9f2e238e6f43::cross::TokenVault             │
│  │ Version: 92611834                                                                                             │
│  │ Digest: 9qwh2qqcupQYueEtiXQR9E2MarnPNFJHnTirbWpFBjmu                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x1eb827def4d18898cb31361f76ff79f019485f647ab7285fbeffa689970c9750                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                 │
│  │ ObjectType: 0x2::package::UpgradeCap                                                                          │
│  │ Version: 92611834                                                                                             │
│  │ Digest: BQJYrbhMpnWmt9kar6aZxc8BUpVhA8BFyqkF5qvBM27i                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x51c98babda309119f8916382d33cb97a88be519062a2852e219b2d8a10521cf0                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611834 )                                                                                     │
│  │ ObjectType: 0x2ec040c645a5c089c2f256be8b7e9c12b56190c635016c3aacda9f2e238e6f43::cross::ProcessedTransactions  │
│  │ Version: 92611834                                                                                             │
│  │ Digest: 765vNraSvbK1gk79oFRD9FEVhtiDziVZC1XemmvYmBDU                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x9a041d94a8ab946b31bcbc0c28f6300e1a866841d6ee4995d2cab33be399819a                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611834 )                                                                                     │
│  │ ObjectType: 0x2ec040c645a5c089c2f256be8b7e9c12b56190c635016c3aacda9f2e238e6f43::admin::Admin                  │
│  │ Version: 92611834                                                                                             │
│  │ Digest: CKLfS3JckJ3VWf9mM6reJqLPaTrLbsKhRdUcB12ri2Zx                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xac799dce4341abed33505f7a5f33d9f988a85c9e74e3a58cd451c8683411425d                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611834 )                                                                                     │
│  │ ObjectType: 0x2ec040c645a5c089c2f256be8b7e9c12b56190c635016c3aacda9f2e238e6f43::cross::FoundationConfig       │
│  │ Version: 92611834                                                                                             │
│  │ Digest: 5rkrvw7yH7SEs62Qc3dHxnwmSQ8LPKUpe5KhzJEt5gxX                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xb62d91a4fc4ba6087df2196032fd13cc1cba3c9a083b4891e2821162d8eccbde                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611834 )                                                                                     │
│  │ ObjectType: 0x2ec040c645a5c089c2f256be8b7e9c12b56190c635016c3aacda9f2e238e6f43::cross::TreasuryCapsRegistry   │
│  │ Version: 92611834                                                                                             │
│  │ Digest: BiXQDu6dd2njRhQrrhBsD7SZarocjs71uzH79DGce2gG                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xcf80b92311d5333a0444dc5bfcd79dcb3f1a8f47e34e42d75c3d5e1b3d8acfcb                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611834 )                                                                                     │
│  │ ObjectType: 0x2ec040c645a5c089c2f256be8b7e9c12b56190c635016c3aacda9f2e238e6f43::cross::TokenPairRegistry      │
│  │ Version: 92611834                                                                                             │
│  │ Digest: 6Jirrz9QX7H7SRuyk7PAWwFPcD6BXDjF4ExCoj2b6P2y                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xf33f2a910133a4bc3c303ebc22e90d98af5e2729d259148428902c789337aa8b                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611834 )                                                                                     │
│  │ ObjectType: 0x2ec040c645a5c089c2f256be8b7e9c12b56190c635016c3aacda9f2e238e6f43::oracle::OracleStorage         │
│  │ Version: 92611834                                                                                             │
│  │ Digest: J5UMng54zpunSPV43UchL4cuqdAeSx9PZ9ApxGiwBqVg                                                          │
│  └──                                                                                                             │
│ Mutated Objects:                                                                                                 │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                 │
│  │ ObjectType: 0x2::coin::Coin<0x2::sui::SUI>                                                                    │
│  │ Version: 92611834                                                                                             │
│  │ Digest: CsJ3BtYhDcrVLZK3nuHdo9jv9zvruj6mq76eX2nbez9p                                                          │
│  └──                                                                                                             │
│ Published Objects:                                                                                               │
│  ┌──                                                                                                             │
│  │ PackageID: 0x2ec040c645a5c089c2f256be8b7e9c12b56190c635016c3aacda9f2e238e6f43                                 │
│  │ Version: 1                                                                                                    │
│  │ Digest: Cyj1HKoXgN1M2Uu1AXokNPFckYYbTnNzo5XPeaVcELGz                                                          │
│  │ Modules: admin, cross, oracle                                                                                 │
│  └──                                                                                                             │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Balance Changes                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──                                                                                              │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ CoinType: 0x2::sui::SUI                                                                        │
│  │ Amount: -88159080                                                                              │
│  └──                                                                                              │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
```
## Wrapped USDT
```
Transaction Digest: 2cLbPjo54XoP6kxJv5DTynrKCroqRjgpapF4NQYzZBHH
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
│  │ Version: 92611834                                                                                         │
│  │ Digest: CsJ3BtYhDcrVLZK3nuHdo9jv9zvruj6mq76eX2nbez9p                                                      │
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
│    ibNmj7bOM/PDlG5zkuEV4wiHp1MGTtu+qLs+nhC6/lGZrcWLza3B4pVG7VDsMjNxifFzbsH5fSlXYzsHSGpMAA==                  │
│                                                                                                              │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Effects                                                                               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Digest: 2cLbPjo54XoP6kxJv5DTynrKCroqRjgpapF4NQYzZBHH                                              │
│ Status: Success                                                                                   │
│ Executed Epoch: 718                                                                               │
│                                                                                                   │
│ Created Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0x3351bc1cb73fbd88d0946b7d184076fc37a578dc281a6daef8cefd05b88cb759                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611835                                                                              │
│  │ Digest: 5L6NmjG7Az3LPag26mjwHdC2rbVfP7sQvvWjCmsXFEv4                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x396ebe1fdaef1403d39674349044df2203e9183f7137cf5723cd554dcdbb1670                         │
│  │ Owner: Immutable                                                                               │
│  │ Version: 1                                                                                     │
│  │ Digest: 3Cx9X7wRif4jRFJKmFWDd1r8jpqFQpAC4fHKFwEEd61L                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xb067144991d736e596d477d673f91fb1d1e315c19a600019b67f6cef60e8841a                         │
│  │ Owner: Shared( 92611835 )                                                                      │
│  │ Version: 92611835                                                                              │
│  │ Digest: DYFzURGYaN7XDeZyCF3LbWh7PuNZKgCuECAqFnokXtkB                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xc43de7f151dd61cbdd1404dd29e767aae5ad9003c9aeffa5512ce12cf7b527d9                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611835                                                                              │
│  │ Digest: CWWMd4trrJX6zkS17MdbKqsZdpR61vM7Qm451bsLpvDQ                                           │
│  └──                                                                                              │
│ Mutated Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611835                                                                              │
│  │ Digest: 5bbx8YbSh6NhyUjR5uDykXavn39yAugcNr1rMsWg6Si7                                           │
│  └──                                                                                              │
│ Gas Object:                                                                                       │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611835                                                                              │
│  │ Digest: 5bbx8YbSh6NhyUjR5uDykXavn39yAugcNr1rMsWg6Si7                                           │
│  └──                                                                                              │
│ Gas Cost Summary:                                                                                 │
│    Storage Cost: 13581200 MIST                                                                    │
│    Computation Cost: 1000000 MIST                                                                 │
│    Storage Rebate: 978120 MIST                                                                    │
│    Non-refundable Storage Fee: 9880 MIST                                                          │
│                                                                                                   │
│ Transaction Dependencies:                                                                         │
│    2KKFDYfXCwBWaS1e3i4gLnjW1DsQoWqYQMb4SVBZFQR2                                                   │
│    4JU3e72F14CPdwUvJSdWMntFGnKWSfK1UdfCygggnmFy                                                   │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
╭─────────────────────────────╮
│ No transaction block events │
╰─────────────────────────────╯

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                                                                        │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0x3351bc1cb73fbd88d0946b7d184076fc37a578dc281a6daef8cefd05b88cb759                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                        │
│  │ ObjectType: 0x2::package::UpgradeCap                                                                                 │
│  │ Version: 92611835                                                                                                    │
│  │ Digest: 5L6NmjG7Az3LPag26mjwHdC2rbVfP7sQvvWjCmsXFEv4                                                                 │
│  └──                                                                                                                    │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0xb067144991d736e596d477d673f91fb1d1e315c19a600019b67f6cef60e8841a                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Shared( 92611835 )                                                                                            │
│  │ ObjectType: 0x2::coin::CoinMetadata<0x396ebe1fdaef1403d39674349044df2203e9183f7137cf5723cd554dcdbb1670::USDT::USDT>  │
│  │ Version: 92611835                                                                                                    │
│  │ Digest: DYFzURGYaN7XDeZyCF3LbWh7PuNZKgCuECAqFnokXtkB                                                                 │
│  └──                                                                                                                    │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0xc43de7f151dd61cbdd1404dd29e767aae5ad9003c9aeffa5512ce12cf7b527d9                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                        │
│  │ ObjectType: 0x2::coin::TreasuryCap<0x396ebe1fdaef1403d39674349044df2203e9183f7137cf5723cd554dcdbb1670::USDT::USDT>   │
│  │ Version: 92611835                                                                                                    │
│  │ Digest: CWWMd4trrJX6zkS17MdbKqsZdpR61vM7Qm451bsLpvDQ                                                                 │
│  └──                                                                                                                    │
│ Mutated Objects:                                                                                                        │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                        │
│  │ ObjectType: 0x2::coin::Coin<0x2::sui::SUI>                                                                           │
│  │ Version: 92611835                                                                                                    │
│  │ Digest: 5bbx8YbSh6NhyUjR5uDykXavn39yAugcNr1rMsWg6Si7                                                                 │
│  └──                                                                                                                    │
│ Published Objects:                                                                                                      │
│  ┌──                                                                                                                    │
│  │ PackageID: 0x396ebe1fdaef1403d39674349044df2203e9183f7137cf5723cd554dcdbb1670                                        │
│  │ Version: 1                                                                                                           │
│  │ Digest: 3Cx9X7wRif4jRFJKmFWDd1r8jpqFQpAC4fHKFwEEd61L                                                                 │
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


