#[test_only]
module BridgeDeployer::token_manager_test {
    use aptos_std::debug;
    use std::signer;
    use aptos_framework::account;
    use BridgeDeployer::TokenManager;

    #[test(account = @0x666, admin = @0x888)]
    public fun token_manager_test(account: signer, admin: signer) {
        let account_addr = signer::address_of(&account);
        let admin_addr = signer::address_of(&admin);
        account::create_account_for_test(account_addr);
        account::create_account_for_test(admin_addr);

        TokenManager::initialize_for_test(&account);

        TokenManager::add_token_pair(&account, 1, 
            @0x123,
            b"test",
            b"test",
            0,
            0,
            123, @0x123, 321, @0x321);

        TokenManager::set_admin(&account, admin_addr);
        
        TokenManager::add_token_pair(&admin, 2, 
            @0x123,
            b"test",
            b"test",
            0,
            0,
            123, @0x123, 321, @0x321);

        TokenManager::set_admin(&admin, account_addr);

        TokenManager::add_token_pair(&account, 3, 
            @0x123,
            b"test",
            b"test",
            0,
            0,
            123, @0x123, 321, @0x321);

        // let val = TokenManager::get_token_pair(1);
        // debug::print<TokenManager::TokenPairInfo>(&val);

        // let val = TokenManager::get_token_pair(2);
        // debug::print<TokenManager::TokenPairInfo>(&val);

        // let val = TokenManager::get_token_pair(3);
        // debug::print<TokenManager::TokenPairInfo>(&val);

        TokenManager::set_operator(&account, @0x666);
        TokenManager::set_token_pair_type(&account, 1, 1);

        TokenManager::remove_token_pair(&account, 1);
        TokenManager::remove_token_pair(&account, 2);
        TokenManager::remove_token_pair(&account, 3);
    }

    #[test(account = @0x666, faker = @0x777)]
    #[expected_failure(abort_code = 0x050001)]
    fun test_for_bad_access(account: signer, faker: signer) {
        let account_addr = signer::address_of(&account);
        account::create_account_for_test(account_addr);
        TokenManager::initialize_for_test(&account);

        let faker_addr = signer::address_of(&faker);
        account::create_account_for_test(faker_addr);

        TokenManager::add_token_pair(&faker, 1, 
            @0x123,
            b"test",
            b"test",
            0,
            0,
            123, @0x123, 321, @0x321);
    }
}
