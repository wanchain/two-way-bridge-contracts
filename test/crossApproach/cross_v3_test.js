const CrossDelegate = artifacts.require('CrossDelegate');
const CrossDelegateV3 = artifacts.require('CrossDelegateV3');
const CrossProxy = artifacts.require('CrossProxy');

const TokenManagerDelegateV2 = artifacts.require('TokenManagerDelegateV2');

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
const DENOMINATOR = 10000;


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

        const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);

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
        const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[currentChainType].coin.symbol);
        const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        const tokenPairID = tokenPair.tokenPairID;

        const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
        const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
        const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

        let funcParams = {
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            crossValue: crossValueActually.toString(10),
            crossFee: crossFee.toString(10),
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
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
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
        const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;

        // cross
        const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);

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
        const crossFee = 5;
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const crossFeeToWei = web3.utils.toWei(crossFee.toString());
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;

        // cross
        const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);

        // tokenAccount
        const tokenAccount = ADDRESS_0;
        const tokenPairID = 0;

        // approve
        let funcParams = {
            smgID: smgID,
            tokenPairID: tokenPairID,
            crossValue: crossValueToWei,
            crossFee: crossFeeToWei,
            tokenAccount: tokenAccount,
            userAccount: userAccount
        };

        // exec
        await cross.userBurn(...Object.values(funcParams), {from: senderAccount, value: global.crossFeesV3[currentChainType][buddyChainType].contractFee});
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
        const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[currentChainType].coin.symbol);
        const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        const tokenPairID = tokenPair.tokenPairID;

        const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
        const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
        const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

        funcParams = {
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            crossValue: crossValueActually,
            crossFee: crossFee,
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
        let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
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
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;

    // cross
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[currentChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
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
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
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
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[buddyChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgMint(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'SmgMintLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.crossValue,
            fee: funcParams.crossFee,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });
    // get token instance
    let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
    let balance = await tokenInstance.balanceOf(funcParams.userAccount);
    assert.equal(funcParams.crossValue.toString(), balance.toString(), "balance of receiver account error");
});

