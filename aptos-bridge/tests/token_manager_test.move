#[test_only]
module bridge_root::token_manager_test {
    use aptos_std::debug;
    use std::signer;
    use aptos_framework::account;
    use bridge_root::token_manager;

    #[test(account = @0x666, admin = @0x888)]
    public fun token_manager_test(account: signer, admin: signer) {
        let account_addr = signer::address_of(&account);
        let admin_addr = signer::address_of(&admin);
        account::create_account_for_test(account_addr);
        account::create_account_for_test(admin_addr);

        token_manager::initialize_for_test(&account);

        token_manager::add_token_pair(&account, 1, 
            @0x123,
            b"test",
            b"test",
            0,
            0,
            123, @0x123, 321, @0x321);

        token_manager::set_admin(&account, admin_addr);
        
        token_manager::add_token_pair(&admin, 2, 
            @0x123,
            b"test",
            b"test",
            0,
            0,
            123, @0x123, 321, @0x321);

        token_manager::set_admin(&admin, account_addr);

        token_manager::add_token_pair(&account, 3, 
            @0x123,
            b"test",
            b"test",
            0,
            0,
            123, @0x123, 321, @0x321);

        let val = token_manager::get_token_pair(1);
        debug::print<token_manager::TokenPairInfo>(&val);

        let val = token_manager::get_token_pair(2);
        debug::print<token_manager::TokenPairInfo>(&val);

        let val = token_manager::get_token_pair(3);
        debug::print<token_manager::TokenPairInfo>(&val);

        token_manager::set_operator(&account, @0x666);
        token_manager::set_token_pair_type(&account, 1, 1);

        token_manager::remove_token_pair(&account, 1);
        token_manager::remove_token_pair(&account, 2);
        token_manager::remove_token_pair(&account, 3);
    }

    #[test(account = @0x666, faker = @0x777)]
    #[expected_failure(abort_code = 0x050001)]
    fun test_for_bad_access(account: signer, faker: signer) {
        let account_addr = signer::address_of(&account);
        account::create_account_for_test(account_addr);
        token_manager::initialize_for_test(&account);

        let faker_addr = signer::address_of(&faker);
        account::create_account_for_test(faker_addr);

        token_manager::add_token_pair(&faker, 1, 
            @0x123,
            b"test",
            b"test",
            0,
            0,
            123, @0x123, 321, @0x321);
    }
}
