module.exports = {
    skipFiles: [
        'lib/SafeMath.sol',
        'lib/BasicStorageLib.sol',
        'components/BasicStorage.sol',
        'components/Halt.sol',
        'components/Owned.sol',
        'components/Proxy.sol',
        'Migrations.sol',
	'PosLib.sol',
        'test/TestQuotaHelper.sol',
        'test/TestBasicStorage.sol',
        'test/TestOrigTokenCreator.sol',
        'test/TestStoremanAdmin.sol',
        'test/TestIOwned.sol',
        'test/fakeQuota.sol',
    ],
    mnemonic:"skill level pulse dune pattern rival used syrup inner first balance sad",
    providerOptions: {
	mnemonic:"skill level pulse dune pattern rival used syrup inner first balance sad",
        default_balance_ether: 100000000,
        total_accounts: 100,
        hardfork: "byzantium",
        gasPrice: "0x3B9ACA00",
        callGasLimit: "0x989680",
        network_id: 3,
        debug: true,
    }
};