it('Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( ethereum => wanchain )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = ethUserAccount;
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;

    // cross
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[buddyChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    // get token instance
    const tokenInstance = await getRC20TokenInstance(tokenAccount);
    const balance = await tokenInstance.balanceOf(senderAccount);

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    // const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(balance)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = balance; // new web3.utils.BN(crossValueToWei).sub(crossFee);

    // approve
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    // // get token instance
    // let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
    // let balance = await tokenInstance.balanceOf(senderAccount);
    // assert.equal(funcParams.crossValue, balance.toString(), "balance of sender account error");

    // await tokenInstance.approve(cross.address, 0, {from: senderAccount});
    // await tokenInstance.approve(cross.address, crossValueToWei, {from: senderAccount});
    // let allowance = await tokenInstance.allowance(senderAccount, cross.address);
    // assert.equal(crossValueToWei, allowance.toString(), "approve token failed");


    // exec
    let receipt = await cross.userBurn(...Object.values(funcParams), {from: senderAccount, value: global.crossFeesV3[currentChainType][buddyChainType].contractFee});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserBurnLogger',
        args: {
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenAccount: funcParams.tokenAccount,
            value: funcParams.crossValue,
            contractFee: contractFee,
            fee: funcParams.crossFee,
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
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, global.chains[currentChainType].coin.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

    funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    // curveID
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgRelease, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgRelease(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'SmgReleaseLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.crossValue,
            fee: funcParams.crossFee,
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
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
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
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
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
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgMint(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'SmgMintLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.crossValue,
            fee: funcParams.crossFee,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });
    // get token instance
    let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
    let balance = await tokenInstance.balanceOf(funcParams.userAccount);
    assert.equal(funcParams.crossValue.toString(), balance.toString(), "balance of receiver account error");
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @wanchain] <( wanchain => ethereum )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = ethUserAccount;
    const senderAccount = wanUserAccount;
    const currentToken = global.chains[buddyChainType].tokens.filter(token => token.symbol === "LINK")[0];
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    // get token instance
    const tokenInstance = await getRC20TokenInstance(tokenAccount);
    const balance = await tokenInstance.balanceOf(senderAccount);

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    // const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(balance)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = balance; // new web3.utils.BN(crossValueToWei).sub(crossFee);

    // approve
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    // // get token instance
    // let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
    // let balance = await tokenInstance.balanceOf(senderAccount);
    // assert.equal(funcParams.crossValue.toString(), balance.toString(), "balance of sender account error");

    // exec
    let receipt = await cross.userBurn(...Object.values(funcParams), {from: senderAccount, value: moreServiceFee});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserBurnLogger',
        args: {
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenAccount: funcParams.tokenAccount,
            value: funcParams.crossValue,
            contractFee: contractFee,
            fee: funcParams.crossFee,
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
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

    funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    // curveID
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgRelease, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgRelease(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'SmgReleaseLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.crossValue,
            fee: funcParams.crossFee,
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
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgMint(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'SmgMintLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.crossValue,
            fee: funcParams.crossFee,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });
    // get token instance
    let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
    let balance = await tokenInstance.balanceOf(funcParams.userAccount);
    assert.equal(funcParams.crossValue.toString(), balance.toString(), "balance of receiver account error");
});

it('Chain [WAN] <=> Chain [ETH] -> COIN [BTC @wanchain] <( wanchain => ethereum )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const btcUserAccount = global.aliceAccount.BTC;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = ethUserAccount;
    const senderAccount = wanUserAccount;
    const currentToken = global.chains[buddyChainType].tokens.filter(token => token.symbol === "wanBTC")[0];
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    // get token instance
    const tokenInstance = await getRC20TokenInstance(tokenAccount);
    const balance = await tokenInstance.balanceOf(senderAccount);

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    // const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(balance)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = balance; // new web3.utils.BN(crossValueToWei).sub(crossFee);

    // approve
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    // // get token instance
    // let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
    // let balance = await tokenInstance.balanceOf(senderAccount);
    // assert.equal(funcParams.crossValue.toString(), balance.toString(), "balance of sender account error");

    // exec
    let receipt = await cross.userBurn(...Object.values(funcParams), {from: senderAccount, value: moreServiceFee});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserBurnLogger',
        args: {
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenAccount: funcParams.tokenAccount,
            value: funcParams.crossValue,
            contractFee: contractFee,
            fee: funcParams.crossFee,
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
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgMint(...Object.values(funcParams), {from: senderAccount});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'SmgMintLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.crossValue,
            fee: funcParams.crossFee,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });
    // get token instance
    let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
    let balance = await tokenInstance.balanceOf(funcParams.userAccount);
    assert.equal(funcParams.crossValue.toString(), balance.toString(), "balance of receiver account error");
});

it('Chain [ETH] <=> Chain [BTC] -> COIN [BTC @ethereum] <( ethereum => bitcoin )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const btcUserAccount = global.aliceAccount.BTC;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.BTC;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = web3.utils.fromAscii(btcUserAccount);
    const senderAccount = ethUserAccount;
    const currentToken = global.chains[buddyChainType].coin;
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    // get token instance
    const tokenInstance = await getRC20TokenInstance(tokenAccount);
    const balance = await tokenInstance.balanceOf(senderAccount);

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    // const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(balance)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = balance; // new web3.utils.BN(crossValueToWei).sub(crossFee);

    // approve
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    // // get token instance
    // let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
    // let balance = await tokenInstance.balanceOf(senderAccount);
    // assert.equal(funcParams.crossValue.toString(), balance.toString(), "balance of sender account error");

    // exec
    let receipt = await cross.userBurn(...Object.values(funcParams), {from: senderAccount, value: moreServiceFee});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserBurnLogger',
        args: {
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenAccount: funcParams.tokenAccount,
            value: funcParams.crossValue,
            contractFee: contractFee,
            fee: funcParams.crossFee,
            userAccount: funcParams.userAccount.toLowerCase(),
        }
    });

});

