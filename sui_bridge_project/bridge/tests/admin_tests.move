#[test_only]
module sui_bridge_contracts::admin_tests {
    use sui::test_scenario;
    use sui_bridge_contracts::admin::{Self, Admin};
    
    // Test account addresses
    const ADMIN: address = @0xA;
    const NEW_OWNER: address = @0xB;
    const NEW_ADMIN_ADDR: address = @0xC;
    const NEW_ORACLE: address = @0xD;
    const NEW_OPERATOR: address = @0xE;
    const ZERO_ADDRESS: address = @0x0;
    
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
            assert!(admin::is_oracle(&admin_cap, ADMIN), EAssertionFailed);
            assert!(admin::is_operator(&admin_cap, ADMIN), EAssertionFailed);
            
            // Verify getter functions
            assert!(admin::admin(&admin_cap) == ADMIN, EAssertionFailed);
            assert!(admin::owner(&admin_cap) == ADMIN, EAssertionFailed);
            assert!(admin::oracle(&admin_cap) == ADMIN, EAssertionFailed);
            assert!(admin::operator(&admin_cap) == ADMIN, EAssertionFailed);
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_set_owner() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize admin module
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Set new owner
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            admin::set_owner(&mut admin_cap, NEW_OWNER, test_scenario::ctx(&mut scenario));
            
            // Verify owner has been updated
            assert!(admin::is_owner(&admin_cap, NEW_OWNER), EAssertionFailed);
            assert!(admin::owner(&admin_cap) == NEW_OWNER, EAssertionFailed);
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    #[expected_failure(abort_code = sui_bridge_contracts::admin::ENotAuthorized)]
    fun test_set_owner_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize admin module
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Try to set new owner from unauthorized address
        test_scenario::next_tx(&mut scenario, NEW_ADMIN_ADDR);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // This should fail because NEW_ADMIN_ADDR is not the owner
            admin::set_owner(&mut admin_cap, NEW_OWNER, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    #[expected_failure(abort_code = sui_bridge_contracts::admin::EZeroAddress)]
    fun test_set_owner_zero_address() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize admin module
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Try to set zero address as owner
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // This should fail because zero address is not allowed
            admin::set_owner(&mut admin_cap, ZERO_ADDRESS, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_set_admin() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize admin module
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Set new admin
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            admin::set_admin(&mut admin_cap, NEW_ADMIN_ADDR, test_scenario::ctx(&mut scenario));
            
            // Verify admin has been updated
            assert!(admin::is_admin(&admin_cap, NEW_ADMIN_ADDR), EAssertionFailed);
            assert!(admin::admin(&admin_cap) == NEW_ADMIN_ADDR, EAssertionFailed);
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    #[expected_failure(abort_code = sui_bridge_contracts::admin::ENotAuthorized)]
    fun test_set_admin_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize admin module
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Try to set new admin from unauthorized address
        test_scenario::next_tx(&mut scenario, NEW_ADMIN_ADDR);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // This should fail because NEW_ADMIN_ADDR is not the owner
            admin::set_admin(&mut admin_cap, NEW_ADMIN_ADDR, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_set_oracle() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize admin module
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Set new oracle
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            admin::set_oracle(&mut admin_cap, NEW_ORACLE, test_scenario::ctx(&mut scenario));
            
            // Verify oracle has been updated
            assert!(admin::is_oracle(&admin_cap, NEW_ORACLE), EAssertionFailed);
            assert!(admin::oracle(&admin_cap) == NEW_ORACLE, EAssertionFailed);
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    #[expected_failure(abort_code = sui_bridge_contracts::admin::ENotAuthorized)]
    fun test_set_oracle_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize admin module
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Try to set new oracle from unauthorized address
        test_scenario::next_tx(&mut scenario, NEW_ADMIN_ADDR);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // This should fail because NEW_ADMIN_ADDR is not the owner
            admin::set_oracle(&mut admin_cap, NEW_ORACLE, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_set_operator() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize admin module
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Set new operator
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            admin::set_operator(&mut admin_cap, NEW_OPERATOR, test_scenario::ctx(&mut scenario));
            
            // Verify operator has been updated
            assert!(admin::is_operator(&admin_cap, NEW_OPERATOR), EAssertionFailed);
            assert!(admin::operator(&admin_cap) == NEW_OPERATOR, EAssertionFailed);
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_set_operator_by_admin() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize admin module
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Set new admin
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            admin::set_admin(&mut admin_cap, NEW_ADMIN_ADDR, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(admin_cap);
        };
        
        // Set new operator by admin (not owner)
        test_scenario::next_tx(&mut scenario, NEW_ADMIN_ADDR);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // This should succeed because NEW_ADMIN_ADDR is now the admin
            admin::set_operator(&mut admin_cap, NEW_OPERATOR, test_scenario::ctx(&mut scenario));
            
            // Verify operator has been updated
            assert!(admin::is_operator(&admin_cap, NEW_OPERATOR), EAssertionFailed);
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    #[expected_failure(abort_code = sui_bridge_contracts::admin::ENotAuthorized)]
    fun test_set_operator_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize admin module
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Try to set new operator from unauthorized address
        test_scenario::next_tx(&mut scenario, NEW_ORACLE);
        {
            let mut admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // This should fail because NEW_ORACLE is neither owner nor admin
            admin::set_operator(&mut admin_cap, NEW_OPERATOR, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
}
