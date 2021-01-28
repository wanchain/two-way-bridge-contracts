const CrossProxy                = artifacts.require('CrossProxy.sol');
const CrossDelegate             = artifacts.require('CrossDelegate.sol');

// const { CrossDelegate } = require("../../migrations/wan/contract");
const {
    ADDRESS_0,
    ADDRESS_CROSS_PROXY_IMPL,
    ERROR_INFO,
    uniqueInfo,
    chainTypes,
    htlcLockedTime,
} = require("./common");

const {
    assert,
}                               = require('./lib');

it('Transfer owner @wanchain  ==> Success', async () => {
    const currentChainType = chainTypes.WAN;
    let crossProxy;
    let currentOwner;

    crossProxy = await CrossProxy.at(global.chains[currentChainType].scAddr.CrossProxy);

    const origOwner = await crossProxy.owner();
    const newOwner = global.aliceAccount.WAN;

    await crossProxy.transferOwner(newOwner, {from: origOwner});
    currentOwner = await crossProxy.owner();
    assert.equal(newOwner.toLowerCase(), currentOwner.toLowerCase(), `transfer owner from current owner (${currentOwner}) to new owner (${newOwner}) failed`);

    await crossProxy.transferOwner(origOwner, {from: newOwner});
    currentOwner = await crossProxy.owner();
    assert.equal(origOwner.toLowerCase(), currentOwner.toLowerCase(), `restore owner from current owner (${currentOwner}) to original owner (${origOwner}) failed`);
});

it('Transfer owner @wanchain  ==> New owner is the zero address', async () => {
    const currentChainType = chainTypes.WAN;
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[currentChainType].scAddr.CrossProxy);
        const origOwner = await crossProxy.owner();
        await crossProxy.transferOwner(ADDRESS_0, {from: origOwner});
        assert.fail(ERROR_INFO)
    } catch (err) {
        assert.include(err.toString(), "New owner is the zero address");
    }
});

it('Others getStoremanFee @wanchain and @ethereum  -> The config value', async () => {
    let wanCross = await CrossDelegate.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
    let smgWanFee = await wanCross.getStoremanFee(global.storemanGroups.src.ID);
    assert.equal(new web3.utils.BN(smgWanFee).eq(new web3.utils.BN(0)), true, `check storeman group fee at ${chainTypes.WAN} failed`);

    let ethCross = await CrossDelegate.at(global.chains[chainTypes.ETH].scAddr.CrossProxy);
    let smgEthFee = await ethCross.getStoremanFee(global.storemanGroups.src.ID);
    assert.equal(new web3.utils.BN(smgEthFee).eq(new web3.utils.BN(0)), true, `check storeman group fee at ${chainTypes.ETH} failed`);
});

it('Others getPartners @wanchain and @ethereum  ==> The config value', async () => {
    let wanchain = chainTypes.WAN;
    let wanCross = await CrossDelegate.at(global.chains[wanchain].scAddr.CrossProxy);
    let wanPartners = await wanCross.getPartners();
    assert.equal(global.chains[wanchain].scAddr.TokenManagerProxy, wanPartners.tokenManager, `check parnters tokenManager at ${wanchain} failed`);
    assert.equal(global.chains[wanchain].scAddr.TestStoremanAdmin, wanPartners.smgAdminProxy, `check parnters smgAdminProxy at ${wanchain} failed`);
    assert.equal(global.chains[wanchain].scAddr.TestStoremanAdmin, wanPartners.smgFeeProxy, `check parnters smgFeeProxy at ${wanchain} failed`);
    assert.equal(global.chains[wanchain].scAddr.QuotaProxy, wanPartners.quota, `check parnters quota at ${wanchain} failed`);
    assert.equal(global.chains[wanchain].scAddr.SignatureVerifier, wanPartners.sigVerifier, `check parnters sigVerifier at ${wanchain} failed`);

    let ethereum = chainTypes.ETH;
    let ethCross = await CrossDelegate.at(global.chains[ethereum].scAddr.CrossProxy);
    let ethPartners = await ethCross.getPartners();
    assert.equal(global.chains[ethereum].scAddr.TokenManagerProxy, ethPartners.tokenManager, `check parnters tokenManager at ${ethereum} failed`);
    assert.equal(global.chains[ethereum].scAddr.OracleProxy, ethPartners.smgAdminProxy, `check parnters smgAdminProxy at ${ethereum} failed`);
    assert.equal(ADDRESS_0, ethPartners.smgFeeProxy, `check parnters smgFeeProxy at ${ethereum} failed`);
    assert.equal(global.chains[ethereum].scAddr.QuotaProxy, ethPartners.quota, `check parnters quota at ${ethereum} failed`);
    assert.equal(global.chains[ethereum].scAddr.SignatureVerifier, ethPartners.sigVerifier, `check parnters sigVerifier at ${ethereum} failed`);
});

it('Others setPartners @wanchain  ==> Parameter is invalid', async () => {
    try {
        let wanCross = await CrossDelegate.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
        await wanCross.setPartners(ADDRESS_0, ADDRESS_0, global.chains[chainTypes.WAN].scAddr.TestStoremanAdmin, ADDRESS_0, ADDRESS_0);
        assert.fail(ERROR_INFO)
    } catch (err) {
        assert.include(err.toString(), "Parameter is invalid");
    }
});

