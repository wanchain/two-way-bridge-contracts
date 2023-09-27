const CrossProxy                = artifacts.require('CrossProxy.sol');
const CrossDelegateV4             = artifacts.require('CrossDelegateV4.sol');

const {
    ADDRESS_0,
    ADDRESS_CROSS_PROXY_IMPL,
    ERROR_INFO,
    chainTypes,
} = require("./common");

const {
    assert,
    sha256,
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
    let wanCross = await CrossDelegateV4.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
    let smgWanFee = await wanCross.getStoremanFee(global.storemanGroups.src.ID);
    assert.equal(new web3.utils.BN(smgWanFee).eq(new web3.utils.BN(0)), true, `check storeman group fee at ${chainTypes.WAN} failed`);

    let ethCross = await CrossDelegateV4.at(global.chains[chainTypes.ETH].scAddr.CrossProxy);
    let smgEthFee = await ethCross.getStoremanFee(global.storemanGroups.src.ID);
    assert.equal(new web3.utils.BN(smgEthFee).eq(new web3.utils.BN(0)), true, `check storeman group fee at ${chainTypes.ETH} failed`);
});

it('Others getPartners @wanchain and @ethereum  ==> The chainID value', async () => {
    let wanchain = chainTypes.WAN;
    let wanCross = await CrossDelegateV4.at(global.chains[wanchain].scAddr.CrossProxy);
    let wanChainID = await wanCross.currentChainID();
    assert.equal(global.chains[wanchain].ID, Number(wanChainID), `check chainID at ${wanchain} failed`);

    let ethereum = chainTypes.ETH;
    let ethCross = await CrossDelegateV4.at(global.chains[ethereum].scAddr.CrossProxy);
    let ethChainID = await ethCross.currentChainID();
    assert.equal(global.chains[ethereum].ID, Number(ethChainID), `check chainID at ${ethereum} failed`);
});

it('Others getPartners @wanchain and @ethereum  ==> The admin value', async () => {
    let wanchain = chainTypes.WAN;
    let wanCross = await CrossDelegateV4.at(global.chains[wanchain].scAddr.CrossProxy);
    let wanAdmin = await wanCross.admin();
    assert.equal(global.adminAccount[wanchain], wanAdmin, `check admin at ${wanchain} failed`);

    let ethereum = chainTypes.ETH;
    let ethCross = await CrossDelegateV4.at(global.chains[ethereum].scAddr.CrossProxy);
    let ethAdmin = await ethCross.admin();
    assert.equal(global.adminAccount[ethereum], ethAdmin, `check admin at ${ethereum} failed`);
});

it('Others getPartners @wanchain and @ethereum  ==> The config value', async () => {
    let wanchain = chainTypes.WAN;
    let wanCross = await CrossDelegateV4.at(global.chains[wanchain].scAddr.CrossProxy);
    let wanPartners = await wanCross.getPartners();
    assert.equal(global.chains[wanchain].scAddr.TokenManagerProxy, wanPartners.tokenManager, `check partners tokenManager at ${wanchain} failed`);
    assert.equal(global.chains[wanchain].scAddr.TestStoremanAdmin, wanPartners.smgAdminProxy, `check partners smgAdminProxy at ${wanchain} failed`);
    assert.equal(global.foundationAccount[wanchain], wanPartners.smgFeeProxy, `check partners smgFeeProxy at ${wanchain} failed`);
    assert.equal(global.chains[wanchain].scAddr.SignatureVerifier, wanPartners.sigVerifier, `check partners sigVerifier at ${wanchain} failed`);

    let ethereum = chainTypes.ETH;
    let ethCross = await CrossDelegateV4.at(global.chains[ethereum].scAddr.CrossProxy);
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
        let wanCross = await CrossDelegateV4.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
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
    let wanCross = await CrossDelegateV4.at(global.chains[wanchain].scAddr.CrossProxy);

    fees = global.crossFeesV3[wanchain][ethereum];
    ret = await wanCross.getFee({srcChainID:global.chains[wanchain].ID, destChainID:global.chains[ethereum].ID});
    assert.equal(fees.contractFee, ret.contractFee, `check contractFee from ${wanchain} to ${ethereum} at ${wanchain} failed`);
    assert.equal(fees.agentFee, ret.agentFee, `check agentFee from ${wanchain} to ${ethereum} at ${wanchain} failed`);

    // ethereum
    let ethCross = await CrossDelegateV4.at(global.chains[ethereum].scAddr.CrossProxy);

    fees = global.crossFeesV3[ethereum][wanchain];
    ret = await ethCross.getFee({srcChainID:global.chains[ethereum].ID, destChainID:global.chains[wanchain].ID});
    assert.equal(fees.contractFee, ret.contractFee, `check contractFee from ${ethereum} to ${wanchain} at ${ethereum} failed`);
    assert.equal(fees.agentFee, ret.agentFee, `check agentFee from ${ethereum} to ${wanchain} at ${ethereum} failed`);
});

