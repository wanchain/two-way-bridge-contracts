#[test_only]
module sui_bridge_contracts::oracle_tests {
    use sui::test_scenario;
    use sui_bridge_contracts::oracle::{Self, OracleStorage};
    use sui_bridge_contracts::admin::{Self, Admin};
    
    // Test account addresses
    const ADMIN: address = @0xA;
    
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
}
