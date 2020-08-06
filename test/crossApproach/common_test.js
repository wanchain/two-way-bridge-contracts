const CrossProxy                = artifacts.require('CrossProxy.sol');

const {
    BN,
    ERROR_INFO,
    ADDRESS_0,
    ADDRESS_CROSS_PROXY_IMPL,
    xInfo,
    htlcLockedTime,
    assert,
}                               = require('./lib');

it('Others getStoremanFee  -> The config value', async () => {
    try {
        let smg1Fee = await global.chains[1].approach.instance.getStoremanFee(global.storemanGroups[1].ID);
        assert.equal(new BN(smg1Fee).eq(new BN(0)), true);
        let smg2Fee = await global.chains[2].approach.instance.getStoremanFee(global.storemanGroups[2].ID);
        assert.equal(new BN(smg2Fee).eq(new BN(0)), true);
    } catch (err) {
        assert.fail(err.toString());
    }
});

it('Others getPartners  ==> The config value', async () => {
    try {
        let partners1 = await global.chains[1].approach.instance.getPartners();
        assert.equal(global.chains[1].approach.parnters.tokenManager.address, partners1[0]);
        assert.equal(global.chains[1].approach.parnters.smgAdminProxy.address, partners1[1]);
        assert.equal(global.chains[1].approach.parnters.smgFeeProxy, partners1[2]);
        assert.equal(global.chains[1].approach.parnters.quota.address, partners1[3]);
        assert.equal(global.chains[1].approach.parnters.sigVerifier.address, partners1[4]);

        let partners2 = await global.chains[2].approach.instance.getPartners();
        assert.equal(global.chains[2].approach.parnters.tokenManager.address, partners2[0]);
        assert.equal(global.chains[2].approach.parnters.smgAdminProxy.address, partners2[1]);
        assert.equal(ADDRESS_0, partners2[2]);
        assert.equal(global.chains[2].approach.parnters.quota.address, partners2[3]);
        assert.equal(global.chains[2].approach.parnters.sigVerifier.address, partners2[4]);
    } catch (err) {
        assert.fail(err.toString());
    }
});

it('Others setPartners  ==> Parameter is invalid', async () => {
    try {
        await global.chains[1].approach.instance.setPartners(ADDRESS_0, ADDRESS_0, global.chains[1].approach.parnters.smgFeeProxy, ADDRESS_0, ADDRESS_0);
        assert.fail(ERROR_INFO)
    } catch (err) {
        assert.include(err.toString(), "Parameter is invalid");
    }
});

it('Others setWithdrawFeeTimeout  ==> Not owner', async () => {
    try {
        await global.chains[1].approach.instance.setWithdrawFeeTimeout(0, {from: accounts[9]});
        assert.fail(ERROR_INFO)
    } catch (err) {
        assert.include(err.toString(), "Not owner");
    }
});

it('Others setWithdrawFeeTimeout  ==> Success', async () => {
    try {
        await global.chains[1].approach.instance.setWithdrawFeeTimeout(600, {from: global.owner});
    } catch (err) {
        assert.fail(err)
    }
});

it('Others getLeftLockedTime  ==> invalid xHash', async () => {
    try {
        await global.chains[1].approach.instance.getLeftLockedTime(xInfo.htlcException.hash);
        assert.fail(ERROR_INFO)
    } catch (err) {
        assert.include(err.toString(), "invalid xHash");
    }
});

it('Others getFees  ==> The config value', async () => {
    try {
        let ret = await global.chains[1].approach.instance.getFees(global.chains[1].ID, global.chains[2].ID);
        assert.equal(global.chains[1].approach.origLockFee, ret[0]);
        assert.equal(global.chains[1].approach.origRevokeFee, ret[1]);
        // console.log("chain1 orig fees", ret[0], ret[1]);

        ret = await global.chains[1].approach.instance.getFees(global.chains[2].ID, global.chains[1].ID);
        assert.equal(global.chains[1].approach.shadowLockFee, ret[0]);
        assert.equal(global.chains[1].approach.shadowRevokeFee, ret[1]);
        // console.log("chain1 shadow fees", ret[0], ret[1]);

        ret = await global.chains[2].approach.instance.getFees(global.chains[2].ID, global.chains[1].ID);
        assert.equal(global.chains[2].approach.origLockFee, ret[0]);
        assert.equal(global.chains[2].approach.origRevokeFee, ret[1]);
        // console.log("chain2 orig fees", ret[0], ret[1]);

        ret = await global.chains[2].approach.instance.getFees(global.chains[1].ID, global.chains[2].ID);
        assert.equal(global.chains[2].approach.shadowLockFee, ret[0]);
        assert.equal(global.chains[2].approach.shadowRevokeFee, ret[1]);
        // console.log("chain1 shadow fees", ret[0], ret[1]);

    } catch (err) {
        assert.fail(err.toString());
    }
});

it('Others lockedTime  ==> The config value', async () => {
    try {
        let ret = await global.chains[1].approach.instance._lockedTime();
        assert.equal(htlcLockedTime, ret);
    } catch (err) {
        assert.fail(err.toString());
    }
});

it('Proxy   -> get the implementation address', async () => {
    try {
        let crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        let address = await crossProxy.implementation();
        assert.equal(address, global.chains[1].approach.delegate.address);
    } catch (err) {
        assert.fail(err.toString());
    }
});

it('Proxy   -> upgradeTo', async () => {
    try {
        let crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        await crossProxy.upgradeTo(ADDRESS_CROSS_PROXY_IMPL);

        let address = await crossProxy.implementation();
        assert.equal(address, ADDRESS_CROSS_PROXY_IMPL);
    } catch (err) {
        assert.fail(err.toString());
    }
});

it('Proxy   -> upgradeTo with the same implementation address', async () => {
    try {
        let crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        await crossProxy.upgradeTo(ADDRESS_CROSS_PROXY_IMPL);

        let address = await crossProxy.implementation();
        assert.equal(address, ADDRESS_CROSS_PROXY_IMPL);
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Cannot upgrade to the same implementation");
    }
});

it('Proxy   -> upgradeTo with 0x address', async () => {
    try {
        let crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        await crossProxy.upgradeTo(ADDRESS_0);

        let address = await crossProxy.implementation();
        assert.equal(address, ADDRESS_0);
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Cannot upgrade to invalid address");
    }
});

it('Proxy   -> restore', async () => {
    try {
        let crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        let ret = await crossProxy.upgradeTo(global.chains[1].approach.delegate.address);
        let address = await crossProxy.implementation();
        assert.equal(address, global.chains[1].approach.delegate.address);

        assert.checkWeb3Event(ret, {
            event: 'Upgraded',
            args: {
                implementation:address
            }
        });
    } catch (err) {
        assert.fail(err.toString());
    }
});
