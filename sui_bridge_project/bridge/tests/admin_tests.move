#[test_only]
module sui_bridge_contracts::admin_tests {
    use sui::test_scenario;
    use sui_bridge_contracts::admin::{Self, Admin};
    
    // 测试账户地址
    const ADMIN: address = @0xA;
    
    // 错误码
    const EAssertionFailed: u64 = 1;
    
    #[test]
    fun test_admin_initialization() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // 初始化 admin 模块
        {
            admin::test_init(test_scenario::ctx(&mut scenario));
        };
        
        // 验证初始管理员
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test_scenario::take_shared<Admin>(&scenario);
            
            // 验证初始管理员是否正确
            assert!(admin::is_admin(&admin_cap, ADMIN), EAssertionFailed);
            assert!(admin::is_owner(&admin_cap, ADMIN), EAssertionFailed);
            
            test_scenario::return_shared(admin_cap);
        };
        
        test_scenario::end(scenario);
    }
}
