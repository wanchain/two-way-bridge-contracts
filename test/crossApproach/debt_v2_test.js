const CrossDelegateV2 = artifacts.require('CrossDelegateV2');
const CrossProxy = artifacts.require('CrossProxy');

const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');

const QuotaDelegate = artifacts.require('QuotaDelegate');

const {
    ERROR_INFO,
    uniqueInfo,
    chainTypes,
    defaultCurve2Schnorr,
} = require("./common");

const {
    skInfo,
    storemanGroupStatus,
} = require("./smg-config");

const {
    filterTokenPair,
    getTokenAccount
} = require("./token-config");

const {
    assert,
    testInit,
    getTxParsedLogs
}                               = require('./lib');

const {
    typesArrayList,
} = require("./sc-config");

const {
    getRC20TokenInstance,
    buildMpcSign,
}                               = require('../utils');

const crossValue = 10;
const minerFee = 5;


before("init...   -> success", () => {
    testInit();
});

it('Chain [WAN] <=> Chain [ETH] -> Asset @wanchain <( wanchain => ethereum )> -> transferAsset  ==> Halted', async () => {
    let crossProxy;
    try {
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const srcSmgID = global.storemanGroups.src.ID;
        const destSmgID = global.storemanGroups.dest.ID;
        const uniqueID = uniqueInfo.wanAssetDebt;
        const senderAccount = global.smgAccount.src[currentChainType];

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        let funcParams = {
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
        };

        // curveID
        let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.srcSmgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.transferAsset, (await cross.currentChainID()), funcParams.uniqueID, funcParams.destSmgID);
        funcParams = {...funcParams, R: R, s: s};

        // crossProxy halted
        crossProxy = await CrossProxy.at(global.chains[currentChainType].scAddr.CrossProxy);
        await crossProxy.setHalt(true, {from: global.contractOwner});

        // transferAsset
        let receipt = await cross.transferAsset(...Object.values(funcParams), {from: senderAccount});
        if (!receipt.logs.length) {
            receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
        }

        assert.checkWeb3Event(receipt, {
            event: 'TransferAssetLogger',
            args: {
                uniqueID: funcParams.uniqueID,
                srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
                destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
            }
        });

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        if (crossProxy) {
            await crossProxy.setHalt(false, {from: global.contractOwner});
        }
    }
});

it('Chain [WAN] <=> Chain [ETH] -> Asset @wanchain <( wanchain => ethereum )> -> transferAsset  ==> Destination storeman group ID is invalid', async () => {
    try {
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const srcSmgID = global.storemanGroups.src.ID;
        const destSmgID = global.storemanGroups.exception.ID;
        const uniqueID = uniqueInfo.wanAssetDebt;
        const senderAccount = global.smgAccount.src[currentChainType];

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        let funcParams = {
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
        };

        // curveID
        let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.srcSmgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.transferAsset, (await cross.currentChainID()), funcParams.uniqueID, funcParams.destSmgID);
        funcParams = {...funcParams, R: R, s: s};

        // transferAsset
        let receipt = await cross.transferAsset(...Object.values(funcParams), {from: senderAccount});
        if (!receipt.logs.length) {
            receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
        }

        assert.checkWeb3Event(receipt, {
            event: 'TransferAssetLogger',
            args: {
                uniqueID: funcParams.uniqueID,
                srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
                destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
            }
        });

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    }
});

it('Chain [WAN] <=> Chain [ETH] -> Asset @wanchain <( wanchain => ethereum )> -> transferAsset  ==> Destination storeman group ID is not ready', async () => {
    let smg;
    let funcParams;
    try {
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const srcSmgID = global.storemanGroups.src.ID;
        const destSmgID = global.storemanGroups.dest.ID;
        const uniqueID = uniqueInfo.wanAssetDebt;
        const senderAccount = global.smgAccount.src[currentChainType];

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        funcParams = {
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
        };

        // curveID
        smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.srcSmgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.transferAsset, (await cross.currentChainID()), funcParams.uniqueID, funcParams.destSmgID);
        funcParams = {...funcParams, R: R, s: s};

        // destination storeman group is ready
        await smg.setStoremanGroupStatus(funcParams.srcSmgID, storemanGroupStatus.ready);
        // source storeman group is unregistered
        await smg.setStoremanGroupStatus(funcParams.destSmgID, storemanGroupStatus.unregistered);

        let receipt = await cross.transferAsset(...Object.values(funcParams), {from: senderAccount});
        if (!receipt.logs.length) {
            receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
        }

        assert.checkWeb3Event(receipt, {
            event: 'TransferAssetLogger',
            args: {
                uniqueID: funcParams.uniqueID,
                srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
                destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
            }
        });

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    } finally {
        if (smg) {
            // restore storeman group ready
            await smg.setStoremanGroupStatus(funcParams.srcSmgID, storemanGroupStatus.ready);
            await smg.setStoremanGroupStatus(funcParams.destSmgID, storemanGroupStatus.ready);
        }
    }
});

