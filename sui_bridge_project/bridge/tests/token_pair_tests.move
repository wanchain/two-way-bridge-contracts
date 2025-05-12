#[test_only]
module sui_bridge_contracts::token_pair_tests {
    use sui::test_scenario;
    use sui_bridge_contracts::cross::{Self, TokenPairRegistry};
    use sui_bridge_contracts::admin::{Self, Admin};
    use std::ascii;
    
    // Test account addresses
    const ADMIN: address = @0xA;
    
    // Test token pair parameters
    const TOKEN_PAIR_ID_1: u64 = 1;
    const TOKEN_PAIR_ID_2: u64 = 2;
    const EXTERNAL_CHAIN_ID: u64 = 101;
    const TOKEN_TYPE_NATIVE: u8 = 1;
    const TOKEN_TYPE_WRAPPED: u8 = 2;
    
    // Error codes
    const EAssertionFailed: u64 = 1;
    
    #[test]
    fun test_add_token_pair() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize cross module
            cross::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Add token pair
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test_scenario::take_shared<TokenPairRegistry>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            cross::add_token_pair(
                &mut registry,
                &admin_cap,
                TOKEN_PAIR_ID_1,
                ascii::string(b"0x2::sui::SUI"),
                TOKEN_TYPE_NATIVE,
                EXTERNAL_CHAIN_ID,
                ascii::string(b"0xExternal"),
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify if token pair has been added
            assert!(cross::token_pair_exists(&registry, TOKEN_PAIR_ID_1), EAssertionFailed);
            
            test_scenario::return_shared(registry);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_update_token_pair() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize cross module
            cross::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Add token pair
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test_scenario::take_shared<TokenPairRegistry>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            cross::add_token_pair(
                &mut registry,
                &admin_cap,
                TOKEN_PAIR_ID_1,
                ascii::string(b"0x2::sui::SUI"),
                TOKEN_TYPE_NATIVE,
                EXTERNAL_CHAIN_ID,
                ascii::string(b"0xExternal"),
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
            test_scenario::return_shared(admin_cap);
        };
        
        // Update token pair
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test_scenario::take_shared<TokenPairRegistry>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // Update token pair with new external token address and set inactive
            cross::update_token_pair(
                &mut registry,
                &admin_cap,
                TOKEN_PAIR_ID_1,
                ascii::string(b"0x2::sui::SUI"),
                TOKEN_TYPE_NATIVE,
                EXTERNAL_CHAIN_ID,
                ascii::string(b"0xNewExternal"),
                false, // set inactive
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify token pair still exists
            assert!(cross::token_pair_exists(&registry, TOKEN_PAIR_ID_1), EAssertionFailed);
            
            // Get token pair details to verify update
            let (_, _, external_chain_id, sui_token_type, is_active) = 
                cross::get_token_pair_by_id(&registry, TOKEN_PAIR_ID_1);
            
            // Verify updated values
            assert!(external_chain_id == EXTERNAL_CHAIN_ID, EAssertionFailed);
            assert!(sui_token_type == TOKEN_TYPE_NATIVE, EAssertionFailed);
            assert!(!is_active, EAssertionFailed); // Should be inactive now
            
            test_scenario::return_shared(registry);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_remove_token_pair() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize cross module
            cross::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Add token pair
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test_scenario::take_shared<TokenPairRegistry>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            cross::add_token_pair(
                &mut registry,
                &admin_cap,
                TOKEN_PAIR_ID_1,
                ascii::string(b"0x2::sui::SUI"),
                TOKEN_TYPE_NATIVE,
                EXTERNAL_CHAIN_ID,
                ascii::string(b"0xExternal"),
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
            test_scenario::return_shared(admin_cap);
        };
        
        // Remove token pair
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test_scenario::take_shared<TokenPairRegistry>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            cross::remove_token_pair(
                &mut registry,
                &admin_cap,
                TOKEN_PAIR_ID_1,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify token pair has been removed
            assert!(!cross::token_pair_exists(&registry, TOKEN_PAIR_ID_1), EAssertionFailed);
            
            test_scenario::return_shared(registry);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_multiple_token_pairs() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize cross module
            cross::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Add multiple token pairs
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test_scenario::take_shared<TokenPairRegistry>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // Add first token pair (Native SUI)
            cross::add_token_pair(
                &mut registry,
                &admin_cap,
                TOKEN_PAIR_ID_1,
                ascii::string(b"0x2::sui::SUI"),
                TOKEN_TYPE_NATIVE,
                EXTERNAL_CHAIN_ID,
                ascii::string(b"0xExternal1"),
                test_scenario::ctx(&mut scenario)
            );
            
            // Add second token pair (Wrapped token)
            cross::add_token_pair(
                &mut registry,
                &admin_cap,
                TOKEN_PAIR_ID_2,
                ascii::string(b"0x2::example::USDC"),
                TOKEN_TYPE_WRAPPED,
                EXTERNAL_CHAIN_ID,
                ascii::string(b"0xExternal2"),
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify both token pairs exist
            assert!(cross::token_pair_exists(&registry, TOKEN_PAIR_ID_1), EAssertionFailed);
            assert!(cross::token_pair_exists(&registry, TOKEN_PAIR_ID_2), EAssertionFailed);
            
            test_scenario::return_shared(registry);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
}
