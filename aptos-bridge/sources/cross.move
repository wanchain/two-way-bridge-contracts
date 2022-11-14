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

module bridge_root::cross {
    use std::signer;
    use std::error;
    use std::vector;
    use aptos_std::table;
    use aptos_std::event::{Self, EventHandle};
    use aptos_framework::account;

    struct SetAdminEvent has drop, store {
        admin: address,
    }

    struct SetFeeEvent has drop, store {
        srcChainID: u64,
        destChainID: u64,
        contractFee: u128,
        agentFee: u128,
    }

    struct SetTokenPairFee has drop, store {
        tokenPairID: u64,
        contractFee: u128,
    }

    struct WithdrawHistoryFeeLogger has drop, store {
        smgID: address,
        timeStamp: u64,
        receiver: address,
        fee: u128,
    }

    struct Cross has key, store {
        admin: address,
        owner: address,
    }

    /// Account has no capabilities (admin).
    const ENO_CAPABILITIES: u64 = 1;
    const ENO_INPUT_ERROR: u64 = 2;

    fun init_module(sender: &signer) {
        let account_addr = signer::address_of(sender);
        move_to<Cross>(sender, Cross {
            admin: account_addr,
            owner: account_addr,
        });
    }

    fun only_admin(account: &signer) acquires Cross {
        let account_addr = signer::address_of(account);
        let data = borrow_global<Cross>(@bridge_root);
        assert!((account_addr == data.admin) || (account_addr == data.owner), error::permission_denied(ENO_CAPABILITIES));
    }

    fun only_owner(account: &signer) acquires Cross {
        let account_addr = signer::address_of(account);
        let data = borrow_global<Cross>(@bridge_root);
        assert!(account_addr == data.owner, error::permission_denied(ENO_CAPABILITIES));
    }
}