it('Chain [WAN] <=> Chain [ETH] -> Asset @wanchain <( wanchain => ethereum )> -> transferAsset  ==> Source storeman group ID is ready', async () => {
    let smg;
    let funcParams;
    try {
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const srcSmgID = global.storemanGroups.src.ID;
        const destSmgID = global.storemanGroups.dest.ID;
        const uniqueID = uniqueInfo.wanAssetDebt;
        const senderAccount = global.smgAccount.src[currentChainType];

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        funcParams = {
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
        };

        // curveID
        smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.srcSmgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.transferAsset, (await cross.currentChainID()), funcParams.uniqueID, funcParams.destSmgID);
        funcParams = {...funcParams, R: R, s: s};

        // destination storeman group is unregistered
        await smg.setStoremanGroupStatus(funcParams.srcSmgID, storemanGroupStatus.ready);
        // destination storeman group is ready
        await smg.setStoremanGroupStatus(funcParams.destSmgID, storemanGroupStatus.ready);

        let receipt = await cross.transferAsset(...Object.values(funcParams), {from: senderAccount});
        if (!receipt.logs.length) {
            receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
        }

        assert.checkWeb3Event(receipt, {
            event: 'TransferAssetLogger',
            args: {
                uniqueID: funcParams.uniqueID,
                srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
                destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
            }
        });

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not unregistered");
    } finally {
        if (smg) {
            // restore storeman group ready
            await smg.setStoremanGroupStatus(funcParams.srcSmgID, storemanGroupStatus.ready);
            await smg.setStoremanGroupStatus(funcParams.destSmgID, storemanGroupStatus.ready);
        }
    }
});

it('Chain [WAN] <=> Chain [ETH] -> Asset @wanchain <( wanchain => ethereum )> -> transferAsset  ==> Signature is invalid', async () => {
    let smg;
    try {
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const srcSmgID = global.storemanGroups.src.ID;
        const destSmgID = global.storemanGroups.dest.ID;
        const uniqueID = uniqueInfo.wanAssetDebt;
        const senderAccount = global.smgAccount.src[currentChainType];

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        let funcParams = {
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
        };

        // curveID
        smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.srcSmgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.transferAsset, (await cross.currentChainID()), funcParams.uniqueID, funcParams.srcSmgID);
        funcParams = {...funcParams, R: R, s: s};

        let receipt = await cross.transferAsset(...Object.values(funcParams), {from: senderAccount});
        if (!receipt.logs.length) {
            receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
        }

        assert.checkWeb3Event(receipt, {
            event: 'TransferAssetLogger',
            args: {
                uniqueID: funcParams.uniqueID,
                srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
                destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
            }
        });

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not unregistered");
    }
});

it('Chain [WAN] <=> Chain [ETH] -> Debt @ethereum <( wanchain => ethereum )> -> receiveDebt  ==> Halted', async () => {
    let crossProxy;
    try {
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const srcSmgID = global.storemanGroups.src.ID;
        const destSmgID = global.storemanGroups.dest.ID;
        const uniqueID = uniqueInfo.wanAssetDebt;
        const senderAccount = global.smgAccount.dest[currentChainType];

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        let funcParams = {
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
        };

        // curveID
        let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.destSmgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.dest[currentChainType];

        // sign
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.receiveDebt, (await cross.currentChainID()), funcParams.uniqueID, funcParams.srcSmgID);
        funcParams = {...funcParams, R: R, s: s};

        // crossProxy halted
        crossProxy = await CrossProxy.at(global.chains[currentChainType].scAddr.CrossProxy);
        await crossProxy.setHalt(true, {from: global.contractOwner});

        // receiveDebt
        let receipt = await cross.receiveDebt(...Object.values(funcParams), {from: senderAccount});
        if (!receipt.logs.length) {
            receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
        }

        assert.checkWeb3Event(receipt, {
            event: 'ReceiveDebtLogger',
            args: {
                uniqueID: funcParams.uniqueID,
                srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
                destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
            }
        });

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        if (crossProxy) {
            await crossProxy.setHalt(false, {from: global.contractOwner});
        }
    }
});

