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

module BridgeDeployer::Cross {
    use std::signer;
    use std::error;
    use std::bcs;
    use std::vector;
    use std::string;
    use std::hash;
    use aptos_std::table;
    use aptos_std::simple_map;
    use aptos_std::event::{Self, EventHandle};
    use aptos_std::ed25519;
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    use std::type_info;
    use aptos_framework::aptos_coin::AptosCoin;
    
    use BridgeDeployer::Oracle;
    use BridgeDeployer::TokenManager;
    

    // events start ------------------------------------------------------------

    struct SetAdmin has drop, store {
        adminAccount: address,
    }

    // event SetFee(uint srcChainID, uint destChainID, uint contractFee, uint agentFee);
    struct SetFee has drop, store {
        srcChainID: u64,
        destChainID: u64,
        contractFee: u64,
        agentFee: u64,
    }

    // event SmgWithdrawFeeLogger(bytes32 indexed smgID, uint indexed timeStamp, address indexed receiver, uint fee);
    struct SmgWithdrawFeeLogger has drop, store {
        smgID: address,
        timeStamp: u64,
        receiver: address,
        fee: u64,
    }

    // event WithdrawContractFeeLogger(uint indexed block, uint indexed timeStamp, address indexed receiver, uint fee);
    struct WithdrawContractFeeLogger has drop, store {
        block: u64,
        timeStamp: u64,
        receiver: address,
        fee: u64,
    }

    // event SetTokenPairFee(uint indexed tokenPairID, uint contractFee);
    struct SetTokenPairFee has drop, store {
        tokenPairID: u64,
        contractFee: u64,
    }

    // event WithdrawHistoryFeeLogger(bytes32 indexed smgID, uint indexed timeStamp, address indexed receiver, uint fee);
    struct WithdrawHistoryFeeLogger has drop, store {
        smgID: address,
        timeStamp: u64,
        receiver: address,
        fee: u64,
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
        tokenAccount: vector<u8>,
        keys: vector<u8>,
        values: vector<u8>,
    }

    // event UserBurnNFT(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, string[] keys, bytes[] values);
    struct UserBurnNFT has drop, store {
        smgID: address,
        tokenPairID: u64,
        tokenAccount: vector<u8>,
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
        tokenAccount: vector<u8>,
        value: u64,
        contractFee: u64,
        userAccount: vector<u8>,
    }

    // event UserBurnLogger(bytes32 indexed smgID, uint indexed tokenPairID, address indexed tokenAccount, uint value, uint contractFee, uint fee, bytes userAccount);
    struct UserBurnLogger has drop, store {
        smgID: address,
        tokenPairID: u64,
        tokenAccount: vector<u8>,
        value: u64,
        contractFee: u64,
        fee: u64,
        userAccount: vector<u8>,
    }

    // event SmgMintLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);
    struct SmgMintLogger has drop, store {
        uniqueID: address,
        smgID: address,
        tokenPairID: u64,
        value: u64,
        tokenAccount: vector<u8>,
        userAccount: vector<u8>,
    }

    // event SmgMint(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, string[] keys, bytes[] values);
    struct SmgMint has drop, store {
        uniqueID: address,
        smgID: address,
        tokenPairID: u64,
        keys: vector<string::String>,
        values: vector<vector<u8>>,
    }

    // event SmgReleaseLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);
    struct SmgReleaseLogger has drop, store {
        uniqueID: address,
        smgID: address,
        tokenPairID: u64,
        value: u64,
        tokenAccount: vector<u8>,
        userAccount: vector<u8>,
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


    struct RapidityUserLockParams has store, drop {
        smgID: address,
        tokenPairID: u64,
        value: u64,
        currentChainID: u64,
        tokenPairContractFee: u64,
        destUserAccount: vector<u8>,
        smgFeeProxy: address,
    }

    struct RapiditySmgMintParams has store, drop {
        uniqueID: address,               /// Rapidity random number
        smgID: address,                   /// ID of storeman group which user has selected
        tokenPairID: u64,                 /// token pair id on cross chain
        value: u64,                       /// exchange token value
        fee: u64,                         /// exchange token fee
        destTokenAccount: vector<u8>,         /// shadow token account
        destUserAccount: address,          /// account of shadow chain, used to receive token
        smgFeeProxy: address,             
    }

