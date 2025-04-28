#[test_only]
module sui_bridge_contracts::treasury_cap_tests {
    use sui::test_scenario::{Self};
    use sui::test_utils;
    use sui::coin::{Self};
    use sui_bridge_contracts::cross::{Self, TreasuryCapsRegistry};
    use sui_bridge_contracts::admin::{Self, Admin};

    // Define the One Time Witness type for the test module, must be the uppercase version of the module name
    #[test_only]
    public struct TREASURY_CAP_TESTS has drop {}
    
    // Test the receive_treasury_cap function
    #[test]
    public fun test_receive_treasury_cap() {
        // Create a test scenario with @0xA as the sender
        let mut scenario = test_scenario::begin(@0xA);
        
        // Initialize the cross module
        {
            cross::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Create test token
        test_scenario::next_tx(&mut scenario, @0xA);
        {
            // Create One Time Witness
            let witness = test_utils::create_one_time_witness<TREASURY_CAP_TESTS>();
            
            // Use witness to create test token, note that we use TREASURY_CAP_TESTS as the token type
            let (treasury_cap, metadata) = coin::create_currency<TREASURY_CAP_TESTS>(
                witness,
                6, // Decimals
                b"TEST", 
                b"TEST", 
                b"Test Token", 
                option::none(), 
                test_scenario::ctx(&mut scenario)
            );
            
            // Share metadata
            transfer::public_share_object(metadata);
            
            // Get TreasuryCapsRegistry
            let mut treasury_caps_registry = test_scenario::take_shared<TreasuryCapsRegistry>(&scenario);
            
            // Call receive_treasury_cap function
            cross::receive_treasury_cap<TREASURY_CAP_TESTS>(
                &mut treasury_caps_registry,
                treasury_cap,
                test_scenario::ctx(&mut scenario)
            );
            
            // Return TreasuryCapsRegistry
            test_scenario::return_shared(treasury_caps_registry);
        };
        
        test_scenario::end(scenario);
    }
    
    // Test the admin_mint function
    #[test]
    public fun test_admin_mint() {
        // Create a test scenario
        let mut scenario = test_scenario::begin(@0xA);
        
        // Initialize the cross module
        {
            cross::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Create admin module
        test_scenario::next_tx(&mut scenario, @0xA);
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Create test token and call receive_treasury_cap
        test_scenario::next_tx(&mut scenario, @0xA);
        {
            // Create One Time Witness
            let witness = test_utils::create_one_time_witness<TREASURY_CAP_TESTS>();
            
            // Use witness to create test token, note that we use TREASURY_CAP_TESTS as the token type
            let (treasury_cap, metadata) = coin::create_currency<TREASURY_CAP_TESTS>(
                witness,
                6, // Decimals
                b"TEST", 
                b"TEST", 
                b"Test Token", 
                option::none(), 
                test_scenario::ctx(&mut scenario)
            );
            
            // Share metadata
            transfer::public_share_object(metadata);
            
            // Get TreasuryCapsRegistry
            let mut treasury_caps_registry = test_scenario::take_shared<TreasuryCapsRegistry>(&scenario);
            
            // Call receive_treasury_cap function
            cross::receive_treasury_cap<TREASURY_CAP_TESTS>(
                &mut treasury_caps_registry,
                treasury_cap,
                test_scenario::ctx(&mut scenario)
            );
            
            // Return TreasuryCapsRegistry
            test_scenario::return_shared(treasury_caps_registry);
        };
        
        // Test admin_mint function
        test_scenario::next_tx(&mut scenario, @0xA);
        {
            // Get Admin
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // Get TreasuryCapsRegistry
            let mut treasury_caps_registry = test_scenario::take_shared<TreasuryCapsRegistry>(&scenario);
            
            // Mint 1000000 tokens (considering 6 decimals, this is actually 1 whole token)
            let amount = 1000000;
            let recipient = @0xB; // Recipient address
            
            // Call admin_mint function
            cross::admin_mint<TREASURY_CAP_TESTS>(
                &mut treasury_caps_registry,
                &admin_cap,
                amount,
                recipient,
                test_scenario::ctx(&mut scenario)
            );
            
            // Return resources
            test_scenario::return_shared(admin_cap);
            test_scenario::return_shared(treasury_caps_registry);
        };
        
        // Verify that the recipient received the tokens
        test_scenario::next_tx(&mut scenario, @0xB);
        {
            // Check if the recipient received the tokens
            let coin = test_scenario::take_from_address<coin::Coin<TREASURY_CAP_TESTS>>(&scenario, @0xB);
            assert!(coin::value(&coin) == 1000000, 0);
            test_scenario::return_to_address(@0xB, coin);
        };
        
        test_scenario::end(scenario);
    }
    
    // Test the admin_burn function
    #[test]
    public fun test_admin_burn() {
        // Create a test scenario
        let mut scenario = test_scenario::begin(@0xA);
        
        // Initialize the cross module
        {
            cross::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Create admin module
        test_scenario::next_tx(&mut scenario, @0xA);
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // Create test token and call receive_treasury_cap
        test_scenario::next_tx(&mut scenario, @0xA);
        {
            // Create One Time Witness
            let witness = test_utils::create_one_time_witness<TREASURY_CAP_TESTS>();
            
            // Use witness to create test token, note that we use TREASURY_CAP_TESTS as the token type
            let (treasury_cap, metadata) = coin::create_currency<TREASURY_CAP_TESTS>(
                witness,
                6, // Decimals
                b"TEST", 
                b"TEST", 
                b"Test Token", 
                option::none(), 
                test_scenario::ctx(&mut scenario)
            );
            
            // Share metadata
            transfer::public_share_object(metadata);
            
            // Get TreasuryCapsRegistry
            let mut treasury_caps_registry = test_scenario::take_shared<TreasuryCapsRegistry>(&scenario);
            
            // Call receive_treasury_cap function
            cross::receive_treasury_cap<TREASURY_CAP_TESTS>(
                &mut treasury_caps_registry,
                treasury_cap,
                test_scenario::ctx(&mut scenario)
            );
            
            // Return TreasuryCapsRegistry
            test_scenario::return_shared(treasury_caps_registry);
        };
        
        // First mint tokens
        test_scenario::next_tx(&mut scenario, @0xA);
        {
            // Get Admin
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // Get TreasuryCapsRegistry
            let mut treasury_caps_registry = test_scenario::take_shared<TreasuryCapsRegistry>(&scenario);
            
            // Mint 1000000 tokens (considering 6 decimals, this is actually 1 whole token)
            let amount = 1000000;
            let recipient = @0xA; // Mint to self
            
            // Call admin_mint function
            cross::admin_mint<TREASURY_CAP_TESTS>(
                &mut treasury_caps_registry,
                &admin_cap,
                amount,
                recipient,
                test_scenario::ctx(&mut scenario)
            );
            
            // Return resources
            test_scenario::return_shared(admin_cap);
            test_scenario::return_shared(treasury_caps_registry);
        };
        
        // Test admin_burn function
        test_scenario::next_tx(&mut scenario, @0xA);
        {
            // Get Admin
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // Get TreasuryCapsRegistry
            let mut treasury_caps_registry = test_scenario::take_shared<TreasuryCapsRegistry>(&scenario);
            
            // Get tokens to burn
            let coin_to_burn = test_scenario::take_from_address<coin::Coin<TREASURY_CAP_TESTS>>(&scenario, @0xA);
            
            // Call admin_burn function
            cross::admin_burn<TREASURY_CAP_TESTS>(
                &mut treasury_caps_registry,
                &admin_cap,
                coin_to_burn,
                test_scenario::ctx(&mut scenario)
            );
            
            // Return resources
            test_scenario::return_shared(admin_cap);
            test_scenario::return_shared(treasury_caps_registry);
        };
        
        // Verify that the tokens have been burned (there should be no tokens at the address)
        test_scenario::next_tx(&mut scenario, @0xA);
        {
            // Check if there are any tokens at the address
            assert!(!test_scenario::has_most_recent_for_address<coin::Coin<TREASURY_CAP_TESTS>>(@0xA), 0);
        };
        
        test_scenario::end(scenario);
    }
}