// smgWithdrawFee
it('Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( ethereum <=> wanchain )> -> smgWithdrawFee lock in Cross, withdraw for owner  ==> success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = ethUserAccount;
    const currentToken = global.chains[currentChainType].tokens.filter(token => token.symbol === "LINK")[0];
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();
    const crossProxy = await CrossProxy.at(global.chains[currentChainType].scAddr.CrossProxy);
    const origOwner = await crossProxy.owner();
    await cross.setPartners(partners.tokenManager, partners.smgAdminProxy, ADDRESS_0, ADDRESS_0, partners.sigVerifier, {from: origOwner});

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    // exec
    let lockParams = {
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

    let receipt = await cross.userLock(...Object.values(lockParams), {from: senderAccount, value: moreServiceFee});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserLockLogger',
        args: {
            smgID: web3.utils.padRight(lockParams.smgID, 64),
            tokenPairID: lockParams.tokenPairID,
            tokenAccount: tokenAccount,
            value: lockParams.crossValue,
            contractFee: contractFee,
            userAccount: lockParams.userAccount.toLowerCase(),
        }
    });

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

    // buddy chain
    let releaseParams = {
        uniqueID: receipt.tx,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
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
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgRelease, (await cross.currentChainID()), releaseParams.uniqueID, releaseParams.tokenPairID, releaseParams.crossValue, releaseParams.crossFee, releaseParams.tokenAccount, releaseParams.userAccount);
    releaseParams = {...releaseParams, R: R, s: s};

    let releaseReceipt = await cross.smgRelease(...Object.values(releaseParams), {from: userAccount});
    if (!releaseReceipt.logs.length) {
        releaseReceipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, releaseReceipt.tx);
    }

    assert.checkWeb3Event(releaseReceipt, {
        event: 'SmgReleaseLogger',
        args: {
            uniqueID: releaseParams.uniqueID,
            smgID: web3.utils.padRight(releaseParams.smgID, 64),
            tokenPairID: releaseParams.tokenPairID,
            value: releaseParams.crossValue,
            fee: releaseParams.crossFee,
            tokenAccount: releaseParams.tokenAccount,
            userAccount: releaseParams.userAccount
        }
    });

    // console.log("check UserLockLogger ok");
    // const crossBalanceDelta = new web3.utils.BN(crossBalance).sub(new web3.utils.BN(await tokenInstance.balanceOf(cross.address)));
    // console.log("crossBalanceDelta:", crossBalanceDelta.toString(10));

    // current chain
    await cross.setPartners(partners.tokenManager, partners.smgAdminProxy, ADDRESS_0, ADDRESS_0, partners.sigVerifier, {from: origOwner});

    let totalValues = [new web3.utils.BN(lockParams.crossValue), new web3.utils.BN(releaseParams.crossValue)];
    let totalFees = [new web3.utils.BN(contractFee), new web3.utils.BN(releaseParams.crossFee)];
    let tokenAccounts = [ADDRESS_0, releaseParams.tokenAccount];
    let beforeCrossBalances = [];
    for (let i = 0; i < tokenAccounts.length; ++i) {
        let fee = new web3.utils.BN(await cross.getStoremanFee(web3.utils.padLeft(tokenAccounts[i], 64)));
        let beforeCrossBalance;
        if (tokenAccounts[i] === ADDRESS_0) {
            beforeCrossBalance = new web3.utils.BN(await web3.eth.getBalance(cross.address));
            console.log("balance:", beforeCrossBalance.toString());
        } else {
            beforeCrossBalance = new web3.utils.BN(await tokenInstance.balanceOf(cross.address));
            console.log("token balance:", beforeCrossBalance.toString());
        }
        assert.equal(totalFees[i].eq(fee), true, `check storeman fee at ${i} failed`);
        assert.equal(beforeCrossBalance.lte(fee.add(totalValues[i])), true, `check storeman fee balance at ${i} failed`);
        beforeCrossBalances.push(beforeCrossBalance);
    }

    let withdrawReceipt = await cross.smgWithdrawFee([ADDRESS_0, releaseParams.tokenAccount]);
    let withdrawLogs = withdrawReceipt.logs.filter(log => log.event === 'SmgWithdrawFeeLogger');
    for (let log of withdrawLogs) {
        if (log.args.tokenAccount === ADDRESS_0) {
            assert.equal(new web3.utils.BN(log.args.fee).eq(new web3.utils.BN(contractFee)), true, "withdraw contract fee failed");
        } else {
            assert.equal(new web3.utils.BN(log.args.fee).eq(new web3.utils.BN(releaseParams.crossFee)), true, "withdraw agent fee failed");
        }
        assert.equal(log.args.receiver, origOwner, "withdraw fee receiver failed");
    }

    for (let i = 0; i < tokenAccounts.length; ++i) {
        let afterFeeBalance;
        if (tokenAccounts[i] === ADDRESS_0) {
            afterFeeBalance = new web3.utils.BN(await web3.eth.getBalance(cross.address));
        } else {
            afterFeeBalance = new web3.utils.BN(await tokenInstance.balanceOf(cross.address));
        }
        assert.equal(beforeCrossBalances[i].sub(afterFeeBalance).eq(totalFees[i]), true, `check withdraw storeman fee balance at ${i} failed`);
    }
});

