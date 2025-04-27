#[test_only]
module cctp_helper::fee_tests {
    use sui::test_scenario::{Self as ts};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use sui::test_scenario;
    use fee_manager::fee_manager::{Self, FeeConfig};
    use fee_collector::fee_collector::{Self, FeeCollectorConfig};

    const ADMIN: address = @0xA;
    const USER: address = @0xB;
    const NEW_ADMIN: address = @0xC;
    const FEE_RECIPIENT: address = @0xD;
    const OPERATOR: address = @0xE;

    #[test]
    fun test_fee_manager_and_collector() {
        let mut scenario_val = ts::begin(ADMIN);
        let scenario = &mut scenario_val;
        
        // Initialize fee_manager and fee_collector
        ts::next_tx(scenario, ADMIN);
        {
            fee_manager::test_init(ts::ctx(scenario));
            fee_collector::test_init(ts::ctx(scenario));
        };

        // Test change_operator
        ts::next_tx(scenario, ADMIN);
        {
            let mut fee_config = ts::take_shared<FeeConfig>(scenario);
            fee_manager::change_operator(&mut fee_config, OPERATOR, ts::ctx(scenario));
            ts::return_shared(fee_config);
        };

        // Test set_fee (now with OPERATOR)
        ts::next_tx(scenario, OPERATOR);
        {
            let mut fee_config = ts::take_shared<FeeConfig>(scenario);
            fee_manager::set_fee(&mut fee_config, 1, 100, ts::ctx(scenario));
            assert!(fee_manager::get_fee(&fee_config, 1) == 100, 0);
            ts::return_shared(fee_config);
        };

        // Test change_admin for fee_manager
        ts::next_tx(scenario, ADMIN);
        {
            let mut fee_config = ts::take_shared<FeeConfig>(scenario);
            fee_manager::change_admin(&mut fee_config, NEW_ADMIN, ts::ctx(scenario));
            ts::return_shared(fee_config);
        };

        // Test change_admin for fee_collector
        ts::next_tx(scenario, ADMIN);
        {
            let mut collector_config = ts::take_shared<FeeCollectorConfig>(scenario);
            fee_collector::change_admin(&mut collector_config, NEW_ADMIN, ts::ctx(scenario));
            ts::return_shared(collector_config);
        };

        // Test change_fee_recipient
        ts::next_tx(scenario, NEW_ADMIN);
        {
            let mut collector_config = ts::take_shared<FeeCollectorConfig>(scenario);
            fee_collector::change_fee_recipient(&mut collector_config, FEE_RECIPIENT, ts::ctx(scenario));
            ts::return_shared(collector_config);
        };

        // Test collect_fee
        ts::next_tx(scenario, USER);
        {
            let fee_config = ts::take_shared<FeeConfig>(scenario);
            let collector_config = ts::take_shared<FeeCollectorConfig>(scenario);
            let mut coin = coin::mint_for_testing<SUI>(150, ts::ctx(scenario));
            
            fee_collector::collect_fee(&fee_config, &collector_config, 1, &mut coin, ts::ctx(scenario));
            
            assert!(coin::value(&coin) == 50, 1); // Check remaining balance
            
            // Clean up
            coin::burn_for_testing(coin);
            ts::return_shared(fee_config);
            ts::return_shared(collector_config);
        };

        ts::end(scenario_val);
    }

    #[test]
    #[expected_failure(abort_code = fee_manager::E_NOT_OPERATOR)]
    fun test_set_fee_not_operator() {
        let mut scenario_val = ts::begin(ADMIN);
        let scenario = &mut scenario_val;
        
        // Initialize
        ts::next_tx(scenario, ADMIN);
        {
            fee_manager::test_init(ts::ctx(scenario));
        };

        // Try to set fee with non-operator (should fail)
        ts::next_tx(scenario, USER);
        {
            let mut fee_config = ts::take_shared<FeeConfig>(scenario);
            fee_manager::set_fee(&mut fee_config, 1, 100, ts::ctx(scenario));
            ts::return_shared(fee_config);
        };

        ts::end(scenario_val);
    }

    #[test]
    #[expected_failure(abort_code = fee_collector::E_INSUFFICIENT_FEE)]
    fun test_insufficient_fee() {
        let mut scenario_val = ts::begin(ADMIN);
        let scenario = &mut scenario_val;
        
        // Initialize
        ts::next_tx(scenario, ADMIN);
        {
            fee_manager::test_init(ts::ctx(scenario));
            fee_collector::test_init(ts::ctx(scenario));
        };

        // Change operator
        ts::next_tx(scenario, ADMIN);
        {
            let mut fee_config = ts::take_shared<FeeConfig>(scenario);
            fee_manager::change_operator(&mut fee_config, OPERATOR, ts::ctx(scenario));
            ts::return_shared(fee_config);
        };

        // Set fee (now with OPERATOR)
        ts::next_tx(scenario, OPERATOR);
        {
            let mut fee_config = ts::take_shared<FeeConfig>(scenario);
            fee_manager::set_fee(&mut fee_config, 1, 100, ts::ctx(scenario));
            ts::return_shared(fee_config);
        };

        // Try to collect fee with insufficient amount
        ts::next_tx(scenario, USER);
        {
            let fee_config = ts::take_shared<FeeConfig>(scenario);
            let collector_config = ts::take_shared<FeeCollectorConfig>(scenario);
            let mut coin = coin::mint_for_testing<SUI>(50, ts::ctx(scenario)); // Not enough to cover the fee
            
            fee_collector::collect_fee(&fee_config, &collector_config, 1, &mut coin, ts::ctx(scenario));
            
            // Clean up (this won't be reached due to the expected failure)
            test_scenario::return_to_sender(scenario, coin);
            ts::return_shared(fee_config);
            ts::return_shared(collector_config);
        };

        ts::end(scenario_val);
    }
}