it('Chain [WAN] <=> Chain [ETH] -> Debt @ethereum <( wanchain => ethereum )> -> receiveDebt  ==> Destination storeman group ID is invalid', async () => {
    try {
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const srcSmgID = global.storemanGroups.src.ID;
        const destSmgID = global.storemanGroups.exception.ID;
        const uniqueID = uniqueInfo.wanAssetDebt;
        const senderAccount = global.smgAccount.dest[currentChainType];

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        let funcParams = {
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
        };

        // curveID
        let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
        let smgConfig = await smg.getStoremanGroupConfig.call(global.storemanGroups.dest.ID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.dest[currentChainType];

        // sign
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.receiveDebt, (await cross.currentChainID()), funcParams.uniqueID, funcParams.srcSmgID);
        funcParams = {...funcParams, R: R, s: s};

        // receiveDebt
        let receipt = await cross.receiveDebt(...Object.values(funcParams), {from: senderAccount});
        if (!receipt.logs.length) {
            receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
        }

        assert.checkWeb3Event(receipt, {
            event: 'ReceiveDebtLogger',
            args: {
                uniqueID: funcParams.uniqueID,
                srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
                destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
            }
        });

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    }
});

it('Chain [WAN] <=> Chain [ETH] -> Debt @ethereum <( wanchain => ethereum )> -> receiveDebt  ==> Destination storeman group ID is not ready', async () => {
    let smg;
    let funcParams;
    try {
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const srcSmgID = global.storemanGroups.src.ID;
        const destSmgID = global.storemanGroups.dest.ID;
        const uniqueID = uniqueInfo.wanAssetDebt;
        const senderAccount = global.smgAccount.dest[currentChainType];

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        funcParams = {
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
        };

        // curveID
        smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.destSmgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.dest[currentChainType];

        // sign
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.receiveDebt, (await cross.currentChainID()), funcParams.uniqueID, funcParams.srcSmgID);
        funcParams = {...funcParams, R: R, s: s};

        // destination storeman group is ready
        await smg.setStoremanGroupStatus(funcParams.srcSmgID, storemanGroupStatus.ready);
        // source storeman group is unregistered
        await smg.setStoremanGroupStatus(funcParams.destSmgID, storemanGroupStatus.unregistered);

        // receiveDebt
        let receipt = await cross.receiveDebt(...Object.values(funcParams), {from: senderAccount});
        if (!receipt.logs.length) {
            receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
        }

        assert.checkWeb3Event(receipt, {
            event: 'ReceiveDebtLogger',
            args: {
                uniqueID: funcParams.uniqueID,
                srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
                destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
            }
        });

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    } finally {
        if (smg) {
            // restore storeman group ready
            await smg.setStoremanGroupStatus(funcParams.srcSmgID, storemanGroupStatus.ready);
            await smg.setStoremanGroupStatus(funcParams.destSmgID, storemanGroupStatus.ready);
        }
    }
});

it('Chain [WAN] <=> Chain [ETH] -> Debt @ethereum <( wanchain => ethereum )> -> receiveDebt  ==> Signature is invalid', async () => {
    try {
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const srcSmgID = global.storemanGroups.src.ID;
        const destSmgID = global.storemanGroups.dest.ID;
        const uniqueID = uniqueInfo.wanAssetDebt;
        const senderAccount = global.smgAccount.dest[currentChainType];

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        let funcParams = {
            uniqueID: uniqueID,
            srcSmgID: srcSmgID,
            destSmgID: destSmgID,
        };

        // curveID
        let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.destSmgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.dest[currentChainType];

        // sign
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.receiveDebt, (await cross.currentChainID()), funcParams.uniqueID, funcParams.destSmgID);
        funcParams = {...funcParams, R: R, s: s};

        // receiveDebt
        let receipt = await cross.receiveDebt(...Object.values(funcParams), {from: senderAccount});
        if (!receipt.logs.length) {
            receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
        }

        assert.checkWeb3Event(receipt, {
            event: 'ReceiveDebtLogger',
            args: {
                uniqueID: funcParams.uniqueID,
                srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
                destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
            }
        });

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Signature verification failed");
    }
});

