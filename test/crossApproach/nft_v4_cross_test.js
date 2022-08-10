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

const minerFee = 5;
const tokenCrossType = 1;
const tokenID = 12345;

before("init...   -> success", () => {
    testInit();
});

// NFT ...
it('Chain [ETH] <=> Chain [WAN] -> TOKEN [NFT @ethereum] <( ethereum => wanchain )> -> userLock  ==> success', async () => {
    // console.log("nft userLock");
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const smgID = global.storemanGroups.src.ID
    const userAccount = wanUserAccount;
    const senderAccount = ethUserAccount;
    const currentChainAdmin = global.adminAccount[currentChainType];

    const currentToken = global.chains[currentChainType].nftTokens.filter(token => token.symbol === "NFT")[0];
    //console.log("NFT_CrossChain userLock currentToken:", currentToken);
    const contractFee = new web3.utils.BN(global.crossFeesV3[currentChainType][buddyChainType].contractFee).div(new web3.utils.BN(2));
    //console.log("NFT_CrossChain userLock serviceFee:", serviceFee);
    const moreServiceFee = new web3.utils.BN(contractFee).toString();
    //console.log("NFT_CrossChain userLock moreServiceFee:", moreServiceFee);
    // cross
    const cross = await CrossDelegateV4.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    //console.log("NFT_CrossChain userLock tokenPair:", tokenPair);

    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    await cross.setTokenPairFees([[tokenPairID, contractFee]], {from: currentChainAdmin});
    assert.equal(contractFee.eq(new web3.utils.BN(await cross.getTokenPairFee(tokenPairID))), true, "fee of token pair error");

    const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
    if (!new web3.utils.BN(currTokenCrossType).eq(new web3.utils.BN(tokenCrossType))) {
        await tokenManager.setTokenPairType(tokenPairID, new web3.utils.BN(tokenCrossType), {from: global.operatorAccount[currentChainType]});
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
        userAccount: userAccount
    };
    // get token instance
    let tokenInstance = await getNftTokenInstance(tokenAccount);
    let balance = await tokenInstance.balanceOf(senderAccount);
    // console.log("NFT_CrossChain userLock balance:", balance.toString());

    // approve
    //console.log("NFT_CrossChain userLock approve tokenID:", tokenID);
    await tokenInstance.approve(cross.address, tokenID, {from: senderAccount});
    let approved = await tokenInstance.getApproved(tokenID);
    //console.log("userLock approved:", approved);

    let receipt = await cross.userLock(...Object.values(funcParams), { from: senderAccount, value: moreServiceFee });
    //console.log("nft userlock receipt:", receipt);
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV4, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserLockLogger',
        args: {
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenAccount: tokenAccount,
            value: funcParams.tokenID,
            contractFee: contractFee,
            userAccount: funcParams.userAccount.toLowerCase(),
        }
    });

    balance = await tokenInstance.balanceOf(senderAccount);
    balance = balance.toString();
    assert.equal(0, balance, "after check userLock balanceOf error:", balance);
    let ownerOf = await tokenInstance.ownerOf(tokenID);
    //console.log("after check userLock nft:", tokenID, ",ownerOf:", ownerOf, ",cross.address:", cross.address);
    assert.equal(ownerOf, cross.address, "after check userLock nft:", tokenID, ",ownerOf:", ownerOf, ",cross.address:", cross.address);

    const afterFeeProxyBalance = new web3.utils.BN(await web3.eth.getBalance(smgFeeProxy));
    assert.equal(afterFeeProxyBalance.sub(beforeFeeProxyBalance).eq(new web3.utils.BN(contractFee)), true, "balance of storeman fee error");
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [NFT @wanchain] <( ethereum => wanchain )> -> smgMint  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const uniqueID = uniqueInfo.userLockNFT;
    const smgID = global.storemanGroups.src.ID
    const userAccount = wanUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];
    const currentToken = global.chains[buddyChainType].nftTokens.filter(token => token.symbol === "NFT")[0];

    // cross
    const cross = await CrossDelegateV4.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    //console.log("nft smgMint tokenPair:", tokenPair);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;
    console.log("tokenAccount:", tokenAccount)

    //const fee = await cross.getFee({ srcChainID: global.chains[currentChainType].ID, destChainID: global.chains[buddyChainType].ID });
    const crossFee = new web3.utils.BN(0);

    const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
    if (!new web3.utils.BN(currTokenCrossType).eq(new web3.utils.BN(tokenCrossType))) {
        await tokenManager.setTokenPairType(tokenPairID, new web3.utils.BN(tokenCrossType), {from: global.operatorAccount[currentChainType]});
    }

    let tokenInstance = await getNftTokenInstance(tokenAccount);
    let smgFeeProxy = partners.smgFeeProxy;
    if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
    }
    const beforeFeeProxyBalance = new web3.utils.BN(await tokenInstance.balanceOf(smgFeeProxy));

    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenID: tokenID,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };
    //console.log("nft smgMint funcParams:", funcParams);
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let { R, s } = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.tokenID, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};


    //console.log("nft smgMint ************************************")
    //console.log("nft smgMint tokenAccount:", tokenAccount);
    let receipt = await cross.smgMint(...Object.values(funcParams), { from: senderAccount });
    // console.log("nft smgMint receipt:", receipt);
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV4, receipt.tx);
    }

    //receipt.logs.forEach(function (logEntry) {
    //    console.log("logEntry:", logEntry);
    //});
    assert.checkWeb3Event(receipt, {
        event: 'SmgMintLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.tokenID,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });
    {
        //console.log("\n after check **********************************:");
        //console.log("after check nft smgMint tokenPair.shadowChainToken.tokenAccount:", tokenPair.shadowChainToken.tokenAccount);
        //console.log("after check nft smgMint wanUserAccount:", wanUserAccount);
        let balance = await tokenInstance.balanceOf(wanUserAccount);
        balance = balance.toString();
        assert.equal(1, balance, "after check smgMint balanceOf error:", balance);

        let ownerOf = await tokenInstance.ownerOf(tokenID);
        assert.equal(ownerOf, wanUserAccount, "owner of nft error");

        const afterFeeProxyBalance = new web3.utils.BN(await tokenInstance.balanceOf(smgFeeProxy));
        assert.equal(afterFeeProxyBalance.sub(beforeFeeProxyBalance).eq(new web3.utils.BN("0")), true, "balance of storeman fee error");
    }
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [NFT @wanchain] <( wanchain => ethereum )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const smgID = global.storemanGroups.src.ID
    const minerFeeToWei = web3.utils.toWei(minerFee.toString());
    const userAccount = ethUserAccount;
    const senderAccount = wanUserAccount;
    const currentToken = global.chains[buddyChainType].nftTokens.filter(token => token.symbol === "NFT")[0];
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(contractFee).toString();

    // cross
    const cross = await CrossDelegateV4.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    // console.log("nft userBurn tokenPair:", tokenPair);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;
    console.log("tokenAccount:", tokenAccount)

    // const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
    // if (!new web3.utils.BN(currTokenCrossType).eq(new web3.utils.BN(tokenCrossType))) {
    //     await tokenManager.setTokenPairType(tokenPairID, new web3.utils.BN(tokenCrossType), {from: global.operatorAccount[currentChainType]});
    // }

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
        crossFee: minerFeeToWei,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };
    //console.log("nft userBurn funcParams:", funcParams);
    // get token instance
    let tokenInstance = await getNftTokenInstance(funcParams.tokenAccount);
    let balance = await tokenInstance.balanceOf(senderAccount);
    balance = balance.toString()
    assert.equal(1, balance, "before userBurn check balance:", balance);

    let ownerOf = await tokenInstance.ownerOf(tokenID);
    //console.log("nft userBurn ownerOf:", ownerOf);
    //console.log("nft userBurn userAccount:", userAccount);
    //console.log("nft userBurn senderAccount:", senderAccount);

    // approve
    await tokenInstance.approve(cross.address, tokenID, { from: senderAccount });
    let approved = await tokenInstance.getApproved(tokenID);
    //console.log("nft userBurn approved:", approved);

    // exec
    let receipt = await cross.userBurn(...Object.values(funcParams), { from: senderAccount, value: moreServiceFee });
    //console.log("nft userBurn receipt:", receipt);
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV4, receipt.tx);
    }

    assert.checkWeb3Event(receipt, {
        event: 'UserBurnLogger',
        args: {
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            tokenAccount: funcParams.tokenAccount,
            value: funcParams.tokenID,
            contractFee: contractFee,
            fee: minerFeeToWei,
            userAccount: funcParams.userAccount.toLowerCase(),
        }
    });

    {
        let balance = await tokenInstance.balanceOf(senderAccount);
        balance = balance.toString();
        assert.equal(0, balance, "after check userBurn balanceOf account error:", balance);
    }

    const afterFeeProxyBalance = new web3.utils.BN(await web3.eth.getBalance(smgFeeProxy));
    assert.equal(afterFeeProxyBalance.sub(beforeFeeProxyBalance).eq(new web3.utils.BN(contractFee)), true, "balance of storeman fee error");
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [NFT @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const uniqueID = uniqueInfo.userReleaseNFT;
    const smgID = global.storemanGroups.src.ID
    const userAccount = ethUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];
    const currentToken = global.chains[currentChainType].nftTokens.filter(token => token.symbol === "NFT")[0];

    // cross
    const cross = await CrossDelegateV4.at(global.chains[currentChainType].scAddr.CrossProxy);
    const partners = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;
    console.log("tokenAccount:", tokenAccount)

    //const fee = await cross.getFee({ srcChainID: global.chains[currentChainType].ID, destChainID: global.chains[buddyChainType].ID });
    //const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossFee = new web3.utils.BN(0);
    //const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

    // const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
    // if (!new web3.utils.BN(currTokenCrossType).eq(new web3.utils.BN(tokenCrossType))) {
    //     await tokenManager.setTokenPairType(tokenPairID, new web3.utils.BN(tokenCrossType), {from: global.operatorAccount[currentChainType]});
    // }

    let tokenInstance = await getNftTokenInstance(tokenAccount);
    let smgFeeProxy = partners.smgFeeProxy;
    if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
    }
    const beforeFeeProxyBalance = new web3.utils.BN(await tokenInstance.balanceOf(smgFeeProxy));

    //console.log("nft smgRelease tokenPair:", tokenPair);
    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenID: tokenID,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };
    //console.log("nft smgRelease funcParams:", funcParams);

    let totalSupply = await tokenInstance.totalSupply();
    assert.equal(new web3.utils.BN(totalSupply).eq(0), false, "nft smgRelease totalSupply error");
    // before check
    let balance = await tokenInstance.balanceOf(userAccount);
    balance = balance.toString();
    assert.equal(0, balance, "nft smgRelease before check balance error");

    let crossBalance = await tokenInstance.balanceOf(cross.address);
    assert.equal(new web3.utils.BN(crossBalance).eq((new web3.utils.BN(0))), false, "check cross nft balance error");

    let ownerOf = await tokenInstance.ownerOf(tokenID);
    assert.equal(ownerOf, cross.address, "before check smgRelease ownerOf nft:", tokenID, ",ownerOf:", ownerOf, ",cross.address:", cross.address);

    balance = await tokenInstance.balanceOf(cross.address);
    balance = balance.toString();
    assert.equal(balance, 1, "before check smgRelease cross.address:", cross.address,",balance:",balance);

    // curveID
    let smg = await global.getSmgProxy(currentChainType, partners.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let { R, s } = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgRelease, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.tokenID, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgRelease(...Object.values(funcParams), { from: senderAccount });
    //console.log("nft smgRelease receipt:", receipt);
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV4, receipt.tx);
    }
    //console.log("nft smgRelease receipt logs:", receipt.logs);

    assert.checkWeb3Event(receipt, {
        event: 'SmgReleaseLogger',
        args: {
            uniqueID: funcParams.uniqueID,
            smgID: web3.utils.padRight(funcParams.smgID, 64),
            tokenPairID: funcParams.tokenPairID,
            value: funcParams.tokenID,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });

    // after check
    balance = await tokenInstance.balanceOf(userAccount);
    balance = balance.toString();
    assert.equal(balance, 1, "nft: after smgRelease userAccount:", userAccount, ",balance:", balance);

    balance = await tokenInstance.balanceOf(cross.address);
    balance = balance.toString();
    assert.equal(balance, 0, "nft: after smgRelease crossDelegate:", cross.address, ",balance:", balance);

    ownerOf = await tokenInstance.ownerOf(tokenID);
    //console.log("nft: after smgRelease ownerOf:", ownerOf);
    assert.equal(ownerOf, userAccount, "after check smgRelease ownerOf nft:", tokenID, ",ownerOf:", ownerOf, ",userAccount:", userAccount);

    const afterFeeProxyBalance = new web3.utils.BN(await tokenInstance.balanceOf(smgFeeProxy));
    assert.equal(afterFeeProxyBalance.sub(beforeFeeProxyBalance).eq(new web3.utils.BN("0")), true, "balance of storeman fee error");
});
