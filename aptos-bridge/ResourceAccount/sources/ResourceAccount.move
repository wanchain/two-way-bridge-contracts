/// The module used to create user resource account for swap and deploy LP coins under that account.
module BridgeDeployer::ResourceAccount {
    use std::signer;

    use aptos_framework::account::{Self, SignerCapability};

    /// When called from wrong account.
    const ERR_FORBIDDEN: u64 = 103;

    /// Temporary storage for user resource account signer capability.
    struct CapabilityStorage has key { signer_cap: SignerCapability }

    /// Creates new resource account for swap, puts signer capability into storage and deploys LP coin type.
    /// Can be executed only from swap account.
    public entry fun initialize_lp_account(
        admin: &signer,
        lp_coin_metadata_serialized: vector<u8>,
        lp_coin_code: vector<u8>
    ) {
        assert!(signer::address_of(admin) == @BridgeDeployer, ERR_FORBIDDEN);

        let (lp_acc, signer_cap) = account::create_resource_account(admin, x"30");
        aptos_framework::code::publish_package_txn(
            &lp_acc,
            lp_coin_metadata_serialized,
            vector[lp_coin_code]
        );
        move_to(admin, CapabilityStorage { signer_cap });
    }

    /// Destroys temporary storage for resource account signer capability and returns signer capability.
    /// It needs for initialization of swap.
    public fun retrieve_signer_cap(admin: &signer): SignerCapability acquires CapabilityStorage {
        assert!(signer::address_of(admin) == @BridgeDeployer, ERR_FORBIDDEN);
        let CapabilityStorage { signer_cap } = move_from<CapabilityStorage>(signer::address_of(admin));
        signer_cap
    }

    #[test_only]
    use aptos_framework::genesis;
    #[test_only]
    use aptos_framework::account::create_account_for_test;
    #[test_only]
    use std::debug;
    #[test_only]
    const TEST_ERROR:u64 = 10000;

    // test resource account equal
    #[test(deployer = @BridgeDeployer)]
    public entry fun test_resource_account(deployer: &signer) {
        genesis::setup();
        create_account_for_test(signer::address_of(deployer));
        let addr = account::create_resource_address(&signer::address_of(deployer), x"30");
        debug::print<address>(&addr);
        debug::print<address>(&@ResourceAccountDeployer);
        assert!(addr == @ResourceAccountDeployer, TEST_ERROR);
    }
}
