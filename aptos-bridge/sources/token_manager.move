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

module bridge_root::token_manager {
    use std::signer;
    use bridge_root::iterable_table;
    use std::error;
    use aptos_framework::account;
    use aptos_std::event::{Self, EventHandle};

    struct AncestorInfo has store, drop, copy {
        account: address,
        name: vector<u8>,
        symbol: vector<u8>,
        decimals: u8,
        chainID: u64,
    }

    struct TokenPairInfo has store, drop, copy {
        aInfo: AncestorInfo,
        fromChainID: u64,
        fromAccount: address,
        toChainID: u64,
        toAccount: address,
    }

    /// admin access
    struct AdminCapability has key, drop, store { account: address }

    /// Account has no capabilities (admin/burn/mint).
    const ENO_CAPABILITIES: u64 = 1;

    struct TokenManager has key, store {
        tokenPairs: iterable_table::IterableTable<u64, TokenPairInfo>,
        tokenPairsType: iterable_table::IterableTable<u64, u8>,
        operator: address,
        add_token_pair_events: EventHandle<AddTokenPairEvent>,
        update_token_pair_events: EventHandle<UpdateTokenPairEvent>,
        remove_token_pair_events: EventHandle<RemoveTokenPairEvent>,
    }

    struct AddTokenPairEvent has drop, store {
        info: TokenPairInfo,
    }

    struct UpdateTokenPairEvent has drop, store {
        info: TokenPairInfo,
    }

    struct RemoveTokenPairEvent has drop, store {
        info: TokenPairInfo,
    }

    fun init_module(sender: &signer) {
        move_to<TokenManager>(
            sender,
            TokenManager { 
                tokenPairs: iterable_table::new<u64, TokenPairInfo>(), 
                tokenPairsType: iterable_table::new<u64, u8>(), 
                operator: @0x0,
                add_token_pair_events: account::new_event_handle<AddTokenPairEvent>(sender),
                update_token_pair_events: account::new_event_handle<UpdateTokenPairEvent>(sender),
                remove_token_pair_events: account::new_event_handle<RemoveTokenPairEvent>(sender),
            },
        );

        let account_addr = signer::address_of(sender);
        move_to<AdminCapability>(sender, AdminCapability { account: account_addr });
    }

    public entry fun add_token_pair(
        account: &signer, 
        id: u64, 
        ancestor_account: address,
        ancestor_name: vector<u8>,
        ancestor_symbol: vector<u8>,
        ancestor_decimals: u8,
        ancestor_chainID: u64, 
        fromChainID: u64, 
        fromAccount: address, 
        toChainID: u64, 
        toAccount: address
    ) acquires TokenManager {
        let account_addr = signer::address_of(account);
        let manager = borrow_global_mut<TokenManager>(account_addr);

        iterable_table::add<u64, TokenPairInfo>(&mut manager.tokenPairs, id, TokenPairInfo {
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
        ancestor_account: address,
        ancestor_name: vector<u8>,
        ancestor_symbol: vector<u8>,
        ancestor_decimals: u8,
        ancestor_chainID: u64, 
        fromChainID: u64, 
        fromAccount: address, 
        toChainID: u64, 
        toAccount: address
    ) acquires TokenManager {
        let account_addr = signer::address_of(account);
        let manager = borrow_global_mut<TokenManager>(account_addr);

        let val = iterable_table::borrow_mut<u64, TokenPairInfo>(&mut manager.tokenPairs, id);
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
        let account_addr = signer::address_of(account);
        let manager = borrow_global_mut<TokenManager>(account_addr);

        let info = iterable_table::remove<u64, TokenPairInfo>(&mut manager.tokenPairs, id);
        
        event::emit_event<RemoveTokenPairEvent>(
            &mut manager.remove_token_pair_events,
            RemoveTokenPairEvent { 
                info,
            },
        );
    }

    public fun get_token_pair(id: u64): TokenPairInfo acquires TokenManager {
        let manager = borrow_global<TokenManager>(@bridge_root);
        let val = iterable_table::borrow<u64, TokenPairInfo>(&manager.tokenPairs, id);
        *val
    }

    public entry fun set_operator(account: &signer, op: address) acquires TokenManager {
        let account_addr = signer::address_of(account);
        let manager = borrow_global_mut<TokenManager>(account_addr);
        manager.operator = op;
    }

    public entry fun set_token_pair_type(account: &signer, id: u64, type: u8) acquires TokenManager {
        let account_addr = signer::address_of(account);
        let manager = borrow_global_mut<TokenManager>(@bridge_root);
        assert!(account_addr == manager.operator, error::permission_denied(ENO_CAPABILITIES));

        iterable_table::add<u64, u8>(&mut manager.tokenPairsType, id, type);
    }

    public entry fun destory(account: &signer) : TokenManager acquires TokenManager {
        let account_addr = signer::address_of(account);
        move_from<TokenManager>(account_addr)
    }

    #[test(account = @0x666)]
    public entry fun token_manager_test(account: signer) acquires TokenManager {
        use aptos_std::debug;

        let addr = signer::address_of(&account);
        debug::print<address>(&addr);
        init_module(&account);
        let ret = exists<AdminCapability>(addr);
        debug::print<bool>(&ret);

        add_token_pair(&account, 1, AncestorInfo {
            account: @0x123,
            name: b"test",
            symbol: b"test",
            decimals: 0,
            chainID: 0,
        }, 123, @0x123, 321, @0x321);

        add_token_pair(&account, 2, AncestorInfo {
            account: @0x123,
            name: b"test",
            symbol: b"test",
            decimals: 0,
            chainID: 0,
        }, 123, @0x123, 321, @0x321);

        add_token_pair(&account, 3, AncestorInfo {
            account: @0x123,
            name: b"test",
            symbol: b"test",
            decimals: 0,
            chainID: 0,
        }, 123, @0x123, 321, @0x321);

        let val = get_token_pair(1);
        debug::print<TokenPairInfo>(&val);

        let val = get_token_pair(2);
        debug::print<TokenPairInfo>(&val);

        let val = get_token_pair(3);
        debug::print<TokenPairInfo>(&val);

        set_operator(&account, @0x666);
        set_token_pair_type(&account, 1, 1);

        remove_token_pair(&account, 1);
        remove_token_pair(&account, 2);
        remove_token_pair(&account, 3);
        
    }
}
