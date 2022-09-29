#[test_only]
module bridge_root::token_manager_test {
    use aptos_std::debug;
    use std::signer;
    use aptos_framework::account;
    use bridge_root::token_manager;

    #[test(account = @0x666)]
    public fun token_manager_test(account: signer) {
        let account_addr = signer::address_of(&account);
        account::create_account_for_test(account_addr);
        token_manager::initialize_for_test(&account);
        let addr = signer::address_of(&account);
        debug::print<address>(&addr);

        token_manager::add_token_pair(&account, 1, 
            @0x123,
            b"test",
            b"test",
            0,
            0,
            123, @0x123, 321, @0x321);
        
        token_manager::add_token_pair(&account, 2, 
            @0x123,
            b"test",
            b"test",
            0,
            0,
            123, @0x123, 321, @0x321);

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
}
