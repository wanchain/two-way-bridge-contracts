#[test_only]
module sui_bridge_contracts::cross_tests {
    use sui::test_scenario;
    use sui_bridge_contracts::cross::{Self, TokenPairRegistry};
    use sui_bridge_contracts::admin::{Self, Admin};
    
    // Test account address
    const ADMIN: address = @0xA;
    
    // Test token pair parameters
    const TOKEN_PAIR_ID: u64 = 1;
    const EXTERNAL_CHAIN_ID: u64 = 101;
    
    // Error codes
    const EAssertionFailed: u64 = 1;
    
    #[test]
    fun test_token_pair_registry() {
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
                TOKEN_PAIR_ID,
                b"0x2::sui::SUI",
                1,
                EXTERNAL_CHAIN_ID,
                b"0xExternal",
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify if token pair has been added
            assert!(cross::token_pair_exists(&registry, TOKEN_PAIR_ID), EAssertionFailed);
            
            test_scenario::return_shared(registry);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
}
