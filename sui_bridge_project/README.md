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
{
  "objectChanges": [
    {
      "type": "mutated",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "AddressOwner": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc"
      },
      "objectType": "0x2::coin::Coin<0x2::sui::SUI>",
      "objectId": "0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6",
      "version": "92611846",
      "previousVersion": "92611845",
      "digest": "uecXphwB19TtFpYxzNtMdUo9SDf2dRzKa3c8Vc9VcZH"
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "Shared": {
          "initial_shared_version": 92611846
        }
      },
      "objectType": "0x0ead8f7257ade37b0e739786b51405f9def1c8ac35644a8d79dad5df7f256d4e::cross::TreasuryCapsRegistry",
      "objectId": "0x00c6abd2bedc2fcb5d58f014faf540c38fde705b00bb4387df3d251652693525",
      "version": "92611846",
      "digest": "CMR2ikD8sSVwowWGo1GTzP1wuHLdDEDQvttSm8rZAVV8"
    },
    {
      "type": "published",
      "packageId": "0x0ead8f7257ade37b0e739786b51405f9def1c8ac35644a8d79dad5df7f256d4e",
      "version": "1",
      "digest": "CLegpNw94HRA7DBPYpHccjJN98DCo8A34QKV5YJ9PXrW",
      "modules": [
        "admin",
        "cross",
        "oracle"
      ]
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "Shared": {
          "initial_shared_version": 92611846
        }
      },
      "objectType": "0x0ead8f7257ade37b0e739786b51405f9def1c8ac35644a8d79dad5df7f256d4e::cross::TokenPairRegistry",
      "objectId": "0x2d3c0fd157af92224a39226316b19a96ed2c89083b80858f8aa9b6628476c8f5",
      "version": "92611846",
      "digest": "EWAXggH3k5t5LzYxFZDZKJRVB3GV5SceCjaQRjaXhbdH"
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "Shared": {
          "initial_shared_version": 92611846
        }
      },
      "objectType": "0x0ead8f7257ade37b0e739786b51405f9def1c8ac35644a8d79dad5df7f256d4e::oracle::OracleStorage",
      "objectId": "0x315c7aad1da447b91b3ff10b932c6c864fac9a65207f2518b96524a20cb607ea",
      "version": "92611846",
      "digest": "6p3vyYHY6Tj19Yqf6eSv8aPq42DjVyadC949TZPt5jAk"
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "Shared": {
          "initial_shared_version": 92611846
        }
      },
      "objectType": "0x0ead8f7257ade37b0e739786b51405f9def1c8ac35644a8d79dad5df7f256d4e::cross::TokenVault",
      "objectId": "0x500ddd6e867b99061d2530a258d15803e2a5f3acda3b17a1a08da802360e6724",
      "version": "92611846",
      "digest": "AT7ZDcepdpKDN5i7zuiJVHAwYrmcLw9qpe9XNRzTaHMA"
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "AddressOwner": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc"
      },
      "objectType": "0x2::package::UpgradeCap",
      "objectId": "0x6f7829a5a8b68883cbf86fbc3e4d359d5729a4d6f72a9f5800d0dd28fb5ccc3f",
      "version": "92611846",
      "digest": "Aw7QgqmXAco9CWH3U76oUnswFLPWkVSuFvntA5F4oMBq"
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "Shared": {
          "initial_shared_version": 92611846
        }
      },
      "objectType": "0x0ead8f7257ade37b0e739786b51405f9def1c8ac35644a8d79dad5df7f256d4e::cross::ProcessedTransactions",
      "objectId": "0x8423ce9b19c9acb0655aec3f112b9c35765d20806106d9516a1e22d64a466169",
      "version": "92611846",
      "digest": "3L8YrWPsY4fCAeAnTMGkx9ZutVyeztrQBPByB6TamxSJ"
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "Shared": {
          "initial_shared_version": 92611846
        }
      },
      "objectType": "0x0ead8f7257ade37b0e739786b51405f9def1c8ac35644a8d79dad5df7f256d4e::admin::Admin",
      "objectId": "0x952ced01393c3beb3e14894b69f90a570a7463f8db8519f3c70c8391cc0ce96c",
      "version": "92611846",
      "digest": "E6xANhxR984B1rQ6hLJRfsbzXBDWpdLqLemodec3zpEd"
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "Shared": {
          "initial_shared_version": 92611846
        }
      },
      "objectType": "0x0ead8f7257ade37b0e739786b51405f9def1c8ac35644a8d79dad5df7f256d4e::cross::FoundationConfig",
      "objectId": "0x9bc66b16165eb1dc086aef070ad5cd92fa30fb0d68637f00481b603a6b1e16fb",
      "version": "92611846",
      "digest": "4QBokUmATohf8kZ45F6B1QtVihx1PSL2XAgo7JFnNrHg"
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "Shared": {
          "initial_shared_version": 92611846
        }
      },
      "objectType": "0x0ead8f7257ade37b0e739786b51405f9def1c8ac35644a8d79dad5df7f256d4e::cross::PauseConfig",
      "objectId": "0xbf09d327183d4507346aa45cdc461290d5218aeb38d8e9ee2edc4bb73660bc61",
      "version": "92611846",
      "digest": "2BzZ7zM5SArsYfsbv3zUJWoHvg14cZqqQn3qReLe6ifT"
    }
  ],
  "balanceChanges": [
    {
      "owner": {
        "AddressOwner": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc"
      },
      "coinType": "0x2::sui::SUI",
      "amount": "-92696280"
    }
  ],
  "timestampMs": "1745983378358",
  "confirmedLocalExecution": true,
  "checkpoint": "190376422"
}
```

FeeConfig Object: 
  - 0x5273632246b772b26a1c48692c97a77d0dcafe0bcc87d601073c2961b7cf8338 (Shared)

## Wrapped USDT
```
{
  "objectChanges": [
    {
      "type": "mutated",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "AddressOwner": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc"
      },
      "objectType": "0x2::coin::Coin<0x2::sui::SUI>",
      "objectId": "0xc2eb13432bf1f88615a279a8304ba079eb8ddb8a3de14af26b439129cdcabaa6",
      "version": "92611847",
      "previousVersion": "92611846",
      "digest": "EZKuM19KwV2nsAAdrQ9ghZTb1AuSjtzoieMFpefZwL5d"
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "AddressOwner": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc"
      },
      "objectType": "0x2::package::UpgradeCap",
      "objectId": "0x4b6ef4c75948d13a31ef1e600f9b5caf5a49ad0cbaf6f18de778bd6c1379c570",
      "version": "92611847",
      "digest": "4kNfPtDPSUJKimBCdybmxVjAPc6o66jt5d43XJWzf1EX"
    },
    {
      "type": "published",
      "packageId": "0x8342ade816437f9c891591d2dba5b4fcd5d375d3a156bf518634dcaa4071b1e0",
      "version": "1",
      "digest": "79GZaizkJNLN9o6ABnnqxRQRtJfoc15ZDkeni9KHbtZz",
      "modules": [
        "USDT"
      ]
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "Shared": {
          "initial_shared_version": 92611847
        }
      },
      "objectType": "0x2::coin::CoinMetadata<0x8342ade816437f9c891591d2dba5b4fcd5d375d3a156bf518634dcaa4071b1e0::USDT::USDT>",
      "objectId": "0x9600774569e32afaf08f09e6ffdd9689e74b31bfeb7229c645a0d6548310396b",
      "version": "92611847",
      "digest": "7p38PqTpQZ6x2SpUdsQnMcbrk4sQxUoYkV3pKure4Zkt"
    },
    {
      "type": "created",
      "sender": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc",
      "owner": {
        "AddressOwner": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc"
      },
      "objectType": "0x2::coin::TreasuryCap<0x8342ade816437f9c891591d2dba5b4fcd5d375d3a156bf518634dcaa4071b1e0::USDT::USDT>",
      "objectId": "0xa96aa3758c31fffbfcabc61aa186c1ec01c23d35713fb1af915a61f21d3637cf",
      "version": "92611847",
      "digest": "E3CzNHmWAP62Gi1gAX914Rq21WCRm4c1oGE11JMT7WPX"
    }
  ],
  "balanceChanges": [
    {
      "owner": {
        "AddressOwner": "0x09212c719c1c62cd75a33a1cd70f34468b6096a26179f9e943621953168adbfc"
      },
      "coinType": "0x2::sui::SUI",
      "amount": "-13603080"
    }
  ],
  "timestampMs": "1745983536554",
  "confirmedLocalExecution": true,
  "checkpoint": "190377112"
}

```