// smgWithdrawFee
it('Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( ethereum <=> wanchain )> -> smgWithdrawFee foundation account  ==> success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = ethUserAccount;
    const currentToken = global.chains[currentChainType].tokens.filter(token => token.symbol === "LINK")[0];
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();
    const crossProxy = await CrossProxy.at(global.chains[currentChainType].scAddr.CrossProxy);
    const origOwner = await crossProxy.owner();
    await cross.setPartners(partners.tokenManager, partners.smgAdminProxy, ADDRESS_0, ADDRESS_0, partners.sigVerifier, {from: origOwner});

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    // exec
    let lockParams = {
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

    let receipt = await cross.userLock(...Object.values(lockParams), {from: senderAccount, value: moreServiceFee});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserLockLogger',
        args: {
            smgID: web3.utils.padRight(lockParams.smgID, 64),
            tokenPairID: lockParams.tokenPairID,
            tokenAccount: tokenAccount,
            value: lockParams.crossValue,
            contractFee: contractFee,
            userAccount: lockParams.userAccount.toLowerCase(),
        }
    });

    const fee = await cross.getFee({srcChainID:global.chains[currentChainType].ID, destChainID:global.chains[buddyChainType].ID});
    const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

    // buddy chain
    let releaseParams = {
        uniqueID: receipt.tx,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
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
    let {R, s} = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgRelease, (await cross.currentChainID()), releaseParams.uniqueID, releaseParams.tokenPairID, releaseParams.crossValue, releaseParams.crossFee, releaseParams.tokenAccount, releaseParams.userAccount);
    releaseParams = {...releaseParams, R: R, s: s};

    let releaseReceipt = await cross.smgRelease(...Object.values(releaseParams), {from: userAccount});
    if (!releaseReceipt.logs.length) {
        releaseReceipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, releaseReceipt.tx);
    }

    assert.checkWeb3Event(releaseReceipt, {
        event: 'SmgReleaseLogger',
        args: {
            uniqueID: releaseParams.uniqueID,
            smgID: web3.utils.padRight(releaseParams.smgID, 64),
            tokenPairID: releaseParams.tokenPairID,
            value: releaseParams.crossValue,
            fee: releaseParams.crossFee,
            tokenAccount: releaseParams.tokenAccount,
            userAccount: releaseParams.userAccount
        }
    });

    // console.log("check UserLockLogger ok");
    // const crossBalanceDelta = new web3.utils.BN(crossBalance).sub(new web3.utils.BN(await tokenInstance.balanceOf(cross.address)));
    // console.log("crossBalanceDelta:", crossBalanceDelta.toString(10));

    // current chain
    await cross.setPartners(partners.tokenManager, partners.smgAdminProxy, partners.smgFeeProxy, ADDRESS_0, partners.sigVerifier, {from: origOwner});
    let totalValues = [new web3.utils.BN(lockParams.crossValue), new web3.utils.BN(releaseParams.crossValue)];
    let totalFees = [new web3.utils.BN(contractFee), new web3.utils.BN(releaseParams.crossFee)];
    let tokenAccounts = [ADDRESS_0, releaseParams.tokenAccount];
    let beforeCrossBalances = [];
    for (let i = 0; i < tokenAccounts.length; ++i) {
        let fee = new web3.utils.BN(await cross.getStoremanFee(web3.utils.padLeft(tokenAccounts[i], 64)));
        let beforeCrossBalance;
        if (tokenAccounts[i] === ADDRESS_0) {
            beforeCrossBalance = new web3.utils.BN(await web3.eth.getBalance(cross.address));
            console.log("balance:", beforeCrossBalance.toString());
        } else {
            beforeCrossBalance = new web3.utils.BN(await tokenInstance.balanceOf(cross.address));
            console.log("token balance:", beforeCrossBalance.toString());
        }
        assert.equal(totalFees[i].eq(fee), true, `check storeman fee at ${i} failed`);
        assert.equal(beforeCrossBalance.lte(fee.add(totalValues[i])), true, `check storeman fee balance at ${i} failed`);
        beforeCrossBalances.push(beforeCrossBalance);
    }

    let withdrawReceipt = await cross.smgWithdrawFee([ADDRESS_0, releaseParams.tokenAccount]);
    let withdrawLogs = withdrawReceipt.logs.filter(log => log.event === 'SmgWithdrawFeeLogger');
    assert.equal(withdrawLogs.length > 0, true, "invalid logs");
    for (let log of withdrawLogs) {
        if (log.args.tokenAccount === ADDRESS_0) {
            assert.equal(new web3.utils.BN(log.args.fee).eq(new web3.utils.BN(contractFee)), true, "withdraw contract fee failed");
        } else {
            assert.equal(new web3.utils.BN(log.args.fee).eq(new web3.utils.BN(releaseParams.crossFee)), true, "withdraw agent fee failed");
        }
        assert.equal(log.args.receiver, origOwner, "withdraw fee receiver failed");
    }

    for (let i = 0; i < tokenAccounts.length; ++i) {
        let afterFeeBalance;
        if (tokenAccounts[i] === ADDRESS_0) {
            afterFeeBalance = new web3.utils.BN(await web3.eth.getBalance(cross.address));
        } else {
            afterFeeBalance = new web3.utils.BN(await tokenInstance.balanceOf(cross.address));
        }
        assert.equal(beforeCrossBalances[i].sub(afterFeeBalance).eq(totalFees[i]), true, `check withdraw storeman fee balance at ${i} failed`);
    }
});

