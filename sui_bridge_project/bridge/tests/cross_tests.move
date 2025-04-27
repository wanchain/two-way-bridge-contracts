#[test_only]
module sui_bridge_contracts::cross_tests {
    use sui::test_scenario;
    use sui_bridge_contracts::cross::{Self, TokenPairRegistry};
    use sui_bridge_contracts::admin::{Self, Admin};
    
    // 测试账户地址
    const ADMIN: address = @0xA;
    
    // 测试 token pair 参数
    const TOKEN_PAIR_ID: u64 = 1;
    const EXTERNAL_CHAIN_ID: u64 = 101;
    
    // 错误码
    const EAssertionFailed: u64 = 1;
    
    #[test]
    fun test_token_pair_registry() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // 初始化模块
        {
            // 初始化 admin 模块
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // 初始化 cross 模块
            cross::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // 添加 token pair
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
            
            // 验证 token pair 是否已添加
            assert!(cross::token_pair_exists(&registry, TOKEN_PAIR_ID), EAssertionFailed);
            
            test_scenario::return_shared(registry);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
}
