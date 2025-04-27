#[test_only]
module sui_bridge_contracts::oracle_tests {
    use sui::test_scenario;
    use sui_bridge_contracts::oracle::{Self, OracleStorage};
    use sui_bridge_contracts::admin::{Self, Admin};
    
    // Test account addresses
    const ADMIN: address = @0xA;
    const NEW_ORACLE: address = @0xB;
    const UNAUTHORIZED: address = @0xC;
    
    // Test SMG parameters
    const SMG_ID: vector<u8> = b"test_smg_id";
    const GPK: vector<u8> = b"test_gpk";
    const NEW_GPK: vector<u8> = b"new_test_gpk";
    const STATUS_ACTIVE: u8 = 5;
    const STATUS_INACTIVE: u8 = 0;
    const START_TIME: u64 = 1000;
    const END_TIME: u64 = 2000;
    const HASH_KECCAK256: u8 = 0;
    const HASH_SHA256: u8 = 1;
    const INVALID_HASH_TYPE: u8 = 2;
    
    // Error codes
    const EAssertionFailed: u64 = 1;
    
    #[test]
    fun test_oracle_initialization() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize oracle module
            oracle::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Verify initialization
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // Verify if oracle_storage has been created
            assert!(true, EAssertionFailed); // If oracle_storage can be retrieved, it means it has been successfully created
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_add_smg_info() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize oracle module
            oracle::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Add SMG info
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            oracle::add_smg_info(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                GPK,
                STATUS_ACTIVE,
                START_TIME,
                END_TIME,
                HASH_KECCAK256,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify SMG has been added
            assert!(oracle::smg_exists(&oracle_storage, SMG_ID), EAssertionFailed);
            
            // Verify SMG info
            let (gpk, status, start_time, end_time, hash_type) = oracle::get_smg_info(&oracle_storage, SMG_ID);
            assert!(gpk == GPK, EAssertionFailed);
            assert!(status == STATUS_ACTIVE, EAssertionFailed);
            assert!(start_time == START_TIME, EAssertionFailed);
            assert!(end_time == END_TIME, EAssertionFailed);
            assert!(hash_type == HASH_KECCAK256, EAssertionFailed);
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_update_smg_info() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize oracle module
            oracle::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Add initial SMG info
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            oracle::add_smg_info(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                GPK,
                STATUS_ACTIVE,
                START_TIME,
                END_TIME,
                HASH_KECCAK256,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        // Update SMG info
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // Update with new values
            oracle::add_smg_info(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                NEW_GPK,
                STATUS_ACTIVE,
                START_TIME,
                END_TIME + 1000,
                HASH_SHA256,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify SMG info has been updated
            let (gpk, status, start_time, end_time, hash_type) = oracle::get_smg_info(&oracle_storage, SMG_ID);
            assert!(gpk == NEW_GPK, EAssertionFailed);
            assert!(status == STATUS_ACTIVE, EAssertionFailed);
            assert!(start_time == START_TIME, EAssertionFailed);
            assert!(end_time == END_TIME + 1000, EAssertionFailed);
            assert!(hash_type == HASH_SHA256, EAssertionFailed);
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_update_smg_status() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize oracle module
            oracle::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Add initial SMG info
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            oracle::add_smg_info(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                GPK,
                STATUS_ACTIVE,
                START_TIME,
                END_TIME,
                HASH_KECCAK256,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        // Update SMG status
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // Update status to inactive
            oracle::update_smg_status(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                STATUS_INACTIVE,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify status has been updated
            let (_, status, _, _, _) = oracle::get_smg_info(&oracle_storage, SMG_ID);
            assert!(status == STATUS_INACTIVE, EAssertionFailed);
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_change_oracle_and_add_smg() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize oracle module
            oracle::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Change oracle address
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // Set new oracle
            admin::set_oracle(&mut admin_cap, NEW_ORACLE, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(admin_cap);
        };
        
        // Add SMG info with new oracle
        test_scenario::next_tx(&mut scenario, NEW_ORACLE);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // New oracle should be able to add SMG
            oracle::add_smg_info(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                GPK,
                STATUS_ACTIVE,
                START_TIME,
                END_TIME,
                HASH_KECCAK256,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify SMG has been added
            assert!(oracle::smg_exists(&oracle_storage, SMG_ID), EAssertionFailed);
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    #[expected_failure(abort_code = sui_bridge_contracts::admin::ENotAuthorized)]
    fun test_add_smg_info_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize oracle module
            oracle::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Try to add SMG info with unauthorized account
        test_scenario::next_tx(&mut scenario, UNAUTHORIZED);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // This should fail because UNAUTHORIZED is not the oracle
            oracle::add_smg_info(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                GPK,
                STATUS_ACTIVE,
                START_TIME,
                END_TIME,
                HASH_KECCAK256,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    #[expected_failure(abort_code = sui_bridge_contracts::oracle::EInvalidTimeRange)]
    fun test_add_smg_info_invalid_time_range() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize oracle module
            oracle::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Try to add SMG info with invalid time range
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // This should fail because end_time <= start_time
            oracle::add_smg_info(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                GPK,
                STATUS_ACTIVE,
                END_TIME, // Swapped with START_TIME
                START_TIME, // Swapped with END_TIME
                HASH_KECCAK256,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    #[expected_failure(abort_code = sui_bridge_contracts::oracle::EInvalidHashType)]
    fun test_add_smg_info_invalid_hash_type() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize oracle module
            oracle::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Try to add SMG info with invalid hash type
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // This should fail because hash_type is invalid
            oracle::add_smg_info(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                GPK,
                STATUS_ACTIVE,
                START_TIME,
                END_TIME,
                INVALID_HASH_TYPE,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    #[expected_failure(abort_code = sui_bridge_contracts::admin::ENotAuthorized)]
    fun test_update_smg_status_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize oracle module
            oracle::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Add initial SMG info
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            oracle::add_smg_info(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                GPK,
                STATUS_ACTIVE,
                START_TIME,
                END_TIME,
                HASH_KECCAK256,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        // Try to update SMG status with unauthorized account
        test_scenario::next_tx(&mut scenario, UNAUTHORIZED);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // This should fail because UNAUTHORIZED is not the oracle
            oracle::update_smg_status(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                STATUS_INACTIVE,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    #[expected_failure(abort_code = sui_bridge_contracts::oracle::ESmgIdNotFound)]
    fun test_update_smg_status_not_found() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize oracle module
            oracle::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Try to update non-existent SMG status
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // This should fail because SMG_ID doesn't exist
            oracle::update_smg_status(
                &admin_cap,
                &mut oracle_storage,
                SMG_ID,
                STATUS_INACTIVE,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
}
