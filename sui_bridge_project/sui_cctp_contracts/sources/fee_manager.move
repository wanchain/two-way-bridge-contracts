module fee_manager::fee_manager {
    use sui::table::{Self, Table};
    use sui::event;

    // Error codes
    const E_NOT_ADMIN: u64 = 0;
    const E_NOT_OPERATOR: u64 = 1;

    // Structure to store fee configuration
    public struct FeeConfig has key {
        id: object::UID,
        admin: address,
        operator: address,
        fees: Table<u64, u64>,
    }

    // Fee update event
    public struct FeeUpdatedEvent has copy, drop {
        chain_id: u64,
        fee: u64,
    }

    // Admin change event
    public struct AdminChangedEvent has copy, drop {
        old_admin: address,
        new_admin: address,
    }

    // Operator change event
    public struct OperatorChangedEvent has copy, drop {
        old_operator: address,
        new_operator: address,
    }

    // Initialization function
    fun init(ctx: &mut tx_context::TxContext) {
        let sender = tx_context::sender(ctx);
        let fee_config = FeeConfig {
            id: object::new(ctx),
            admin: sender,
            operator: sender,
            fees: table::new(ctx),
        };
        transfer::share_object(fee_config);
    }

    // Add initialization function for testing purposes
    #[test_only]
    public fun test_init(ctx: &mut tx_context::TxContext) {
        init(ctx)
    }

    // Set fee for a specific chain_id (now only accessible by operator)
    public entry fun set_fee(
        fee_config: &mut FeeConfig,
        chain_id: u64,
        fee: u64,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(tx_context::sender(ctx) == fee_config.operator, E_NOT_OPERATOR);
        if (table::contains(&fee_config.fees, chain_id)) {
            table::remove(&mut fee_config.fees, chain_id);
        };
        table::add(&mut fee_config.fees, chain_id, fee);
        event::emit(FeeUpdatedEvent { chain_id, fee });
    }

    // Query fee for a specific chain_id
    public fun get_fee(fee_config: &FeeConfig, chain_id: u64): u64 {
        if (table::contains(&fee_config.fees, chain_id)) {
            *table::borrow(&fee_config.fees, chain_id)
        } else {
            0
        }
    }

    // Change admin address
    public entry fun change_admin(
        fee_config: &mut FeeConfig,
        new_admin: address,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(tx_context::sender(ctx) == fee_config.admin, E_NOT_ADMIN);
        let old_admin = fee_config.admin;
        fee_config.admin = new_admin;
        event::emit(AdminChangedEvent { old_admin, new_admin });
    }

    // Change operator address (only accessible by admin)
    public entry fun change_operator(
        fee_config: &mut FeeConfig,
        new_operator: address,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(tx_context::sender(ctx) == fee_config.admin, E_NOT_ADMIN);
        let old_operator = fee_config.operator;
        fee_config.operator = new_operator;
        event::emit(OperatorChangedEvent { old_operator, new_operator });
    }
}
