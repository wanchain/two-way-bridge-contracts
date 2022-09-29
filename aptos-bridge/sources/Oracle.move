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

module BridgeRoot::Oracle {
    use std::signer;
    use std::error;
    use std::vector;
    use aptos_std::table;
    use aptos_std::event::{Self, EventHandle};
    use aptos_framework::account;


    struct StoremanGroupConfig has store, drop, copy {
        deposit: u128,
        chain: vector<u128>,
        curve: vector<u128>,
        gpk1: vector<u8>,
        gpk2: vector<u8>,
        startTime: u64,
        endTime: u64,
        status: u8,
        isDebtClean: bool,
    }

    struct SetAdminEvent has drop, store {
        admin: address,
    }

    struct UpdatePriceEvent has drop, store {
        keys: vector<address>,
        prices: vector<u128>,
    }

    struct SetDebtCleanEvent has drop, store {
        id: address,
        isDebtClean: bool,
    }

    struct SetStoremanGroupConfigEvent has drop, store {
        config: StoremanGroupConfig,
    }

    struct SetStoremanGroupStatusEvent has drop, store {
        id: address,
        status: u8,
    }

    struct UpdateDepositEvent has drop, store {
        id: address,
        deposit: u128,
    }

    struct Oracle has key, store {
        mapPrices: table::Table<address, u128>,
        mapStoremanGroupConfig: table::Table<address, StoremanGroupConfig>,
        admin: address,
        eventSetAdmin: EventHandle<SetAdminEvent>,
        eventUpdatePrice: EventHandle<UpdatePriceEvent>,
        eventSetDebtClean: EventHandle<SetDebtCleanEvent>,
        eventSetStoremanGroupConfig: EventHandle<SetStoremanGroupConfigEvent>,
        eventSetStoremanGroupStatus: EventHandle<SetStoremanGroupStatusEvent>,
        eventUpdateDeposit: EventHandle<UpdateDepositEvent>,
    }

    /// Account has no capabilities (admin).
    const ENO_CAPABILITIES: u64 = 1;
    const ENO_INPUT_ERROR: u64 = 2;

    fun init_module(sender: &signer) {
        let account_addr = signer::address_of(sender);
        move_to<Oracle>(
            sender,
            Oracle { 
                mapPrices: table::new<address, u128>(), 
                mapStoremanGroupConfig: table::new<address, StoremanGroupConfig>(), 
                admin: account_addr,
                eventSetAdmin: account::new_event_handle<SetAdminEvent>(sender),
                eventUpdatePrice: account::new_event_handle<UpdatePriceEvent>(sender),
                eventSetDebtClean: account::new_event_handle<SetDebtCleanEvent>(sender),
                eventSetStoremanGroupConfig: account::new_event_handle<SetStoremanGroupConfigEvent>(sender),
                eventSetStoremanGroupStatus: account::new_event_handle<SetStoremanGroupStatusEvent>(sender),
                eventUpdateDeposit: account::new_event_handle<UpdateDepositEvent>(sender),
            },
        );
    }

    fun onlyAdmin(account: &signer) acquires Oracle {
        let account_addr = signer::address_of(account);
        let data = borrow_global<Oracle>(@BridgeRoot);
        data.admin == account_addr;
        assert!(account_addr == data.admin, error::permission_denied(ENO_CAPABILITIES));
    }

    public entry fun updatePrice(account: &signer, keys: vector<address>, prices: vector<u128>) acquires Oracle {
        assert!(vector::length<address>(&keys) == vector::length<u128>(&prices), error::invalid_argument(ENO_INPUT_ERROR));

        onlyAdmin(account);

        let data = borrow_global_mut<Oracle>(@BridgeRoot);
        let length = vector::length<address>(&keys);
        let i = 0;
        while ( i < length) {
            let key = vector::borrow<address>(&keys, i);
            let price = vector::borrow<u128>(&prices, i);
            table::upsert<address, u128>(&mut data.mapPrices, *key, *price);
            i = i + 1;
        };

        event::emit_event<UpdatePriceEvent>(
            &mut data.eventUpdatePrice,
            UpdatePriceEvent { 
                keys: keys,
                prices: prices,
            },
        );
    }

    public entry fun updateDeposit(account: &signer, smgID: address, amount: u128) acquires Oracle {
        onlyAdmin(account);
        let data = borrow_global_mut<Oracle>(@BridgeRoot);
        table::borrow_mut<address, StoremanGroupConfig>(&mut data.mapStoremanGroupConfig, smgID).deposit = amount;

        event::emit_event<UpdateDepositEvent>(
            &mut data.eventUpdateDeposit,
            UpdateDepositEvent { 
                id: smgID,
                deposit: amount,
            },
        );
    }

