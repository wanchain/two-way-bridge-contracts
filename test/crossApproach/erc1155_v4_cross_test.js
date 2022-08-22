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
    tokenID,
    minerFee,
    erc1155TokenCrossType,
    mintValue
} = require("../erc1155/erc1155_utils.js");

const WrappedErc1155Json = require("../erc1155/WrappedErc1155.json");

before("init...   -> success", () => {
    testInit();
});

async function getErc1155TokenInstance(tokenAccount) {
    let erc1155Inst = new web3.eth.Contract(WrappedErc1155Json.abi, tokenAccount);
    return erc1155Inst;
}

// NFT ...
it('Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC1155 @ethereum] <( ethereum => wanchain )> -> userLock  ==> success', async () => {
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
        await tokenManager.setTokenPairType(tokenPairID, new web3.utils.BN(erc1155TokenCrossType), { from: global.operatorAccount[currentChainType] });
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
        tokenID: tokenID,
        value: mintValue,
        userAccount: userAccount
    };

    // get token instance
    let tokenInstance = await getErc1155TokenInstance(tokenAccount);
    let balance = await tokenInstance.methods.balanceOf(senderAccount, tokenID).call();

    // approve
    let setApprovalForAllReceipt = await tokenInstance.methods.setApprovalForAll(cross.address, true)
        .send(
            {
                from: senderAccount,
                gasPrice: '20000000000',// ganacle-cli default value
                gas: 6721975            // ganache-cli default value
            });
    //console.log("setApprovalForAllReceipt:", setApprovalForAllReceipt);
    let approved = await tokenInstance.methods.isApprovedForAll(senderAccount, cross.address).call();
    assert.equal(approved, true, "check isApprovedForAll");

    let receipt = await cross.userLockErc1155(...Object.values(funcParams), { from: senderAccount, value: moreServiceFee });
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV4, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserLockLoggerErc1155',
        args: {
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenAccount: tokenAccount,
            tokenID: funcParams.tokenID,
            value: funcParams.value,
            contractFee: contractFee,
            userAccount: funcParams.userAccount.toLowerCase(),
        }
    });

    balance = await tokenInstance.methods.balanceOf(senderAccount,tokenID).call();
    balance = balance.toString();
    assert.equal(0, balance, "after check userLockErc1155 balanceOf error:", balance);

    const afterFeeProxyBalance = new web3.utils.BN(await web3.eth.getBalance(smgFeeProxy));
    assert.equal(afterFeeProxyBalance.sub(beforeFeeProxyBalance).eq(new web3.utils.BN(contractFee)), true, "balance of storeman fee error");
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC1155 @wanchain] <( ethereum => wanchain )> -> smgMint  ==>  success', async () => {
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
    //console.log("Erc1155 smgMint tokenPair:", tokenPair);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;
    // console.log("tokenAccount:", tokenAccount)

    //const fee = await cross.getFee({ srcChainID: global.chains[currentChainType].ID, destChainID: global.chains[buddyChainType].ID });
    const crossFee = new web3.utils.BN(0);

    const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
    if (!new web3.utils.BN(currTokenCrossType).eq(new web3.utils.BN(erc1155TokenCrossType))) {
        await tokenManager.setTokenPairType(tokenPairID, new web3.utils.BN(erc1155TokenCrossType), { from: global.operatorAccount[currentChainType] });
    }

    let tokenInstance = await getErc1155TokenInstance(tokenAccount);
    let smgFeeProxy = partners.smgFeeProxy;
    if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
    }
    const beforeFeeProxyBalance = new web3.utils.BN(await tokenInstance.methods.balanceOf(smgFeeProxy, tokenID).call());

    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenID: tokenID,
        value: mintValue,
        fee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };
    // console.log("erc1155 smgMint funcParams:", funcParams);
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];
    // console.log("smgMintErc1155 funcParams:", funcParams);
    // sign
    let { R, s } = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMintErc1155,
        (await cross.currentChainID()),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.tokenID,
        funcParams.value,
        funcParams.fee,
        funcParams.tokenAccount,
        funcParams.userAccount);
    funcParams = { ...funcParams, R: R, s: s };
    
    //console.log("Erc1155 smgMintErc1155 ************************************")
    //console.log("Erc1155 smgMintErc1155 tokenAccount:", tokenAccount);
    let receipt = await cross.smgMintErc1155(...Object.values(funcParams), { from: senderAccount });
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV4, receipt.tx);
    }

    const eventSmgMint = assert.getWeb3Log(receipt, { event: 'SmgMintLoggerErc1155' });
    assert.equal(!!eventSmgMint === true, true, "get event SmgMint error");
    assert.equal(eventSmgMint.args.uniqueID, funcParams.uniqueID, "event SmgMint uniqueID error");
    assert.equal(eventSmgMint.args.smgID, funcParams.smgID, "event SmgMint smgID error");
    assert.equal(web3.utils.toBN(eventSmgMint.args.fee).eq(funcParams.fee), true, "invalid SmgMint fee value");

    assert.checkWeb3Event(receipt, {
        event: 'SmgMintLoggerErc1155',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenID: funcParams.tokenID,
            value: funcParams.value,
            fee: funcParams.fee,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });
    {
        let balance = await tokenInstance.methods.balanceOf(wanUserAccount,tokenID).call();
        assert.equal(Number(mintValue), Number(balance), "after check smgMint balanceOf error:", balance);

        const afterFeeProxyBalance = new web3.utils.BN(await tokenInstance.methods.balanceOf(smgFeeProxy, tokenID).call());
        assert.equal(afterFeeProxyBalance.sub(beforeFeeProxyBalance).eq(new web3.utils.BN("0")), true, "balance of storeman fee error");
    }
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC1155 @wanchain] <( wanchain => ethereum )> -> userBurn ==>  success', async () => {
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