// WAN
it('Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = ethUserAccount;
    const senderAccount = wanUserAccount;
    const contractFee = global.crossFeesV2[currentChainType][buddyChainType].contractFee;

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[currentChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    const totalValue = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // exec
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        userAccount: userAccount
    };
    let receipt = await cross.userLock(...Object.values(funcParams), {from: senderAccount, value: totalValue});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserLockLogger',
        args: {
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenAccount: tokenAccount,
            value: funcParams.crossValue,
            contractFee: contractFee,
            userAccount: funcParams.userAccount.toLowerCase(),
        }
    });
});

it('Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( wanchain => ethereum )> -> smgMint  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const uniqueID = uniqueInfo.userDebtLockWAN;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = ethUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[buddyChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgMint(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'SmgMintLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.crossValue,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });
});

// ETH
it('Chain [ETH] <=> Chain [WAN] -> COIN [ETH @ethereum] <( ethereum => wanchain )> -> userLock  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = ethUserAccount;
    const contractFee = global.crossFeesV2[currentChainType][buddyChainType].contractFee;

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[currentChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    const totalValue = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // exec
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        userAccount: userAccount
    };
    let receipt = await cross.userLock(...Object.values(funcParams), {from: senderAccount, value: totalValue});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserLockLogger',
        args: {
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenAccount: tokenAccount,
            value: funcParams.crossValue,
            contractFee: contractFee,
            userAccount: funcParams.userAccount.toLowerCase(),
        }
    });
});

it('Chain [WAN] <=> Chain [ETH] -> Unregister @wanchain @ethereum <( wanchain <=> ethereum )> -> setStoremanGroupStatus  ==> unregister source storeman group', async () => {
    const wanchain = chainTypes.WAN;
    const ethereum = chainTypes.ETH;
    const srcSmgID = global.storemanGroups.src.ID;
    const destSmgID = global.storemanGroups.dest.ID;

    // wanchain
    const wanCross = await CrossDelegateV2.at(global.chains[wanchain].scAddr.CrossProxy);
    const wanPartners = await wanCross.getPartners();
    const wanSmg = await global.getSmgProxy(wanchain, wanPartners.smgAdminProxy);
    // source storeman group is unregistered
    await wanSmg.setStoremanGroupStatus(srcSmgID, storemanGroupStatus.unregistered);
    const wanSrcSmgConfig = await wanSmg.getStoremanGroupConfig.call(srcSmgID);
    assert.equal(wanSrcSmgConfig.status, storemanGroupStatus.unregistered, `check source storeman group status at ${wanchain} failed`);

    // destination storeman group is ready
    await wanSmg.setStoremanGroupStatus(destSmgID, storemanGroupStatus.ready);
    const wanDestSmgConfig = await wanSmg.getStoremanGroupConfig.call(destSmgID);
    assert.equal(wanDestSmgConfig.status, storemanGroupStatus.ready, `check destination storeman group status at ${wanchain} failed`);

    // ethereum
    const ethCross = await CrossDelegateV2.at(global.chains[ethereum].scAddr.CrossProxy);
    const ethPartners = await ethCross.getPartners();
    const ethSmg = await global.getSmgProxy(ethereum, ethPartners.smgAdminProxy);
    // source storeman group is unregistered
    await ethSmg.setStoremanGroupStatus(srcSmgID, storemanGroupStatus.unregistered);
    const ethSrcSmgConfig = await ethSmg.getStoremanGroupConfig.call(srcSmgID);
    assert.equal(ethSrcSmgConfig.status, storemanGroupStatus.unregistered, `check source storeman group status at ${ethereum} failed`);

    // destination storeman group is ready
    await ethSmg.setStoremanGroupStatus(destSmgID, storemanGroupStatus.ready);
    const ethDestSmgConfig = await ethSmg.getStoremanGroupConfig.call(destSmgID);
    assert.equal(ethDestSmgConfig.status, storemanGroupStatus.ready, `check destination storeman group status at ${ethereum} failed`);

});