it('Others setWithdrawFeeTimeout @wanchain  ==> Not owner', async () => {
    try {
        let wanCross = await CrossDelegate.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
        await wanCross.setWithdrawFeeTimeout(0, {from: global.aliceAccount.WAN});
        assert.fail(ERROR_INFO)
    } catch (err) {
        assert.include(err.toString(), "Not owner");
    }
});

it('Others setWithdrawFeeTimeout @wanchain  ==> Success', async () => {
    let wanCross = await CrossDelegate.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
    await wanCross.setWithdrawFeeTimeout(600);
});

it('Others getLeftLockedTime @wanchain  ==> invalid xHash', async () => {
    try {
        let wanCross = await CrossDelegate.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
        await wanCross.getLeftLockedTime(uniqueInfo.fastException);
        assert.fail(ERROR_INFO)
    } catch (err) {
        assert.include(err.toString(), "invalid xHash");
    }
});

it('Others getFees @wanchain and @ethereum  ==> The config value', async () => {
    const wanchain = chainTypes.WAN;
    const ethereum = chainTypes.ETH;
    let fees;
    let ret;

    // wanchain
    let wanCross = await CrossDelegate.at(global.chains[wanchain].scAddr.CrossProxy);

    fees = global.crossFees[wanchain][wanchain][ethereum];
    ret = await wanCross.getFees(global.chains[wanchain].ID, global.chains[ethereum].ID);
    assert.equal(fees.lockFee, ret.lockFee, `check lockFee from ${wanchain} to ${ethereum} at ${wanchain} failed`);
    assert.equal(fees.revokeFee, ret.revokeFee, `check revokeFee from ${wanchain} to ${ethereum} at ${wanchain} failed`);

    fees = global.crossFees[wanchain][ethereum][wanchain];
    ret = await wanCross.getFees(global.chains[ethereum].ID, global.chains[wanchain].ID);
    assert.equal(fees.lockFee, ret.lockFee, `check lockFee from ${ethereum} to ${wanchain} at ${wanchain} failed`);
    assert.equal(fees.revokeFee, ret.revokeFee, `check revokeFee from ${ethereum} to ${wanchain} at ${wanchain} failed`);

    // ethereum
    let ethCross = await CrossDelegate.at(global.chains[ethereum].scAddr.CrossProxy);
    // userLock
    fees = global.crossFees[ethereum][ethereum][wanchain];
    ret = await ethCross.getFees(global.chains[ethereum].ID, global.chains[wanchain].ID);
    assert.equal(fees.lockFee, ret.lockFee, `check lockFee from ${ethereum} to ${wanchain} at ${ethereum} failed`);
    assert.equal(fees.revokeFee, ret.revokeFee, `check revokeFee from ${ethereum} to ${wanchain} at ${ethereum} failed`);

    // userBurn
    fees = global.crossFees[ethereum][wanchain][ethereum];
    ret = await ethCross.getFees(global.chains[wanchain].ID, global.chains[ethereum].ID);
    assert.equal(fees.lockFee, ret.lockFee, `check lockFee from ${wanchain} to ${ethereum} at ${ethereum} failed`);
    assert.equal(fees.revokeFee, ret.revokeFee, `check revokeFee from ${wanchain} to ${ethereum} at ${ethereum} failed`);
});

it('Others lockedTime @wanchain  ==> The config value', async () => {
    let wanCross = await CrossDelegate.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
    let ret = await wanCross.lockedTime();
    assert.equal(htlcLockedTime, ret, "check lockedTime failed");
});

it('Proxy @wanchain   -> get the implementation address', async () => {
    let crossProxy = await CrossProxy.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
    let address = await crossProxy.implementation();
    assert.equal(address, global.chains[chainTypes.WAN].scAddr.CrossDelegate, "check implementation failed");
});

it('Proxy @wanchain   -> upgradeTo', async () => {
    let crossProxy = await CrossProxy.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
    await crossProxy.upgradeTo(ADDRESS_CROSS_PROXY_IMPL);

    let address = await crossProxy.implementation();
    assert.equal(address, ADDRESS_CROSS_PROXY_IMPL, "check implementation failed");
});

it('Proxy @wanchain   -> upgradeTo with the same implementation address', async () => {
    try {
        let crossProxy = await CrossProxy.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
        await crossProxy.upgradeTo(ADDRESS_CROSS_PROXY_IMPL);
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Cannot upgrade to the same implementation");
    }
});

it('Proxy @wanchain   -> upgradeTo with 0x address', async () => {
    try {
        let crossProxy = await CrossProxy.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
        await crossProxy.upgradeTo(ADDRESS_0);
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Cannot upgrade to invalid address");
    }
});

it('Proxy @wanchain   -> restore', async () => {
    let crossProxy = await CrossProxy.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
    let ret = await crossProxy.upgradeTo(global.chains[chainTypes.WAN].scAddr.CrossDelegate);
    let address = await crossProxy.implementation();
    assert.equal(address, global.chains[chainTypes.WAN].scAddr.CrossDelegate, "check implementation failed");

    assert.checkWeb3Event(ret, {
        event: 'Upgraded',
        args: {
            implementation:address
        }
    });
});
