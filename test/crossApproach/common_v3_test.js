const CrossProxy                = artifacts.require('CrossProxy.sol');
const CrossDelegateV3             = artifacts.require('CrossDelegateV3.sol');

const {
    ADDRESS_0,
    ADDRESS_CROSS_PROXY_IMPL,
    ERROR_INFO,
    chainTypes,
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
    let wanCross = await CrossDelegateV3.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
    let smgWanFee = await wanCross.getStoremanFee(global.storemanGroups.src.ID);
    assert.equal(new web3.utils.BN(smgWanFee).eq(new web3.utils.BN(0)), true, `check storeman group fee at ${chainTypes.WAN} failed`);

    let ethCross = await CrossDelegateV3.at(global.chains[chainTypes.ETH].scAddr.CrossProxy);
    let smgEthFee = await ethCross.getStoremanFee(global.storemanGroups.src.ID);
    assert.equal(new web3.utils.BN(smgEthFee).eq(new web3.utils.BN(0)), true, `check storeman group fee at ${chainTypes.ETH} failed`);
});

it('Others getPartners @wanchain and @ethereum  ==> The chainID value', async () => {
    let wanchain = chainTypes.WAN;
    let wanCross = await CrossDelegateV3.at(global.chains[wanchain].scAddr.CrossProxy);
    let wanChainID = await wanCross.currentChainID();
    assert.equal(global.chains[wanchain].ID, Number(wanChainID), `check chainID at ${wanchain} failed`);

    let ethereum = chainTypes.ETH;
    let ethCross = await CrossDelegateV3.at(global.chains[ethereum].scAddr.CrossProxy);
    let ethChainID = await ethCross.currentChainID();
    assert.equal(global.chains[ethereum].ID, Number(ethChainID), `check chainID at ${ethereum} failed`);
});

it('Others getPartners @wanchain and @ethereum  ==> The admin value', async () => {
    let wanchain = chainTypes.WAN;
    let wanCross = await CrossDelegateV3.at(global.chains[wanchain].scAddr.CrossProxy);
    let wanAdmin = await wanCross.admin();
    assert.equal(global.adminAccount[wanchain], wanAdmin, `check admin at ${wanchain} failed`);

    let ethereum = chainTypes.ETH;
    let ethCross = await CrossDelegateV3.at(global.chains[ethereum].scAddr.CrossProxy);
    let ethAdmin = await ethCross.admin();
    assert.equal(global.adminAccount[ethereum], ethAdmin, `check admin at ${ethereum} failed`);
});

it('Others getPartners @wanchain and @ethereum  ==> The config value', async () => {
    let wanchain = chainTypes.WAN;
    let wanCross = await CrossDelegateV3.at(global.chains[wanchain].scAddr.CrossProxy);
    let wanPartners = await wanCross.getPartners();
    assert.equal(global.chains[wanchain].scAddr.TokenManagerProxy, wanPartners.tokenManager, `check partners tokenManager at ${wanchain} failed`);
    assert.equal(global.chains[wanchain].scAddr.TestStoremanAdmin, wanPartners.smgAdminProxy, `check partners smgAdminProxy at ${wanchain} failed`);
    assert.equal(global.foundationAccount[wanchain], wanPartners.smgFeeProxy, `check partners smgFeeProxy at ${wanchain} failed`);
    assert.equal(global.chains[wanchain].scAddr.SignatureVerifier, wanPartners.sigVerifier, `check partners sigVerifier at ${wanchain} failed`);

    let ethereum = chainTypes.ETH;
    let ethCross = await CrossDelegateV3.at(global.chains[ethereum].scAddr.CrossProxy);
    let ethPartners = await ethCross.getPartners();
    assert.equal(global.chains[ethereum].scAddr.TokenManagerProxy, ethPartners.tokenManager, `check partners tokenManager at ${ethereum} failed`);
    assert.equal(global.chains[ethereum].scAddr.OracleProxy, ethPartners.smgAdminProxy, `check partners smgAdminProxy at ${ethereum} failed`);
    assert.equal(global.foundationAccount[ethereum], ethPartners.smgFeeProxy, `check partners smgFeeProxy at ${ethereum} failed`);
    assert.equal(global.chains[ethereum].scAddr.SignatureVerifier, ethPartners.sigVerifier, `check partners sigVerifier at ${ethereum} failed`);
});

it('Others setPartners @wanchain  ==> Parameter is invalid', async () => {
    try {
        let crossProxy = await CrossProxy.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
        const origOwner = await crossProxy.owner();
        let wanCross = await CrossDelegateV3.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
        await wanCross.setPartners(ADDRESS_0, ADDRESS_0, global.chains[chainTypes.WAN].scAddr.TestStoremanAdmin, ADDRESS_0, ADDRESS_0, {from: origOwner});
        assert.fail(ERROR_INFO)
    } catch (err) {
        assert.include(err.toString(), "Parameter is invalid");
    }
});

it('Others getFees @wanchain and @ethereum  ==> The config value', async () => {
    const wanchain = chainTypes.WAN;
    const ethereum = chainTypes.ETH;
    let fees;
    let ret;

    // wanchain
    let wanCross = await CrossDelegateV3.at(global.chains[wanchain].scAddr.CrossProxy);

    fees = global.crossFeesV3[wanchain][ethereum];
    ret = await wanCross.getFee({srcChainID:global.chains[wanchain].ID, destChainID:global.chains[ethereum].ID});
    assert.equal(fees.contractFee, ret.contractFee, `check contractFee from ${wanchain} to ${ethereum} at ${wanchain} failed`);
    assert.equal(fees.agentFee, ret.agentFee, `check agentFee from ${wanchain} to ${ethereum} at ${wanchain} failed`);

    // ethereum
    let ethCross = await CrossDelegateV3.at(global.chains[ethereum].scAddr.CrossProxy);

    fees = global.crossFeesV3[ethereum][wanchain];
    ret = await ethCross.getFee({srcChainID:global.chains[ethereum].ID, destChainID:global.chains[wanchain].ID});
    assert.equal(fees.contractFee, ret.contractFee, `check contractFee from ${ethereum} to ${wanchain} at ${ethereum} failed`);
    assert.equal(fees.agentFee, ret.agentFee, `check agentFee from ${ethereum} to ${wanchain} at ${ethereum} failed`);
});

it('Proxy @wanchain   -> get the implementation address', async () => {
    let crossProxy = await CrossProxy.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
    let address = await crossProxy.implementation();
    assert.equal(address, global.chains[chainTypes.WAN].scAddr.CrossDelegateV3, "check implementation failed");
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
    let ret = await crossProxy.upgradeTo(global.chains[chainTypes.WAN].scAddr.CrossDelegateV3);
    let address = await crossProxy.implementation();
    assert.equal(address, global.chains[chainTypes.WAN].scAddr.CrossDelegateV3, "check implementation failed");

    assert.checkWeb3Event(ret, {
        event: 'Upgraded',
        args: {
            implementation:address
        }
    });
});
