module sui_bridge_contracts::admin {
    use sui::event;

    /// Error codes
    const ENotAuthorized: u64 = 0;
    const EZeroAddress: u64 = 1;

    /// Events
    public struct OwnerChanged has copy, drop {
        old_owner: address,
        new_owner: address,
    }

    public struct AdminChanged has copy, drop {
        old_admin: address,
        new_admin: address,
    }

    public struct OracleChanged has copy, drop {
        old_oracle: address,
        new_oracle: address,
    }

    public struct OperatorChanged has copy, drop {
        old_operator: address,
        new_operator: address,
    }

    /// Admin object that stores role addresses
    public struct Admin has key {
        id: UID,
        owner: address,
        admin: address,
        oracle: address,
        operator: address,
    }

    /// One-time witness for initialization
    public struct ADMIN has drop {}

    /// Initialization function, creates Admin object and sets initial role addresses
    fun init(_witness: ADMIN, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        let admin = Admin {
            id: object::new(ctx),
            owner: sender,
            admin: sender,
            oracle: sender,
            operator: sender,
        };

        // Make Admin a shared object
        transfer::share_object(admin);
    }

    /// Check if caller is owner
    public fun assert_owner(admin: &Admin, ctx: &TxContext) {
        assert!(tx_context::sender(ctx) == admin.owner, ENotAuthorized);
    }

    /// Check if caller is admin
    public fun assert_admin(admin: &Admin, ctx: &TxContext) {
        assert!(
            tx_context::sender(ctx) == admin.owner || 
            tx_context::sender(ctx) == admin.admin, 
            ENotAuthorized
        );
    }

    /// Check if caller is oracle
    public fun assert_oracle(admin: &Admin, ctx: &TxContext) {
        assert!(tx_context::sender(ctx) == admin.oracle, ENotAuthorized);
    }

    /// Check if caller is operator
    public fun assert_operator(admin: &Admin, ctx: &TxContext) {
        assert!(tx_context::sender(ctx) == admin.operator, ENotAuthorized);
    }

    /// Get owner address
    public fun owner(admin: &Admin): address {
        admin.owner
    }

    /// Get admin address
    public fun admin(admin: &Admin): address {
        admin.admin
    }

    /// Get oracle address
    public fun oracle(admin: &Admin): address {
        admin.oracle
    }

    /// Get operator address
    public fun operator(admin: &Admin): address {
        admin.operator
    }

    /// Check if address is owner
    public fun is_owner(admin: &Admin, addr: address): bool {
        addr == admin.owner
    }

    /// Check if address is admin
    public fun is_admin(admin: &Admin, addr: address): bool {
        addr == admin.admin
    }

    /// Check if address is oracle
    public fun is_oracle(admin: &Admin, addr: address): bool {
        addr == admin.oracle
    }

    /// Check if address is operator
    public fun is_operator(admin: &Admin, addr: address): bool {
        addr == admin.operator
    }

    /// Set new owner, only current owner can call
    public entry fun set_owner(
        admin: &mut Admin, 
        new_owner: address,
        ctx: &mut TxContext
    ) {
        // Verify caller is current owner
        assert_owner(admin, ctx);
        // Verify new address is not zero address
        assert!(new_owner != @0x0, EZeroAddress);
        
        let old_owner = admin.owner;
        admin.owner = new_owner;
        
        // Emit event
        event::emit(OwnerChanged {
            old_owner,
            new_owner,
        });
    }

    /// Set new admin, only owner can call
    public entry fun set_admin(
        admin: &mut Admin, 
        new_admin: address,
        ctx: &mut TxContext
    ) {
        // Verify caller is owner
        assert_owner(admin, ctx);
        // Verify new address is not zero address
        assert!(new_admin != @0x0, EZeroAddress);
        
        let old_admin = admin.admin;
        admin.admin = new_admin;
        
        // Emit event
        event::emit(AdminChanged {
            old_admin,
            new_admin,
        });
    }

    /// Set new oracle, only owner can call
    public entry fun set_oracle(
        admin: &mut Admin, 
        new_oracle: address,
        ctx: &mut TxContext
    ) {
        // Verify caller is owner
        assert_owner(admin, ctx);
        // Verify new address is not zero address
        assert!(new_oracle != @0x0, EZeroAddress);
        
        let old_oracle = admin.oracle;
        admin.oracle = new_oracle;
        
        // Emit event
        event::emit(OracleChanged {
            old_oracle,
            new_oracle,
        });
    }

    /// Set new operator, owner or admin can call
    public entry fun set_operator(
        admin: &mut Admin, 
        new_operator: address,
        ctx: &mut TxContext
    ) {
        // Verify caller is owner or admin
        assert_admin(admin, ctx);
        // Verify new address is not zero address
        assert!(new_operator != @0x0, EZeroAddress);
        
        let old_operator = admin.operator;
        admin.operator = new_operator;
        
        // Emit event
        event::emit(OperatorChanged {
            old_operator,
            new_operator,
        });
    }

    /// Test initialization function
    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ADMIN {}, ctx)
    }
}