    struct SmgSignatureData has store, drop {
        currentChainID: u64,
        uniqueID: address,
        tokenPairID: u64,
        value: u64,
        fee: u64,
        tokenAccount: vector<u8>,
        userAccount: address,
    }

    struct RapidityUserBurnParams has store, drop {
        smgID: address,                  /// ID of storeman group which user has selected
        tokenPairID: u64,               /// token pair id on cross chain
        value: u64,                  /// exchange token value
        currentChainID: u64,            /// current chain ID
        fee: u64,                       /// exchange token fee
        tokenPairContractFee: u64,      /// fee of token pair
        srcTokenAccount: vector<u8>,        /// shadow token account
        destUserAccount: vector<u8>,          /// account of token destination chain, used to receive token
        smgFeeProxy: address,            
    }

    struct RapiditySmgReleaseParams has store, drop {
        uniqueID: address,               /// Rapidity random number
        smgID: address,                  /// ID of storeman group which user has selected
        tokenPairID: u64,               /// token pair id on cross chain
        value: u64,                     /// exchange token value
        fee: u64,                       /// exchange token fee
        destTokenAccount: address,       /// original token/coin account
        destUserAccount: address,        /// account of token original chain, used to receive token
        smgFeeProxy: address,            
    }


    struct CrossType has store {
        /// @notice transaction fee, smgID => fee
        mapStoremanFee: table::Table<address, u64>,
        /// @notice transaction fee, origChainID => shadowChainID => fee
        mapContractFee: table::Table<u64, simple_map::SimpleMap<u64, u64>>,
        /// @notice transaction fee, origChainID => shadowChainID => fee
        mapAgentFee: table::Table<u64, simple_map::SimpleMap<u64, u64>>,
        /// @notice tokenPair fee, tokenPairID => fee
        mapTokenPairContractFee: table::Table<u64, u64>,
        /// @notice txStatus, uniqueID => status
        mapTxStatus: table::Table<address, u8>,
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
    const TOKEN_CROSS_TYPE_ERC20: u8 = 0;
    const TOKEN_CROSS_TYPE_ERC721: u8 = 1;
    const TOKEN_CROSS_TYPE_ERC1155: u8 = 2;
    const TX_STATUS_CLAIMED: u8 = 1;

