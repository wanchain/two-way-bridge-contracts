module sui_bridge_contracts::cross {
    use sui::table;
    use sui::event;
    use sui_bridge_contracts::admin;
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::balance;
    use sui::dynamic_field as df;
    use std::type_name;
    use std::bcs;
    use std::ascii;
    use sui::clock::{Clock};
    use sui_bridge_contracts::oracle;
    use cctp_helper::fee_manager::{Self, FeeConfig};
    use sui::sui::SUI;

    #[allow(unused_const)]
    const CHAIN_ID: u64 = 2147484432; // SUI chain bip44 chainId

    /// Error codes
    const ETokenPairNotFound: u64 = 2;
    const EInvalidChainId: u64 = 3;
    const EInvalidTokenAddress: u64 = 4;
    const ETokenPairIdExists: u64 = 5;
    const EInvalidTokenType: u64 = 6;
    const ETokenPairNotActive: u64 = 7;
    const EInsufficientBalance: u64 = 8;
    const ETokenAddressMismatch: u64 = 9;
    const ETreasuryCapsNotFound: u64 = 10;
    const ETreasuryCapsAlreadyExists: u64 = 11;
    const ETransactionAlreadyProcessed: u64 = 12;
    const EInsufficientFee: u64 = 13;
    const EBridgePaused: u64 = 14;

    /// Token source type
    const TOKEN_TYPE_NATIVE: u8 = 1; // Native token on the chain
    #[allow(unused_const)]
    const TOKEN_TYPE_WRAPPED: u8 = 2; // Token wrapped by contract

    /// TokenPair struct to store cross-chain token mapping
    public struct TokenPair has store, drop, copy {
        token_pair_id: u64,
        sui_token_address: ascii::String,
        sui_token_type: u8, // 1 = native token, 2 = wrapped by contract

        external_chain_id: u64,
        external_token_address: ascii::String,
        is_active: bool
    }

    /// TokenPairRegistry to store all token pairs
    public struct TokenPairRegistry has key {
        id: object::UID,
        // Map from token_pair_id to TokenPair
        pairs_by_id: table::Table<u64, TokenPair>
    }

    /// TreasuryCapsRegistry to store all token treasury caps
    public struct TreasuryCapsRegistry has key {
        id: object::UID
    }

    /// Foundation wallet configuration
    public struct FoundationConfig has key {
        id: object::UID,
        fee_recipient: address
    }

    /// Pause configuration to control bridge operations
    public struct PauseConfig has key {
        id: object::UID,
        is_paused: bool
    }

    /// Events
    public struct TokenPairAdded has copy, drop {
        token_pair_id: u64,
        sui_token_address: ascii::String,
        external_chain_id: u64,
        external_token_address: ascii::String,
        sui_token_type: u8
    }

    public struct TokenPairRemoved has copy, drop {
        token_pair_id: u64,
        sui_token_address: ascii::String,
        external_chain_id: u64,
        external_token_address: ascii::String
    }

    public struct TokenPairUpdated has copy, drop {
        token_pair_id: u64,
        sui_token_address: ascii::String,
        external_chain_id: u64,
        external_token_address: ascii::String,
        sui_token_type: u8,
        is_active: bool
    }

    /// Treasury cap received event
    public struct TreasuryCapReceived has copy, drop {
        token_type: ascii::String,
        receiver: address
    }

    /// User lock event
    public struct UserLockLogger has copy, drop {
        smg_id: vector<u8>,
        token_pair_id: u64,
        sender: address,
        recipient: ascii::String,
        amount: u64,
        sui_token_address: ascii::String,
        external_chain_id: u64,
        external_token_address: ascii::String,
        token_type: ascii::String
    }

    /// User burn event
    public struct UserBurnLogger has copy, drop {
        smg_id: vector<u8>,
        token_pair_id: u64,
        sender: address,
        recipient: ascii::String,
        amount: u64,
        sui_token_address: ascii::String,
        external_chain_id: u64,
        external_token_address: ascii::String,
        token_type: ascii::String
    }

    /// Mint event for cross-chain transfer
    public struct SmgMintLogger has copy, drop {
        unique_id: vector<u8>,
        smg_id: vector<u8>,
        token_pair_id: u64,
        recipient: address,
        amount: u64,
        serviceFee: u64,
        fee_recipient: address,
        token_type: ascii::String
    }

    /// Release event for cross-chain transfer
    public struct SmgReleaseLogger has copy, drop {
        unique_id: vector<u8>,
        smg_id: vector<u8>,
        token_pair_id: u64,
        recipient: address,
        amount: u64,
        serviceFee: u64,
        fee_recipient: address,
        token_type: ascii::String
    }

    /// Fee collected event
    public struct FeeCollectedEvent has copy, drop {
        chain_id: u64,
        amount: u64,
        recipient: address
    }

    /// Fee recipient changed event
    public struct FeeRecipientChangedEvent has copy, drop {
        old_recipient: address,
        new_recipient: address
    }

    /// Pause status changed event
    public struct PauseStatusChangedEvent has copy, drop {
        is_paused: bool
    }

    /// Vault to store locked tokens
    public struct TokenVault has key {
        id: object::UID
    }

    /// Balance wrapper for dynamic fields
    public struct TokenBalance<phantom T> has store {
        balance: balance::Balance<T>
    }

    /// Key for token balance dynamic field
    public struct TokenBalanceKey has store, copy, drop {
        type_name: type_name::TypeName
    }

    /// Registry to track processed transactions
    public struct ProcessedTransactions has key {
        id: UID,
        // Map from transaction unique_id to bool (true if processed)
        processed: table::Table<vector<u8>, bool>
    }

    /// Initialize the cross-chain bridge
    fun init(ctx: &mut TxContext) {
        let registry = TokenPairRegistry {
            id: object::new(ctx),
            pairs_by_id: table::new(ctx)
        };
        
        let vault = TokenVault {
            id: object::new(ctx)
        };
        
        let treasury_caps_registry = TreasuryCapsRegistry {
            id: object::new(ctx)
        };
        
        let processed_tx = ProcessedTransactions {
            id: object::new(ctx),
            processed: table::new(ctx)
        };
        
        let foundation_config = FoundationConfig {
            id: object::new(ctx),
            fee_recipient: tx_context::sender(ctx)
        };
        
        let pause_config = PauseConfig {
            id: object::new(ctx),
            is_paused: false
        };
        
        transfer::share_object(registry);
        transfer::share_object(vault);
        transfer::share_object(treasury_caps_registry);
        transfer::share_object(processed_tx);
        transfer::share_object(foundation_config);
        transfer::share_object(pause_config);
    }

    /// Test initialization function
    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx)
    }

    /// Helper function for tests to check if token pair exists
    #[test_only]
    public fun token_pair_exists(registry: &TokenPairRegistry, token_pair_id: u64): bool {
        table::contains(&registry.pairs_by_id, token_pair_id)
    }

    /// Helper function for tests to get fee recipient
    #[test_only]
    public fun get_fee_recipient(foundation_config: &FoundationConfig): address {
        foundation_config.fee_recipient
    }

    /// Add a new token pair
    public entry fun add_token_pair(
        registry: &mut TokenPairRegistry,
        admin_cap: &admin::Admin,
        token_pair_id: u64,
        sui_token_address: ascii::String,
        sui_token_type: u8,
        external_chain_id: u64, 
        external_token_address: ascii::String,
        ctx: &mut TxContext
    ) {
        // Verify caller has admin permission
        admin::assert_admin(admin_cap, ctx);
        
        // Validate input parameters
        assert!(token_pair_id > 0, EInvalidChainId);
        assert!(external_chain_id > 0, EInvalidChainId);
        assert!(ascii::length(&sui_token_address) > 0, EInvalidTokenAddress);
        assert!(ascii::length(&external_token_address) > 0, EInvalidTokenAddress);
        assert!(sui_token_type == TOKEN_TYPE_NATIVE || sui_token_type == TOKEN_TYPE_WRAPPED, EInvalidTokenType);
        
        // Ensure token pair ID does not exist
        assert!(!table::contains(&registry.pairs_by_id, token_pair_id), ETokenPairIdExists);
        
        // Add token pair to registry
        table::add(&mut registry.pairs_by_id, token_pair_id, TokenPair {
            token_pair_id,
            sui_token_address,
            sui_token_type,
            external_chain_id,
            external_token_address,
            is_active: true
        });
        
        // Emit event
        event::emit(TokenPairAdded {
            token_pair_id,
            sui_token_address,
            external_chain_id,
            external_token_address,
            sui_token_type
        });
    }

    /// Remove a token pair
    public entry fun remove_token_pair(
        registry: &mut TokenPairRegistry,
        admin_cap: &admin::Admin,
        token_pair_id: u64,
        ctx: &mut TxContext
    ) {
        // Verify caller has admin permission
        admin::assert_admin(admin_cap, ctx);
        
        // Ensure the token pair exists
        assert!(table::contains(&registry.pairs_by_id, token_pair_id), ETokenPairNotFound);
        
        // Get token pair
        let token_pair = table::remove(&mut registry.pairs_by_id, token_pair_id);
        
        // Emit event
        event::emit(TokenPairRemoved {
            token_pair_id,
            sui_token_address: token_pair.sui_token_address,
            external_chain_id: token_pair.external_chain_id,
            external_token_address: token_pair.external_token_address
        });
    }

    /// Update a token pair
    public entry fun update_token_pair(
        registry: &mut TokenPairRegistry,
        admin_cap: &admin::Admin,
        token_pair_id: u64,
        sui_token_address: ascii::String,
        sui_token_type: u8,
        external_chain_id: u64,
        external_token_address: ascii::String,
        is_active: bool,
        ctx: &mut TxContext
    ) {
        // Verify caller has admin permission
        admin::assert_admin(admin_cap, ctx);
        
        // Validate input parameters
        assert!(external_chain_id > 0, EInvalidChainId);
        assert!(ascii::length(&sui_token_address) > 0, EInvalidTokenAddress);
        assert!(ascii::length(&external_token_address) > 0, EInvalidTokenAddress);
        assert!(sui_token_type == TOKEN_TYPE_NATIVE || sui_token_type == TOKEN_TYPE_WRAPPED, EInvalidTokenType);
        
        // Ensure the token pair exists
        assert!(table::contains(&registry.pairs_by_id, token_pair_id), ETokenPairNotFound);
        
        // Update token pair
        let token_pair = table::borrow_mut(&mut registry.pairs_by_id, token_pair_id);
        token_pair.sui_token_address = sui_token_address;
        token_pair.sui_token_type = sui_token_type;
        token_pair.external_chain_id = external_chain_id;
        token_pair.external_token_address = external_token_address;
        token_pair.is_active = is_active;
        
        // Emit event
        event::emit(TokenPairUpdated {
            token_pair_id,
            sui_token_address: sui_token_address,
            external_chain_id,
            external_token_address: external_token_address,
            sui_token_type,
            is_active
        });
    }

    /// Get token pair by ID
    public fun get_token_pair_by_id(
        registry: &TokenPairRegistry,
        token_pair_id: u64
    ): (ascii::String, ascii::String, u64, u8, bool) {
        // Ensure the token pair exists
        assert!(table::contains(&registry.pairs_by_id, token_pair_id), ETokenPairNotFound);
        
        // Get token pair
        let token_pair = table::borrow(&registry.pairs_by_id, token_pair_id);
        
        (
            token_pair.sui_token_address,
            token_pair.external_token_address,
            token_pair.external_chain_id,
            token_pair.sui_token_type,
            token_pair.is_active
        )
    }

    /// Receive treasury cap from token contract
    public entry fun receive_treasury_cap<CoinType>(
        treasury_caps_registry: &mut TreasuryCapsRegistry,
        treasury_cap: TreasuryCap<CoinType>,
        ctx: &mut TxContext
    ) {
        // Get type name for the coin
        let type_name_val = type_name::get<CoinType>();
        
        // Check if treasury cap already exists
        assert!(!df::exists_(&treasury_caps_registry.id, type_name_val), ETreasuryCapsAlreadyExists);
        
        // Store treasury cap in registry
        df::add(&mut treasury_caps_registry.id, type_name_val, treasury_cap);
        
        // Get type name for the coin
        let type_name_val = type_name::get<CoinType>();
        let type_name_str = type_name::into_string(type_name_val);
        
        // Emit event
        event::emit(TreasuryCapReceived {
            token_type: type_name_str,
            receiver: tx_context::sender(ctx)
        });
    }
    
    /// Mint tokens using stored treasury cap (admin only, test only)
    #[test_only]
    public entry fun admin_mint<CoinType>(
        treasury_caps_registry: &mut TreasuryCapsRegistry,
        admin_cap: &admin::Admin,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // Verify caller has owner permission
        admin::assert_owner(admin_cap, ctx);
        
        // Get type name for the coin
        let type_name_val = type_name::get<CoinType>();
        
        // Check if treasury cap exists
        assert!(df::exists_(&treasury_caps_registry.id, type_name_val), ETreasuryCapsNotFound);
        
        // Borrow treasury cap
        let treasury_cap = df::borrow_mut<type_name::TypeName, TreasuryCap<CoinType>>(
            &mut treasury_caps_registry.id, 
            type_name_val
        );
        
        // Mint coins
        let minted_coin = coin::mint(treasury_cap, amount, ctx);
        
        // Transfer to recipient
        transfer::public_transfer(minted_coin, recipient);
    }
    
    /// Burn tokens using stored treasury cap (admin only, test only)
    #[test_only]
    public entry fun admin_burn<CoinType>(
        treasury_caps_registry: &mut TreasuryCapsRegistry,
        admin_cap: &admin::Admin,
        coin_in: Coin<CoinType>,
        ctx: &mut TxContext
    ) {
        // Verify caller has owner permission
        admin::assert_owner(admin_cap, ctx);
        
        // Get type name for the coin
        let type_name_val = type_name::get<CoinType>();
        
        // Check if treasury cap exists
        assert!(df::exists_(&treasury_caps_registry.id, type_name_val), ETreasuryCapsNotFound);
        
        // Borrow treasury cap
        let treasury_cap = df::borrow_mut<type_name::TypeName, TreasuryCap<CoinType>>(
            &mut treasury_caps_registry.id, 
            type_name_val
        );
        
        // Burn coins
        coin::burn(treasury_cap, coin_in);
    }

    /// Set foundation fee recipient address
    public entry fun set_fee_recipient(
        foundation_config: &mut FoundationConfig,
        admin_cap: &admin::Admin,
        new_recipient: address,
        ctx: &mut tx_context::TxContext
    ) {
        // Verify caller has admin permission
        admin::assert_admin(admin_cap, ctx);
        
        let old_recipient = foundation_config.fee_recipient;
        foundation_config.fee_recipient = new_recipient;
        
        // Emit event
        event::emit(FeeRecipientChangedEvent {
            old_recipient,
            new_recipient
        });
    }

    /// Set pause status for bridge operations
    public entry fun set_pause_status(
        pause_config: &mut PauseConfig,
        admin_cap: &admin::Admin,
        is_paused: bool,
        ctx: &mut tx_context::TxContext
    ) {
        // Verify caller has admin permission
        admin::assert_admin(admin_cap, ctx);
        
        // Only update if the status is changing
        if (pause_config.is_paused != is_paused) {
            pause_config.is_paused = is_paused;
            
            // Emit event
            event::emit(PauseStatusChangedEvent {
                is_paused
            });
        }
    }

    public entry fun user_lock<T>(
        registry: &TokenPairRegistry,
        vault: &mut TokenVault,
        foundation_config: &FoundationConfig,
        pause_config: &PauseConfig,
        fee_config: &FeeConfig,
        oracle_storage: &oracle::OracleStorage,
        clock: &Clock,
        smg_id: vector<u8>,
        token_pair_id: u64,
        recipient: ascii::String,
        coin_in: coin::Coin<T>,
        fee_coin: &mut Coin<SUI>,
        ctx: &mut tx_context::TxContext
    ) {
        // Check if bridge is paused
        assert!(!pause_config.is_paused, EBridgePaused);
        
        // Ensure the token pair exists
        assert!(table::contains(&registry.pairs_by_id, token_pair_id), ETokenPairNotFound);
        
        // Get token pair
        let token_pair = table::borrow(&registry.pairs_by_id, token_pair_id);
        
        // Ensure token pair is active
        assert!(token_pair.is_active, ETokenPairNotActive);
        
        // Ensure token type is native
        assert!(token_pair.sui_token_type == TOKEN_TYPE_NATIVE, EInvalidTokenType);
        
        // Get fee amount for the destination chain
        let required_fee = fee_manager::get_fee(fee_config, token_pair.external_chain_id);
        
        // Check if user has provided enough fee
        assert!(coin::value(fee_coin) >= required_fee, EInsufficientFee);
        
        // Collect fee if required
        if (required_fee > 0) {
            let fee_payment = coin::split(fee_coin, required_fee, ctx);
            transfer::public_transfer(fee_payment, foundation_config.fee_recipient);
            
            // Emit fee collection event
            event::emit(FeeCollectedEvent {
                chain_id: token_pair.external_chain_id,
                amount: required_fee,
                recipient: foundation_config.fee_recipient
            });
        };
        
        // Verify coin type matches token pair's sui_token_address
        let type_name_val = type_name::get<T>();
        let type_str = type_name::into_string(type_name_val);
        
        // Compare type string with token pair's sui_token_address
        assert!(type_str == token_pair.sui_token_address, ETokenAddressMismatch);
        
        // Get coin amount
        let amount = coin::value(&coin_in);
        assert!(amount > 0, EInsufficientBalance);

        oracle::verify_smg_id(
            oracle_storage,
            clock,
            smg_id
        );
        
        // Create balance key
        let balance_key = TokenBalanceKey { 
            type_name: type_name_val
        };
        
        // Check if balance exists
        if (!df::exists_(&vault.id, balance_key)) {
            // Create new balance
            let token_balance = TokenBalance<T> { 
                balance: balance::zero<T>() 
            };
            df::add(&mut vault.id, balance_key, token_balance);
        };
        
        // Get balance
        let token_balance = df::borrow_mut<TokenBalanceKey, TokenBalance<T>>(
            &mut vault.id, 
            balance_key
        );
        
        // Deposit coin to balance
        balance::join(&mut token_balance.balance, coin::into_balance(coin_in));
        
        // Get user address
        let sender = tx_context::sender(ctx);
        
        // Emit event
        event::emit(UserLockLogger {
            smg_id,
            token_pair_id,
            sender,
            recipient,
            amount,
            sui_token_address: token_pair.sui_token_address,
            external_chain_id: token_pair.external_chain_id,
            external_token_address: token_pair.external_token_address,
            token_type: type_str
        });
    }

    public entry fun user_burn<CoinType>(
        registry: &TokenPairRegistry,
        treasury_caps_registry: &mut TreasuryCapsRegistry,
        foundation_config: &FoundationConfig,
        pause_config: &PauseConfig,
        fee_config: &FeeConfig,
        oracle_storage: &oracle::OracleStorage,
        clock: &Clock,
        smg_id: vector<u8>,
        token_pair_id: u64,
        recipient: ascii::String,
        coin_in: coin::Coin<CoinType>,
        fee_coin: &mut Coin<SUI>,
        ctx: &mut tx_context::TxContext
    ) {
        // Check if bridge is paused
        assert!(!pause_config.is_paused, EBridgePaused);
        
        // Ensure the token pair exists
        assert!(table::contains(&registry.pairs_by_id, token_pair_id), ETokenPairNotFound);
        
        // Get token pair
        let token_pair = table::borrow(&registry.pairs_by_id, token_pair_id);
        
        // Ensure token pair is active
        assert!(token_pair.is_active, ETokenPairNotActive);
        
        // Ensure token type is wrapped
        assert!(token_pair.sui_token_type == TOKEN_TYPE_WRAPPED, EInvalidTokenType);
        
        // Get fee amount for the destination chain
        let required_fee = fee_manager::get_fee(fee_config, token_pair.external_chain_id);
        
        // Check if user has provided enough fee
        assert!(coin::value(fee_coin) >= required_fee, EInsufficientFee);
        
        // Collect fee if required
        if (required_fee > 0) {
            let fee_payment = coin::split(fee_coin, required_fee, ctx);
            transfer::public_transfer(fee_payment, foundation_config.fee_recipient);
            
            // Emit fee collection event
            event::emit(FeeCollectedEvent {
                chain_id: token_pair.external_chain_id,
                amount: required_fee,
                recipient: foundation_config.fee_recipient
            });
        };
        
        // Get coin amount
        let amount = coin::value(&coin_in);
        assert!(amount > 0, EInsufficientBalance);
        
        // Verify coin type matches token pair's sui_token_address
        let type_name_val = type_name::get<CoinType>();
        let type_str = type_name::into_string(type_name_val);
        
        // Compare type string with token pair's sui_token_address
        assert!(type_str == token_pair.sui_token_address, ETokenAddressMismatch);
        
        // Check if treasury cap exists
        assert!(df::exists_(&treasury_caps_registry.id, type_name_val), ETreasuryCapsNotFound);

        oracle::verify_smg_id(
            oracle_storage,
            clock,
            smg_id
        );
        
        // Borrow treasury cap
        let treasury_cap = df::borrow_mut<type_name::TypeName, TreasuryCap<CoinType>>(
            &mut treasury_caps_registry.id, 
            type_name_val
        );
        
        // Burn coins directly using treasury cap
        coin::burn(treasury_cap, coin_in);
        
        // Get user address
        let sender = tx_context::sender(ctx);
        
        // Get type bytes for the event
        // Emit event
        event::emit(UserBurnLogger {
            smg_id,
            token_pair_id,
            sender,
            recipient,
            amount,
            sui_token_address: token_pair.sui_token_address,
            external_chain_id: token_pair.external_chain_id,
            external_token_address: token_pair.external_token_address,
            token_type: type_str
        });
    }

    public entry fun smg_mint<CoinType>(
        registry: &TokenPairRegistry,
        treasury_caps_registry: &mut TreasuryCapsRegistry,
        processed_tx: &mut ProcessedTransactions,
        oracle_storage: &oracle::OracleStorage,
        pause_config: &PauseConfig,
        foundation_config: &FoundationConfig,
        clock: &Clock,
        unique_id: vector<u8>,
        smg_id: vector<u8>,
        token_pair_id: u64,
        to_account: address,
        amount: u64,
        serviceFee: u64,
        signature: vector<u8>,
        ctx: &mut TxContext
    ) {
        // Check if bridge is paused
        assert!(!pause_config.is_paused, EBridgePaused);
        
        // Check if transaction has already been processed
        assert!(!table::contains(&processed_tx.processed, unique_id), ETransactionAlreadyProcessed);
        
        // Ensure the token pair exists
        assert!(table::contains(&registry.pairs_by_id, token_pair_id), ETokenPairNotFound);
        
        // Get token pair
        let token_pair = table::borrow(&registry.pairs_by_id, token_pair_id);
        
        // Ensure token pair is active
        assert!(token_pair.is_active, ETokenPairNotActive);
        
        // Ensure token type is wrapped
        assert!(token_pair.sui_token_type == TOKEN_TYPE_WRAPPED, EInvalidTokenType);
        
        // Get type name for the coin
        let type_name_val = type_name::get<CoinType>();
        
        // Verify coin type matches token pair's sui_token_address
        let type_str = type_name::into_string(type_name_val);
        
        // Compare type string with token pair's sui_token_address
        assert!(type_str == token_pair.sui_token_address, ETokenAddressMismatch);
        
        // Check if treasury cap exists
        assert!(df::exists_(&treasury_caps_registry.id, type_name_val), ETreasuryCapsNotFound);
        
        // Get fee recipient from foundation config
        let fee_recipient = foundation_config.fee_recipient;
        
        // Create message hash for signature verification
        // Format: unique_id + token_pair_id + to_account + amount + serviceFee
        let mut message = vector::empty<u8>();
        vector::append(&mut message, unique_id);
        vector::append(&mut message, bcs::to_bytes(&token_pair_id));
        vector::append(&mut message, bcs::to_bytes(&to_account));
        vector::append(&mut message, bcs::to_bytes(&amount));
        vector::append(&mut message, bcs::to_bytes(&serviceFee));
        
        // Verify signature using oracle module
        oracle::verify_signature(
            oracle_storage,
            clock,
            smg_id,
            message,
            signature
        );
        
        // Borrow treasury cap
        let treasury_cap = df::borrow_mut<type_name::TypeName, TreasuryCap<CoinType>>(
            &mut treasury_caps_registry.id, 
            type_name_val
        );
        
        // Mint new coins for the user
        let minted_coins = coin::mint(treasury_cap, amount, ctx);
        
        // Transfer minted coins to recipient
        transfer::public_transfer(minted_coins, to_account);
        
        // Mint service fee coins if fee is greater than zero
        if (serviceFee > 0) {
            let fee_coins = coin::mint(treasury_cap, serviceFee, ctx);
            transfer::public_transfer(fee_coins, fee_recipient);
        };
        
        // Mark transaction as processed
        table::add(&mut processed_tx.processed, unique_id, true);
        
        // Emit event
        event::emit(SmgMintLogger {
            unique_id,
            smg_id,
            token_pair_id,
            recipient: to_account,
            amount,
            serviceFee,
            fee_recipient,
            token_type: type_str
        });
    }

    public entry fun smg_release<CoinType>(
        registry: &TokenPairRegistry,
        vault: &mut TokenVault,
        processed_tx: &mut ProcessedTransactions,
        oracle_storage: &oracle::OracleStorage,
        pause_config: &PauseConfig,
        foundation_config: &FoundationConfig,
        clock: &Clock,
        unique_id: vector<u8>,
        smg_id: vector<u8>,
        token_pair_id: u64,
        to_account: address,
        amount: u64,
        serviceFee: u64,
        signature: vector<u8>,
        ctx: &mut TxContext
    ) {
        // Check if bridge is paused
        assert!(!pause_config.is_paused, EBridgePaused);
        
        // Check if transaction has already been processed
        assert!(!table::contains(&processed_tx.processed, unique_id), ETransactionAlreadyProcessed);
        
        // Ensure the token pair exists
        assert!(table::contains(&registry.pairs_by_id, token_pair_id), ETokenPairNotFound);
        
        // Get token pair
        let token_pair = table::borrow(&registry.pairs_by_id, token_pair_id);
        
        // Ensure token pair is active
        assert!(token_pair.is_active, ETokenPairNotActive);
        
        // Ensure token type is native
        assert!(token_pair.sui_token_type == TOKEN_TYPE_NATIVE, EInvalidTokenType);
        
        // Verify coin type matches token pair's sui_token_address
        let type_name_val = type_name::get<CoinType>();
        let type_str = type_name::into_string(type_name_val);
        
        // Compare type string with token pair's sui_token_address
        assert!(type_str == token_pair.sui_token_address, ETokenAddressMismatch);
        
        // Get fee recipient from foundation config
        let fee_recipient = foundation_config.fee_recipient;
        
        // Create message for signature verification
        // Format: unique_id + token_pair_id + to_account + amount + serviceFee
        let mut message = vector::empty<u8>();
        vector::append(&mut message, unique_id);
        vector::append(&mut message, bcs::to_bytes(&token_pair_id));
        vector::append(&mut message, bcs::to_bytes(&to_account));
        vector::append(&mut message, bcs::to_bytes(&amount));
        vector::append(&mut message, bcs::to_bytes(&serviceFee));
        
        // Verify signature using oracle module
        oracle::verify_signature(
            oracle_storage,
            clock,
            smg_id,
            message,
            signature
        );
        
        // Create balance key
        let balance_key = TokenBalanceKey { 
            type_name: type_name_val
        };
        
        // Check if balance exists in vault
        assert!(df::exists_(&vault.id, balance_key), EInsufficientBalance);
        
        // Get balance from vault
        let token_balance = df::borrow_mut<TokenBalanceKey, TokenBalance<CoinType>>(
            &mut vault.id, 
            balance_key
        );
        
        // Check if vault has enough balance for both amount and service fee
        assert!(balance::value(&token_balance.balance) >= (amount + serviceFee), EInsufficientBalance);
        
        // Take tokens from vault balance for the user
        let withdrawn_balance = balance::split(&mut token_balance.balance, amount);
        
        // Create coin from balance
        let coin_out = coin::from_balance(withdrawn_balance, ctx);
        
        // Transfer coins to recipient
        transfer::public_transfer(coin_out, to_account);
        
        // Process service fee if greater than zero
        if (serviceFee > 0) {
            let fee_balance = balance::split(&mut token_balance.balance, serviceFee);
            let fee_coin = coin::from_balance(fee_balance, ctx);
            transfer::public_transfer(fee_coin, fee_recipient);
        };
        
        // Mark transaction as processed
        table::add(&mut processed_tx.processed, unique_id, true);
        
        // Emit event
        event::emit(SmgReleaseLogger {
            unique_id,
            smg_id,
            token_pair_id,
            recipient: to_account,
            amount,
            serviceFee,
            fee_recipient,
            token_type: type_str
        });
    }
}
