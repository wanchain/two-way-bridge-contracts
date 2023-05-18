const CrossDelegateV4 = artifacts.require('CrossDelegateV4');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegateV2');

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
    getNftTokenInstance,
    buildMpcSign,
}                               = require('../utils');

const {
    typesArrayList,
} = require("./sc-config");

const {
    tokenIDs,
    minerFee,
    erc1155TokenCrossType,
    tokenValues,
    stringToBytes
} = require("../erc1155/erc1155_utils.js");

const WrappedErc1155Json = require("../erc1155/WrappedErc1155.json");


//[48,48,48,48,48,48]
before("init...   -> success", () => {
    testInit();
});

async function getErc1155TokenInstance(tokenAccount) {
    let erc1155Inst = new web3.eth.Contract(WrappedErc1155Json.abi, tokenAccount);
    return erc1155Inst;
}

// NFT ...
it('Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC1155 @ethereum] <( ethereum => wanchain )> -> userLockNFT  ==> success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const smgID = global.storemanGroups.src.ID
    const userAccount = wanUserAccount;
    const senderAccount = ethUserAccount;
    const currentChainAdmin = global.adminAccount[currentChainType];

    const currentToken = global.chains[currentChainType].erc1155Tokens.filter(token => token.symbol === "Erc1155Symbol")[0];
    const contractFee = new web3.utils.BN(global.crossFeesV3[currentChainType][buddyChainType].contractFee).div(new web3.utils.BN(2));
    const moreServiceFee = new web3.utils.BN(contractFee).toString();

    // cross
    const cross = await CrossDelegateV4.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    await cross.setTokenPairFees([[tokenPairID, contractFee]], { from: currentChainAdmin });
    assert.equal(contractFee.eq(new web3.utils.BN(await cross.getTokenPairFee(tokenPairID))), true, "fee of token pair error");
    const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
    if (!new web3.utils.BN(currTokenCrossType).eq(new web3.utils.BN(erc1155TokenCrossType))) {
        await tokenManager.setTokenPairTypes([tokenPairID], [new web3.utils.BN(erc1155TokenCrossType)], { from: global.operatorAccount[currentChainType] });
    }
    let smgFeeProxy = partners.smgFeeProxy;
    if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
    }
    const beforeFeeProxyBalance = new web3.utils.BN(await web3.eth.getBalance(smgFeeProxy));
    // exec
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenIDs: tokenIDs,
        tokenValues: tokenValues,
        userAccount: userAccount
    };

    // get token instance
    let tokenInstance = await getErc1155TokenInstance(tokenAccount);
    let senderAccounts = [senderAccount, senderAccount, senderAccount, senderAccount, senderAccount];
    let balances = await tokenInstance.methods.balanceOfBatch(senderAccounts, tokenIDs).call();
    let idx;
    for (idx = 0; idx < tokenIDs.length; ++idx) {
        assert.equal(parseInt(balances[idx]), parseInt(balances[idx]), "before userLockNFT check balances:", balances);
    }

    // approve
    let setApprovalForAllReceipt = await tokenInstance.methods.setApprovalForAll(cross.address, true)
        .send(
            {
                from: senderAccount,
                gasPrice: '20000000000',// ganacle-cli default value
                gas: 6721975            // ganache-cli default value
            });

    let approved = await tokenInstance.methods.isApprovedForAll(senderAccount, cross.address).call();
    assert.equal(approved, true, "check isApprovedForAll");

    let receipt = await cross.userLockNFT(...Object.values(funcParams), { from: senderAccount, value: moreServiceFee });
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].NFTLibV1, receipt.tx);
    }

    const eventUserLockNFT = assert.getWeb3Log(receipt, { event: 'UserLockNFT' });
    assert.equal(!!eventUserLockNFT === true, true, "get event UserLockNFT error");
    assert.equal(eventUserLockNFT.args.smgID, funcParams.smgID, "event UserLockNFT smgID error");
    assert.equal(eventUserLockNFT.args.tokenPairID, funcParams.tokenPairID, "event UserLockNFT tokenPairID error");
    assert.equal(eventUserLockNFT.args.keys.length, eventUserLockNFT.args.values.length, "invalid UserLockNFT keys and values length");

    const eventUserLockNFTParams = eventUserLockNFT.args.keys.reduce((reduced, next, index) => {
        const [paramName, paramType] = next.split(":");
        reduced[paramName] = {};
        reduced[paramName].type = paramType;
        reduced[paramName].value = eventUserLockNFT.args.values[index];
        return reduced;
    }, {});

    assert.equal(eventUserLockNFTParams.userAccount.type, "bytes", "invalid UserLockNFT userAccount type");
    assert.equal(eventUserLockNFTParams.userAccount.value.toLowerCase(), funcParams.userAccount.toLowerCase(), "invalid UserLockNFT userAccount value");
    assert.equal(eventUserLockNFTParams.contractFee.type, "uint256", "invalid UserLockNFT contractFee type");
    assert.equal(eventUserLockNFTParams.tokenIDs.type, "uint256[]", "invalid UserLockNFT tokenIDs type");
    assert.equal(eventUserLockNFTParams.tokenValues.type, "uint256[]", "invalid UserLockNFT tokenValues type");

    let decodeTokenIDs = web3.eth.abi.decodeParameters(['uint256[]'], eventUserLockNFTParams.tokenIDs.value);
    assert.equal(!!decodeTokenIDs[0] === true, true, "UserLockNFT tokenIDs error");
    decodeTokenIDs = decodeTokenIDs[0];
    assert.equal(decodeTokenIDs.length, tokenIDs.length, "invalid UserLockNFT tokenIDs length");
    for (idx = 0; idx < decodeTokenIDs.length; ++idx) {
        assert.equal(parseInt(decodeTokenIDs[idx]), tokenIDs[idx], "invalid UserLockNFT tokenIDs value!");
    }

    let decodeTokenValues = web3.eth.abi.decodeParameters(['uint256[]'], eventUserLockNFTParams.tokenValues.value);
    assert.equal(!!decodeTokenValues[0] === true, true, "UserLockNFT tokenValues error");
    decodeTokenValues = decodeTokenValues[0];
    assert.equal(decodeTokenValues.length, tokenValues.length, "invalid UserLockNFT tokenValues length");
    for (idx = 0; idx < decodeTokenValues.length; ++idx) {
        assert.equal(parseInt(decodeTokenValues[idx]), tokenValues[idx], "invalid UserLockNFT tokenValues value!");
    }

    balances = await tokenInstance.methods.balanceOfBatch(senderAccounts, tokenIDs).call();
    for (idx = 0; idx < balances.length; ++idx) {
        assert.equal(0, parseInt(balances[idx]), "after check userLockErc1155 balanceOf error idx:", idx, ",balance:", balances[idx]);
    }
    
    const afterFeeProxyBalance = new web3.utils.BN(await web3.eth.getBalance(smgFeeProxy));
    assert.equal(afterFeeProxyBalance.sub(beforeFeeProxyBalance).eq(new web3.utils.BN(contractFee)), true, "balance of storeman fee error");
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC1155 @wanchain] <( ethereum => wanchain )> -> smgMintNFT  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const uniqueID = uniqueInfo.userLockErc1155;
    const smgID = global.storemanGroups.src.ID
    const userAccount = wanUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];
    const currentToken = global.chains[buddyChainType].erc1155Tokens.filter(token => token.symbol === "Erc1155Symbol")[0];

    // cross
    const cross = await CrossDelegateV4.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
    if (!new web3.utils.BN(currTokenCrossType).eq(new web3.utils.BN(erc1155TokenCrossType))) {
        await tokenManager.setTokenPairTypes([tokenPairID], [new web3.utils.BN(erc1155TokenCrossType)], { from: global.operatorAccount[currentChainType] });
    }

    let tokenInstance = await getErc1155TokenInstance(tokenAccount);

    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenIDs: tokenIDs,
        tokenValues: tokenValues,
        extData: "0x00",
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let { R, s } = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMintNFT,
        (await cross.currentChainID()),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.tokenIDs,
        funcParams.tokenValues,
        funcParams.extData,
        funcParams.tokenAccount,
        funcParams.userAccount);
    funcParams = { ...funcParams, R: R, s: s };

    let receipt = await cross.smgMintNFT(...Object.values(funcParams), { from: senderAccount });
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].NFTLibV1, receipt.tx);
    }

    const eventSmgMintNFT = assert.getWeb3Log(receipt, { event: 'SmgMintNFT' });
    assert.equal(!!eventSmgMintNFT === true, true, "get event SmgMintNFT error");
    assert.equal(eventSmgMintNFT.args.uniqueID, funcParams.uniqueID, "event SmgMintNFT uniqueID error");
    assert.equal(eventSmgMintNFT.args.smgID, funcParams.smgID, "event SmgMintNFT smgID error");
    assert.equal(eventSmgMintNFT.args.tokenPairID, funcParams.tokenPairID, "event SmgMintNFT tokenPairID error");
    assert.equal(eventSmgMintNFT.args.keys.length, eventSmgMintNFT.args.values.length, "invalid SmgMintNFT keys and values length");

    const eventSmgMintNFTParams = eventSmgMintNFT.args.keys.reduce((reduced, next, index) => {
        const [paramName, paramType] = next.split(":");
        reduced[paramName] = {};
        reduced[paramName].type = paramType;
        reduced[paramName].value = eventSmgMintNFT.args.values[index];
        return reduced;
    }, {});

    assert.equal(eventSmgMintNFTParams.userAccount.type, "address", "invalid SmgMintNFT userAccount type");
    assert.equal(eventSmgMintNFTParams.userAccount.value.toLowerCase(), funcParams.userAccount.toLowerCase(), "invalid SmgMintNFT userAccount value");

    assert.equal(eventSmgMintNFTParams.tokenAccount.type, "address", "invalid SmgMintNFT tokenAccount type");
    assert.equal(eventSmgMintNFTParams.tokenAccount.value.toLowerCase(), funcParams.tokenAccount.toLowerCase(), "invalid SmgMintNFT tokenAccount value");

    assert.equal(eventSmgMintNFTParams.extData.type, "bytes", "invalid SmgMintNFT extData type");
    assert.equal(eventSmgMintNFTParams.extData.value.toLowerCase(), funcParams.extData.toLowerCase(), "invalid SmgMintNFT extData value");

    assert.equal(eventSmgMintNFTParams.tokenIDs.type, "uint256[]", "invalid SmgMintNFT tokenIDs type");
    assert.equal(eventSmgMintNFTParams.tokenValues.type, "uint256[]", "invalid SmgMintNFT tokenValues type");

    let idx = 0;
    let decodeTokenIDs = web3.eth.abi.decodeParameters(['uint256[]'], eventSmgMintNFTParams.tokenIDs.value);
    assert.equal(!!decodeTokenIDs[0] === true, true, "SmgMintNFT tokenIDs error");
    decodeTokenIDs = decodeTokenIDs[0];
    assert.equal(decodeTokenIDs.length, tokenIDs.length, "invalid SmgMintNFT tokenIDs length");
    for (idx = 0; idx < decodeTokenIDs.length; ++idx) {
        assert.equal(parseInt(decodeTokenIDs[idx]), tokenIDs[idx], "invalid SmgMintNFT tokenIDs value!");
    }
    
    let decodeTokenValues = web3.eth.abi.decodeParameters(['uint256[]'], eventSmgMintNFTParams.tokenValues.value);
    assert.equal(!!decodeTokenValues[0] === true, true, "SmgMintNFT tokenValues error");
    decodeTokenValues = decodeTokenValues[0];
    assert.equal(decodeTokenValues.length, tokenValues.length, "invalid SmgMintNFT tokenValues length");
    for (idx = 0; idx < decodeTokenValues.length; ++idx) {
        assert.equal(parseInt(decodeTokenValues[idx]), tokenValues[idx], "invalid SmgMintNFT tokenValues value!");
    }

    let wanUserAccounts = [wanUserAccount, wanUserAccount, wanUserAccount, wanUserAccount, wanUserAccount];
    let balances = await tokenInstance.methods.balanceOfBatch(wanUserAccounts, tokenIDs).call();
    for (idx = 0; idx < balances.length; ++idx) {
        assert.equal(Number(balances[idx]), Number(tokenValues[idx]), "after check smgMintNFT balanceOfBatch error:", balances);
    }
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC1155 @wanchain] <( wanchain => ethereum )> -> userBurnNFT ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const smgID = global.storemanGroups.src.ID
    const minerFeeToWei = web3.utils.toWei(minerFee.toString());
    const userAccount = ethUserAccount;
    const senderAccount = wanUserAccount;
    const currentToken = global.chains[buddyChainType].erc1155Tokens.filter(token => token.symbol === "Erc1155Symbol")[0];
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;
    
    const moreServiceFee = new web3.utils.BN(contractFee).toString();

    // cross
    const cross = await CrossDelegateV4.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
    if (!new web3.utils.BN(currTokenCrossType).eq(new web3.utils.BN(erc1155TokenCrossType))) {
        await tokenManager.setTokenPairTypes([tokenPairID], [new web3.utils.BN(erc1155TokenCrossType)], { from: global.operatorAccount[currentChainType] });
    }

    let smgFeeProxy = partners.smgFeeProxy;
    if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
    }
    const beforeFeeProxyBalance = new web3.utils.BN(await web3.eth.getBalance(smgFeeProxy));

    // approve
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenIDs: tokenIDs,
        tokenValues: tokenValues,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    let idx;
    // get token instance
    let tokenInstance = await getErc1155TokenInstance(funcParams.tokenAccount);
    let senderAccounts = [senderAccount, senderAccount, senderAccount, senderAccount, senderAccount];
    let balances = await tokenInstance.methods.balanceOfBatch(senderAccounts, tokenIDs).call();
    for (idx = 0; idx < tokenIDs.length; ++idx) {
        assert.equal(tokenValues[idx], parseInt(balances[idx]), "before userBurnNFT check balance:", balances);
    }

    // approve
    await tokenInstance.methods.setApprovalForAll(cross.address, true)
        .send(
            {
                from: senderAccount,
                gasPrice: '20000000000',// ganacle-cli default value
                gas: 6721975            // ganache-cli default value
            });
    let approved = await tokenInstance.methods.isApprovedForAll(senderAccount, cross.address).call();
    assert.equal(approved, true, "check isApprovedForAll");
    
    let batchFee = await cross.getBatchFee(tokenPairID, tokenIDs.length);
    // exec
    let receipt = await cross.userBurnNFT(...Object.values(funcParams), { from: senderAccount, value: batchFee });
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].NFTLibV1, receipt.tx);
    }

    const eventUserBurnNFT = assert.getWeb3Log(receipt, { event: 'UserBurnNFT' });
    assert.equal(!!eventUserBurnNFT === true, true, "get event UserBurnNFT error");
    assert.equal(eventUserBurnNFT.args.smgID, funcParams.smgID, "event UserBurnNFT smgID error");
    assert.equal(eventUserBurnNFT.args.tokenPairID, funcParams.tokenPairID, "event UserBurnNFT tokenPairID error");
    assert.equal(eventUserBurnNFT.args.keys.length, eventUserBurnNFT.args.values.length, "invalid UserBurnNFT keys and values length");

    const eventUserBurnNFTParams = eventUserBurnNFT.args.keys.reduce((reduced, next, index) => {
        const [paramName, paramType] = next.split(":");
        reduced[paramName] = {};
        reduced[paramName].type = paramType;
        reduced[paramName].value = eventUserBurnNFT.args.values[index];
        return reduced;
    }, {});

    assert.equal(eventUserBurnNFTParams.userAccount.type, "bytes", "invalid UserBurnNFT userAccount type");
    assert.equal(eventUserBurnNFTParams.userAccount.value.toLowerCase(), funcParams.userAccount.toLowerCase(), "invalid UserBurnNFT userAccount value");
    assert.equal(eventUserBurnNFTParams.contractFee.type, "uint256", "invalid UserBurnNFT contractFee type");
    assert.equal(eventUserBurnNFTParams.tokenIDs.type, "uint256[]", "invalid UserBurnNFT tokenIDs type");
    assert.equal(eventUserBurnNFTParams.tokenValues.type, "uint256[]", "invalid UserBurnNFT tokenValues type");

    let decodeTokenIDs = web3.eth.abi.decodeParameters(['uint256[]'], eventUserBurnNFTParams.tokenIDs.value);
    assert.equal(!!decodeTokenIDs[0] === true, true, "UserBurnNFT tokenIDs error");
    decodeTokenIDs = decodeTokenIDs[0];
    assert.equal(decodeTokenIDs.length, tokenIDs.length, "invalid UserBurnNFT tokenIDs length");
    for (idx = 0; idx < decodeTokenIDs.length; ++idx) {
        assert.equal(parseInt(decodeTokenIDs[idx]), tokenIDs[idx], "invalid UserBurnNFT tokenIDs value!");
    }

    let decodeTokenValues = web3.eth.abi.decodeParameters(['uint256[]'], eventUserBurnNFTParams.tokenValues.value);
    assert.equal(!!decodeTokenValues[0] === true, true, "UserBurnNFT tokenValues error");
    decodeTokenValues = decodeTokenValues[0];
    assert.equal(decodeTokenValues.length, tokenValues.length, "invalid UserBurnNFT tokenValues length");
    for (idx = 0; idx < decodeTokenValues.length; ++idx) {
        assert.equal(parseInt(decodeTokenValues[idx]), tokenValues[idx], "invalid UserBurnNFT tokenValues value!");
    }

    balances = await tokenInstance.methods.balanceOfBatch(senderAccounts, tokenIDs).call();
    for (idx = 0; idx < balances.length; ++idx) {
        assert.equal(0, parseInt(balances[idx]), "after check userBurnNFT balanceOf error idx:", idx, ",balance:", balances[idx]);
    }

    const afterFeeProxyBalance = new web3.utils.BN(await web3.eth.getBalance(smgFeeProxy));
    assert.equal(afterFeeProxyBalance.sub(beforeFeeProxyBalance).eq(new web3.utils.BN(batchFee)), true, "balance of storeman fee error");
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC1155 @ethereum] <( wanchain => ethereum )> -> smgReleaseNFT  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const uniqueID = uniqueInfo.userReleaseErc1155;
    const smgID = global.storemanGroups.src.ID
    const userAccount = ethUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];
    const currentToken = global.chains[currentChainType].erc1155Tokens.filter(token => token.symbol === "Erc1155Symbol")[0];

    // cross
    const cross = await CrossDelegateV4.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    //const fee = await cross.getFee({ srcChainID: global.chains[currentChainType].ID, destChainID: global.chains[buddyChainType].ID });
    //const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossFee = new web3.utils.BN(0);
    //const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

    // const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
    // if (!new web3.utils.BN(currTokenCrossType).eq(new web3.utils.BN(tokenCrossType))) {
    //     await tokenManager.setTokenPairType(tokenPairID, new web3.utils.BN(tokenCrossType), {from: global.operatorAccount[currentChainType]});
    // }

    let tokenInstance = await getErc1155TokenInstance(tokenAccount);
    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenIDs: tokenIDs,
        tokenValues: tokenValues,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    let idx = 0;
    // before check
    let userAccounts = [userAccount, userAccount, userAccount, userAccount, userAccount];
    let balances = await tokenInstance.methods.balanceOfBatch(userAccounts, tokenIDs).call();
    for (idx = 0; idx < tokenIDs.length; ++idx) {
        assert.equal(0, parseInt(balances[idx]), "before smgReleaseNFT check balances:", balances);
    }

    let crossAddresses = [cross.address, cross.address, cross.address, cross.address, cross.address];
    let crossBalances = await tokenInstance.methods.balanceOfBatch(crossAddresses, tokenIDs).call();
    for (idx = 0; idx < tokenIDs.length; ++idx) {
        assert.equal(new web3.utils.BN(crossBalances[idx]).eq((new web3.utils.BN(tokenValues[idx]))), true, "before userReleaseNFT check cross balance error");
    }

    // curveID
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let { R, s } = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgReleaseNFT,
        (await cross.currentChainID()),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.tokenIDs,
        funcParams.tokenValues,
        funcParams.tokenAccount,
        funcParams.userAccount);
    funcParams = { ...funcParams, R: R, s: s };

    let receipt = await cross.smgReleaseNFT(...Object.values(funcParams), { from: senderAccount });
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].NFTLibV1, receipt.tx);
    }

    const eventSmgReleaseNFT = assert.getWeb3Log(receipt, { event: 'SmgReleaseNFT' });
    assert.equal(!!eventSmgReleaseNFT === true, true, "get event SmgReleaseNFT error");
    assert.equal(eventSmgReleaseNFT.args.uniqueID, funcParams.uniqueID, "event SmgReleaseNFT uniqueID error");
    assert.equal(eventSmgReleaseNFT.args.smgID, funcParams.smgID, "event SmgReleaseNFT smgID error");
    assert.equal(eventSmgReleaseNFT.args.tokenPairID, funcParams.tokenPairID, "event SmgReleaseNFT tokenPairID error");
    assert.equal(eventSmgReleaseNFT.args.keys.length, eventSmgReleaseNFT.args.values.length, "invalid SmgReleaseNFT keys and values length");

    const eventSmgReleaseNFTParams = eventSmgReleaseNFT.args.keys.reduce((reduced, next, index) => {
        const [paramName, paramType] = next.split(":");
        reduced[paramName] = {};
        reduced[paramName].type = paramType;
        reduced[paramName].value = eventSmgReleaseNFT.args.values[index];
        return reduced;
    }, {});

    assert.equal(eventSmgReleaseNFTParams.userAccount.type, "address", "invalid SmgReleaseNFT userAccount type");
    assert.equal(eventSmgReleaseNFTParams.userAccount.value.toLowerCase(), funcParams.userAccount.toLowerCase(), "invalid SmgReleaseNFT userAccount value");

    assert.equal(eventSmgReleaseNFTParams.tokenAccount.type, "address", "invalid SmgMintNFT tokenAccount type");
    assert.equal(eventSmgReleaseNFTParams.tokenAccount.value.toLowerCase(), funcParams.tokenAccount.toLowerCase(), "invalid SmgReleaseNFT tokenAccount value");

    assert.equal(eventSmgReleaseNFTParams.tokenIDs.type, "uint256[]", "invalid SmgReleaseNFT tokenIDs type");
    assert.equal(eventSmgReleaseNFTParams.tokenValues.type, "uint256[]", "invalid SmgReleaseNFT tokenValues type");

    idx = 0;
    let decodeTokenIDs = web3.eth.abi.decodeParameters(['uint256[]'], eventSmgReleaseNFTParams.tokenIDs.value);
    assert.equal(!!decodeTokenIDs[0] === true, true, "SmgReleaseNFT tokenIDs error");
    decodeTokenIDs = decodeTokenIDs[0];
    assert.equal(decodeTokenIDs.length, tokenIDs.length, "invalid SmgReleaseNFT tokenIDs length");
    for (idx = 0; idx < decodeTokenIDs.length; ++idx) {
        assert.equal(parseInt(decodeTokenIDs[idx]), tokenIDs[idx], "invalid SmgReleaseNFT tokenIDs value!");
    }

    let decodeTokenValues = web3.eth.abi.decodeParameters(['uint256[]'], eventSmgReleaseNFTParams.tokenValues.value);
    assert.equal(!!decodeTokenValues[0] === true, true, "SmgReleaseNFT tokenValues error");
    decodeTokenValues = decodeTokenValues[0];
    assert.equal(decodeTokenValues.length, tokenValues.length, "invalid SmgReleaseNFT tokenValues length");
    for (idx = 0; idx < decodeTokenValues.length; ++idx) {
        assert.equal(parseInt(decodeTokenValues[idx]), tokenValues[idx], "invalid SmgReleaseNFT tokenValues value!");
    }

    // after check
    balances = await tokenInstance.methods.balanceOfBatch(userAccounts, tokenIDs).call();
    for (idx = 0; idx < tokenIDs.length; ++idx) {
        assert.equal(tokenValues[idx], parseInt(balances[idx]), "after userReleaseNFT check balances:", balances);
    }

    crossBalances = await tokenInstance.methods.balanceOfBatch(crossAddresses, tokenIDs).call();
    for (idx = 0; idx < tokenIDs.length; ++idx) {
        assert.equal(new web3.utils.BN(crossBalances[idx]).eq((new web3.utils.BN(0))), true, "after userReleaseNFT check cross balance error");
    }
});
