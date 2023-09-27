const optimist                  = require("optimist");
const schnorrTool               = require('../utils/schnorr/tools');

const {
    ADDRESS_0,
    chainTypes,
    defaultChainIDs,
    defaultCurve,
    defaultCurve2Schnorr,
    crossFees,
    crossFeesV3,
    userBTCAccount
} = require("./crossApproach/common");

const {
    storemanGroups,
    initStoremanGroup,
    addWanStoremanGroup,
    syncWanStoremanGroup,
} = require("./crossApproach/smg-config");

const {
    coins,
    tokens,
    startTokenPairID,
    deployOrigToken,
    transferOrigToken,
    transferNftToken,
    addMappingToken,
    cleanTokenPairs,
    mergeTokenPairs,
    initOrigTokenPairs,
    addTokenPairs,
    nftTokens,
    erc1155Tokens
} = require("./crossApproach/token-config");

const {
    updateOracle
} = require("./crossApproach/oracle-config");

const truffleConfig = require("./config");
// console.log("truffleConfig:", truffleConfig);

const {
    testInit,
    getEventSignature,
    assert
}                               = require('./crossApproach/lib');

const {
    getBalance,
    toNonExponential,
    importMochaTest,
    setGlobal,
    clearGlobal
}                               = require('./utils');

describe('Test Cross Approach', () => {
    before("init...   -> success", async () => {
        testInit();

        let accounts = await web3.eth.getAccounts();
        // console.log("accounts:", accounts, accounts.length);
        let currNetwork = optimist.argv.network || "development";
        currNetwork = currNetwork.split("-")[0];
        const from = truffleConfig.networks[currNetwork].from;
        const owner = from ? (accounts.includes(from) ? from : accounts[0]) : accounts[0];
        const adminAccounts = {WAN: accounts[1], ETH: accounts[2]};
        const foundationAccounts = {WAN: accounts[3], ETH: accounts[4]};
        const aliceAccounts = {WAN: accounts[5], ETH: accounts[6], BTC: userBTCAccount};
        const smgAccounts = { src: {WAN: accounts[7], ETH: accounts[8]}, dest: {WAN: accounts[7], ETH: accounts[8]} }
        const operatorAccounts = {WAN: accounts[9], ETH: accounts[9]};
        // const curveIDs = {WAN: defaultCurve.secp256K1, ETH: defaultCurve.bn128};
        const curveIDs = {WAN: defaultCurve.bn128, ETH: defaultCurve.bn128, BTC: defaultCurve.ecSchnorr};

        console.log(`Deploy contracts, wait...`);
        let tokenPairs = {};
        let knownEvents = {};
        let deployed = {};
        deployed[chainTypes.WAN] = await deployCrossContracts(owner, {chainType: chainTypes.WAN, tokenPairs, curveIDs, alice:aliceAccounts.WAN, foundation: foundationAccounts.WAN, admin: adminAccounts.WAN, operator:operatorAccounts.WAN});
        console.log("contracts:", chainTypes.WAN, JSON.stringify(deployed[chainTypes.WAN].scAddr));
        tokenPairs = deployed[chainTypes.WAN].tokenPairs;
        knownEvents[chainTypes.WAN] = deployed[chainTypes.WAN].knownEvents;
        deployed[chainTypes.ETH] = await deployCrossContracts(owner, {chainType: chainTypes.ETH, tokenPairs, curveIDs, alice:aliceAccounts.ETH, foundation: foundationAccounts.ETH, admin: adminAccounts.ETH, operator:operatorAccounts.ETH});
        console.log("contracts:", chainTypes.ETH, JSON.stringify(deployed[chainTypes.ETH].scAddr));
        tokenPairs = deployed[chainTypes.ETH].tokenPairs;
        knownEvents[chainTypes.ETH] = deployed[chainTypes.ETH].knownEvents;
        await addChainTokenPairs(deployed[chainTypes.WAN].scAddr.TokenManagerProxy, tokenPairs);
        await addChainTokenPairs(deployed[chainTypes.ETH].scAddr.TokenManagerProxy, tokenPairs);

        let chainType;
        let chains = {};
        chainType = chainTypes.WAN;
        chains[chainType] = makeChainInfo(chainType, deployed[chainType].scAddr, coins[chainType], tokens[chainType], nftTokens[chainType], erc1155Tokens[chainType])
        chainType = chainTypes.ETH;
        chains[chainType] = makeChainInfo(chainType, deployed[chainType].scAddr, coins[chainType], tokens[chainType], nftTokens[chainType], erc1155Tokens[chainType])
        chainType = chainTypes.BTC;
        chains[chainType] = makeChainInfo(chainType, null, coins[chainType], null)

        // console.log("===chains:", JSON.stringify(chains, null, 2));
        // console.log("===tokenPairs:", JSON.stringify(tokenPairs, null, 2));
        // console.log("===chains:", JSON.stringify(chains, null, 2));
        // console.log("===coins:", JSON.stringify(coins, null, 2));
        // console.log("===tokens:", JSON.stringify(tokens, null, 2));

        // setGlobal("accounts", accounts);
        setGlobal("operatorAccount", operatorAccounts);
        setGlobal("adminAccount", adminAccounts);
        setGlobal("foundationAccount", foundationAccounts);
        setGlobal("aliceAccount", aliceAccounts);
        setGlobal("smgAccount", smgAccounts);
        setGlobal("crossFees", crossFees);
        setGlobal("crossFeesV3", crossFeesV3);
        setGlobal("knownEvents", knownEvents);
        setGlobal("tokenPairs", tokenPairs);
        setGlobal("chains", chains);
        setGlobal("schnorr", schnorrTool);
        setGlobal("storemanGroups", storemanGroups);
        // set owner
        setGlobal("contractOwner", owner);
        setGlobal("getSmgProxy", getSmgProxy);

    });

    importMochaTest("Test Common V4", './crossApproach/common_v4_test');

    importMochaTest("Test Cross V4", './crossApproach/cross_v4_test');

    importMochaTest("Test ERC751 Cross V4", './crossApproach/nft_v1_cross_test');

    importMochaTest("Test ERC1155 Cross V4", './crossApproach/erc1155_v4_cross_test');

    after("finish...   -> success", function () {
        clearGlobal("operatorAccount");
        clearGlobal("adminAccount");
        clearGlobal("foundationAccount");
        clearGlobal("aliceAccount");
        clearGlobal("smgAccount");
        clearGlobal("crossFees");
        clearGlobal("crossFeesV3");
        clearGlobal("knownEvents");
        clearGlobal("tokenPairs");
        clearGlobal("chains");
        clearGlobal("schnorr");
        clearGlobal("storemanGroups");
        // clear owner
        clearGlobal("contractOwner");
        clearGlobal("getSmgProxy");
        console.log("After all tests");
    });
});

