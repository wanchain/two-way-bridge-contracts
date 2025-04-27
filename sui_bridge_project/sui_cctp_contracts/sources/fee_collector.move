module fee_collector::fee_collector {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use fee_manager::fee_manager::{Self, FeeConfig};

    // Error codes
    const E_INSUFFICIENT_FEE: u64 = 0;
    const E_NOT_ADMIN: u64 = 1;

    // Fee collector configuration
    public struct FeeCollectorConfig has key {
        id: object::UID,
        admin: address,
        fee_recipient: address,
    }

    // Fee collection success event
    public struct FeeCollectedEvent has copy, drop {
        chain_id: u64,
        amount: u64,
        recipient: address,
    }

    public struct AgentMintEvent has copy, drop {
        to_address: address,
        amount: u64,
        from_tx_hash: vector<u8>,
    }

    // Admin change event
    public struct AdminChangedEvent has copy, drop {
        old_admin: address,
        new_admin: address,
    }

    // Fee recipient change event
    public struct FeeRecipientChangedEvent has copy, drop {
        old_recipient: address,
        new_recipient: address,
    }

    // Initialization function
    fun init(ctx: &mut tx_context::TxContext) {
        let collector_config = FeeCollectorConfig {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            fee_recipient: tx_context::sender(ctx),
        };
        transfer::share_object(collector_config);
    }

    // Fee collection function
    public entry fun collect_fee(
        fee_config: &FeeConfig,
        collector_config: &FeeCollectorConfig,
        chain_id: u64,
        payment: &mut Coin<SUI>,
        ctx: &mut tx_context::TxContext
    ) {
        let required_fee = fee_manager::get_fee(fee_config, chain_id);
        assert!(coin::value(payment) >= required_fee, E_INSUFFICIENT_FEE);

        if (required_fee > 0) {
            let fee_coin = coin::split(payment, required_fee, ctx);
            transfer::public_transfer(fee_coin, collector_config.fee_recipient);
            event::emit(FeeCollectedEvent { 
                chain_id, 
                amount: required_fee, 
                recipient: collector_config.fee_recipient 
            });
        };
    }

    public entry fun agent_mint(
        to_address: address,
        amount: u64,
        from_tx_hash: vector<u8>
    ) {
        event::emit(AgentMintEvent { to_address, amount, from_tx_hash });
    }

    // Change admin address
    public entry fun change_admin(
        collector_config: &mut FeeCollectorConfig,
        new_admin: address,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(tx_context::sender(ctx) == collector_config.admin, E_NOT_ADMIN);
        let old_admin = collector_config.admin;
        collector_config.admin = new_admin;
        event::emit(AdminChangedEvent { old_admin, new_admin });
    }

    // Change fee recipient address
    public entry fun change_fee_recipient(
        collector_config: &mut FeeCollectorConfig,
        new_recipient: address,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(tx_context::sender(ctx) == collector_config.admin, E_NOT_ADMIN);
        let old_recipient = collector_config.fee_recipient;
        collector_config.fee_recipient = new_recipient;
        event::emit(FeeRecipientChangedEvent { old_recipient, new_recipient });
    }

    // Add initialization function for testing purposes
    #[test_only]
    public fun test_init(ctx: &mut tx_context::TxContext) {
        init(ctx)
    }
}