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
    use aptos_std::simple_map;
    use aptos_std::event::{Self, EventHandle};
    use aptos_framework::account;
    use bridge_root::oracle;
    use bridge_root::token_manager;
    use aptos_framework::timestamp;

    // events start ------------------------------------------------------------

    struct SetAdmin has drop, store {
        adminAccount: address,
    }

    // event SetFee(uint srcChainID, uint destChainID, uint contractFee, uint agentFee);
    struct SetFee has drop, store {
        srcChainID: u64,
        destChainID: u64,
        contractFee: u128,
        agentFee: u128,
    }

    // event SmgWithdrawFeeLogger(bytes32 indexed smgID, uint indexed timeStamp, address indexed receiver, uint fee);
    struct SmgWithdrawFeeLogger has drop, store {
        smgID: address,
        timeStamp: u64,
        receiver: address,
        fee: u128,
    }

    // event WithdrawContractFeeLogger(uint indexed block, uint indexed timeStamp, address indexed receiver, uint fee);
    struct WithdrawContractFeeLogger has drop, store {
        block: u128,
        timeStamp: u64,
        receiver: address,
        fee: u128,
    }

    // event SetTokenPairFee(uint indexed tokenPairID, uint contractFee);
    struct SetTokenPairFee has drop, store {
        tokenPairID: u64,
        contractFee: u128,
    }

    // event WithdrawHistoryFeeLogger(bytes32 indexed smgID, uint indexed timeStamp, address indexed receiver, uint fee);
    struct WithdrawHistoryFeeLogger has drop, store {
        smgID: address,
        timeStamp: u64,
        receiver: address,
        fee: u128,
    }

    // event TransferAssetLogger(bytes32 indexed uniqueID, bytes32 indexed srcSmgID, bytes32 indexed destSmgID);
    struct TransferAssetLogger has drop, store {
        uniqueID: address,
        srcSmgID: address,
        destSmgID: address,
    }

    // event ReceiveDebtLogger(bytes32 indexed uniqueID, bytes32 indexed srcSmgID, bytes32 indexed destSmgID);
    struct ReceiveDebtLogger has drop, store {
        uniqueID: address,
        srcSmgID: address,
        destSmgID: address,
    }

    // event UserLockNFT(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, string[] keys, bytes[] values);
    struct UserLockNFT has drop, store {
        smgID: address,
        tokenPairID: u64,
        tokenAccount: address,
        keys: vector<u8>,
        values: vector<u8>,
    }

    // event UserBurnNFT(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, string[] keys, bytes[] values);
    struct UserBurnNFT has drop, store {
        smgID: address,
        tokenPairID: u64,
        tokenAccount: address,
        keys: vector<u8>,
        values: vector<u8>,
    }

    // event SmgMintNFT(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);
    struct SmgMintNFT has drop, store {
        uniqueID: address,
        smgID: address,
        tokenPairID: u64,
        keys: vector<u8>,
        values: vector<u8>,
    }

    // event SmgReleaseNFT(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);
    struct SmgReleaseNFT has drop, store {
        uniqueID: address,
        smgID: address,
        tokenPairID: u64,
        keys: vector<u8>,
        values: vector<u8>,
    }

    // event UserLockLogger(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, uint value, uint contractFee, bytes userAccount);
    struct UserLockLogger has drop, store {
        smgID: address,
        tokenPairID: u64,
        tokenAccount: address,
        value: u128,
        contractFee: u128,
        userAccount: vector<u8>,
    }

    // event UserBurnLogger(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, uint value, uint contractFee, uint fee, bytes userAccount);
    struct UserBurnLogger has drop, store {
        smgID: address,
        tokenPairID: u64,
        tokenAccount: address,
        value: u128,
        contractFee: u128,
        fee: u128,
        userAccount: vector<u8>,
    }

    // event SmgMintLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);
    struct SmgMintLogger has drop, store {
        uniqueID: address,
        smgID: address,
        tokenPairID: u64,
        value: u128,
        tokenAccount: address,
        userAccount: address,
    }

    // event SmgMint(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);
    struct SmgMint has drop, store {
        uniqueID: address,
        smgID: address,
        tokenPairID: u64,
        keys: vector<u8>,
        values: vector<u8>,
    }

    // event SmgReleaseLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);
    struct SmgReleaseLogger has drop, store {
        uniqueID: address,
        smgID: address,
        tokenPairID: u64,
        value: u128,
        tokenAccount: address,
        userAccount: address,
    }
    
    // event SmgRelease(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);
    struct SmgRelease has drop, store {
        uniqueID: address,
        smgID: address,
        tokenPairID: u64,
        keys: vector<u8>,
        values: vector<u8>,
    }

    // events finish -----------------------------------------------------------

    struct HTLCTxLibData has store, drop {
        // TODO
    }

    struct RapidityTxLibData has store, drop {
        // TODO
    }

    struct RapidityUserLockParams has store, drop {
        smgID: address,
        tokenPairID: u64,
        value: u128,
        currentChainID: u64,
        tokenPairContractFee: u128,
        destUserAccount: address,
        smgFeeProxy: address,
    }


    struct CrossType has store {
        htlcTxData: HTLCTxLibData,
        rapidityTxData: RapidityTxLibData,

        /// @notice transaction fee, smgID => fee
        mapStoremanFee: table::Table<address, u128>,
        /// @notice transaction fee, origChainID => shadowChainID => fee
        mapContractFee: table::Table<u64, simple_map::SimpleMap<u64, u128>>,
        /// @notice transaction fee, origChainID => shadowChainID => fee
        mapAgentFee: table::Table<u64, simple_map::SimpleMap<u64, u128>>,
        /// @notice tokenPair fee, tokenPairID => fee
        mapTokenPairContractFee: table::Table<u64, u128>,
    }

    struct CrossEventHandlers has store {
        set_admin: EventHandle<SetAdmin>,
        set_fee: EventHandle<SetFee>,
        smg_withdraw_fee_logger: EventHandle<SmgWithdrawFeeLogger>,
        withdraw_contract_fee_logger: EventHandle<WithdrawContractFeeLogger>,
        set_token_pair_fee: EventHandle<SetTokenPairFee>,
        withdraw_history_fee_logger: EventHandle<WithdrawHistoryFeeLogger>,
        transfer_asset_logger: EventHandle<TransferAssetLogger>,
        receive_debt_logger: EventHandle<ReceiveDebtLogger>,
        user_lock_nft: EventHandle<UserLockNFT>,
        user_burn_nft: EventHandle<UserBurnNFT>,
        smg_mint_nft: EventHandle<SmgMintNFT>,
        smg_release_nft: EventHandle<SmgReleaseNFT>,
        user_lock_logger: EventHandle<UserLockLogger>,
        user_burn_logger: EventHandle<UserBurnLogger>,
        smg_mint_logger: EventHandle<SmgMintLogger>,
        smg_mint: EventHandle<SmgMint>,
        smg_release_logger: EventHandle<SmgReleaseLogger>,
        smg_release: EventHandle<SmgRelease>,
    }

    struct Cross has key, store {
        admin: address,
        owner: address,
        halted: bool,
        smg_fee_proxy: address,
        current_chain_id: u64,
        data: CrossType,
        event_handler: CrossEventHandlers,
    }

    /// Account has no capabilities (admin).
    const ENO_CAPABILITIES: u64 = 1;
    const ENO_INPUT_ERROR: u64 = 2;
    const GROUP_STATUS_READY: u8 = 5;

    fun init_module(sender: &signer) {
        let account_addr = signer::address_of(sender);
        move_to<Cross>(sender, Cross {
            admin: account_addr,
            owner: account_addr,
            smg_fee_proxy: account_addr,
            halted: false,
            current_chain_id: 0,
            data: CrossType {
                htlcTxData: HTLCTxLibData {},
                rapidityTxData: RapidityTxLibData {},
                mapStoremanFee: table::new<address, u128>(),
                mapContractFee: table::new<u64, simple_map::SimpleMap<u64, u128>>(),
                mapAgentFee: table::new<u64, simple_map::SimpleMap<u64, u128>>(),
                mapTokenPairContractFee: table::new<u64, u128>(),
            },
            event_handler: CrossEventHandlers {
                set_admin: account::new_event_handle<SetAdmin>(sender),
                set_fee: account::new_event_handle<SetFee>(sender),
                smg_withdraw_fee_logger: account::new_event_handle<SmgWithdrawFeeLogger>(sender),
                withdraw_contract_fee_logger: account::new_event_handle<WithdrawContractFeeLogger>(sender),
                set_token_pair_fee: account::new_event_handle<SetTokenPairFee>(sender),
                withdraw_history_fee_logger: account::new_event_handle<WithdrawHistoryFeeLogger>(sender),
                transfer_asset_logger: account::new_event_handle<TransferAssetLogger>(sender),
                receive_debt_logger: account::new_event_handle<ReceiveDebtLogger>(sender),
                user_lock_nft: account::new_event_handle<UserLockNFT>(sender),
                user_burn_nft: account::new_event_handle<UserBurnNFT>(sender),
                smg_mint_nft: account::new_event_handle<SmgMintNFT>(sender),
                smg_release_nft: account::new_event_handle<SmgReleaseNFT>(sender),
                user_lock_logger: account::new_event_handle<UserLockLogger>(sender),
                user_burn_logger: account::new_event_handle<UserBurnLogger>(sender),
                smg_mint_logger: account::new_event_handle<SmgMintLogger>(sender),
                smg_mint: account::new_event_handle<SmgMint>(sender),
                smg_release_logger: account::new_event_handle<SmgReleaseLogger>(sender),
                smg_release: account::new_event_handle<SmgRelease>(sender),
            },
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

    fun not_halted() acquires Cross {
        let data = borrow_global<Cross>(@bridge_root);
        assert!(!data.halted, error::permission_denied(ENO_CAPABILITIES));
    }

    fun only_ready_smg(smgID: address): bool {
        let (status, startTime, endTime) = oracle::get_storeman_group_status(smgID);
        status == GROUP_STATUS_READY && startTime <= timestamp::now_seconds() && timestamp::now_seconds() <= endTime
    }

    public entry fun set_halt(account: &signer, halt: bool) acquires Cross {
        only_owner(account);
        let data = borrow_global_mut<Cross>(@bridge_root);
        data.halted = halt;
    }

    public entry fun set_admin(account: &signer, newAdmin: address) acquires Cross {
        only_owner(account);
        let data = borrow_global_mut<Cross>(@bridge_root);
        data.admin = newAdmin;
        event::emit_event<SetAdmin>(&mut data.event_handler.set_admin, SetAdmin{
            adminAccount: newAdmin,
        });
    }

    public entry fun set_owner(account: &signer, newOwner: address) acquires Cross {
        only_owner(account);
        let data = borrow_global_mut<Cross>(@bridge_root);
        data.owner = newOwner;
    }

    public entry fun set_fee(account: &signer, srcChainID: u64, destChainID: u64, contractFee: u128, agentFee: u128) acquires Cross {
        only_admin(account);
        not_halted();
        let data = borrow_global_mut<Cross>(@bridge_root);
        let mapContractFee = &mut data.data.mapContractFee;
        let mapAgentFee = &mut data.data.mapAgentFee;
        let contractFeeMap = table::borrow_mut_with_default<u64, simple_map::SimpleMap<u64, u128>>(mapContractFee, srcChainID, simple_map::create<u64, u128>());
        let agentFeeMap = table::borrow_mut_with_default<u64, simple_map::SimpleMap<u64, u128>>(mapAgentFee, srcChainID, simple_map::create<u64, u128>());
        if (simple_map::contains_key<u64, u128>(contractFeeMap, &destChainID)) {
            simple_map::remove<u64, u128>(contractFeeMap, &destChainID);
            simple_map::add<u64, u128>(contractFeeMap, destChainID, contractFee);
        } else {
            simple_map::add<u64, u128>(contractFeeMap, destChainID, contractFee);
        };

        if (simple_map::contains_key<u64, u128>(agentFeeMap, &destChainID)) {
            simple_map::remove<u64, u128>(agentFeeMap, &destChainID);
            simple_map::add<u64, u128>(agentFeeMap, destChainID, agentFee);
        } else {
            simple_map::add<u64, u128>(agentFeeMap, destChainID, agentFee);
        };
        
        event::emit_event<SetFee>(&mut data.event_handler.set_fee, SetFee{
            srcChainID: srcChainID,
            destChainID: destChainID,
            contractFee: contractFee,
            agentFee: agentFee,
        });
    }

    public entry fun set_token_pair_fee(account: &signer, tokenPairID: u64, contractFee: u128) acquires Cross {
        only_admin(account);
        not_halted();
        let data = borrow_global_mut<Cross>(@bridge_root);
        let mapTokenPairContractFee = &mut data.data.mapTokenPairContractFee;
        table::upsert<u64, u128>(mapTokenPairContractFee, tokenPairID, contractFee);

        event::emit_event<SetTokenPairFee>(&mut data.event_handler.set_token_pair_fee, SetTokenPairFee{
            tokenPairID: tokenPairID,
            contractFee: contractFee,
        });
    }

    public entry fun set_chain_id(account: &signer, chainID: u64) acquires Cross {
        only_admin(account);
        not_halted();
        let data = borrow_global_mut<Cross>(@bridge_root);
        data.current_chain_id = chainID;
    }

    public entry fun user_lock(smgID: address, tokenPairID: u64, value: u128, userAccount: address) acquires Cross {
        not_halted();
        let data = borrow_global<Cross>(@bridge_root);
        let param = RapidityUserLockParams {
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            currentChainID: data.current_chain_id,
            tokenPairContractFee: 0,
            destUserAccount: userAccount,
            smgFeeProxy: data.smg_fee_proxy,
        };

        user_lock_internal(param);
    }

    fun user_lock_internal(param: RapidityUserLockParams) {
        let pairInfo = token_manager::get_token_pair(param.tokenPairID);
    }

}

