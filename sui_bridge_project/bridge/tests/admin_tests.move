#[test_only]
module sui_bridge_contracts::admin_tests {
    use sui::test_scenario;
    use sui_bridge_contracts::admin::{Self, Admin};
    
    // Test account address
    const ADMIN: address = @0xA;
    
    // Error codes
    const EAssertionFailed: u64 = 1;
    
    #[test]
    fun test_admin_initialization() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize admin module
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Verify initial administrator
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // Verify if the initial administrator is correct
            assert!(admin::is_admin(&admin_cap, ADMIN), EAssertionFailed);
            assert!(admin::is_owner(&admin_cap, ADMIN), EAssertionFailed);
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
}
