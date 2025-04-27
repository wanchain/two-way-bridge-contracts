#[test_only]
module sui_bridge_contracts::init_tests {
    use sui::test_scenario;
    use sui_bridge_contracts::cross::{Self, TokenPairRegistry, TreasuryCapsRegistry, FoundationConfig, ProcessedTransactions, TokenVault};
    use sui_bridge_contracts::admin::{Self, Admin};
    
    // Test account addresses
    const ADMIN: address = @0xA;
    
    // Error codes
    const EAssertionFailed: u64 = 1;
    
    #[test]
    fun test_init() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize cross module
            cross::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Verify objects were created
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            // Verify TokenPairRegistry was created
            assert!(test_scenario::has_most_recent_shared<TokenPairRegistry>(), EAssertionFailed);
            
            // Verify TreasuryCapsRegistry was created
            assert!(test_scenario::has_most_recent_shared<TreasuryCapsRegistry>(), EAssertionFailed);
            
            // Verify TokenVault was created
            assert!(test_scenario::has_most_recent_shared<TokenVault>(), EAssertionFailed);
            
            // Verify ProcessedTransactions was created
            assert!(test_scenario::has_most_recent_shared<ProcessedTransactions>(), EAssertionFailed);
            
            // Verify FoundationConfig was created
            assert!(test_scenario::has_most_recent_shared<FoundationConfig>(), EAssertionFailed);
        };
        
        test_scenario::end(scenario);
    }
    
    #[test]
    fun test_set_fee_recipient() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize modules
        {
            // Initialize admin module
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // Initialize cross module
            cross::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Set fee recipient
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut foundation_config = test_scenario::take_shared<FoundationConfig>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // Set new fee recipient
            cross::set_fee_recipient(
                &mut foundation_config,
                &admin_cap,
                @0xD, // New fee recipient
                test_scenario::ctx(&mut scenario)
            );
            
            // Return objects
            test_scenario::return_shared(foundation_config);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
}