    public entry fun setStoremanGroupStatus(account: &signer, smgID: address, status: u8) acquires Oracle {
        onlyAdmin(account);
        let data = borrow_global_mut<Oracle>(@BridgeRoot);
        table::borrow_mut<address, StoremanGroupConfig>(&mut data.mapStoremanGroupConfig, smgID).status = status;

        event::emit_event<SetStoremanGroupStatusEvent>(
            &mut data.eventSetStoremanGroupStatus,
            SetStoremanGroupStatusEvent { 
                id: smgID,
                status: status,
            },
        );
    }

    public entry fun setDebtClean(account: &signer, smgID: address, isClean: bool) acquires Oracle {
        onlyAdmin(account);
        let data = borrow_global_mut<Oracle>(@BridgeRoot);
        table::borrow_mut<address, StoremanGroupConfig>(&mut data.mapStoremanGroupConfig, smgID).isDebtClean = isClean;

        event::emit_event<SetDebtCleanEvent>(
            &mut data.eventSetDebtClean,
            SetDebtCleanEvent { 
                id: smgID,
                isDebtClean: isClean,
            },
        );
    }

    public entry fun setStoremanGroupConfig(
        account: &signer,
        id: address,
        status: u8,
        deposit: u128,
        chain: vector<u128>,
        curve: vector<u128>,
        gpk1: vector<u8>,
        gpk2: vector<u8>,
        startTime: u64,
        endTime: u64,
    ) acquires Oracle {
        onlyAdmin(account);
        let data = borrow_global_mut<Oracle>(@BridgeRoot);
        table::upsert<address, StoremanGroupConfig>(&mut data.mapStoremanGroupConfig, id, StoremanGroupConfig {
            deposit: deposit,
            chain: chain,
            curve: curve,
            gpk1: gpk1,
            gpk2: gpk2,
            startTime: startTime,
            endTime: endTime,
            status: status,
            isDebtClean: false,
        });

        let smg = table::borrow<address, StoremanGroupConfig>(&data.mapStoremanGroupConfig, id);
        event::emit_event<SetStoremanGroupConfigEvent>(
            &mut data.eventSetStoremanGroupConfig,
            SetStoremanGroupConfigEvent { 
                config: *smg,
            }
        );
    }

    public entry fun setAdmin(account: &signer, admin: address) acquires Oracle {
        onlyAdmin(account);
        let data = borrow_global_mut<Oracle>(@BridgeRoot);
        data.admin = admin;

        event::emit_event<SetAdminEvent>(
            &mut data.eventSetAdmin,
            SetAdminEvent { 
                admin: admin,
            },
        );
    }

    public fun getValue(key: address): u128 acquires Oracle {
        let data = borrow_global<Oracle>(@BridgeRoot);
        *table::borrow<address, u128>(&data.mapPrices, key)
    }

    public fun getValues(keys: vector<address>): vector<u128> acquires Oracle {
        let data = borrow_global<Oracle>(@BridgeRoot);
        let length = vector::length<address>(&keys);
        let i = 0;
        let prices: vector<u128> = vector::empty();
        while ( i < length) {
            let key = vector::borrow<address>(&keys, i);
            let price = *table::borrow<address, u128>(&data.mapPrices, *key);
            vector::push_back<u128>(&mut prices, price);
            i = i + 1;
        };
        prices
    }

    public fun getDeposit(smgID: address): u128 acquires Oracle {
        let data = borrow_global<Oracle>(@BridgeRoot);
        table::borrow<address, StoremanGroupConfig>(&data.mapStoremanGroupConfig, smgID).deposit
    }

    public fun getStoremanGroupConfig(smgID: address): StoremanGroupConfig acquires Oracle {
        let data = borrow_global<Oracle>(@BridgeRoot);
        *table::borrow<address, StoremanGroupConfig>(&data.mapStoremanGroupConfig, smgID)
    }

    public fun getStoremanGroupStatus(smgID: address): u8 acquires Oracle {
        let data = borrow_global<Oracle>(@BridgeRoot);
        table::borrow<address, StoremanGroupConfig>(&data.mapStoremanGroupConfig, smgID).status
    }

    public fun isDebtClean(smgID: address): bool acquires Oracle {
        let data = borrow_global<Oracle>(@BridgeRoot);
        table::borrow<address, StoremanGroupConfig>(&data.mapStoremanGroupConfig, smgID).isDebtClean
    }
}