it('Others getTokenPairFees and getTokenPairFee  ==> The default value', async () => {
    const wanchain = chainTypes.WAN;
    let ret;

    // wanchain
    let wanCross = await CrossDelegateV4.at(global.chains[wanchain].scAddr.CrossProxy);

    const tokenPairIDs = ["0", "1"];
    ret = await wanCross.getTokenPairFees(tokenPairIDs);
    for (let i = 0; i < tokenPairIDs.length; ++i) {
        assert.equal(ret[i].eq(new web3.utils.BN(0)), true, `check token pair ${tokenPairIDs[i]} default contractFee failed`);
    }

    ret = await wanCross.getTokenPairFee(tokenPairIDs[0]);
    assert.equal(ret.eq(new web3.utils.BN(0)), true, `check token pair fee about ${tokenPairIDs[0]} default contractFee failed`);
});

it('Others setEtherTransferGasLimit and getEtherTransferGasLimit  ==> The default value', async () => {
    const wanchain = chainTypes.WAN;
    let ret;

    // wanchain
    let wanCross = await CrossDelegateV4.at(global.chains[wanchain].scAddr.CrossProxy);

    ret = await wanCross.getEtherTransferGasLimit();
    assert.equal(ret.eq(new web3.utils.BN(2300)), true, `check default etherTransferGasLimit failed`);

    const admin = await wanCross.admin();
    await wanCross.setEtherTransferGasLimit(3000, {from: admin});
    ret = await wanCross.getEtherTransferGasLimit();
    assert.equal(ret.eq(new web3.utils.BN(3000)), true, `check etherTransferGasLimit after setEtherTransferGasLimit failed`);

    await wanCross.setEtherTransferGasLimit(0, {from: admin});
    ret = await wanCross.getEtherTransferGasLimit();
    assert.equal(ret.eq(new web3.utils.BN(2300)), true, `check etherTransferGasLimit after setEtherTransferGasLimit failed`);
});

it('Others setHashType and hashType  ==> The default value', async () => {
    const wanchain = chainTypes.WAN;
    let ret;
    let data = "0x010203040506070809";

    // wanchain
    let wanCross = await CrossDelegateV4.at(global.chains[wanchain].scAddr.CrossProxy);

    ret = await wanCross.hashType();
    assert.equal(ret.eq(new web3.utils.BN(0)), true, `check default hashType failed`);

    const sha256Hash = await wanCross.hashFunc(data);
    const sha256Local = sha256(Buffer.from(web3.utils.hexToBytes(data)));
    assert.equal(sha256Hash, sha256Local, "check sha256 failed");

    await wanCross.setHashType(1);
    ret = await wanCross.hashType();
    assert.equal(ret.eq(new web3.utils.BN(1)), true, `check hashType after setHashType failed`);

    const keccak256Hash = await wanCross.hashFunc(data);
    const keccak256Local = web3.utils.keccak256(Buffer.from(web3.utils.hexToBytes(data)));
    assert.equal(keccak256Hash, keccak256Local, "check keccak256 failed");

    await wanCross.setHashType(0);
    ret = await wanCross.hashType();
    assert.equal(ret.eq(new web3.utils.BN(0)), true, `check hashType after setHashType failed`);
});

it('Others setHashType and hashType failed by account which is not owner', async () => {
    try {
        const wanchain = chainTypes.WAN;
        let ret;

        // wanchain
        let wanCross = await CrossDelegateV4.at(global.chains[wanchain].scAddr.CrossProxy);
        const admin = await wanCross.admin();
        await wanCross.setHashType(1, {from: admin});
        } catch (err) {
        assert.include(err.toString(), "Not owner");
    }
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
