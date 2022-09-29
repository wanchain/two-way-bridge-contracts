#[test_only]
module bridge_root::token_manager_test {
    use aptos_std::debug;
    use std::signer;
    use bridge_root::token_manager;

    #[test(account = @0x666)]
    public fun token_manager_test(account: signer) {
        token_manager::initialize_for_test(&account);
        let addr = signer::address_of(&account);
        debug::print<address>(&addr);

        // add_token_pair(&account, 1, AncestorInfo {
        //     account: @0x123,
        //     name: b"test",
        //     symbol: b"test",
        //     decimals: 0,
        //     chainID: 0,
        // }, 123, @0x123, 321, @0x321);

        // add_token_pair(&account, 2, AncestorInfo {
        //     account: @0x123,
        //     name: b"test",
        //     symbol: b"test",
        //     decimals: 0,
        //     chainID: 0,
        // }, 123, @0x123, 321, @0x321);

        // add_token_pair(&account, 3, AncestorInfo {
        //     account: @0x123,
        //     name: b"test",
        //     symbol: b"test",
        //     decimals: 0,
        //     chainID: 0,
        // }, 123, @0x123, 321, @0x321);

        // let val = get_token_pair(1);
        // debug::print<TokenPairInfo>(&val);

        // let val = get_token_pair(2);
        // debug::print<TokenPairInfo>(&val);

        // let val = get_token_pair(3);
        // debug::print<TokenPairInfo>(&val);

        // set_operator(&account, @0x666);
        // set_token_pair_type(&account, 1, 1);

        // remove_token_pair(&account, 1);
        // remove_token_pair(&account, 2);
        // remove_token_pair(&account, 3);
        
    }
}