    fun init_module(sender: &signer) {
        let account_addr = signer::address_of(sender);
        move_to<Cross>(sender, Cross {
            admin: account_addr,
            owner: account_addr,
            smg_fee_proxy: account_addr,
            halted: false,
            current_chain_id: 0,
            data: CrossType {
                mapStoremanFee: table::new<address, u64>(),
                mapContractFee: table::new<u64, simple_map::SimpleMap<u64, u64>>(),
                mapAgentFee: table::new<u64, simple_map::SimpleMap<u64, u64>>(),
                mapTokenPairContractFee: table::new<u64, u64>(),
                mapTxStatus: table::new<address, u8>(),
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
        let data = borrow_global<Cross>(@BridgeDeployer);
        assert!((account_addr == data.admin) || (account_addr == data.owner), error::permission_denied(ENO_CAPABILITIES));
    }

    fun only_owner(account: &signer) acquires Cross {
        let account_addr = signer::address_of(account);
        let data = borrow_global<Cross>(@BridgeDeployer);
        assert!(account_addr == data.owner, error::permission_denied(ENO_CAPABILITIES));
    }

    fun not_halted() acquires Cross {
        let data = borrow_global<Cross>(@BridgeDeployer);
        assert!(!data.halted, error::permission_denied(ENO_CAPABILITIES));
    }

    fun only_ready_smg(smgID: &address): bool {
        let (status, startTime, endTime) = Oracle::get_storeman_group_status(*smgID);
        status == GROUP_STATUS_READY && startTime <= timestamp::now_seconds() && timestamp::now_seconds() <= endTime
    }

    public entry fun set_halt(account: &signer, halt: bool) acquires Cross {
        only_owner(account);
        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        data.halted = halt;
    }

    public entry fun set_admin(account: &signer, newAdmin: address) acquires Cross {
        only_owner(account);
        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        data.admin = newAdmin;
        event::emit_event<SetAdmin>(&mut data.event_handler.set_admin, SetAdmin{
            adminAccount: newAdmin,
        });
    }

    public entry fun set_owner(account: &signer, newOwner: address) acquires Cross {
        only_owner(account);
        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        data.owner = newOwner;
    }

    public entry fun set_fee(account: &signer, srcChainID: u64, destChainID: u64, contractFee: u64, agentFee: u64) acquires Cross {
        only_admin(account);
        not_halted();
        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        let mapContractFee = &mut data.data.mapContractFee;
        let mapAgentFee = &mut data.data.mapAgentFee;
        let contractFeeMap = table::borrow_mut_with_default<u64, simple_map::SimpleMap<u64, u64>>(mapContractFee, srcChainID, simple_map::create<u64, u64>());
        let agentFeeMap = table::borrow_mut_with_default<u64, simple_map::SimpleMap<u64, u64>>(mapAgentFee, srcChainID, simple_map::create<u64, u64>());
        if (simple_map::contains_key<u64, u64>(contractFeeMap, &destChainID)) {
            simple_map::remove<u64, u64>(contractFeeMap, &destChainID);
            simple_map::add<u64, u64>(contractFeeMap, destChainID, contractFee);
        } else {
            simple_map::add<u64, u64>(contractFeeMap, destChainID, contractFee);
        };

        if (simple_map::contains_key<u64, u64>(agentFeeMap, &destChainID)) {
            simple_map::remove<u64, u64>(agentFeeMap, &destChainID);
            simple_map::add<u64, u64>(agentFeeMap, destChainID, agentFee);
        } else {
            simple_map::add<u64, u64>(agentFeeMap, destChainID, agentFee);
        };
        
        event::emit_event<SetFee>(&mut data.event_handler.set_fee, SetFee{
            srcChainID: srcChainID,
            destChainID: destChainID,
            contractFee: contractFee,
            agentFee: agentFee,
        });
    }

    public entry fun set_token_pair_fee(account: &signer, tokenPairID: u64, contractFee: u64) acquires Cross {
        only_admin(account);
        not_halted();
        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        let mapTokenPairContractFee = &mut data.data.mapTokenPairContractFee;
        table::upsert<u64, u64>(mapTokenPairContractFee, tokenPairID, contractFee);

        event::emit_event<SetTokenPairFee>(&mut data.event_handler.set_token_pair_fee, SetTokenPairFee{
            tokenPairID: tokenPairID,
            contractFee: contractFee,
        });
    }

    public entry fun set_chain_id(account: &signer, chainID: u64) acquires Cross {
        only_admin(account);
        not_halted();
        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        data.current_chain_id = chainID;
    }

    public entry fun user_lock<CoinType>(account: &signer, smgID: address, tokenPairID: u64, value: u64, userAccount: vector<u8>) acquires Cross {
        not_halted();
        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        let mapTokenPairContractFee = &mut data.data.mapTokenPairContractFee;
        let contractFee = table::borrow_mut_with_default<u64, u64>(mapTokenPairContractFee, tokenPairID, 0);
        let param = RapidityUserLockParams {
            smgID: smgID,
            tokenPairID: tokenPairID,
            value: value,
            currentChainID: data.current_chain_id,
            tokenPairContractFee: *contractFee,
            destUserAccount: userAccount,
            smgFeeProxy: data.smg_fee_proxy,
        };

        user_lock_internal<CoinType>(account, param);
    }

    fun user_lock_internal<CoinType>(account: &signer, param: RapidityUserLockParams) acquires Cross {
        let (fromChainID, _, toChainID, _) = TokenManager::get_token_pair(param.tokenPairID);
        assert!(fromChainID != 0u64, error::invalid_argument(ENO_INPUT_ERROR));
        let contractFee = param.tokenPairContractFee;
        if (param.currentChainID == fromChainID) {
            if (contractFee == 0u64) {
                let mapContractFee = &mut borrow_global_mut<Cross>(@BridgeDeployer).data.mapContractFee;
                let contractFeeMap = table::borrow_mut_with_default<u64, simple_map::SimpleMap<u64, u64>>(mapContractFee, fromChainID, simple_map::create<u64, u64>());
                if (simple_map::contains_key<u64, u64>(contractFeeMap, &toChainID)) {
                    contractFee = *simple_map::borrow<u64, u64>(contractFeeMap, &toChainID);
                };
            };
        } else if (param.currentChainID == toChainID) {
            if (contractFee == 0u64) {
                let mapContractFee = &mut borrow_global_mut<Cross>(@BridgeDeployer).data.mapContractFee;
                let contractFeeMap = table::borrow_mut_with_default<u64, simple_map::SimpleMap<u64, u64>>(mapContractFee, toChainID, simple_map::create<u64, u64>());
                if (simple_map::contains_key<u64, u64>(contractFeeMap, &fromChainID)) {
                    contractFee = *simple_map::borrow<u64, u64>(contractFeeMap, &fromChainID);
                };
            };
        } else {
            assert!(false, error::invalid_argument(ENO_INPUT_ERROR));
        };

        if (contractFee > 0) {
            let feeAccount = borrow_global<Cross>(@BridgeDeployer).smg_fee_proxy;
            coin::transfer<CoinType>(account, feeAccount, contractFee);
        };

        let left = param.value - contractFee;
        let type = TokenManager::get_token_pair_type(param.tokenPairID);
        assert!(type == TOKEN_CROSS_TYPE_ERC20, error::invalid_argument(ENO_INPUT_ERROR));

        TokenManager::lock_coin<CoinType>(account, left);

        let tokenAddr = string::bytes(&type_info::type_name<CoinType>());

        event::emit_event<UserLockLogger>(&mut borrow_global_mut<Cross>(@BridgeDeployer).event_handler.user_lock_logger, UserLockLogger {
            smgID: param.smgID,
            tokenPairID: param.tokenPairID,
            tokenAccount: *tokenAddr,
            value: param.value,
            contractFee: contractFee,
            userAccount: param.destUserAccount,
        });
    }

    public entry fun user_burn<CoinType>(account: &signer, smgID: address, tokenPairID: u64, value: u64, fee: u64, userAccount: vector<u8>) acquires Cross {
        not_halted();
        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        let mapTokenPairContractFee = &mut data.data.mapTokenPairContractFee;
        let contractFee = table::borrow_mut_with_default<u64, u64>(mapTokenPairContractFee, tokenPairID, 0);
        let tokenAddr = string::bytes(&type_info::type_name<CoinType>());

        let param = RapidityUserBurnParams {
            smgID,                  
            tokenPairID,           
            value,                  
            currentChainID: data.current_chain_id,           
            fee,                       
            tokenPairContractFee: *contractFee,      
            srcTokenAccount: *tokenAddr,        
            destUserAccount: userAccount,          
            smgFeeProxy: data.smg_fee_proxy, 
        };

        user_burn_internal<CoinType>(account, param);
    }

    fun user_burn_internal<CoinType>(account: &signer, param: RapidityUserBurnParams) acquires Cross {
        let (fromChainID, fromTokenAccount, toChainID, toTokenAccount) = TokenManager::get_token_pair(param.tokenPairID);
        assert!(fromChainID != 0u64, error::invalid_argument(ENO_INPUT_ERROR));
        let contractFee = param.tokenPairContractFee;

        let tokenScAddr: vector<u8> = vector::empty();
        if (param.currentChainID == fromChainID) {
            if (contractFee == 0u64) {
                let mapContractFee = &mut borrow_global_mut<Cross>(@BridgeDeployer).data.mapContractFee;
                let contractFeeMap = table::borrow_mut_with_default<u64, simple_map::SimpleMap<u64, u64>>(mapContractFee, fromChainID, simple_map::create<u64, u64>());
                if (simple_map::contains_key<u64, u64>(contractFeeMap, &toChainID)) {
                    contractFee = *simple_map::borrow<u64, u64>(contractFeeMap, &toChainID);
                };
            };
            tokenScAddr = fromTokenAccount;
        } else if (param.currentChainID == toChainID) {
            if (contractFee == 0u64) {
                let mapContractFee = &mut borrow_global_mut<Cross>(@BridgeDeployer).data.mapContractFee;
                let contractFeeMap = table::borrow_mut_with_default<u64, simple_map::SimpleMap<u64, u64>>(mapContractFee, toChainID, simple_map::create<u64, u64>());
                if (simple_map::contains_key<u64, u64>(contractFeeMap, &fromChainID)) {
                    contractFee = *simple_map::borrow<u64, u64>(contractFeeMap, &fromChainID);
                };
            };
            tokenScAddr = toTokenAccount;
        } else {
            assert!(false, error::invalid_argument(ENO_INPUT_ERROR));
        };

        assert!(param.srcTokenAccount == tokenScAddr, error::invalid_argument(ENO_INPUT_ERROR));
        
        let fromTokenType = TokenManager::get_token_pair_type(param.tokenPairID);
        assert!(fromTokenType == TOKEN_CROSS_TYPE_ERC20, error::invalid_argument(ENO_INPUT_ERROR));

        TokenManager::burn_wrapped_coin<CoinType>(account, param.value);

        if (contractFee > 0) {
            coin::transfer<AptosCoin>(account, @BridgeDeployer, contractFee);
        };

        let tokenAddr = string::bytes(&type_info::type_of<CoinType>());

        event::emit_event<UserBurnLogger>(&mut borrow_global_mut<Cross>(@BridgeDeployer).event_handler.user_burn_logger, UserBurnLogger {
            smgID: param.smgID,
            tokenPairID: param.tokenPairID,
            tokenAccount: tokenAddr,
            value: param.value,
            contractFee: contractFee,
            userAccount: param.destUserAccount,
            fee: contractFee,
        });
    }

    public entry fun smg_mint<CoinType>(account: &signer, uniqueID: address, smgID: address, tokenPairID: u64, value: u64, fee: u64, userAccount: address, signature: vector<u8>) acquires Cross {
        not_halted();
        only_ready_smg(&smgID);

        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        let mapTokenPairContractFee = &mut data.data.mapTokenPairContractFee;
        let contractFee = table::borrow_mut_with_default<u64, u64>(mapTokenPairContractFee, tokenPairID, 0);
        let tokenAddr = string::bytes(&type_info::type_name<CoinType>());
        let pk = Oracle::get_storeman_group_pk(*&smgID);


        let param = RapiditySmgMintParams {
            uniqueID,                  
            smgID,                  
            tokenPairID,           
            value,                  
            fee,     
            destTokenAccount: tokenAddr,                 
            destUserAccount: userAccount,          
            smgFeeProxy: data.smg_fee_proxy, 
        };

        smg_mint_internal<CoinType>(account, &param);

        let sigData = bcs::to_bytes(&SmgSignatureData{
            currentChainID: data.current_chain_id,
            uniqueID: param.uniqueID,
            tokenPairID: param.tokenPairID,
            value: param.value,
            fee: param.fee,
            tokenAccount: param.destTokenAccount,
            userAccount: param.destUserAccount,
        });

        let mHash = hash::sha2_256<SmgSignatureData>(&sigData);
        let result = ed25519::signature_verify_strict(&ed25519::new_signature_from_bytes(signature), &ed25519::new_unvalidated_public_key_from_bytes(pk), mHash);
        assert!(result, error::invalid_argument(ENO_INPUT_ERROR));
    }

    fun smg_mint_internal<CoinType>(account: &signer, param: &RapiditySmgMintParams) acquires Cross {
        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        assert!(!table::contains<address, u8>(&data.data.mapTxStatus, &param.uniqueID), error::invalid_argument(ENO_INPUT_ERROR));
        table::insert<address, u8>(&mut data.data.mapTxStatus, &param.uniqueID, TX_STATUS_CLAIMED);

        let tokenCrossType = TokenManager::get_token_pair_type(param.tokenPairID);
        assert!(tokenCrossType == TOKEN_CROSS_TYPE_ERC20, error::invalid_argument(ENO_INPUT_ERROR));

        if (param.fee > 0) {
            TokenManager::mint_wrapped_coin<CoinType>(account, param.smgFeeProxy, param.fee);
        };

        TokenManager::mint_wrapped_coin<CoinType>(account, param.destUserAccount, param.value);

        let keys = vector::empty();
        let values = vector::empty();

        vector::push_back(&mut keys, b"value:u64");
        vector::push_back(&mut keys, b"tokenAccount:TypeInfo");
        vector::push_back(&mut keys, b"userAccount:address");
        vector::push_back(&mut keys, b"fee:u64");

        vector::push_back(&mut values, bcs::to_bytes(&param.value));
        vector::push_back(&mut values, bcs::to_bytes(&param.destTokenAccount));
        vector::push_back(&mut values, bcs::to_bytes(&param.destUserAccount));
        vector::push_back(&mut values, bcs::to_bytes(&param.fee));

        event::emit_event<SmgMint>(&mut data.event_handler.smg_mint, SmgMint {
            uniqueID: param.uniqueID,
            smgID: param.smgID,
            tokenPairID: param.tokenPairID,
            keys: keys,
            values: values,
        });

        event::emit_event<SmgMintLogger>(&mut data.event_handler.smg_mint_logger, SmgMintLogger {
            uniqueID: param.uniqueID,
            smgID: param.smgID,
            tokenPairID: param.tokenPairID,
            tokenAccount: param.destTokenAccount,
            value: param.value,
            fee: param.fee,
            userAccount: param.destUserAccount,
        });
    }

    public entry fun smg_release<CoinType>(account: &signer, uniqueID: address, smgID: address, tokenPairID: u64, value: u64, fee: u64, userAccount: address, signature: vector<u8>) acquires Cross {
        not_halted();
        only_ready_smg(&smgID);

        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        let mapTokenPairContractFee = &mut data.data.mapTokenPairContractFee;
        let contractFee = table::borrow_mut_with_default<u64, u64>(mapTokenPairContractFee, tokenPairID, 0);
        let tokenAddr = type_info::bytes(&type_info::type_name<CoinType>());
        let pk = Oracle::get_storeman_group_pk(*&smgID);

        let param = RapiditySmgReleaseParams {
            uniqueID,                  
            smgID,                  
            tokenPairID,           
            value,                  
            fee,     
            destTokenAccount: tokenAddr,                 
            destUserAccount: userAccount,          
            smgFeeProxy: data.smg_fee_proxy, 
        };

        smg_release_internal<CoinType>(account, &param);

        let sigData = bcs::to_bytes(&SmgSignatureData{
            currentChainID: data.current_chain_id,
            uniqueID: param.uniqueID,
            tokenPairID: param.tokenPairID,
            value: param.value,
            fee: param.fee,
            tokenAccount: param.destTokenAccount,
            userAccount: param.destUserAccount,
        });

        let mHash = hash::sha2_256<SmgSignatureData>(&sigData);
        let result = ed25519::signature_verify_strict(&ed25519::new_signature_from_bytes(signature), &ed25519::new_unvalidated_public_key_from_bytes(pk), mHash);
        assert!(result, error::invalid_argument(ENO_INPUT_ERROR));
    }

    fun smg_release_internal<CoinType>(account: &signer, param: &RapiditySmgReleaseParams) acquires Cross {
        let data = borrow_global_mut<Cross>(@BridgeDeployer);
        assert!(!table::contains<address, u8>(&data.data.mapTxStatus, &param.uniqueID), error::invalid_argument(ENO_INPUT_ERROR));
        table::insert<address, u8>(&mut data.data.mapTxStatus, &param.uniqueID, TX_STATUS_CLAIMED);

        let tokenCrossType = TokenManager::get_token_pair_type(param.tokenPairID);
        assert!(tokenCrossType == TOKEN_CROSS_TYPE_ERC20, error::invalid_argument(ENO_INPUT_ERROR));

        if (param.fee > 0) {
            TokenManager::release_coin<CoinType>(account, param.smgFeeProxy, param.fee);
        };

        TokenManager::release_coin<CoinType>(account, param.destUserAccount, param.value);

        let keys = vector::empty();
        let values = vector::empty();

        vector::push_back(&mut keys, b"value:u64");
        vector::push_back(&mut keys, b"tokenAccount:TypeInfo");
        vector::push_back(&mut keys, b"userAccount:address");
        vector::push_back(&mut keys, b"fee:u64");

        vector::push_back(&mut values, bcs::to_bytes(&param.value));
        vector::push_back(&mut values, bcs::to_bytes(&param.destTokenAccount));
        vector::push_back(&mut values, bcs::to_bytes(&param.destUserAccount));
        vector::push_back(&mut values, bcs::to_bytes(&param.fee));

        event::emit_event<SmgRelease>(&mut data.event_handler.smg_release, SmgRelease {
            uniqueID: param.uniqueID,
            smgID: param.smgID,
            tokenPairID: param.tokenPairID,
            keys: keys,
            values: values,
        });

        event::emit_event<SmgReleaseLogger>(&mut data.event_handler.smg_release_logger, SmgReleaseLogger {
            uniqueID: param.uniqueID,
            smgID: param.smgID,
            tokenPairID: param.tokenPairID,
            tokenAccount: param.destTokenAccount,
            value: param.value,
            fee: param.fee,
            userAccount: param.destUserAccount,
        });
    }
}