it('Chain [WAN] <=> Chain [ETH] -> Asset @wanchain <( wanchain => ethereum )> -> transferAsset  ==>  success', async () => {
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const srcSmgID = global.storemanGroups.src.ID;
    const destSmgID = global.storemanGroups.dest.ID;
    const uniqueID = uniqueInfo.wanAssetDebt;
    const senderAccount = global.smgAccount.src[currentChainType];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    let funcParams = {
        uniqueID: uniqueID,
        srcSmgID: srcSmgID,
        destSmgID: destSmgID,
    };

    // curveID
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.srcSmgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.transferAsset, (await cross.currentChainID()), funcParams.uniqueID, funcParams.destSmgID);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.transferAsset(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'TransferAssetLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
            destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
        }
    });
});

it('Chain [WAN] <=> Chain [ETH] -> Debt @ethereum <( wanchain => ethereum )> -> receiveDebt  ==>  success', async () => {
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const srcSmgID = global.storemanGroups.src.ID;
    const destSmgID = global.storemanGroups.dest.ID;
    const uniqueID = uniqueInfo.wanAssetDebt;
    const senderAccount = global.smgAccount.dest[currentChainType];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    let funcParams = {
        uniqueID: uniqueID,
        srcSmgID: srcSmgID,
        destSmgID: destSmgID,
    };

    // curveID
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.destSmgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.dest[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.receiveDebt, (await cross.currentChainID()), funcParams.uniqueID, funcParams.srcSmgID);
    funcParams = {...funcParams, R: R, s: s};

    // receiveDebt
    let receipt = await cross.receiveDebt(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'ReceiveDebtLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
            destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
        }
    });
});

it('Chain [ETH] <=> Chain [WAN] -> Asset @ethereum <( ethereum => wanchain )> -> transferAsset  ==>  success', async () => {
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const srcSmgID = global.storemanGroups.src.ID;
    const destSmgID = global.storemanGroups.dest.ID;
    const uniqueID = uniqueInfo.ethAssetDebt;
    const senderAccount = global.smgAccount.src[currentChainType];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    let funcParams = {
        uniqueID: uniqueID,
        srcSmgID: srcSmgID,
        destSmgID: destSmgID,
    };

    // curveID
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.srcSmgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.transferAsset, (await cross.currentChainID()), funcParams.uniqueID, funcParams.destSmgID);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.transferAsset(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'TransferAssetLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
            destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
        }
    });
});

it('Chain [ETH] <=> Chain [WAN] -> Debt @wanchain <( ethereum => wanchain )> -> receiveDebt  ==>  success', async () => {
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const srcSmgID = global.storemanGroups.src.ID;
    const destSmgID = global.storemanGroups.dest.ID;
    const uniqueID = uniqueInfo.ethAssetDebt;
    const senderAccount = global.smgAccount.dest[currentChainType];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    let funcParams = {
        uniqueID: uniqueID,
        srcSmgID: srcSmgID,
        destSmgID: destSmgID,
    };

    // curveID
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.destSmgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.dest[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.receiveDebt, (await cross.currentChainID()), funcParams.uniqueID, funcParams.srcSmgID);
    funcParams = {...funcParams, R: R, s: s};

    // receiveDebt
    let receipt = await cross.receiveDebt(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].HTLCDebtLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'ReceiveDebtLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            srcSmgID: web3.utils.padRight(funcParams.srcSmgID, 64),
            destSmgID: web3.utils.padRight(funcParams.destSmgID, 64),
        }
    });
});