//    // const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
//    // if (!new web3.utils.BN(currTokenCrossType).eq(new web3.utils.BN(tokenCrossType))) {
//    //     await tokenManager.setTokenPairType(tokenPairID, new web3.utils.BN(tokenCrossType), {from: global.operatorAccount[currentChainType]});
//    // }

    let smgFeeProxy = partners.smgFeeProxy;
    if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
    }
    const beforeFeeProxyBalance = new web3.utils.BN(await web3.eth.getBalance(smgFeeProxy));

    // approve
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenID: tokenID,
        value: mintValue,
        crossFee: minerFeeToWei,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };
    
    // get token instance
    let tokenInstance = await getErc1155TokenInstance(funcParams.tokenAccount);
    let balance = await tokenInstance.methods.balanceOf(senderAccount, tokenID).call();
    balance = balance.toString()
    assert.equal(mintValue, balance, "before userBurnErc1155 check balance:", balance);

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

    // exec
    let receipt = await cross.userBurnErc1155(...Object.values(funcParams), { from: senderAccount, value: moreServiceFee });
    // console.log("Erc1155 1 userBurn receipt:", receipt);
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV4, receipt.tx);
    }

    let args = {
        smgID: web3.utils.padRight(funcParams.smgID, 64),
        tokenPairID: funcParams.tokenPairID,
        tokenAccount: funcParams.tokenAccount,
        tokenID: funcParams.tokenID,
        value: funcParams.value,
        contractFee: contractFee,
        fee: funcParams.crossFee,
        userAccount: funcParams.userAccount.toLowerCase(),
    };

    assert.checkWeb3Event(receipt, {
        event: 'UserBurnLoggerErc1155',
        args: args
    });

   {
       let balance = await tokenInstance.methods.balanceOf(senderAccount,tokenID).call();
       assert.equal(Number(0), Number(balance), "after check userBurn balanceOf account error:", balance);
    }

    const afterFeeProxyBalance = new web3.utils.BN(await web3.eth.getBalance(smgFeeProxy));
    assert.equal(afterFeeProxyBalance.sub(beforeFeeProxyBalance).eq(new web3.utils.BN(contractFee)), true, "balance of storeman fee error");
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC1155 @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  success', async () => {
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
    let smgFeeProxy = partners.smgFeeProxy;
    if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
    }
    const beforeFeeProxyBalance = new web3.utils.BN(await tokenInstance.methods.balanceOf(smgFeeProxy,tokenID).call());

    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenID: tokenID,
        value: mintValue,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };

    // before check
    let balance = await tokenInstance.methods.balanceOf(userAccount, tokenID).call();
    balance = balance.toString();
    assert.equal(0, balance, "erc1155 smgRelease before check balance error");

    let crossBalance = await tokenInstance.methods.balanceOf(cross.address, tokenID).call();
    assert.equal(new web3.utils.BN(crossBalance).eq((new web3.utils.BN(0))), false, "check cross nft balance error");

    balance = await tokenInstance.methods.balanceOf(cross.address, tokenID).call();
    balance = balance.toString();
    assert.equal(balance, mintValue, "erc1155 before check smgRelease cross.address:", cross.address, ",balance:", balance);

    // curveID
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let { R, s } = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgReleaseErc1155,
        (await cross.currentChainID()),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.tokenID,
        funcParams.value,
        funcParams.crossFee,
        funcParams.tokenAccount,
        funcParams.userAccount);
    funcParams = { ...funcParams, R: R, s: s };

    let receipt = await cross.smgReleaseErc1155(...Object.values(funcParams), { from: senderAccount });
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV4, receipt.tx);
    }
    //console.log("nft smgRelease receipt logs:", receipt.logs);
    const eventSmgRelease = assert.getWeb3Log(receipt, { event: 'SmgReleaseLoggerErc1155' });
    assert.equal(!!eventSmgRelease === true, true, "get event SmgRelease error");
    assert.equal(eventSmgRelease.args.uniqueID, funcParams.uniqueID, "event SmgRelease uniqueID error");
    assert.equal(eventSmgRelease.args.smgID, funcParams.smgID, "event SmgRelease smgID error");

    assert.checkWeb3Event(receipt, {
        event: 'SmgReleaseLoggerErc1155',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenID: funcParams.tokenID,
            value: funcParams.value,
            fee: funcParams.crossFee,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });

    // after check
    balance = await tokenInstance.methods.balanceOf(userAccount, tokenID).call();
    balance = balance.toString();
    assert.equal(balance, mintValue, "erc1155: after smgRelease userAccount:", userAccount, ",balance:", balance);

    balance = await tokenInstance.methods.balanceOf(cross.address, tokenID).call();
    balance = balance.toString();
    assert.equal(balance, 0, "erc1155: after smgRelease crossDelegate:", cross.address, ",balance:", balance);

    const afterFeeProxyBalance = new web3.utils.BN(await tokenInstance.methods.balanceOf(smgFeeProxy, tokenID).call());
    assert.equal(afterFeeProxyBalance.sub(beforeFeeProxyBalance).eq(new web3.utils.BN("0")), true, "balance of storeman fee error");
});
