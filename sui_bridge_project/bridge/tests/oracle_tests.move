#[test_only]
module sui_bridge_contracts::oracle_tests {
    use sui::test_scenario;
    use sui_bridge_contracts::oracle::{Self, OracleStorage};
    use sui_bridge_contracts::admin::{Self, Admin};
    
    // 测试账户地址
    const ADMIN: address = @0xA;
    
    // 错误码
    const EAssertionFailed: u64 = 1;
    
    #[test]
    fun test_oracle_initialization() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // 初始化模块
        {
            // 初始化 admin 模块
            admin::test_init(test_scenario::ctx(&mut scenario));
            
            // 初始化 oracle 模块
            oracle::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // 验证初始化
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let oracle_storage = test_scenario::take_shared<OracleStorage>(&scenario);
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // 验证 oracle_storage 是否已创建
            assert!(true, EAssertionFailed); // 如果能取到 oracle_storage，说明已成功创建
            
            test_scenario::return_shared(oracle_storage);
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
}
