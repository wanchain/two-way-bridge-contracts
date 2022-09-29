#[test_only]
module bridge_root::oracle_test {
    use bridge_root::oracle;

    #[test(account = @0x666, faker = @0x777)]
    fun test(account: signer, faker: signer) {
        bridge_root::oracle::initialize_for_test(&account);
    }
}
