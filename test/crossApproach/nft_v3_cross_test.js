const CrossDelegateV2 = artifacts.require('CrossDelegateV3');
const CrossProxy = artifacts.require('CrossProxy');

const TokenManagerDelegate = artifacts.require('TokenManagerDelegateV2');

const QuotaDelegate = artifacts.require('QuotaDelegate');
const QuotaProxy = artifacts.require('QuotaProxy');

const OracleDelegate = artifacts.require('OracleDelegate');

const TestStoremanAdmin = artifacts.require('TestStoremanAdmin.sol');
const TestOrigTokenCreator = artifacts.require("TestOrigTokenCreator.sol");
const MappingNftToken = artifacts.require("MappingNftToken");

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

//const crossValue = 10;
const minerFee = 5;


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
    let nftCrossValue = 12345;// token-config.js::transferNftToken mintValue="12345"
    const crossValueToWei = nftCrossValue;
    const userAccount = wanUserAccount;
    const senderAccount = ethUserAccount;


    const currentToken = global.chains[currentChainType].nftTokens.filter(token => token.symbol === "NFT")[0];
    //console.log("NFT_CrossChain userLock currentToken:", currentToken);
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;
    //console.log("NFT_CrossChain userLock serviceFee:", serviceFee);
    const moreServiceFee = new web3.utils.BN(contractFee).toString();
    //console.log("NFT_CrossChain userLock moreServiceFee:", moreServiceFee);
    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const parnters = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    //console.log("NFT_CrossChain userLock tokenPair:", tokenPair);

    const tokenManager = await TokenManagerDelegate.at(parnters.tokenManager);
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
    let tokenInstance = await getNftTokenInstance(tokenAccount);
    let balance = await tokenInstance.balanceOf(senderAccount);
    // console.log("NFT_CrossChain userLock balance:", balance.toString());

    // approve
    //console.log("NFT_CrossChain userLock approve crossValueToWei:", crossValueToWei);
    await tokenInstance.approve(cross.address, crossValueToWei, {from: senderAccount});
    let approved = await tokenInstance.getApproved(crossValueToWei);
    //console.log("userLock approved:", approved);
    
    
    let receipt = await cross.userLock(...Object.values(funcParams), { from: senderAccount, value: moreServiceFee });
    //console.log("nft userlock receipt:", receipt);
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

    balance = await tokenInstance.balanceOf(senderAccount);
    balance = balance.toString();
    assert.equal(0, balance, "after check userLock balanceOf error:", balance);
    let ownerOf = await tokenInstance.ownerOf(nftCrossValue);
    //console.log("after check userLock nft:", nftCrossValue, ",ownerOf:", ownerOf, ",cross.address:", cross.address);
    assert.equal(ownerOf, cross.address, "after check userLock nft:", nftCrossValue, ",ownerOf:", ownerOf, ",cross.address:", cross.address);
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [NFT @wanchain] <( ethereum => wanchain )> -> smgMint  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const uniqueID = uniqueInfo.userLockNFT;
    const smgID = global.storemanGroups.src.ID
    let crossValue = 12345;
    const userAccount = wanUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];
    const currentToken = global.chains[buddyChainType].nftTokens.filter(token => token.symbol === "NFT")[0];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const parnters = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    //console.log("nft smgMint tokenPair:", tokenPair);
    const tokenManager = await TokenManagerDelegate.at(parnters.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    //const fee = await cross.getFee({ srcChainID: global.chains[currentChainType].ID, destChainID: global.chains[buddyChainType].ID });
    const crossFee = new web3.utils.BN(0);

    let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValue,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };
    //console.log("nft smgMint funcParams:", funcParams);
    let smg = await global.getSmgProxy(currentChainType, parnters.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let { R, s } = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgMint, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};


    //console.log("nft smgMint ************************************")
    //console.log("nft smgMint tokenAccount:", tokenAccount);
    let receipt = await cross.smgMint(...Object.values(funcParams), { from: senderAccount });
    // console.log("nft smgMint receipt:", receipt);
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
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
            value: funcParams.crossValue,
            tokenAccount: funcParams.tokenAccount,
            userAccount: funcParams.userAccount
        }
    });
    {
        //console.log("\n after check **********************************:");
        //console.log("after check nft smgMint tokenPair.shadowChainToken.tokenAccount:", tokenPair.shadowChainToken.tokenAccount);
        //console.log("after check nft smgMint wanUserAccount:", wanUserAccount);
        let tokenInstance = await getNftTokenInstance(tokenPair.shadowChainToken.tokenAccount);
        let balance = await tokenInstance.balanceOf(wanUserAccount);
        balance = balance.toString();
        assert.equal(1, balance, "after check smgMint balanceOf error:", balance);
    }
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [NFT @wanchain] <( wanchain => ethereum )> -> userBurn ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.WAN;
    const buddyChainType = chainTypes.ETH;
    const smgID = global.storemanGroups.src.ID
    const crossValue = 12345;
    const minerFeeToWei = web3.utils.toWei(minerFee.toString());
    const userAccount = ethUserAccount;
    const senderAccount = wanUserAccount;
    const currentToken = global.chains[buddyChainType].nftTokens.filter(token => token.symbol === "NFT")[0];
    const contractFee = global.crossFeesV3[currentChainType][buddyChainType].contractFee;
    const moreServiceFee = new web3.utils.BN(contractFee).toString();

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const parnters = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    // console.log("nft userBurn tokenPair:", tokenPair);
    const tokenManager = await TokenManagerDelegate.at(parnters.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;

    // approve
    let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValue,
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

    let ownerOf = await tokenInstance.ownerOf(crossValue);
    //console.log("nft userBurn ownerOf:", ownerOf);
    //console.log("nft userBurn userAccount:", userAccount);
    //console.log("nft userBurn senderAccount:", senderAccount);

    // approve
    await tokenInstance.approve(cross.address, crossValue, { from: senderAccount });
    let approved = await tokenInstance.getApproved(crossValue);
    //console.log("nft userBurn approved:", approved);

    // exec
    let receipt = await cross.userBurn(...Object.values(funcParams), { from: senderAccount, value: moreServiceFee });
    //console.log("nft userBurn receipt:", receipt);
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
            fee: minerFeeToWei,
            userAccount: funcParams.userAccount.toLowerCase(),
        }
    });

    {
        let balance = await tokenInstance.balanceOf(senderAccount);
        balance = balance.toString();
        assert.equal(0, balance, "after check userBurn balanceOf account error:", balance);
    }
});

