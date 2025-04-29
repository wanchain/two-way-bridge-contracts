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
Transaction Digest: EtLn2f2yu261HSUqnA6j7ash6BmsRjPxopD7Vmpyna42
╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Data                                                                                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                   │
│ Gas Owner: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                │
│ Gas Budget: 94720000 MIST                                                                                    │
│ Gas Price: 1000 MIST                                                                                         │
│ Gas Payment:                                                                                                 │
│  ┌──                                                                                                         │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                    │
│  │ Version: 92611837                                                                                         │
│  │ Digest: EaWPrabN7yT5arbVYeGuZkjTdzhfUDyUeyunZABjx1ng                                                      │
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
│    jK6dEEQYxn2C5QEcDfZel55TOB19ooRgJ52Y5JAYZMjpwGWGrY6eIHVdPNpFrmCDmtf1CFGvF12PzBw4LGcFDg==                  │
│                                                                                                              │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Effects                                                                               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Digest: EtLn2f2yu261HSUqnA6j7ash6BmsRjPxopD7Vmpyna42                                              │
│ Status: Success                                                                                   │
│ Executed Epoch: 719                                                                               │
│                                                                                                   │
│ Created Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0x1393722a2f811d28dedae432f90761647dcbbf8b544c7634e83f1ae3466f2cb1                         │
│  │ Owner: Shared( 92611838 )                                                                      │
│  │ Version: 92611838                                                                              │
│  │ Digest: 3HEHNEfGjaXxZGmofWgru6kG2TnpJf7doJAChkmqbLwD                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x63eb5ffbf158f6808d2a9c544838c0773a4373a2d8fc27157bed4609607f22fa                         │
│  │ Owner: Shared( 92611838 )                                                                      │
│  │ Version: 92611838                                                                              │
│  │ Digest: 82rFL3TbhufzjUWgU3cwdTsB5HvDA4KnUn7ZbNfQBQqD                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x79c8d7780234edf6eb5847b643b6fdde59adc17ca475ce17dfc4539fc767b75a                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611838                                                                              │
│  │ Digest: AbFNbCHbwQ19yAooSRoFK1BNexggGAwNEsz21Rv8hjZp                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x9f434839a0331fda7e44f82e7b62064109d8e7afa2f46a163ecf44453f5521f6                         │
│  │ Owner: Shared( 92611838 )                                                                      │
│  │ Version: 92611838                                                                              │
│  │ Digest: 2in4NYPbMnDSvgNcCr8hhXMPxgbw4ZAZZZNGz2yLEjCZ                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xae3ac8f1f73d5e7a5212f97ea83238fcf8af8fc8c360d6322ff3720b4e71b156                         │
│  │ Owner: Shared( 92611838 )                                                                      │
│  │ Version: 92611838                                                                              │
│  │ Digest: 739jn1ab2nqLqc1gnxMbcQ2HbZhEsv5hZ2Wr4mgDPFaJ                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xbbafe6dfdf38bd570e401d4369a75a508c057a9a7f28373186374a4f598390e7                         │
│  │ Owner: Shared( 92611838 )                                                                      │
│  │ Version: 92611838                                                                              │
│  │ Digest: 7Viz69FMVHLLNhiNjccTGKwYLUBUyc1dJJ6FXott2kW2                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xbbeb5c24bb2f36682a75fcc6f031aff1df27dc2a874be8363330170f9dad86de                         │
│  │ Owner: Immutable                                                                               │
│  │ Version: 1                                                                                     │
│  │ Digest: GKfWmk9uYp5icrRKWwzgv5PNg169xzknWtEG8wWJXxAd                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xbc1041cbfae775f93c5825e49d742033fba716922a7f7fefde94272505b9f625                         │
│  │ Owner: Shared( 92611838 )                                                                      │
│  │ Version: 92611838                                                                              │
│  │ Digest: JA1AAmtdUix5V1qDrhLnbYZGxgxbCakcNYBUUVczkmJn                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xe34dee1de4926ced432ad2b692b608250130f91157c978a34062db3fc4fd2b76                         │
│  │ Owner: Shared( 92611838 )                                                                      │
│  │ Version: 92611838                                                                              │
│  │ Digest: 7yhuNGUCSNdfSJK616GbU6gmmtXqbUPw5d2h2v6hu6Lr                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xf46c548ef0271cac7bf0f0f29e29ee9295b953b140eeeb5f731ccd82ea18f83e                         │
│  │ Owner: Shared( 92611838 )                                                                      │
│  │ Version: 92611838                                                                              │
│  │ Digest: 4XHvfY3Nuy71j1WsZZAgk2ptE86AxzN8FQR18SmSbwcE                                           │
│  └──                                                                                              │
│ Mutated Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611838                                                                              │
│  │ Digest: HYbQE8P5wtsEhX4XGDJxUstPoaHtbVC7ad6azeSt2sNd                                           │
│  └──                                                                                              │
│ Gas Object:                                                                                       │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611838                                                                              │
│  │ Digest: HYbQE8P5wtsEhX4XGDJxUstPoaHtbVC7ad6azeSt2sNd                                           │
│  └──                                                                                              │
│ Gas Cost Summary:                                                                                 │
│    Storage Cost: 92720000 MIST                                                                    │
│    Computation Cost: 1000000 MIST                                                                 │
│    Storage Rebate: 978120 MIST                                                                    │
│    Non-refundable Storage Fee: 9880 MIST                                                          │
│                                                                                                   │
│ Transaction Dependencies:                                                                         │
│    2KKFDYfXCwBWaS1e3i4gLnjW1DsQoWqYQMb4SVBZFQR2                                                   │
│    CM657ZCTgd2LVzjo6DQQRJfVcyWzSZK8y5Wfi8PKoo4B                                                   │
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
│  │ ObjectID: 0x1393722a2f811d28dedae432f90761647dcbbf8b544c7634e83f1ae3466f2cb1                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611838 )                                                                                     │
│  │ ObjectType: 0xbbeb5c24bb2f36682a75fcc6f031aff1df27dc2a874be8363330170f9dad86de::cross::TokenVault             │
│  │ Version: 92611838                                                                                             │
│  │ Digest: 3HEHNEfGjaXxZGmofWgru6kG2TnpJf7doJAChkmqbLwD                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x63eb5ffbf158f6808d2a9c544838c0773a4373a2d8fc27157bed4609607f22fa                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611838 )                                                                                     │
│  │ ObjectType: 0xbbeb5c24bb2f36682a75fcc6f031aff1df27dc2a874be8363330170f9dad86de::oracle::OracleStorage         │
│  │ Version: 92611838                                                                                             │
│  │ Digest: 82rFL3TbhufzjUWgU3cwdTsB5HvDA4KnUn7ZbNfQBQqD                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x79c8d7780234edf6eb5847b643b6fdde59adc17ca475ce17dfc4539fc767b75a                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                 │
│  │ ObjectType: 0x2::package::UpgradeCap                                                                          │
│  │ Version: 92611838                                                                                             │
│  │ Digest: AbFNbCHbwQ19yAooSRoFK1BNexggGAwNEsz21Rv8hjZp                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0x9f434839a0331fda7e44f82e7b62064109d8e7afa2f46a163ecf44453f5521f6                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611838 )                                                                                     │
│  │ ObjectType: 0xbbeb5c24bb2f36682a75fcc6f031aff1df27dc2a874be8363330170f9dad86de::cross::FoundationConfig       │
│  │ Version: 92611838                                                                                             │
│  │ Digest: 2in4NYPbMnDSvgNcCr8hhXMPxgbw4ZAZZZNGz2yLEjCZ                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xae3ac8f1f73d5e7a5212f97ea83238fcf8af8fc8c360d6322ff3720b4e71b156                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611838 )                                                                                     │
│  │ ObjectType: 0xbbeb5c24bb2f36682a75fcc6f031aff1df27dc2a874be8363330170f9dad86de::cross::ProcessedTransactions  │
│  │ Version: 92611838                                                                                             │
│  │ Digest: 739jn1ab2nqLqc1gnxMbcQ2HbZhEsv5hZ2Wr4mgDPFaJ                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xbbafe6dfdf38bd570e401d4369a75a508c057a9a7f28373186374a4f598390e7                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611838 )                                                                                     │
│  │ ObjectType: 0xbbeb5c24bb2f36682a75fcc6f031aff1df27dc2a874be8363330170f9dad86de::cross::PauseConfig            │
│  │ Version: 92611838                                                                                             │
│  │ Digest: 7Viz69FMVHLLNhiNjccTGKwYLUBUyc1dJJ6FXott2kW2                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xbc1041cbfae775f93c5825e49d742033fba716922a7f7fefde94272505b9f625                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611838 )                                                                                     │
│  │ ObjectType: 0xbbeb5c24bb2f36682a75fcc6f031aff1df27dc2a874be8363330170f9dad86de::cross::TreasuryCapsRegistry   │
│  │ Version: 92611838                                                                                             │
│  │ Digest: JA1AAmtdUix5V1qDrhLnbYZGxgxbCakcNYBUUVczkmJn                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xe34dee1de4926ced432ad2b692b608250130f91157c978a34062db3fc4fd2b76                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611838 )                                                                                     │
│  │ ObjectType: 0xbbeb5c24bb2f36682a75fcc6f031aff1df27dc2a874be8363330170f9dad86de::admin::Admin                  │
│  │ Version: 92611838                                                                                             │
│  │ Digest: 7yhuNGUCSNdfSJK616GbU6gmmtXqbUPw5d2h2v6hu6Lr                                                          │
│  └──                                                                                                             │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xf46c548ef0271cac7bf0f0f29e29ee9295b953b140eeeb5f731ccd82ea18f83e                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Shared( 92611838 )                                                                                     │
│  │ ObjectType: 0xbbeb5c24bb2f36682a75fcc6f031aff1df27dc2a874be8363330170f9dad86de::cross::TokenPairRegistry      │
│  │ Version: 92611838                                                                                             │
│  │ Digest: 4XHvfY3Nuy71j1WsZZAgk2ptE86AxzN8FQR18SmSbwcE                                                          │
│  └──                                                                                                             │
│ Mutated Objects:                                                                                                 │
│  ┌──                                                                                                             │
│  │ ObjectID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                  │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                    │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                 │
│  │ ObjectType: 0x2::coin::Coin<0x2::sui::SUI>                                                                    │
│  │ Version: 92611838                                                                                             │
│  │ Digest: HYbQE8P5wtsEhX4XGDJxUstPoaHtbVC7ad6azeSt2sNd                                                          │
│  └──                                                                                                             │
│ Published Objects:                                                                                               │
│  ┌──                                                                                                             │
│  │ PackageID: 0x010f2a3728fbdaa6d72dcef01c50dc1736c9366b308889a4baade34c3f9cf77d                                 │
│  │ Version: 1                                                                                                    │
│  │ Digest: GKfWmk9uYp5icrRKWwzgv5PNg169xzknWtEG8wWJXxAd                                                          │
│  │ Modules: admin, cross, oracle                                                                                 │
│  └──                                                                                                             │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Balance Changes                                                                                   │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──                                                                                              │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ CoinType: 0x2::sui::SUI                                                                        │
│  │ Amount: -92741880                                                                              │
│  └──                                                                                              │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
```
## Wrapped USDT
```
Transaction Digest: 8KYGuubCxixo3brScxmL5PT2Ch8QLanwY2gkawLZj7e
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
│  │ Version: 92611838                                                                                         │
│  │ Digest: HYbQE8P5wtsEhX4XGDJxUstPoaHtbVC7ad6azeSt2sNd                                                      │
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
│    GX8meA+WiWNXZl3EnRaQLC6Rf9BWPFlMTlAg75wWFyCPKyXINwYtHMS7X8C4KUmLowPp5l+Tf4ZLNI6zHnnzDw==                  │
│                                                                                                              │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Effects                                                                               │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Digest: 8KYGuubCxixo3brScxmL5PT2Ch8QLanwY2gkawLZj7e                                               │
│ Status: Success                                                                                   │
│ Executed Epoch: 719                                                                               │
│                                                                                                   │
│ Created Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0x4ccd4d9c57fe473859c33cd5e4da7e2eb2a41b605d291882a1e672a49fabeb31                         │
│  │ Owner: Shared( 92611839 )                                                                      │
│  │ Version: 92611839                                                                              │
│  │ Digest: 97MzAv81MbxN9m2UyrbHzoTMbGiyhkdioWyopM62jvMJ                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0x55ca34a9be66e32b19c89efc52b41c3b65cab137efd17296cb6ece59212a6582                         │
│  │ Owner: Immutable                                                                               │
│  │ Version: 1                                                                                     │
│  │ Digest: AwnAYjL1Wwye5ZmrKFfpmPvEGH9GotsojpeChSmn2nQ                                            │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xc13e504523d08aab6189ac098e624841fb9d8eb512bb4ab3b5994b1180575cf4                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611839                                                                              │
│  │ Digest: E8bmfLc6R14pNWqkW7hFS4KtvoJBXWVswU7mYYSNfEEL                                           │
│  └──                                                                                              │
│  ┌──                                                                                              │
│  │ ID: 0xc8b34969ead0713e9880be5943a4d667ca4b0f7b488a244539bbf387ce0c6184                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611839                                                                              │
│  │ Digest: HR6XNAbpLCp7ZjiNkMq3XPG9MwoeLBTf5uvsnu3kDYfz                                           │
│  └──                                                                                              │
│ Mutated Objects:                                                                                  │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611839                                                                              │
│  │ Digest: GDedaeLy9D3Riqbgk1MXHm4gLSYxqz6NY3TYWzYo7i4G                                           │
│  └──                                                                                              │
│ Gas Object:                                                                                       │
│  ┌──                                                                                              │
│  │ ID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                         │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )  │
│  │ Version: 92611839                                                                              │
│  │ Digest: GDedaeLy9D3Riqbgk1MXHm4gLSYxqz6NY3TYWzYo7i4G                                           │
│  └──                                                                                              │
│ Gas Cost Summary:                                                                                 │
│    Storage Cost: 13581200 MIST                                                                    │
│    Computation Cost: 1000000 MIST                                                                 │
│    Storage Rebate: 978120 MIST                                                                    │
│    Non-refundable Storage Fee: 9880 MIST                                                          │
│                                                                                                   │
│ Transaction Dependencies:                                                                         │
│    2KKFDYfXCwBWaS1e3i4gLnjW1DsQoWqYQMb4SVBZFQR2                                                   │
│    EtLn2f2yu261HSUqnA6j7ash6BmsRjPxopD7Vmpyna42                                                   │
╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
╭─────────────────────────────╮
│ No transaction block events │
╰─────────────────────────────╯

╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                                                                        │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0x4ccd4d9c57fe473859c33cd5e4da7e2eb2a41b605d291882a1e672a49fabeb31                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Shared( 92611839 )                                                                                            │
│  │ ObjectType: 0x2::coin::CoinMetadata<0x55ca34a9be66e32b19c89efc52b41c3b65cab137efd17296cb6ece59212a6582::USDT::USDT>  │
│  │ Version: 92611839                                                                                                    │
│  │ Digest: 97MzAv81MbxN9m2UyrbHzoTMbGiyhkdioWyopM62jvMJ                                                                 │
│  └──                                                                                                                    │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0xc13e504523d08aab6189ac098e624841fb9d8eb512bb4ab3b5994b1180575cf4                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                        │
│  │ ObjectType: 0x2::coin::TreasuryCap<0x55ca34a9be66e32b19c89efc52b41c3b65cab137efd17296cb6ece59212a6582::USDT::USDT>   │
│  │ Version: 92611839                                                                                                    │
│  │ Digest: E8bmfLc6R14pNWqkW7hFS4KtvoJBXWVswU7mYYSNfEEL                                                                 │
│  └──                                                                                                                    │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0xc8b34969ead0713e9880be5943a4d667ca4b0f7b488a244539bbf387ce0c6184                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                        │
│  │ ObjectType: 0x2::package::UpgradeCap                                                                                 │
│  │ Version: 92611839                                                                                                    │
│  │ Digest: HR6XNAbpLCp7ZjiNkMq3XPG9MwoeLBTf5uvsnu3kDYfz                                                                 │
│  └──                                                                                                                    │
│ Mutated Objects:                                                                                                        │
│  ┌──                                                                                                                    │
│  │ ObjectID: 0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6                                         │
│  │ Sender: 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc                                           │
│  │ Owner: Account Address ( 0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc )                        │
│  │ ObjectType: 0x2::coin::Coin<0x2::sui::SUI>                                                                           │
│  │ Version: 92611839                                                                                                    │
│  │ Digest: GDedaeLy9D3Riqbgk1MXHm4gLSYxqz6NY3TYWzYo7i4G                                                                 │
│  └──                                                                                                                    │
│ Published Objects:                                                                                                      │
│  ┌──                                                                                                                    │
│  │ PackageID: 0x55ca34a9be66e32b19c89efc52b41c3b65cab137efd17296cb6ece59212a6582                                        │
│  │ Version: 1                                                                                                           │
│  │ Digest: AwnAYjL1Wwye5ZmrKFfpmPvEGH9GotsojpeChSmn2nQ                                                                  │
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


