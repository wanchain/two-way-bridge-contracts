#[test_only]
module sui_bridge_contracts::test_utils_tests {
    use sui::test_scenario;
    use sui::test_utils;
    use sui::coin::{Self};
    
    // Define the One Time Witness type for testing, must be the uppercase version of the module name
    #[test_only]
    public struct TEST_UTILS_TESTS has drop {}
    
    // Define a test token type, note this is not a One Time Witness
    #[test_only]
    public struct MyTestToken has drop {}
    
    // Simple test for create_one_time_witness function
    #[test]
    fun test_create_one_time_witness_basic() {
        // Create a test scenario
        let scenario = test_scenario::begin(@0xA);
        
        // Test the create_one_time_witness function
        {
            // Create a One Time Witness
            let _witness = test_utils::create_one_time_witness<TEST_UTILS_TESTS>();
            
            // If the function executes successfully, the test passes
        };
        
        test_scenario::end(scenario);
    }
    
    // Test creating a token using One Time Witness
    #[test]
    fun test_create_token_with_witness() {
        // Create a test scenario
        let mut scenario = test_scenario::begin(@0xA);
        
        // Test creating a token using One Time Witness
        {
            // Create a One Time Witness, must use the uppercase version of the module name
            let witness = test_utils::create_one_time_witness<TEST_UTILS_TESTS>();
            
            // Use the witness to create a token, note we use TEST_UTILS_TESTS as the token type
            let (treasury_cap, metadata) = coin::create_currency<TEST_UTILS_TESTS>(
                witness,
                6, // Decimals
                b"TEST", 
                b"TEST", 
                b"Test Token", 
                option::none(), 
                test_scenario::ctx(&mut scenario)
            );
            
            // Destroy or transfer resources to avoid test failures
            transfer::public_transfer(treasury_cap, @0xA);
            transfer::public_share_object(metadata);
        };
        
        test_scenario::end(scenario);
    }
}