it('Chain [ETH] <=> Chain [WAN] -> TOKEN [NFT @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  success', async () => {
    const wanUserAccount = global.aliceAccount.WAN;
    const ethUserAccount = global.aliceAccount.ETH;
    const currentChainType = chainTypes.ETH;
    const buddyChainType = chainTypes.WAN;
    const uniqueID = uniqueInfo.userReleaseNFT;
    const smgID = global.storemanGroups.src.ID
    const crossValue = 12345;
    const userAccount = ethUserAccount;
    const senderAccount = global.smgAccount.src[currentChainType];
    const currentToken = global.chains[currentChainType].nftTokens.filter(token => token.symbol === "NFT")[0];

    // cross
    const cross = await CrossDelegateV2.at(global.chains[currentChainType].scAddr.CrossProxy);
    const parnters = await cross.getPartners();

    // tokenAccount
    const tokenPair = filterTokenPair(global.tokenPairs, currentChainType, buddyChainType, currentToken.symbol);
    const tokenManager = await TokenManagerDelegate.at(parnters.tokenManager);
    const tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
    const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
    const tokenPairID = tokenPair.tokenPairID;


    //const fee = await cross.getFee({ srcChainID: global.chains[currentChainType].ID, destChainID: global.chains[buddyChainType].ID });
    //const crossFee = new web3.utils.BN(fee.agentFee).mul(new web3.utils.BN(crossValueToWei)).div(new web3.utils.BN(DENOMINATOR));
    const crossFee = new web3.utils.BN(0);
    //const crossValueActually = new web3.utils.BN(crossValueToWei).sub(crossFee);

    //console.log("nft smgRelease tokenPair:", tokenPair);
    funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValue,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount
    };
    //console.log("nft smgRelease funcParams:", funcParams);

    // before check
    let tokenInstance = await getNftTokenInstance(funcParams.tokenAccount);
    let balance = await tokenInstance.balanceOf(userAccount);
    balance = balance.toString();
    assert.equal(0, balance, "nft smgRelease before check balance error");
    let ownerOf = await tokenInstance.ownerOf(crossValue);
    assert.equal(ownerOf, cross.address, "before check smgRelease ownerOf nft:", crossValue, ",ownerOf:", ownerOf, ",cross.address:", cross.address);

    balance = await tokenInstance.balanceOf(cross.address);
    balance = balance.toString();
    assert.equal(balance, 1, "before check smgRelease cross.address:", cross.address,",balance:",balance);

    // curveID
    let smg = await global.getSmgProxy(currentChainType, parnters.smgAdminProxy);
    let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
    let curveID = smgConfig.curve1;
    let sk = skInfo.src[currentChainType];

    // sign
    let { R, s } = buildMpcSign(global.schnorr[defaultCurve2Schnorr[Number(curveID)]], sk, typesArrayList.smgRelease, (await cross.currentChainID()), funcParams.uniqueID, funcParams.tokenPairID, funcParams.crossValue, funcParams.crossFee, funcParams.tokenAccount, funcParams.userAccount);
    funcParams = {...funcParams, R: R, s: s};

    let receipt = await cross.smgRelease(...Object.values(funcParams), { from: senderAccount });
    //console.log("nft smgRelease receipt:", receipt);
    if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(global.knownEvents[currentChainType].RapidityLibV3, receipt.tx);
    }
    //console.log("nft smgRelease receipt logs:", receipt.logs);

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

    // after check
    balance = await tokenInstance.balanceOf(userAccount);
    balance = balance.toString();
    assert.equal(balance, 1, "nft: after smgRelease userAccount:", userAccount, ",balance:", balance);

    balance = await tokenInstance.balanceOf(cross.address);
    balance = balance.toString();
    assert.equal(balance, 0, "nft: after smgRelease crossDelegate:", cross.address, ",balance:", balance);

    ownerOf = await tokenInstance.ownerOf(crossValue);
    //console.log("nft: after smgRelease ownerOf:", ownerOf);
    assert.equal(ownerOf, userAccount, "after check smgRelease ownerOf nft:", crossValue, ",ownerOf:", ownerOf, ",userAccount:", userAccount);
});
