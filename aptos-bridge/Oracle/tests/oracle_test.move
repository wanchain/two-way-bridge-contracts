#[test_only]
module BridgeDeployer::oracle_test {
    use BridgeDeployer::Oracle;
    use std::vector;
    use std::signer;
    use aptos_framework::account;
    // use aptos_std::debug;


    #[test(account = @0x666)]
    fun test_read_write(account: signer) {
        let account_addr = signer::address_of(&account);
        account::create_account_for_test(account_addr);
        Oracle::initialize_for_test(&account);

        let keys: vector<address> = vector::empty();
        let prices: vector<u128> = vector::empty();
        vector::push_back<address>(&mut keys, @0x1);
        vector::push_back<address>(&mut keys, @0x2);
        vector::push_back<address>(&mut keys, @0x3);
        vector::push_back<u128>(&mut prices, 100);
        vector::push_back<u128>(&mut prices, 200);
        vector::push_back<u128>(&mut prices, 300);

        Oracle::update_price(&account, keys, prices);
        assert!(Oracle::get_value(@0x1) == 100, 0);
        assert!(Oracle::get_value(@0x2) == 200, 1);
        assert!(Oracle::get_value(@0x3) == 300, 2);

        let chain: vector<u128> = vector::empty();
        let curve: vector<u128> = vector::empty();
        vector::push_back<u128>(&mut chain, 100);
        vector::push_back<u128>(&mut chain, 101);
        vector::push_back<u128>(&mut curve, 1);
        vector::push_back<u128>(&mut curve, 2);


        Oracle::set_storeman_group_config(
            &account,
            @0x1,
            1,
            1000,
            chain,
            curve,
            b"Hello",
            b"World",
            12345678,
            87654321,
        );

        // let config = Oracle::get_storeman_group_config(@0x1);
        // debug::print<Oracle::StoremanGroupConfig>(&config);

        Oracle::update_deposit(&account, @0x1, 100);
        assert!(Oracle::get_deposit(@0x1) == 100, 3);
        
        // assert!(Oracle::get_storeman_group_status(@0x1) == 1, 4);

        Oracle::set_debt_clean(&account, @0x1, true);

        assert!(Oracle::is_debt_clean(@0x1), 5);

        Oracle::set_debt_clean(&account, @0x1, false);

        assert!(!Oracle::is_debt_clean(@0x1), 6);

        Oracle::set_storeman_group_status(&account, @0x1, 2);

        // assert!(Oracle::get_storeman_group_status(@0x1) == 2, 7);
    }

    #[test(account = @0x666, admin = @0x888, faker = @0x999)]
    fun test_access(account: signer, admin: signer, faker: signer) { 
        account::create_account_for_test(signer::address_of(&account));
        account::create_account_for_test(signer::address_of(&admin));
        account::create_account_for_test(signer::address_of(&faker));
        Oracle::initialize_for_test(&account);
        Oracle::set_admin(&account, signer::address_of(&admin));

        let keys: vector<address> = vector::empty();
        let prices: vector<u128> = vector::empty();
        vector::push_back<address>(&mut keys, @0x1);
        vector::push_back<address>(&mut keys, @0x2);
        vector::push_back<address>(&mut keys, @0x3);
        vector::push_back<u128>(&mut prices, 100);
        vector::push_back<u128>(&mut prices, 200);
        vector::push_back<u128>(&mut prices, 300);

        Oracle::update_price(&admin, keys, prices);

        Oracle::set_admin(&account, signer::address_of(&faker));
        Oracle::transfer_owner(&account, signer::address_of(&admin));

        Oracle::update_price(&faker, keys, prices);

        Oracle::transfer_owner(&admin, signer::address_of(&faker));
    }

    #[test(account = @0x666, admin = @0x888, faker = @0x999)]
    #[expected_failure(abort_code = 0x050001)]
    fun test_bad_access(account: signer, admin: signer, faker: signer) { 
        account::create_account_for_test(signer::address_of(&account));
        account::create_account_for_test(signer::address_of(&admin));
        account::create_account_for_test(signer::address_of(&faker));
        Oracle::initialize_for_test(&account);

        Oracle::set_admin(&faker, signer::address_of(&admin));

    }
}