// ETH
it('Chain [ETH] <=> Chain [WAN] -> COIN [ETH @wanchain] <( ethereum => wanchain )> -> smgMint  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const uniqueID = uniqueInfo.userLockETH;
    const smgID = global.storemanGroups.dest.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = global.smgAccount.dest[currentChainType];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[buddyChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.dest[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgMint(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'SmgMintLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.crossValue,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });
});

it('Chain [ETH] <=> Chain [WAN] -> COIN [ETH @wanchain] <( wanchain => ethereum )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const smgID = global.storemanGroups.dest.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const minerFeeToWei = web3.utils.toWei(minerFee.toString());
    const userAccount = ethUserAccount;
    const senderAccount = wanUserAccount;
    const contractFee = global.crossFeesV2[currentChainType][buddyChainType].contractFee;

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[buddyChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    let fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    // approve
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        minerFee: fee.agentFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    // get token instance
    let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
    let balance = await tokenInstance.balanceOf(senderAccount);
    assert.equal(crossValueToWei, balance.toString(), "balance of sender account error");

    // exec
    let receipt = await cross.userBurn(...Object.values(funcParams), {from: senderAccount, value: global.crossFeesV2[currentChainType][buddyChainType].contractFee});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserBurnLogger',
        args: {
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenAccount: funcParams.tokenAccount,
            value: funcParams.crossValue,
            contractFee: contractFee,
            fee: fee.agentFee,
            userAccount: funcParams.userAccount.toLowerCase(),
        }
    });
});

it('Chain [ETH] <=> Chain [WAN] -> COIN [ETH @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const uniqueID = uniqueInfo.userReleaseETH;
    const smgID = global.storemanGroups.dest.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = ethUserAccount;
    const senderAccount = global.smgAccount.dest[currentChainType];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[currentChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    // curveID
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.dest[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgRelease, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgRelease(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'SmgReleaseLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.crossValue,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });
});

// WAN
it('Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( ethereum => wanchain )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const smgID = global.storemanGroups.dest.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const minerFeeToWei = web3.utils.toWei(minerFee.toString());
    const userAccount = wanUserAccount;
    const senderAccount = ethUserAccount;
    const contractFee = global.crossFeesV2[currentChainType][buddyChainType].contractFee;

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[buddyChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    let fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    // approve
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        minerFee: fee.agentFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    // get token instance
    let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
    let balance = await tokenInstance.balanceOf(senderAccount);
    assert.equal(crossValueToWei, balance.toString(), "balance of sender account error");

    // await tokenInstance.approve(cross.address, 0, {from: senderAccount});
    // await tokenInstance.approve(cross.address, crossValueToWei, {from: senderAccount});
    // let allowance = await tokenInstance.allowance(senderAccount, cross.address);
    // assert.equal(crossValueToWei, allowance.toString(), "approve token failed");

    // exec
    let receipt = await cross.userBurn(...Object.values(funcParams), {from: senderAccount, value: global.crossFeesV2[currentChainType][buddyChainType].contractFee});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserBurnLogger',
        args: {
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenAccount: funcParams.tokenAccount,
            value: funcParams.crossValue,
            contractFee: contractFee,
            fee: fee.agentFee,
            userAccount: funcParams.userAccount.toLowerCase(),
        }
    });
});

