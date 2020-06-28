module.exports = {
    skipFiles: [
        'lib/SafeMath.sol',
        'lib/BasicStorageLib.sol',
        'components/BasicStorage.sol',
        'components/Halt.sol',
        'components/Owned.sol',
        'components/Proxy.sol',
        'Migrations.sol',
        'test/TestHelper.sol',
        'test/TestBasicStorage.sol'],
    providerOptions: {
        default_balance_ether: 100000000,
        total_accounts: 100,
        hardfork: "byzantium",
        gasPrice: "0x3B9ACA00",
        callGasLimit: "0x989680",
        network_id: 3,
        debug: true,
    }
};
