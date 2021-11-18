const CrossDelegateV2 = artifacts.require('CrossDelegateV2');
const CrossProxy = artifacts.require('CrossProxy');

const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');

const QuotaDelegate = artifacts.require('QuotaDelegate');
const QuotaProxy = artifacts.require('QuotaProxy');

const OracleDelegate = artifacts.require('OracleDelegate');

const TestStoremanAdmin = artifacts.require('TestStoremanAdmin.sol');
const TestOrigTokenCreator = artifacts.require("TestOrigTokenCreator.sol");

const {
    ADDRESS_0,
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
    getRC20TokenInstance,
    buildMpcSign,
}                               = require('../utils');

const {
    typesArrayList,
} = require("./sc-config");

const crossValue = 10;
const minerFee = 5;


before("init...   -> success", () => {
    testInit();
});

it('Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==> Halted', async () => {
    let crossProxy;
    try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;

        crossProxy = await CrossProxy.at(global.chains[currentChainType].scAddr.CrossProxy);
        await crossProxy.setHalt(true, {from: global.contractOwner});

        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);

        // token
        const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[currentChainType].coin.symbol);
        const tokenPairID = tokenPair.tokenPairID;

        let funcParams = {
            smgID: smgID,
            tokenPairID: tokenPairID,
            crossValue: crossValueToWei,
            userAccount: userAccount
        };

        await cross.userLock(...Object.values(funcParams), {from: senderAccount});

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.contractOwner});
    }
});

it.skip("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==> Token does not an original token", async () => {
    try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;
        const tokenPairID = 0;

        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);

        let funcParams = {
            smgID: smgID,
            tokenPairID: tokenPairID,
            crossValue: crossValueToWei,
            userAccount: userAccount
        };
        await cross.userLock(...Object.values(funcParams), {from: senderAccount});

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Token does not an original token");
    }
});

it.skip("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==> Value is null", async () => {
    try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID
        const invalidCrossValue = 0;
        const crossValueToWei = web3.utils.toWei(invalidCrossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);

        // tokenAccount
        const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[currentChainType].coin.symbol);
        const tokenPairID = tokenPair.tokenPairID;

        // exec
        let funcParams = {
            smgID: smgID,
            tokenPairID: tokenPairID,
            crossValue: crossValueToWei,
            userAccount: userAccount
        };
        await cross.userLock(...Object.values(funcParams), {from: senderAccount});

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Value is null");
    }
});

it('Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( wanchain => ethereum )> -> smgMint  ==> Halted', async () => {
    let crossProxy;
    try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const uniqueID = uniqueInfo.fastException;
        const smgID = global.storemanGroups.src.ID
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];

        // halt
        crossProxy = await CrossProxy.at(global.chains[currentChainType].scAddr.CrossProxy);
        await crossProxy.setHalt(true, {from: global.contractOwner});

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[currentChainType].coin.symbol);
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

        // curveID
        let smg;
        if (chainTypes.WAN === currentChainType) {
          smg = await TestStoremanAdmin.at(partners.smgAdminProxy);
        } else {
          smg = await OracleDelegate.at(partners.smgAdminProxy);
        }
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.tokenAccount, funcParams.userAccount);
        funcParams = {...funcParams, R: R, s: s};

        await cross.smgMint(...Object.values(funcParams), {from: senderAccount});

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.contractOwner});
    }
});

it('Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==>  Token does not exist', async () => {
    try {
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

        // tokenAccount
        const tokenPairID = 0;
        const totalValue = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

        // exec
        let funcParams = {
            smgID: smgID,
            tokenPairID: tokenPairID,
            crossValue: crossValueToWei,
            userAccount: userAccount
        };
        await cross.userLock(...Object.values(funcParams), {from: senderAccount, value: totalValue});

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Token does not exist");
    }

});

it('Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( ethereum => wanchain )> -> userBurn ==>  Token does not exist', async () => {
    try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const minerFeeToWei = web3.utils.toWei(minerFee.toString());
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;

        // cross
        const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);

        // tokenAccount
        const tokenAccount = ADDRESS_0;
        const tokenPairID = 0;

        // approve
        let funcParams = {
            smgID: smgID,
            tokenPairID: tokenPairID,
            crossValue: crossValueToWei,
            minerFee: minerFeeToWei,
            tokenAccount: tokenAccount,
            userAccount: userAccount
        };

        // exec
        await cross.userBurn(...Object.values(funcParams), {from: senderAccount, value: global.crossFeesV2[currentChainType][buddyChainType].contractFee});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Token does not exist");
    }
});

