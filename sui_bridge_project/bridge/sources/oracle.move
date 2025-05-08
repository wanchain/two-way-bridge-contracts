module sui_bridge_contracts::oracle {
    use sui::table::{Self, Table};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui_bridge_contracts::admin::{Self, Admin};
    use sui::ecdsa_k1;
    
    /// Error codes
    const ESmgIdNotFound: u64 = 1;
    const EInvalidSignature: u64 = 2;
    const EInvalidTimeRange: u64 = 4;
    const ESmgNotActive: u64 = 5;
    const ESmgExpired: u64 = 6;
    const EInvalidHashType: u64 = 7;

    /// Status constants for SMG
    const SMG_STATUS_ACTIVE: u8 = 5;

    /// Hash function constants
    const HASH_KECCAK256: u8 = 0;
    const HASH_SHA256: u8 = 1;

    /// Events
    public struct SmgInfoAdded has copy, drop {
        smg_id: vector<u8>,
        gpk: vector<u8>,
        status: u8,
        start_time: u64,
        end_time: u64,
        hash_type: u8
    }

    public struct SmgStatusChanged has copy, drop {
        smg_id: vector<u8>,
        old_status: u8,
        new_status: u8
    }

    /// Storeman Group information
    public struct SmgInfo has store, drop {
        gpk: vector<u8>,         // Group public key
        status: u8,              // Status (active/inactive)
        start_time: u64,         // Start timestamp
        end_time: u64,           // End timestamp
        hash_type: u8            // Hash function type (0 = KECCAK256, 1 = SHA256)
    }

    /// Oracle storage for managing SMG information
    public struct OracleStorage has key {
        id: UID,
        // All SMG mappings: smg_id -> SmgInfo
        smgs: Table<vector<u8>, SmgInfo>
    }

    /// One-time witness for initialization
    public struct ORACLE has drop {}

    // === Initialization ===

    fun init(_witness: ORACLE, ctx: &mut TxContext) {
        let oracle_storage = OracleStorage {
            id: object::new(ctx),
            smgs: table::new(ctx)
        };

        // Make OracleStorage a shared object
        transfer::share_object(oracle_storage);
    }

    // === Public Entry Functions ===

    /// Add or update an SMG (Oracle only)
    public entry fun add_smg_info(
        admin: &Admin,
        oracle_storage: &mut OracleStorage,
        smg_id: vector<u8>,
        gpk: vector<u8>,
        status: u8,
        start_time: u64,
        end_time: u64,
        hash_type: u8,
        ctx: &mut TxContext
    ) {
        // Verify caller is oracle
        admin::assert_oracle(admin, ctx);
        
        // Validate inputs
        assert!(start_time < end_time, EInvalidTimeRange);
        assert!(hash_type == HASH_KECCAK256 || hash_type == HASH_SHA256, EInvalidHashType);
        
        // Create new SMG info
        let new_smg_info = SmgInfo {
            gpk,
            status,
            start_time,
            end_time,
            hash_type
        };
        
        // If SMG already exists, update it; otherwise add new
        if (table::contains(&oracle_storage.smgs, smg_id)) {
            let _old_smg_info = table::remove(&mut oracle_storage.smgs, smg_id);
            table::add(&mut oracle_storage.smgs, smg_id, new_smg_info);
        } else {
            table::add(&mut oracle_storage.smgs, smg_id, new_smg_info);
        };
        
        // Emit event
        event::emit(SmgInfoAdded {
            smg_id,
            gpk,
            status,
            start_time,
            end_time,
            hash_type
        });
    }

    /// Update SMG status (Oracle only)
    public entry fun update_smg_status(
        admin: &Admin,
        oracle_storage: &mut OracleStorage,
        smg_id: vector<u8>,
        new_status: u8,
        ctx: &mut TxContext
    ) {
        // Verify caller is oracle
        admin::assert_oracle(admin, ctx);
        
        // Verify SMG exists
        assert!(table::contains(&oracle_storage.smgs, smg_id), ESmgIdNotFound);
        
        // Update status
        let smg_info = table::borrow_mut(&mut oracle_storage.smgs, smg_id);
        let old_status = smg_info.status;
        smg_info.status = new_status;
        
        // Emit event
        event::emit(SmgStatusChanged {
            smg_id,
            old_status,
            new_status
        });
    }

    // === Public View Functions ===

    /// Get SMG info
    public fun get_smg_info(
        oracle_storage: &OracleStorage,
        smg_id: vector<u8>
    ): (vector<u8>, u8, u64, u64, u8) {
        assert!(table::contains(&oracle_storage.smgs, smg_id), ESmgIdNotFound);
        
        let smg_info = table::borrow(&oracle_storage.smgs, smg_id);
        (
            smg_info.gpk,
            smg_info.status,
            smg_info.start_time,
            smg_info.end_time,
            smg_info.hash_type
        )
    }

    /// Check if SMG exists
    public fun smg_exists(
        oracle_storage: &OracleStorage,
        smg_id: vector<u8>
    ): bool {
        table::contains(&oracle_storage.smgs, smg_id)
    }

    public fun verify_smg_id(
        oracle_storage: &OracleStorage,
        clock: &Clock,
        smg_id: vector<u8>
    ) {
        // Verify SMG exists
        assert!(table::contains(&oracle_storage.smgs, smg_id), ESmgIdNotFound);
        
        // Get SMG info
        let smg_info = table::borrow(&oracle_storage.smgs, smg_id);
        
        // Check if SMG is active
        assert!(smg_info.status == SMG_STATUS_ACTIVE, ESmgNotActive);
        
        // Check if current time is within valid range
        let current_time = clock::timestamp_ms(clock) / 1000; // Convert to seconds
        assert!(current_time >= smg_info.start_time && current_time <= smg_info.end_time, ESmgExpired);
    }

    /// Verify signature against SMG's GPK
    public fun verify_signature(
        oracle_storage: &OracleStorage,
        clock: &Clock,
        smg_id: vector<u8>,
        message_body: vector<u8>,
        signature: vector<u8>
    ) {
        // Verify SMG exists
        assert!(table::contains(&oracle_storage.smgs, smg_id), ESmgIdNotFound);
        
        // Get SMG info
        let smg_info = table::borrow(&oracle_storage.smgs, smg_id);
        
        // Check if SMG is active
        assert!(smg_info.status == SMG_STATUS_ACTIVE, ESmgNotActive);
        
        // Check if current time is within valid range
        let current_time = clock::timestamp_ms(clock) / 1000; // Convert to seconds
        assert!(current_time >= smg_info.start_time && current_time <= smg_info.end_time, ESmgExpired);
        
        // Get the GPK
        let gpk = smg_info.gpk;
        
        // Perform ECDSA signature verification using Sui's ecdsa_k1 module.
        let recovered_public_key = ecdsa_k1::secp256k1_ecrecover(&signature, &message_body, smg_info.hash_type);
        
        // Assert that the recovered public key matches the stored GPK
        assert!(recovered_public_key == gpk, EInvalidSignature);
    }

    /// Test initialization function
    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ORACLE {}, ctx)
    }
}