it('Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( ethereum => wanchain )> -> smgRelease  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const uniqueID = uniqueInfo.userDebtReleaseWAN;
    const smgID = global.storemanGroups.dest.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = global.smgAccount.dest[currentChainType];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[currentChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    // curveID
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.dest[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgRelease, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgRelease(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV2, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'SmgReleaseLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.crossValue,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });
});

it('Debt Cleaned -> Cross Cleaned  ==> success', async () => {
    const wanchain = chainTypes.WAN;
    const ethereum = chainTypes.ETH;
    const wanCross = await CrossDelegateV2.at(global.chains[wanchain].scAddr.CrossProxy);
    const ethCross = await CrossDelegateV2.at(global.chains[ethereum].scAddr.CrossProxy);
    const wanPartners = await wanCross.getPartners();
    const ethPartners = await ethCross.getPartners();
    const wanQuota = await QuotaDelegate.at(wanPartners.quota);
    const ethQuota = await QuotaDelegate.at(ethPartners.quota);
    const wanSrcSmgTokenCount = await wanQuota.getTokenCount(global.storemanGroups.src.ID);
    const ethSrcSmgTokenCount = await ethQuota.getTokenCount(global.storemanGroups.src.ID);
    const wanDestSmgTokenCount = await wanQuota.getTokenCount(global.storemanGroups.dest.ID);
    const ethDestSmgTokenCount = await ethQuota.getTokenCount(global.storemanGroups.dest.ID);

    // assert.equal(wanSrcSmgTokenCount.add(new web3.utils.BN(1)).eq(ethSrcSmgTokenCount), true, `check source storeman group token count about ${wanchain} and ${ethereum} failed: wanchain(${wanSrcSmgTokenCount}) ethereum(${ethSrcSmgTokenCount})`);
    assert.equal(wanSrcSmgTokenCount.eq(ethSrcSmgTokenCount), false, `check source storeman group token count about ${wanchain} and ${ethereum} failed: wanchain(${wanSrcSmgTokenCount}) ethereum(${ethSrcSmgTokenCount})`);
    assert.equal(wanDestSmgTokenCount.eq(ethDestSmgTokenCount), true, `check destination storeman group token count about ${wanchain} and ${ethereum} failed: wanchain(${wanDestSmgTokenCount}) ethereum(${ethDestSmgTokenCount})`);

    for (let i = 0; i < Number(wanSrcSmgTokenCount); ++i) {
        const tokenPairID = await wanQuota.getTokenId(global.storemanGroups.src.ID, i);

        const wanAsset = await wanQuota.getAsset(tokenPairID, global.storemanGroups.src.ID);
        const ethDebt = await ethQuota.getDebt(tokenPairID, global.storemanGroups.src.ID);
        assert.equal(wanAsset.asset.eq(ethDebt.debt) && wanAsset.asset_receivable.eq(ethDebt.debt_payable)
            && wanAsset.asset_payable.eq(ethDebt.debt_receivable), true,
            `check source storeman group asset at ${wanchain} and debt at ${ethereum} failed: wanchain(${JSON.stringify(wanAsset)}) ethereum(${JSON.stringify(ethDebt)})`
        );

        const ethAsset = await wanQuota.getAsset(tokenPairID, global.storemanGroups.src.ID);
        const wanDebt = await ethQuota.getDebt(tokenPairID, global.storemanGroups.src.ID);
        // assert.equal(ethAsset, wanDebt, `check source storeman group asset at ${ethereum} and debt at ${wanchain} failed: wanchain(${JSON.stringify(ethAsset)}) ethereum(${JSON.stringify(wanDebt)})`);
        assert.equal(ethAsset.asset.eq(wanDebt.debt) && ethAsset.asset_receivable.eq(wanDebt.debt_payable)
            && ethAsset.asset_payable.eq(wanDebt.debt_receivable), true,
            `check source storeman group asset at ${ethereum} and debt at ${wanchain} failed: wanchain(${JSON.stringify(ethAsset)}) ethereum(${JSON.stringify(wanDebt)})`
        );
    }

    for (let i = 0; i < Number(wanDestSmgTokenCount); ++i) {
        const tokenPairID = await wanQuota.getTokenId(global.storemanGroups.src.ID, i);

        const wanAsset = await wanQuota.getAsset(tokenPairID, global.storemanGroups.src.ID);
        const ethDebt = await ethQuota.getDebt(tokenPairID, global.storemanGroups.src.ID);
        // assert.equal(wanAsset, ethDebt, `check destination storeman group asset at ${wanchain} and debt at ${ethereum} failed: wanchain(${JSON.stringify(wanAsset)}) ethereum(${JSON.stringify(ethDebt)})`);
        assert.equal(wanAsset.asset.eq(ethDebt.debt) && wanAsset.asset_receivable.eq(ethDebt.debt_payable)
            && wanAsset.asset_payable.eq(ethDebt.debt_receivable), true,
            `check destination storeman group asset at ${wanchain} and debt at ${ethereum} failed: wanchain(${JSON.stringify(wanAsset)}) ethereum(${JSON.stringify(ethDebt)})`
        );

        const ethAsset = await wanQuota.getAsset(tokenPairID, global.storemanGroups.src.ID);
        const wanDebt = await ethQuota.getDebt(tokenPairID, global.storemanGroups.src.ID);
        // assert.equal(ethAsset, wanDebt, `check destination storeman group asset at ${ethereum} and debt at ${wanchain} failed: wanchain(${JSON.stringify(ethAsset)}) ethereum(${JSON.stringify(wanDebt)})`);
        assert.equal(ethAsset.asset.eq(wanDebt.debt) && ethAsset.asset_receivable.eq(wanDebt.debt_payable)
            && ethAsset.asset_payable.eq(wanDebt.debt_receivable), true,
            `check destination storeman group asset at ${ethereum} and debt at ${wanchain} failed: wanchain(${JSON.stringify(ethAsset)}) ethereum(${JSON.stringify(wanDebt)})`
        );
    }
});