function makeChainInfo(chainType, scAddr, coin, token, ntfToken, erc1155Tokens) {
    let chain = {};
    chain.ID = defaultChainIDs[chainType];
    chain.scAddr = scAddr;
    chain.coin = coin;
    chain.tokens = token;
    chain.nftTokens = ntfToken;
    chain.erc1155Tokens = erc1155Tokens;
    return chain;
}

async function getSmgProxy(chainType, address) {
    const OracleDelegate            = artifacts.require('OracleDelegate.sol');
    const TestStoremanAdmin         = artifacts.require('TestStoremanAdmin.sol');

    let smg;
    if (chainTypes.WAN === chainType) {
      smg = await TestStoremanAdmin.at(address);
    } else {
      smg = await OracleDelegate.at(address);
    }
    return smg;
}

async function addChainTokenPairs(tokenManagerAddr, tokenPairs) {
    const TokenManagerDelegateV2 = artifacts.require('TokenManagerDelegateV2');

    let tokenManager = await TokenManagerDelegateV2.at(tokenManagerAddr);
    return await addTokenPairs(tokenManager, tokenPairs);
}

async function deployCrossContracts(owner, options) {
    const TokenManagerProxy         = artifacts.require('TokenManagerProxy');
    const TokenManagerDelegateV2      = artifacts.require('TokenManagerDelegateV2');

    const OracleDelegate            = artifacts.require('OracleDelegate.sol');
    const OracleProxy               = artifacts.require('OracleProxy.sol');

    const Bn128SchnorrVerifier      = artifacts.require('Bn128SchnorrVerifier.sol');
    const Secp256k1SchnorrVerifier  = artifacts.require('Secp256k1SchnorrVerifier.sol');
    const EcSchnorrVerifier  = artifacts.require('EcSchnorrVerifier.sol');
    const SignatureVerifier         = artifacts.require('SignatureVerifier.sol');

    const RapidityLibV4             = artifacts.require('RapidityLibV4');
    const NFTLibV1                  = artifacts.require('NFTLibV1');
    const CrossDelegateV4           = artifacts.require('CrossDelegateV4.sol');
    const CrossProxy                = artifacts.require('CrossProxy.sol');

    const TestStoremanAdmin         = artifacts.require('TestStoremanAdmin.sol');
    const TestOrigTokenCreator      = artifacts.require("TestOrigTokenCreator.sol")
    const TestNftTokenCreator       = artifacts.require("TestNftTokenCreator.sol")

    let opts = Object.assign({}, {
        chainType: chainTypes.WAN,
        depositSymbol: coins.WAN.symbol,
        tokenPairs: {},
        curveIDs:{ WAN:defaultCurve.secp256K1, ETH:defaultCurve.bn128, BTC: defaultCurve.ecSchnorr },
        alice: null,
        admin: null,
        foundation: null,
        operator: null,
    }, options);
    let isWAN = opts.chainType === chainTypes.WAN;
    let scAddr = {};
    let knownEvents = {};

    // oracle
    let oracleProxy = await OracleProxy.new({from: owner});
    let oracleDelegate = await OracleDelegate.new({from: owner});
    await oracleProxy.upgradeTo(oracleDelegate.address, {from: owner});
    let oracle = await OracleDelegate.at(oracleProxy.address);
    scAddr["OracleProxy"] = oracle.address;
    scAddr["OracleDelegate"] = oracleDelegate.address;
    knownEvents["OracleDelegate"] = getEventSignature(oracleDelegate.abi);

    // token manager proxy
    let tokenManagerProxy = await TokenManagerProxy.new({from: owner});
    let tokenManagerDelegate = await TokenManagerDelegateV2.new({from: owner});
    await tokenManagerProxy.upgradeTo(tokenManagerDelegate.address, {from: owner});
    let tokenManager = await TokenManagerDelegateV2.at(tokenManagerProxy.address);
    scAddr["TokenManagerProxy"] = tokenManager.address;
    scAddr["TokenManagerDelegate"] = tokenManagerDelegate.address;
    knownEvents["TokenManagerDelegate"] = getEventSignature(tokenManagerDelegate.abi);

    let smgAdminProxy;
    let schnorrs = Object.keys(opts.curveIDs).map(chainType => schnorrTool[defaultCurve2Schnorr[opts.curveIDs[chainType]]]);
    // let wanCurveIDs = Object.values(opts.curveIDs);

    initStoremanGroup(storemanGroups, schnorrs);
    if (isWAN) {
        smgAdminProxy = await TestStoremanAdmin.new({from: owner});
        scAddr["TestStoremanAdmin"] = smgAdminProxy.address;
        knownEvents["TestStoremanAdmin"] = getEventSignature(smgAdminProxy.abi);

        await addWanStoremanGroup(smgAdminProxy, storemanGroups, owner);
    } else {
        // let ethCurveIDs = wanCurveIDs.reverse();
        await syncWanStoremanGroup(oracle, storemanGroups, owner);
    }
    await updateOracle(oracle, storemanGroups, owner)

    // signature verifier
    let signatureVerifier = await SignatureVerifier.new({from: owner});
    let bn128 = await Bn128SchnorrVerifier.new({from: owner});
    let ecSchnorr = await EcSchnorrVerifier.new({from: owner});
    if (isWAN) {
        let secp256K1 = await Secp256k1SchnorrVerifier.new({from: owner});
        await signatureVerifier.register(defaultCurve.secp256K1, secp256K1.address, {from: owner});
        scAddr["Secp256k1SchnorrVerifier"] = secp256K1.address;
        assert.equal(web3.utils.toChecksumAddress(await signatureVerifier.verifierMap(defaultCurve.secp256K1))
            , web3.utils.toChecksumAddress(secp256K1.address)
            , `check registered secp256K1 signature verifier sc failed`
        );
    }
   // register signature verifier contracts
    await signatureVerifier.register(defaultCurve.bn128, bn128.address, {from: owner});
    await signatureVerifier.register(defaultCurve.ecSchnorr, ecSchnorr.address, {from: owner});
    scAddr["SignatureVerifier"] = signatureVerifier.address;
    scAddr["Bn128SchnorrVerifier"] = bn128.address;
    scAddr["EcSchnorrVerifier"] = ecSchnorr.address;
    console.log("register bn128:", defaultCurve.bn128, bn128.address)
    console.log("register ecSchnorr:", defaultCurve.ecSchnorr, ecSchnorr.address)
    web3.utils.toChecksumAddress(await signatureVerifier.verifierMap(defaultCurve.bn128))
    assert.equal(web3.utils.toChecksumAddress(await signatureVerifier.verifierMap(defaultCurve.bn128))
        , web3.utils.toChecksumAddress(bn128.address)
        , `check registered bn128 signature verifier sc failed`
    );
    assert.equal(web3.utils.toChecksumAddress(await signatureVerifier.verifierMap(defaultCurve.ecSchnorr))
        , web3.utils.toChecksumAddress(ecSchnorr.address)
        , `check registered ecSchnorr signature verifier sc failed`
    );

    // cross approach
    let rapidityLib = await RapidityLibV4.new({from: owner});
    let nftLib = await NFTLibV1.new({ from: owner });
    await CrossDelegateV4.link(rapidityLib);
    await CrossDelegateV4.link(nftLib);
    let crossDelegate = await CrossDelegateV4.new({from: owner});

    let crossProxy = await CrossProxy.new({from: owner});
    await crossProxy.upgradeTo(crossDelegate.address, {from: owner});
    let cross = await CrossDelegateV4.at(crossProxy.address);
    scAddr["CrossProxy"] = crossProxy.address;
    scAddr["CrossDelegate"] = crossDelegate.address;
    scAddr["NFTLib"] = nftLib.address;
    knownEvents["RapidityLib"] = getEventSignature(rapidityLib.abi);
    knownEvents["NFTLib"] = getEventSignature(nftLib.abi);
    knownEvents["CrossDelegate"] = getEventSignature(crossDelegate.abi);

    // for (let theChainType in crossFees[opts.chainType]) {
    //     for (let buddyChainType in crossFees[opts.chainType][theChainType]) {
    //         if (theChainType === opts.chainType || buddyChainType === opts.chainType) {
    //             await cross.setFees(defaultChainIDs[theChainType], defaultChainIDs[buddyChainType],
    //                 crossFees[opts.chainType][theChainType][buddyChainType].lockFee,
    //                 crossFees[opts.chainType][theChainType][buddyChainType].revokeFee
    //             );
    //         }
    //     }
    // }

    if (!(await tokenManager.mapAdmin(cross.address))) {
        await tokenManager.addAdmin(cross.address);
    }
    if (!(await tokenManager.operator === ADDRESS_0)) {
        await tokenManager.setOperator(opts.operator);
    }

    // TestOrigTokenCreator
    let testOrigTokenCreator = await TestOrigTokenCreator.new();
    scAddr["TestOrigTokenCreator"] = testOrigTokenCreator.address;
    knownEvents["TestOrigTokenCreator"] = getEventSignature(testOrigTokenCreator.abi);
    // testOrigTokenCreator.setAdmin(crossApproach.address);
    await testOrigTokenCreator.setAdmin(owner);

    // token pairs
    let origTokens = tokens;
    origTokens[opts.chainType] = await deployOrigToken(testOrigTokenCreator, origTokens[opts.chainType]);
    await transferOrigToken(testOrigTokenCreator, origTokens[opts.chainType], opts.alice);

    // 20211112 NFT begin *************************************************************************
    let testNftTokenCreator = await TestNftTokenCreator.new();
    scAddr["TestNftTokenCreator"] = testNftTokenCreator.address;
    knownEvents["TestNftTokenCreator"] = getEventSignature(testNftTokenCreator.abi);
    // token pairs
    let nftOrigTokens = nftTokens;
    nftOrigTokens[opts.chainType] = await deployOrigToken(testNftTokenCreator, nftOrigTokens[opts.chainType]);
    await transferNftToken(testNftTokenCreator, nftOrigTokens[opts.chainType], opts.alice);

    // Erc1155 begin *************************************************************************
    {
        const {
            deployErc1155OrigToken,
            transferErc1155Token
        } = require("./erc1155/erc1155_utils.js");

        let OriginErc1155Tokens = erc1155Tokens;
        OriginErc1155Tokens[opts.chainType] = await deployErc1155OrigToken(owner, OriginErc1155Tokens[opts.chainType]);
        await transferErc1155Token(owner, OriginErc1155Tokens[opts.chainType], opts.alice);
    }
    // Erc1155 end *************************************************************************
    let currTokenPairs = initOrigTokenPairs(coins, origTokens, chainTypes, defaultChainIDs, startTokenPairID);
    currTokenPairs = await addMappingToken(tokenManager, currTokenPairs, opts.chainType, testNftTokenCreator, owner);
    currTokenPairs = cleanTokenPairs(currTokenPairs);
    currTokenPairs = mergeTokenPairs(currTokenPairs, opts.tokenPairs);
    await cross.setPartners(
        tokenManager.address,
        isWAN ? smgAdminProxy.address : oracle.address,
        opts.foundation,
        ADDRESS_0,
        signatureVerifier.address,
        {from: owner}
    );

    assert.equal((await cross.getPartners()).smgFeeProxy, opts.foundation, `smgFeeProxy is not the foundation account`);

    await cross.setAdmin(opts.admin);

    await cross.setChainID(defaultChainIDs[opts.chainType], {from: opts.admin});
    assert.equal((await cross.currentChainID()), defaultChainIDs[opts.chainType], `invalid currentChainID`);
    let multi = false;
    for (let buddyChainType in crossFeesV3[opts.chainType]) {
        if (!multi) {
            await cross.setFee({srcChainID: defaultChainIDs[opts.chainType], destChainID:defaultChainIDs[buddyChainType], contractFee: crossFeesV3[opts.chainType][buddyChainType].contractFee, agentFee: crossFeesV3[opts.chainType][buddyChainType].agentFee}, {from: opts.admin});
            let fee = await cross.getFee({srcChainID: defaultChainIDs[opts.chainType], destChainID:defaultChainIDs[buddyChainType]});
            assert.equal(fee.contractFee, crossFeesV3[opts.chainType][buddyChainType].contractFee, `invalid ${opts.chainType} => ${buddyChainType} contractFee`);
            assert.equal(fee.agentFee, crossFeesV3[opts.chainType][buddyChainType].agentFee, `invalid ${opts.chainType} => ${buddyChainType} agentFee`);
            multi = true;
            continue;
        }
        await cross.setFees([{srcChainID: defaultChainIDs[opts.chainType], destChainID:defaultChainIDs[buddyChainType], contractFee: crossFeesV3[opts.chainType][buddyChainType].contractFee, agentFee: crossFeesV3[opts.chainType][buddyChainType].agentFee}], {from: opts.admin});
        let fees = await cross.getFees([{srcChainID: defaultChainIDs[opts.chainType], destChainID:defaultChainIDs[buddyChainType]}]);
        assert.equal(fees[0].contractFee, crossFeesV3[opts.chainType][buddyChainType].contractFee, `invalid ${opts.chainType} => ${buddyChainType} contractFee`);
        assert.equal(fees[0].agentFee, crossFeesV3[opts.chainType][buddyChainType].agentFee, `invalid ${opts.chainType} => ${buddyChainType} agentFee`);
    }

    return {
        scAddr: scAddr,
        knownEvents: knownEvents,
        tokenPairs: currTokenPairs
    };
}
