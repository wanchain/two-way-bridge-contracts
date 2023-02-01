/*

  Copyright 2022 Wanchain Foundation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

//                            _           _           _
//  __      ____ _ _ __   ___| |__   __ _(_)_ __   __| | _____   __
//  \ \ /\ / / _` | '_ \ / __| '_ \ / _` | | '_ \@/ _` |/ _ \ \ / /
//   \ V  V / (_| | | | | (__| | | | (_| | | | | | (_| |  __/\ V /
//    \_/\_/ \__,_|_| |_|\___|_| |_|\__,_|_|_| |_|\__,_|\___| \_/
//
//

module BridgeDeployer::TokenManager {
    use std::signer;
    use aptos_std::table;
    use std::error;
    use std::string;
    use aptos_framework::account::{Self, SignerCapability};
    use aptos_framework::coin::{Self, MintCapability, FreezeCapability, BurnCapability};
    use aptos_std::event::{Self, EventHandle};
    
    use BridgeDeployer::ResourceAccount;
    use ResourceAccountDeployer::WrappedCoinV1::WrappedCoin;

    friend BridgeDeployer::Cross;

    struct AncestorInfo has store, drop, copy {
        account: vector<u8>,
        name: vector<u8>,
        symbol: vector<u8>,
        decimals: u8,
        chainID: u64,
    }

    struct TokenPairInfo has store, drop, copy {
        aInfo: AncestorInfo,
        fromChainID: u64,
        fromAccount: vector<u8>,
        toChainID: u64,
        toAccount: vector<u8>,
    }

    /// Account has no capabilities (admin/burn/mint).
    const ENO_CAPABILITIES: u64 = 1;

    struct TokenManager has key, store {
        tokenPairs: table::Table<u64, TokenPairInfo>,
        tokenPairsType: table::Table<u64, u8>,
        admin: address,
        operator: address,
        add_token_pair_events: EventHandle<AddTokenPairEvent>,
        update_token_pair_events: EventHandle<UpdateTokenPairEvent>,
        remove_token_pair_events: EventHandle<RemoveTokenPairEvent>,
    }

    // save into resource_account
    struct AdminData has key {
        signer_cap: SignerCapability,
    }

    // save into resource_account
    struct WrappedInfo<phantom CoinBase> has key {
        mint_cap: MintCapability<WrappedCoin<CoinBase>>,
        freeze_cap: FreezeCapability<WrappedCoin<CoinBase>>,
        burn_cap: BurnCapability<WrappedCoin<CoinBase>>,
    }

    struct AddTokenPairEvent has drop, store {
        id: u64,
        info: TokenPairInfo,
    }

    struct UpdateTokenPairEvent has drop, store {
        id: u64,
        info: TokenPairInfo,
    }

    struct RemoveTokenPairEvent has drop, store {
        id: u64,
        info: TokenPairInfo,
    }

    const DEPLOYER_ADDRESS: address = @BridgeDeployer;
    const RESOURCE_ACCOUNT_ADDRESS: address = @ResourceAccountDeployer;

    const ERR_WRAPPED_COIN_ALREADY_EXIST: u64 = 1;
    const ERR_COIN_NOT_REGISTERED: u64 = 2;

    fun init_module(sender: &signer) {
        internal_init(sender);
    }

    fun internal_init(sender: &signer) {
        let account_addr = signer::address_of(sender);
        move_to<TokenManager>(
            sender,
            TokenManager { 
                tokenPairs: table::new<u64, TokenPairInfo>(), 
                tokenPairsType: table::new<u64, u8>(), 
                admin: account_addr,
                operator: @0x0,
                add_token_pair_events: account::new_event_handle<AddTokenPairEvent>(sender),
                update_token_pair_events: account::new_event_handle<UpdateTokenPairEvent>(sender),
                remove_token_pair_events: account::new_event_handle<RemoveTokenPairEvent>(sender),
            },
        );

        // transfer back signer_cap to resource address
        let signer_cap = ResourceAccount::retrieve_signer_cap(sender);
        let resource_account = &account::create_signer_with_capability(&signer_cap);
        move_to(resource_account, AdminData { signer_cap });
    }

    fun only_admin(account: &signer) acquires TokenManager {
        let account_addr = signer::address_of(account);
        let data = borrow_global<TokenManager>(@BridgeDeployer);
        assert!(account_addr == data.admin, error::permission_denied(ENO_CAPABILITIES));
    }

    fun only_operator(account: &signer) acquires TokenManager {
        let account_addr = signer::address_of(account);
        let data = borrow_global<TokenManager>(@BridgeDeployer);
        assert!(account_addr == data.operator, error::permission_denied(ENO_CAPABILITIES));
    }

    public entry fun add_token_pair(
        account: &signer, 
        id: u64, 
        ancestor_account: vector<u8>,
        ancestor_name: vector<u8>,
        ancestor_symbol: vector<u8>,
        ancestor_decimals: u8,
        ancestor_chainID: u64, 
        fromChainID: u64, 
        fromAccount: vector<u8>, 
        toChainID: u64, 
        toAccount: vector<u8>
    ) acquires TokenManager {
        only_admin(account);
        
        let manager = borrow_global_mut<TokenManager>(@BridgeDeployer);

        table::add<u64, TokenPairInfo>(&mut manager.tokenPairs, id, TokenPairInfo {
            aInfo: AncestorInfo {
                account: ancestor_account,
                name: ancestor_name,
                symbol: ancestor_symbol,
                decimals: ancestor_decimals,
                chainID: ancestor_chainID,
            },
            fromChainID,
            fromAccount,
            toChainID,
            toAccount,
        });

        event::emit_event<AddTokenPairEvent>(
            &mut manager.add_token_pair_events,
            AddTokenPairEvent { 
                id: id,
                info: TokenPairInfo {
                    aInfo: AncestorInfo {
                        account: ancestor_account,
                        name: ancestor_name,
                        symbol: ancestor_symbol,
                        decimals: ancestor_decimals,
                        chainID: ancestor_chainID,
                    },
                    fromChainID,
                    fromAccount,
                    toChainID,
                    toAccount,
                }
            },
        );
    }

    public entry fun update_token_pair(
        account: &signer, 
        id: u64, 
        ancestor_account: vector<u8>,
        ancestor_name: vector<u8>,
        ancestor_symbol: vector<u8>,
        ancestor_decimals: u8,
        ancestor_chainID: u64, 
        fromChainID: u64, 
        fromAccount: vector<u8>, 
        toChainID: u64, 
        toAccount: vector<u8>
    ) acquires TokenManager {
        only_admin(account);

        let manager = borrow_global_mut<TokenManager>(@BridgeDeployer);

        let val = table::borrow_mut<u64, TokenPairInfo>(&mut manager.tokenPairs, id);
        val.aInfo = AncestorInfo {
            account: ancestor_account,
            name: ancestor_name,
            symbol: ancestor_symbol,
            decimals: ancestor_decimals,
            chainID: ancestor_chainID,
        };
        val.fromChainID = fromChainID;
        val.fromAccount = fromAccount;
        val.toChainID = toChainID;
        val.toAccount = toAccount;

        event::emit_event<UpdateTokenPairEvent>(
            &mut manager.update_token_pair_events,
            UpdateTokenPairEvent { 
                id: id,
                info: TokenPairInfo {
                    aInfo: AncestorInfo {
                        account: ancestor_account,
                        name: ancestor_name,
                        symbol: ancestor_symbol,
                        decimals: ancestor_decimals,
                        chainID: ancestor_chainID,
                    },
                    fromChainID,
                    fromAccount,
                    toChainID,
                    toAccount,
                }
            },
        );
    }

    public entry fun remove_token_pair(account: &signer, id: u64) acquires TokenManager {
        only_admin(account);

        let manager = borrow_global_mut<TokenManager>(@BridgeDeployer);

        let info = table::remove<u64, TokenPairInfo>(&mut manager.tokenPairs, id);
        
        event::emit_event<RemoveTokenPairEvent>(
            &mut manager.remove_token_pair_events,
            RemoveTokenPairEvent { 
                id: id,
                info,
            },
        );
    }

    // returns: fromChainID, fromAccount, toChainID, toAccount
    public fun get_token_pair(id: u64): (u64, vector<u8>, u64, vector<u8>) acquires TokenManager {
        let manager = borrow_global<TokenManager>(@BridgeDeployer);
        let val = table::borrow<u64, TokenPairInfo>(&manager.tokenPairs, id);
        (val.fromChainID, val.fromAccount, val.toChainID, val.toAccount)
    }

    public entry fun set_operator(account: &signer, op: address) acquires TokenManager {
        only_admin(account);
        
        let manager = borrow_global_mut<TokenManager>(@BridgeDeployer);
        manager.operator = op;
    }

    public entry fun set_admin(account: &signer, admin: address) acquires TokenManager {
        only_admin(account);
        
        let manager = borrow_global_mut<TokenManager>(@BridgeDeployer);
        manager.admin = admin;
    }

    public entry fun set_token_pair_type(account: &signer, id: u64, type: u8) acquires TokenManager {
        only_operator(account);
        
        let manager = borrow_global_mut<TokenManager>(@BridgeDeployer);

        table::add<u64, u8>(&mut manager.tokenPairsType, id, type);
    }

    public fun get_token_pair_type(id: u64): u8 acquires TokenManager {
        let manager = borrow_global<TokenManager>(@BridgeDeployer);
        if (!table::contains<u64, u8>(&manager.tokenPairsType, id)) {
            0u8
        } else {
            *table::borrow<u64, u8>(&manager.tokenPairsType, id)
        }
    }

    // register coin if not registered
    public fun register_coin<CoinType>(
        account: &signer
    ) {
        let account_addr = signer::address_of(account);
        if (!coin::is_account_registered<CoinType>(account_addr)) {
            coin::register<CoinType>(account);
        };
    }

    /// return pair admin account signer
    fun get_resource_account_signer(): signer acquires AdminData {
        let signer_cap = &borrow_global<AdminData>(RESOURCE_ACCOUNT_ADDRESS).signer_cap;
        account::create_signer_with_capability(signer_cap)
    }

    public entry fun create_wrapped_coin<CoinBase>(_account: &signer, name: vector<u8>, symbol: vector<u8>) acquires AdminData {
        assert!(!exists<WrappedInfo<CoinBase>>(RESOURCE_ACCOUNT_ADDRESS), ERR_WRAPPED_COIN_ALREADY_EXIST);
        let resource_account_signer = get_resource_account_signer();
        let (lp_b, lp_f, lp_m) = coin::initialize<WrappedCoin<CoinBase>>(&resource_account_signer, string::utf8(name), string::utf8(symbol), 8, true);
        register_coin<WrappedCoin<CoinBase>>(&resource_account_signer);
        move_to(&resource_account_signer, WrappedInfo<CoinBase> {
            burn_cap: lp_b,
            freeze_cap: lp_f,
            mint_cap: lp_m,
        });
    }

    public(friend) fun mint_wrapped_coin<CoinBase>(to: address, amount: u64) acquires WrappedInfo {
        let caps = borrow_global<WrappedInfo<CoinBase>>(RESOURCE_ACCOUNT_ADDRESS);
        let coin = coin::mint<WrappedCoin<CoinBase>>(amount, &caps.mint_cap);
        coin::deposit<WrappedCoin<CoinBase>>(to, coin);
    }

    public(friend) fun burn_wrapped_coin<CoinBase>(account: &signer, amount: u64) acquires WrappedInfo {
        let caps = borrow_global<WrappedInfo<CoinBase>>(RESOURCE_ACCOUNT_ADDRESS);
        let account_addr = signer::address_of(account);
        coin::burn_from<WrappedCoin<CoinBase>>(account_addr, amount, &caps.burn_cap);
    }

    public(friend) fun lock_coin<CoinType>(account: &signer, amount: u64) acquires AdminData {
        let resource_account_signer = get_resource_account_signer();
        register_coin<CoinType>(&resource_account_signer);
        coin::transfer<CoinType>(account, RESOURCE_ACCOUNT_ADDRESS, amount);
    }

    public(friend) fun release_coin<CoinType>(account: &signer, to: address, amount: u64) acquires AdminData {
        let account_addr = signer::address_of(account);
        assert!(coin::is_account_registered<CoinType>(account_addr), ERR_COIN_NOT_REGISTERED);
        let resource_account_signer = get_resource_account_signer();
        coin::transfer<CoinType>(&resource_account_signer, to, amount);
    }

    #[test_only]
    public fun init_for_test(creator: &signer, resource_account: &signer) {
        let account_addr = signer::address_of(creator);
        move_to<TokenManager>(
            creator,
            TokenManager { 
                tokenPairs: table::new<u64, TokenPairInfo>(), 
                tokenPairsType: table::new<u64, u8>(), 
                admin: account_addr,
                operator: @0x0,
                add_token_pair_events: account::new_event_handle<AddTokenPairEvent>(creator),
                update_token_pair_events: account::new_event_handle<UpdateTokenPairEvent>(creator),
                remove_token_pair_events: account::new_event_handle<RemoveTokenPairEvent>(creator),
            },
        );

        // transfer back signer_cap to resource address
        let signer_cap = account::create_test_signer_cap(signer::address_of(resource_account));
        move_to(resource_account, AdminData { signer_cap });
    }
}