it('Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( ethereum => wanchain )> -> smgRelease  ==> Not ready', async () => {
    let smg;
    let funcParams;
    try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const uniqueID = uniqueInfo.fastException;
        const smgID = global.storemanGroups.src.ID
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = wanUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];

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

        // smg status
        smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
        await smg.setStoremanGroupStatus(funcParams.smgID, storemanGroupStatus.unregistered);
        // curveID
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.tokenAccount, funcParams.userAccount);
        funcParams = {...funcParams, R: R, s: s};

        await cross.smgRelease(...Object.values(funcParams), {from: senderAccount});

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    } finally {
        if (smg) {
            await smg.setStoremanGroupStatus(funcParams.smgID, storemanGroupStatus.ready);
        }
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
    const uniqueID = uniqueInfo.userLockWAN;
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

it('Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( ethereum => wanchain )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const smgID = global.storemanGroups.src.ID
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
    const uniqueID = uniqueInfo.userReleaseWAN;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];

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
    let sk = skInfo.src[currentChainType];

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

// LINK
it('Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( ethereum => wanchain )> -> userLock  ==> success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = ethUserAccount;
    const currentToken = global.chains[currentChainType].tokens.filter(token => token.symbol === "LINK")[0];
    const contractFee = global.crossFeesV2[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    // exec
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        userAccount: userAccount
    };

    // get token instance
    let tokenInstance = await getRC20TokenInstance(tokenAccount);
    let balance = await tokenInstance.balanceOf(senderAccount);
    if (balance.lt(new web3.utils.BN(crossValueToWei))) {
        // mint token: LINK
        let mintValue = new web3.utils.BN(crossValueToWei).sub(balance);
        const tokenCreator = await TestOrigTokenCreator.at(global.chains[currentChainType].scAddr.TestOrigTokenCreator);
        await tokenCreator.mintToken(currentToken.name, currentToken.symbol, senderAccount, mintValue.toString());
    }
    balance = await tokenInstance.balanceOf(senderAccount);
    assert.equal(crossValueToWei, balance.toString(), "balance of sender account error");
    // approve
    await tokenInstance.approve(cross.address, 0, {from: senderAccount});
    await tokenInstance.approve(cross.address, crossValueToWei, {from: senderAccount});
    let allowance = await tokenInstance.allowance(senderAccount, cross.address);
    assert.equal(crossValueToWei, allowance.toString(), "approve token failed");

    let receipt = await cross.userLock(...Object.values(funcParams), {from: senderAccount, value: moreServiceFee});
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
it('Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @wanchain] <( ethereum => wanchain )> -> smgMint  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const uniqueID = uniqueInfo.userLockLink;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];
    const currentToken = global.chains[buddyChainType].tokens.filter(token => token.symbol === "LINK")[0];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
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

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @wanchain] <( wanchain => ethereum )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const minerFeeToWei = web3.utils.toWei(minerFee.toString());
    const userAccount = ethUserAccount;
    const senderAccount = wanUserAccount;
    const currentToken = global.chains[buddyChainType].tokens.filter(token => token.symbol === "LINK")[0];
    const contractFee = global.crossFeesV2[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
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
    let receipt = await cross.userBurn(...Object.values(funcParams), {from: senderAccount, value: moreServiceFee});
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

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const uniqueID = uniqueInfo.userReleaseLink;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = ethUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];
    const currentToken = global.chains[currentChainType].tokens.filter(token => token.symbol === "LINK")[0];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
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
    let sk = skInfo.src[currentChainType];

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

// BTC
it('Chain [BTC] <=> Chain [WAN] -> COIN [BTC @wanchain] <( bitcoin => wanchain )> -> smgMint  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const btcUserAccount = global.aliceAccount.BTC;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.BTC;
    const uniqueID = uniqueInfo.userLockWanBTC;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];
    const currentToken = global.chains[buddyChainType].coin;

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
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

it('Chain [WAN] <=> Chain [ETH] -> COIN [BTC @wanchain] <( wanchain => ethereum )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const btcUserAccount = global.aliceAccount.BTC;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const minerFeeToWei = web3.utils.toWei(minerFee.toString());
    const userAccount = ethUserAccount;
    const senderAccount = wanUserAccount;
    const currentToken = global.chains[buddyChainType].tokens.filter(token => token.symbol === "wanBTC")[0];
    const contractFee = global.crossFeesV2[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
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
    let receipt = await cross.userBurn(...Object.values(funcParams), {from: senderAccount, value: moreServiceFee});
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

it('Chain [WAN] <=> Chain [ETH] -> COIN [BTC @ethereum] <( wanchain => ethereum )> -> smgMint  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const btcUserAccount = global.aliceAccount.BTC;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const uniqueID = uniqueInfo.userLockWan2EthBTC;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = ethUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];
    const currentToken = global.chains[buddyChainType].tokens.filter(token => token.symbol === "wanBTC")[0];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
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

it('Chain [ETH] <=> Chain [BTC] -> COIN [BTC @ethereum] <( ethereum => bitcoin )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const btcUserAccount = global.aliceAccount.BTC;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.BTC;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const minerFeeToWei = web3.utils.toWei(minerFee.toString());
    const userAccount = web3.utils.fromAscii(btcUserAccount);
    const senderAccount = ethUserAccount;
    const currentToken = global.chains[buddyChainType].coin;
    const contractFee = global.crossFeesV2[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
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
    let receipt = await cross.userBurn(...Object.values(funcParams), {from: senderAccount, value: moreServiceFee});
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

// smgWithdrawFee
it('Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( ethereum <=> wanchain )> -> smgWithdrawFee  ==> success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = ethUserAccount;
    const currentToken = global.chains[currentChainType].tokens.filter(token => token.symbol === "LINK")[0];
    const contractFee = global.crossFeesV2[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();
    let crossProxy = await CrossProxy.at(global.chains[chainTypes.WAN].scAddr.CrossProxy);
    const origOwner = await crossProxy.owner();
    await cross.setPartners(partners.tokenManager, partners.smgAdminProxy, ADDRESS_0, partners.quota, partners.sigVerifier, {from: origOwner});

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    // exec
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        userAccount: userAccount
    };

    // get token instance
    let tokenInstance = await getRC20TokenInstance(tokenAccount);
    let balance = await tokenInstance.balanceOf(senderAccount);
    if (balance.lt(new web3.utils.BN(crossValueToWei))) {
        // mint token: LINK
        let mintValue = new web3.utils.BN(crossValueToWei).sub(balance);
        const tokenCreator = await TestOrigTokenCreator.at(global.chains[currentChainType].scAddr.TestOrigTokenCreator);
        await tokenCreator.mintToken(currentToken.name, currentToken.symbol, senderAccount, mintValue.toString());
    }
    balance = await tokenInstance.balanceOf(senderAccount);
    assert.equal(crossValueToWei, balance.toString(), "balance of sender account error");

    // const crossBalance = await tokenInstance.balanceOf(cross.address);
    // approve
    await tokenInstance.approve(cross.address, 0, {from: senderAccount});
    await tokenInstance.approve(cross.address, crossValueToWei, {from: senderAccount});
    let allowance = await tokenInstance.allowance(senderAccount, cross.address);
    assert.equal(crossValueToWei, allowance.toString(), "approve token failed");

    let receipt = await cross.userLock(...Object.values(funcParams), {from: senderAccount, value: moreServiceFee});
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

    // buddy chain
    let releaseParams = {
        uniqueID: receipt.tx,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        tokenAccount: tokenAccount,
        userAccount: senderAccount
    };

    // curveID
    const buddyPartners = await cross.getPartners();
    let smg = await global.getSmgProxy(currentChainType, buddyPartners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(releaseParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgRelease, (await cross.currentChainID()), releaseParams.uniqueID, releaseParams.tokenPairID, releaseParams.crossValue, releaseParams.tokenAccount, releaseParams.userAccount);
    releaseParams = {...releaseParams, R: R, s: s};

    let releaseReceipt = await cross.smgRelease(...Object.values(releaseParams), {from: userAccount});
    if (!releaseReceipt.logs.length) {
        releaseReceipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV2, releaseReceipt.tx);
    }

    assert.checkWeb3Event(releaseReceipt, {
        event: 'SmgReleaseLogger',
        args: {
            uniqueID: releaseParams.uniqueID,
            smgID: web3.utils.padRight(releaseParams.smgID, 64),
            tokenPairID: releaseParams.tokenPairID,
            value: releaseParams.crossValue,
            tokenAccount: releaseParams.tokenAccount,
            userAccount: releaseParams.userAccount
        }
    });

    // console.log("check UserLockLogger ok");
    // const crossBalanceDelta = new web3.utils.BN(crossBalance).sub(new web3.utils.BN(await tokenInstance.balanceOf(cross.address)));
    // console.log("crossBalanceDelta:", crossBalanceDelta.toString(10));

    // current chain
    await cross.setPartners(partners.tokenManager, partners.smgAdminProxy, partners.smgFeeProxy, partners.quota, partners.sigVerifier, {from: origOwner});
    let withdrawReceipt = await cross.smgWithdrawFee([web3.utils.padRight(funcParams.smgID, 64)]);
    let withdrawLogs = withdrawReceipt.logs.filter(log => log.event === 'WithdrawContractFeeLogger');
    assert.equal(new web3.utils.BN(withdrawLogs[0].args.fee).eq(new web3.utils.BN(contractFee)), true, "withdraw fee failed");
});