// smgWithdrawHistoryFee
it('Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( ethereum <=> wanchain )> -> smgWithdrawHistoryFee foundation account  ==> success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const smgID = global.storemanGroups.src.ID
    const crossValueToWei = web3.utils.toWei(crossValue.toString());
    const userAccount = wanUserAccount;
    const senderAccount = ethUserAccount;
    const currentToken = global.chains[currentChainType].tokens.filter(token => token.symbol === "LINK")[0];
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(crossValueToWei).add(new web3.utils.BN(contractFee)).toString();

    // cross
    const crossProxy = await CrossProxy.at(global.chains[currentChainType].scAddr.CrossProxy);
    await crossProxy.upgradeTo(global.chains[currentChainType].scAddr.CrossDelegate);
    var cross = await CrossDelegate.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();
    const origOwner = await crossProxy.owner();
    await cross.setPartners(partners.tokenManager, partners.smgAdminProxy, ADDRESS_0, ADDRESS_0, partners.sigVerifier, {from: origOwner});

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegateV2.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    // exec
    let lockParams = {
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

    let receipt = await cross.userLock(...Object.values(lockParams), {from: senderAccount, value: moreServiceFee});
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLib, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserLockLogger',
        args: {
            smgID: web3.utils.padRight(lockParams.smgID, 64),
            tokenPairID: lockParams.tokenPairID,
            tokenAccount: tokenAccount,
            value: lockParams.crossValue,
            serviceFee: contractFee,
            userAccount: lockParams.userAccount.toLowerCase(),
        }
    });

    await crossProxy.upgradeTo(global.chains[currentChainType].scAddr.CrossDelegateV3);
    var cross = await CrossDelegateV3.at(global.chains[currentChainType].scAddr.CrossProxy);

    let fee = new web3.utils.BN(await cross.getStoremanFee(web3.utils.padRight(smgID, 64)));
    let beforeCrossBalance = new web3.utils.BN(await tokenInstance.balanceOf(cross.address));
    assert.equal(new web3.utils.BN(contractFee).eq(fee), true, `check storeman fee failed`);
    assert.equal(beforeCrossBalance.lte(fee.add(new web3.utils.BN(lockParams.crossValue))), true, `check storeman fee balance failed`);

    let withdrawReceipt = await cross.smgWithdrawHistoryFee([web3.utils.padRight(smgID, 64)]);
    let withdrawLogs = withdrawReceipt.logs.filter(log => log.event === 'WithdrawHistoryFeeLogger');
    if (withdrawLogs[0].args.tokenAccount === ADDRESS_0) {
        assert.equal(new web3.utils.BN(withdrawLogs[0].args.fee).eq(contractFee), true, "withdraw history contract fee failed");
    }
    assert.equal(withdrawLogs[0].args.receiver, origOwner, "withdraw fee receiver failed");

    let afterFeeBalance = new web3.utils.BN(await tokenInstance.balanceOf(cross.address));
    assert.equal(beforeCrossBalance.sub(afterFeeBalance).lte(fee), true, `check withdraw storeman fee balance failed`);
});