const TokenManagerProxy         = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate      = artifacts.require('TokenManagerDelegate');

const QuotaDelegate             = artifacts.require('QuotaDelegate.sol');
const QuotaProxy                = artifacts.require('QuotaProxy.sol');

const OracleDelegate            = artifacts.require('OracleDelegate.sol');
const OracleProxy               = artifacts.require('OracleProxy.sol');

const Bn128SchnorrVerifier      = artifacts.require('Bn128SchnorrVerifier.sol');
const Secp256k1SchnorrVerifier  = artifacts.require('Secp256k1SchnorrVerifier.sol');
const SignatureVerifier         = artifacts.require('SignatureVerifier.sol');

const CrossDelegate             = artifacts.require('CrossDelegate.sol');
const CrossProxy                = artifacts.require('CrossProxy.sol');

const TestStoremanAdmin         = artifacts.require('TestStoremanAdmin.sol');
const TestOrigTokenCreator      = artifacts.require("TestOrigTokenCreator.sol")

const { assert }                = require('chai');
const schnorrTool               = require('../utils/schnorr/tools');
const {
    sleep,
    getBalance,
    getRC20TokenInstance,
    getRC20TokenBalance,
    toNonExponential,
    buildMpcSign,
    parseEventsBy
}                               = require('./utils');

const {
    xInfo,
    skInfo
}                               = require('./config');

const BN                        = web3.utils.BN;

let crossDelegateNotInit;
let origTokenOwner;
const from = require('../truffle').networks.development.from;

const InvalidTokenPairID          = 100;
const htlcLockedTime              = 40; //unit: s
const quotaDepositRate            = 15000;

const ADDRESS_0                   = "0x0000000000000000000000000000000000000000";
const ADDRESS_TM                  = '0x0000000000000000000000000000000000000001';
const ADDRESS_SMGADMIN            = '0x0000000000000000000000000000000000000002';
const ADDRESS_CROSS_PROXY_IMPL    = '0x0000000000000000000000000000000000000003';

const ERROR_INFO                  = 'it should be throw error';

let defaultCurve = {
    curve1                    : 1,
    curve2                    : 2
};

let schnorr = {
    curve1:  null,
    curve2:  null,
};

let defaultChainID = {
    chain1                    : 10,
    chain2                    : 11
};

let coins = {
    coin1: {
        tokenPairID           : 0,
        origChainID           : defaultChainID.chain1,
        shadowChainID         : defaultChainID.chain2,
        origTokenAccount      : ADDRESS_0,
        shadowTokenAccount    : "", 
        decimals              : 18,
        name                  : 'WAN',
        symbol                : 'WAN',
        // price                 : 2.3
        price                 : 23e-16
    },
    coin2: {
        tokenPairID           : 1,
        origChainID           : defaultChainID.chain2,
        shadowChainID         : defaultChainID.chain1,
        origTokenAccount      : ADDRESS_0,
        shadowTokenAccount    : "",
        decimals              : 18,
        name                  : 'ETH',
        symbol                : 'ETH',
        // price                 : 243
        price                 : 243e-15
    }
}

let tokens = {
    token1: {
        tokenCreator          : null,
        tokenPairID           : 2,
        origChainID           : defaultChainID.chain1,
        shadowChainID         : defaultChainID.chain2,
        origTokenAccount      : "",
        shadowTokenAccount    : "",
        decimals              : 18,
        name                  : 'TST1',
        symbol                : 'TST1',
        // price                 : 3
        price                 : 3e-17
    },
    token2: {
        tokenCreator          : null,
        tokenPairID           : 3,
        origChainID           : defaultChainID.chain2,
        shadowChainID         : defaultChainID.chain1,
        origTokenAccount      : "",
        shadowTokenAccount    : "",
        decimals              : 16,
        name                  : 'TST2',
        symbol                : 'TST2',
        // price                 : 7
        price                 : 7e-17
    }
};

let crossApproach = {
    chain1: {
        instance              : null,
        delegate              : ADDRESS_0,
        origLockFee           : 10,
        origRevokeFee         : 11,
        shadowLockFee         : 12,
        shadowRevokeFee       : 13,
        parnters              : {
            tokenManager      : null,
            smgAdminProxy     : null,
            smgFeeProxy       : null,
            quota             : null,
            oracle            : null,
            sigVerifier       : null,
        },
    },
    chain2: {
        instance              : null,
        delegate              : ADDRESS_0,
        origLockFee           : 20,
        origRevokeFee         : 21,
        shadowLockFee         : 22,
        shadowRevokeFee       : 23,
        parnters              : {
            tokenManager      : null,
            smgAdminProxy     : null,
            smgFeeProxy       : null,
            quota             : null,
            oracle            : null,
            sigVerifier       : null,
        },
    },
};

let chains = {
    1: {
        ID                     : defaultChainID.chain1,
        coin                   : coins.coin1,
        token                  : tokens.token1,
        approach               : crossApproach.chain1
    },
    2: {
        ID                     : defaultChainID.chain2,
        coin                   : coins.coin2,
        token                  : tokens.token2,
        approach               : crossApproach.chain2
    }
}

let storemanGroupStatus = {
    none                      : 0,
    initial                   : 1,
    curveSeted                : 2,
    failed                    : 3,
    selected                  : 4,
    ready                     : 5,
    unregistered              : 6,
    dismissed                 : 7
};

let storemanGroups = {
    1: {
        ID                    : "0x01",
        account               : "", // accounts 1 or 2
        // deposit               : new BN(web3.utils.padRight(0x1, 50)),
        deposit               : "90000000000000000000000000000000000",
        status                : storemanGroupStatus.none,
        chain1                : defaultChainID.chain1,
        chain2                : defaultChainID.chain2,
        // sk1                   : "",
        // sk2                   : "",
        gpk1                  : "",
        gpk2                  : "",
        startTime             : 0,
        endTime               : Number.MAX_SAFE_INTEGER,
        R                     : "",
        s                     : ""
    },
    2: {
        ID                    : "0x02",
        account               : "", // accounts 1 or 2
        // deposit               : new BN(web3.utils.padRight(0x2, 50)),
        deposit               : "99000000000000000000000000000000000",
        status                : storemanGroupStatus.none,
        chain1                : defaultChainID.chain1,
        chain2                : defaultChainID.chain2,
        gpk1                  : "",
        gpk2                  : "",
        startTime             : 0,
        endTime               : Number.MAX_SAFE_INTEGER,
        R                     : "",
        s                     : ""
    },
    wrong: {
        ID                    : "0x03",
    }
};

let userLockParams       = {
    xHash: '',
    smgID: storemanGroups[1].ID,
    tokenPairID: tokens.token1.tokenPairID,
    value: 10,
    origUserAccount: '', // accounts 3 or 4
    shadowUserAccount: '', // accounts 3 or 4
    // lockFee: 0, //crossApproach.chain1.origLockFee + 1,
    // revokeFee: 0, //crossApproach.chain1.origRevokeFee + 2
};

let smgLockParams       = {
    xHash: '',
    smgID: storemanGroups[1].ID,
    tokenPairID: tokens.token1.tokenPairID,
    value: userLockParams.value,
    origUserAccount: '', // accounts 3 or 4
    shadowUserAccount: '', // accounts 3 or 4
    R: '',
    s: ''
};

let typesArrayList             = {
    //xHash   tokenPairID   value   userAccount
    smgMintLock: ['bytes32', 'uint', 'uint', 'address'],
    //xHash   tokenPairID   value   userAccount
    smgBurnLock: ['bytes32', 'uint', 'uint', 'address'],
    // timeout receiver
    smgWithdrawFee: ['uint','address'],
};

let owner = require('../truffle.js').networks.development.from;

contract('Test HTLC', async (accounts) => {
    before("init...   -> success", async () => {
        try {
            await testInit();

            // set owner
            owner = from ? from : accounts[0];
            origTokenOwner = accounts[1];

            console.log("init 1", await getBalance(owner));

            // await web3.eth.sendTransaction({from: owner, to: wTokenAddr, value: web3.utils.toWei("0.5")})

            // storeman admin proxy
            let smgAdminProxy = await TestStoremanAdmin.new();
            console.log("init 2", await getBalance(owner));

            // signature verifier
            let bn128 = await Bn128SchnorrVerifier.deployed();
            let secp256K1 = await Secp256k1SchnorrVerifier.deployed();
            let sigVerifier = await SignatureVerifier.deployed();
            // register signature verifier contracts
            await sigVerifier.register(defaultCurve.curve1, bn128.address, {from: owner});
            schnorr.curve1 = schnorrTool.bn128;
            // await sigVerifier.register(defaultCurve.curve1, secp256K1.address, {from: owner});
            // schnorr.curve1 = schnorrTool.secp256k1;
            storemanGroups[1].gpk1 = schnorr.curve1.getPKBySk(skInfo.smg1[1]);
            storemanGroups[1].gpk2 = schnorr.curve1.getPKBySk(skInfo.smg1[2]);
            console.log("init 3", await getBalance(owner));

            await sigVerifier.register(defaultCurve.curve2, bn128.address, {from: owner});
            schnorr.curve2 = schnorrTool.bn128;
            // await sigVerifier.register(defaultCurve.curve2, secp256K1.address, {from: owner});
            // schnorr.curve2 = schnorrTool.secp256k1;
            storemanGroups[2].gpk1 = schnorr.curve2.getPKBySk(skInfo.smg2[1]);
            storemanGroups[2].gpk2 = schnorr.curve2.getPKBySk(skInfo.smg2[2]);
            console.log("init 4", await getBalance(owner));

            // quota1
            let quotaProxy = await QuotaProxy.deployed();
            let quotaDelegate = await QuotaDelegate.deployed();
            let quota1 = await QuotaDelegate.at(quotaProxy.address);
            console.log("init 5", await getBalance(owner));

            // quota2
            let quota2 = await QuotaDelegate.new();
            console.log("init 6", await getBalance(owner));

            // oracle
            let oracleProxy = await OracleProxy.deployed();
            let oracleDelegate = await OracleDelegate.deployed();
            let oracle = await OracleDelegate.at(oracleProxy.address);
            console.log("init 7", await getBalance(owner));

            // token manager proxy
            let tokenManagerProxy = await TokenManagerProxy.deployed();
            let tokenManagerDelegate = await TokenManagerDelegate.deployed();
            let tokenManager = await TokenManagerDelegate.at(tokenManagerProxy.address);
            console.log("init 8", await getBalance(owner));

            // cross approach
            let crossProxy = await CrossProxy.deployed();
            let crossDelegate = await CrossDelegate.deployed();
            crossApproach.chain1.instance = await CrossDelegate.at(crossProxy.address);
            console.log("init 9", await getBalance(owner));
            await crossApproach.chain1.instance.setLockedTime(htlcLockedTime) //second
            console.log("init 10", await getBalance(owner));
            await crossApproach.chain1.instance.setPartners(tokenManager.address, smgAdminProxy.address, smgAdminProxy.address, quota1.address, sigVerifier.address);
            console.log("init 11", await getBalance(owner));
            await crossApproach.chain1.instance.setFees(defaultChainID.chain1, defaultChainID.chain2, crossApproach.chain1.origLockFee, crossApproach.chain1.origRevokeFee);
            console.log("init 12", await getBalance(owner));
            await crossApproach.chain1.instance.setFees(defaultChainID.chain2, defaultChainID.chain1, crossApproach.chain1.shadowLockFee, crossApproach.chain1.shadowRevokeFee);
            console.log("init 13", await getBalance(owner));
            crossApproach.chain1.parnters.tokenManager = tokenManager;
            crossApproach.chain1.parnters.smgAdminProxy = smgAdminProxy;
            crossApproach.chain1.parnters.smgFeeProxy = smgAdminProxy.address;
            crossApproach.chain1.parnters.quota = quota1;
            crossApproach.chain1.parnters.oracle = oracle;
            crossApproach.chain1.parnters.sigVerifier = sigVerifier;
            crossApproach.chain1.delegate = crossDelegate;

            // storeman admin setup
            await smgAdminProxy.addChainInfo(defaultChainID.chain1, defaultChainID.chain2, defaultCurve.curve1, defaultCurve.curve2);
            console.log("init 14", await getBalance(owner));
            var totalChainPair = await smgAdminProxy.getChainPairIDCount.call();
            var chainPairID = Number(totalChainPair) - 1;
            // console.log("deposit", typeof(storemanGroups[1].deposit));
            // console.log("deposit", web3.utils.toWei(storemanGroups[1].deposit));
            // storeman group 1
            await smgAdminProxy.addStoremanGroup(storemanGroups[1].ID, storemanGroupStatus.ready,
                web3.utils.toWei(storemanGroups[1].deposit), chainPairID, storemanGroups[1].gpk1,
                storemanGroups[1].gpk2, storemanGroups[1].startTime, storemanGroups[1].endTime);
            storemanGroups[1].status = storemanGroupStatus.ready;
            console.log("init 15", await getBalance(owner));
            let regSmg1Info = await smgAdminProxy.getStoremanGroupConfig.call(storemanGroups[1].ID);
            assert.equal(storemanGroups[1].status, regSmg1Info[1]);
            assert.equal(web3.utils.toWei(storemanGroups[1].deposit), regSmg1Info[2]);
            assert.equal(storemanGroups[1].chain1, Number(regSmg1Info[3]));
            assert.equal(storemanGroups[1].chain2, Number(regSmg1Info[4]));
            assert.equal(defaultCurve.curve1, Number(regSmg1Info[5]));
            assert.equal(defaultCurve.curve2, Number(regSmg1Info[6]));
            assert.equal(storemanGroups[1].gpk1, regSmg1Info[7]);
            assert.equal(storemanGroups[1].gpk2, regSmg1Info[8]);
            assert.equal(storemanGroups[1].startTime, Number(regSmg1Info[9]));
            assert.equal(storemanGroups[1].endTime, Number(regSmg1Info[10]));
            storemanGroups[1].account = accounts[2];

            // storeman group 2
            await smgAdminProxy.addStoremanGroup(storemanGroups[2].ID, storemanGroupStatus.ready,
                web3.utils.toWei(storemanGroups[2].deposit), chainPairID, storemanGroups[2].gpk1,
                storemanGroups[2].gpk2, storemanGroups[2].startTime, storemanGroups[2].endTime);
            console.log("init 16", await getBalance(owner));
            storemanGroups[2].status = storemanGroupStatus.ready;
            let regSmg2Info = await smgAdminProxy.getStoremanGroupConfig.call(storemanGroups[2].ID);
            assert.equal(storemanGroups[2].status, regSmg2Info[1]);
            assert.equal(web3.utils.toWei(storemanGroups[2].deposit), regSmg2Info[2]);
            assert.equal(storemanGroups[2].chain1, Number(regSmg2Info[3]));
            assert.equal(storemanGroups[2].chain2, Number(regSmg2Info[4]));
            assert.equal(defaultCurve.curve1, Number(regSmg2Info[5]));
            assert.equal(defaultCurve.curve2, Number(regSmg2Info[6]));
            // console.log("curve1", regSmg2Info[5], "curve2", regSmg2Info[6]);
            assert.equal(storemanGroups[2].gpk1, regSmg2Info[7]);
            assert.equal(storemanGroups[2].gpk2, regSmg2Info[8]);
            assert.equal(storemanGroups[2].startTime, Number(regSmg2Info[9]));
            assert.equal(storemanGroups[2].endTime, Number(regSmg2Info[10]));
            storemanGroups[2].account = accounts[3];

            crossDelegateNotInit = await CrossDelegate.new();
            console.log("init 17", await getBalance(owner));

            crossApproach.chain2.delegate = await CrossDelegate.new({from: owner});
            console.log("init 18", await getBalance(owner));
            let chain2CrossProxy = await CrossProxy.new({from: owner});
            console.log("init 19", await getBalance(owner));
            await chain2CrossProxy.upgradeTo(crossApproach.chain2.delegate.address, {from: owner});
            console.log("init 20", await getBalance(owner));
            crossApproach.chain2.instance = await CrossDelegate.at(chain2CrossProxy.address);
            console.log("init 21", await getBalance(owner));
            await crossApproach.chain2.instance.setLockedTime(htlcLockedTime) //second
            console.log("init 22", await getBalance(owner));
            await crossApproach.chain2.instance.setPartners(tokenManager.address, oracle.address, ADDRESS_0, quota2.address, sigVerifier.address);
            console.log("init 23", await getBalance(owner));
            await crossApproach.chain2.instance.setFees(defaultChainID.chain2, defaultChainID.chain1, crossApproach.chain2.origLockFee, crossApproach.chain2.origRevokeFee);
            console.log("init 24", await getBalance(owner));
            await crossApproach.chain2.instance.setFees(defaultChainID.chain1, defaultChainID.chain2, crossApproach.chain2.shadowLockFee, crossApproach.chain2.shadowRevokeFee);
            console.log("init 25", await getBalance(owner));
            crossApproach.chain2.parnters.tokenManager = tokenManager;
            crossApproach.chain2.parnters.smgAdminProxy = oracle;
            crossApproach.chain2.parnters.smgFeeProxy = ADDRESS_0;
            crossApproach.chain2.parnters.quota = quota2;
            crossApproach.chain2.parnters.oracle = oracle;
            crossApproach.chain2.parnters.sigVerifier = sigVerifier;

            // original token creator contract
            tokens.token1.tokenCreator = await TestOrigTokenCreator.new();
            console.log("init 26", await getBalance(owner));
            await tokens.token1.tokenCreator.setAdmin(crossApproach.chain1.instance.address, {from: owner})
            console.log("init 27", await getBalance(owner));
            await tokens.token1.tokenCreator.createToken(tokens.token1.name, tokens.token1.symbol, tokens.token1.decimals);
            console.log("init 28", await getBalance(owner));
            tokens.token1.origTokenAccount = await tokens.token1.tokenCreator.getTokenAddr.call(tokens.token1.name, tokens.token1.symbol);
            // let origTokenContract = new web3.eth.Contract(tokenRC20Abi, tokens.token1.origTokenAccount);

            // /* change original token contract owner request */
            // let changeOwnerTx = await tokens.token1.tokenCreator.changeOwner(tokens.token1.name, tokens.token1.symbol, origTokenOwner, {from: owner});
            // /* accept change original token contract owner request */
            // await origTokenContract.methods.acceptOwnership().send({from: origTokenOwner});
            // var mintTokenTx = await tokens.token1.tokenCreator.mintToken(tokens.token1.name, tokens.token1.symbol, origUser, web3.utils.toWei(origUserBalance.toString()))

            tokens.token2.tokenCreator = await TestOrigTokenCreator.new();
            console.log("init 29", await getBalance(owner));
            await tokens.token2.tokenCreator.setAdmin(crossApproach.chain2.instance.address, {from: owner})
            console.log("init 30", await getBalance(owner));
            await tokens.token2.tokenCreator.createToken(tokens.token2.name, tokens.token2.symbol, tokens.token2.decimals);
            console.log("init 31", await getBalance(owner));
            tokens.token2.origTokenAccount = await tokens.token2.tokenCreator.getTokenAddr.call(tokens.token2.name, tokens.token2.symbol);
            // let origTokenContract = new web3.eth.Contract(tokenRC20Abi, tokens.token2.origTokenAccount);

            // /* change original token contract owner request */
            // let changeOwnerTx = await tokens.token2.tokenCreator.changeOwner(tokens.token2.name, tokenManager.token2.symbol, origTokenOwner, {from: owner});
            // /* accept change original token contract owner request */
            // await origTokenContract.methods.acceptOwnership().send({from: origTokenOwner});
            // var mintTokenTx = await tokens.token2.tokenCreator.mintToken(tokens.token2.name, tokenManager.token2.symbol, origUser, web3.utils.toWei(origUserBalance.toString()))

            // token manager admin
            // token1
            let shadowToken1Receipt = await tokenManager.addToken(tokens.token1.name, tokens.token1.symbol, tokens.token1.decimals);
            console.log("init 32", await getBalance(owner));
            // console.log(shadowToken1Receipt.logs);
            let shadowToken1Logger = assert.getWeb3Log(shadowToken1Receipt, {
                event: 'AddToken'
            });
            tokens.token1.shadowTokenAccount = shadowToken1Logger.args.tokenAddress;
            assert.equal(tokens.token1.name, shadowToken1Logger.args.name);
            assert.equal(tokens.token1.symbol, shadowToken1Logger.args.symbol);
            assert.equal(tokens.token1.decimals, Number(shadowToken1Logger.args.decimals));
            // console.log("check OK");

            let token1PairReceipt = await tokenManager.addTokenPair(tokens.token1.tokenPairID,
                [tokens.token1.origTokenAccount, tokens.token1.name, tokens.token1.symbol, tokens.token1.decimals, tokens.token1.origChainID],
                tokens.token1.origChainID, tokens.token1.origTokenAccount, tokens.token1.shadowChainID, tokens.token1.shadowTokenAccount);
            // console.log("token1PairReceipt", token1PairReceipt.logs);
            assert.checkWeb3Event(token1PairReceipt, {
                event: 'AddTokenPair',
                args: {
                    id: tokens.token1.tokenPairID,
                    fromChainID: tokens.token1.origChainID,
                    fromAccount: tokens.token1.origTokenAccount.toLowerCase(),//web3.utils.hexToBytes(tokens.token1.origTokenAccount),// web3.utils.padRight(tokens.token1.origTokenAccount, 64).toLowerCase(),
                    toChainID: tokens.token1.shadowChainID,
                    tokenAddress: tokens.token1.shadowTokenAccount
                }
            });
            console.log("init 33", await getBalance(owner));

            // token2
            let shadowToken2Receipt = await tokenManager.addToken(tokens.token2.name, tokens.token2.symbol, tokens.token2.decimals);
            console.log("init 34", await getBalance(owner));
            let shadowToken2Logger = assert.getWeb3Log(shadowToken2Receipt, {
                event: 'AddToken'
            });
            tokens.token2.shadowTokenAccount = shadowToken2Logger.args.tokenAddress;
            assert.equal(tokens.token2.name, shadowToken2Logger.args.name);
            assert.equal(tokens.token2.symbol, shadowToken2Logger.args.symbol);
            assert.equal(tokens.token2.decimals, shadowToken2Logger.args.decimals);
            // console.log("check OK");

            let token2PairReceipt = await tokenManager.addTokenPair(tokens.token2.tokenPairID,
                [tokens.token2.origTokenAccount, tokens.token2.name, tokens.token2.symbol, tokens.token2.decimals, tokens.token2.origChainID],
                tokens.token2.origChainID, tokens.token2.origTokenAccount, tokens.token2.shadowChainID, tokens.token2.shadowTokenAccount);
            console.log("init 35", await getBalance(owner));
            assert.checkWeb3Event(token2PairReceipt, {
                event: 'AddTokenPair',
                args: {
                    id: tokens.token2.tokenPairID,
                    fromChainID: tokens.token2.origChainID,
                    fromAccount: tokens.token2.origTokenAccount.toLowerCase(),//web3.utils.hexToBytes(tokens.token2.origTokenAccount),//web3.utils.padRight(tokens.token2.origTokenAccount, 64).toLowerCase(),
                    toChainID: tokens.token2.shadowChainID,
                    tokenAddress: tokens.token2.shadowTokenAccount
                }
            });

            // coin1
            let shadowCoin1Receipt = await tokenManager.addToken(coins.coin1.name, coins.coin1.symbol, coins.coin1.decimals);
            console.log("init 36", await getBalance(owner));
            // console.log(shadowCoin1Receipt.logs);
            let shadowCoin1Logger = assert.getWeb3Log(shadowCoin1Receipt, {
                event: 'AddToken'
            });
            coins.coin1.shadowTokenAccount = shadowCoin1Logger.args.tokenAddress;
            assert.equal(coins.coin1.name, shadowCoin1Logger.args.name);
            assert.equal(coins.coin1.symbol, shadowCoin1Logger.args.symbol);
            assert.equal(coins.coin1.decimals, Number(shadowCoin1Logger.args.decimals));

            let coin1PairReceipt = await tokenManager.addTokenPair(coins.coin1.tokenPairID,
                [coins.coin1.origTokenAccount, coins.coin1.name, coins.coin1.symbol, coins.coin1.decimals, coins.coin1.origChainID],
                coins.coin1.origChainID, coins.coin1.origTokenAccount, coins.coin1.shadowChainID, coins.coin1.shadowTokenAccount);
            assert.checkWeb3Event(coin1PairReceipt, {
                event: 'AddTokenPair',
                args: {
                    id: coins.coin1.tokenPairID,
                    fromChainID: coins.coin1.origChainID,
                    fromAccount: coins.coin1.origTokenAccount.toLowerCase(),//web3.utils.hexToBytes(coins.coin1.origTokenAccount),//web3.utils.padRight(coins.coin1.origTokenAccount, 64).toLowerCase(),
                    toChainID: coins.coin1.shadowChainID,
                    tokenAddress: coins.coin1.shadowTokenAccount
                }
            });
            console.log("init 37", await getBalance(owner));

            // coin2
            let shadowCoin2Receipt = await tokenManager.addToken(coins.coin2.name, coins.coin2.symbol, coins.coin2.decimals);
            console.log("init 38", await getBalance(owner));
            let shadowCoin2Logger = assert.getWeb3Log(shadowCoin2Receipt, {
                event: 'AddToken'
            });
            coins.coin2.shadowTokenAccount = shadowCoin2Logger.args.tokenAddress;
            assert.equal(coins.coin2.name, shadowCoin2Logger.args.name);
            assert.equal(coins.coin2.symbol, shadowCoin2Logger.args.symbol);
            assert.equal(coins.coin2.decimals, shadowCoin2Logger.args.decimals);
            // console.log("check OK");

            let coin2PairReceipt = await tokenManager.addTokenPair(coins.coin2.tokenPairID,
                [coins.coin2.origTokenAccount, coins.coin2.name, coins.coin2.symbol, coins.coin2.decimals, coins.coin2.origChainID],
                coins.coin2.origChainID, coins.coin2.origTokenAccount, coins.coin2.shadowChainID, coins.coin2.shadowTokenAccount);
            console.log("init 39", await getBalance(owner));
            assert.checkWeb3Event(coin2PairReceipt, {
                event: 'AddTokenPair',
                args: {
                    id: coins.coin2.tokenPairID,
                    fromChainID: coins.coin2.origChainID,
                    fromAccount: coins.coin2.origTokenAccount.toLowerCase(),//web3.utils.hexToBytes(coins.coin2.origTokenAccount),//web3.utils.padRight(coins.coin2.origTokenAccount, 64).toLowerCase(),
                    toChainID: coins.coin2.shadowChainID,
                    tokenAddress: coins.coin2.shadowTokenAccount
                }
            });

            // token manager admin
            await tokenManager.addAdmin(crossApproach.chain1.instance.address, {from: owner});
            console.log("init 40", await getBalance(owner));

            await tokenManager.addAdmin(crossApproach.chain2.instance.address, {from: owner});
            console.log("init 41", await getBalance(owner));

            // oracle config
            let smg1ConfigReceipt = await oracle.setStoremanGroupConfig(storemanGroups[1].ID, storemanGroups[1].status,
                web3.utils.toWei(storemanGroups[1].deposit), [storemanGroups[1].chain2, storemanGroups[1].chain1],
                [defaultCurve.curve2, defaultCurve.curve1],
                storemanGroups[1].gpk2, storemanGroups[1].gpk1,
                storemanGroups[1].startTime, storemanGroups[1].endTime, {from: owner});
            // console.log("smg1ConfigReceipt", smg1ConfigReceipt.logs);
            console.log("init 42", await getBalance(owner));

            let smg2ConfigReceipt = await oracle.setStoremanGroupConfig(storemanGroups[2].ID, storemanGroups[2].status,
                web3.utils.toWei(storemanGroups[2].deposit), [storemanGroups[2].chain2, storemanGroups[2].chain1],
                [defaultCurve.curve2, defaultCurve.curve1],
                storemanGroups[2].gpk2, storemanGroups[2].gpk1,
                storemanGroups[2].startTime, storemanGroups[2].endTime, {from: owner});
            // console.log("smg2ConfigReceipt", smg2ConfigReceipt.logs);
            console.log("init 43", await getBalance(owner));
            let smg1DepositReceipt = await oracle.updateDeposit(storemanGroups[1].ID, web3.utils.toWei(storemanGroups[1].deposit), {from: owner});
            // assert.checkWeb3Event(smg1DepositReceipt, {
            //     event: 'UpdateDeposit',
            //     args: {
            //         smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
            //         amount:web3.utils.toWei(storemanGroups[1].deposit)
            //     }
            // });
            // console.log("smg1DepositReceipt", smg1DepositReceipt.logs);
            console.log("init 44", await getBalance(owner));
            let smg2DepositReceipt = await oracle.updateDeposit(storemanGroups[2].ID, web3.utils.toWei(storemanGroups[2].deposit), {from: owner});
            // assert.checkWeb3Event(smg2DepositReceipt, {
            //     event: 'UpdateDeposit',
            //     args: {
            //         smgID: web3.utils.padRight(storemanGroups[2].ID, 64),
            //         amount:web3.utils.toWei(storemanGroups[2].deposit)
            //     }
            // });
            // console.log("smg2DepositReceipt", smg2DepositReceipt.logs);
            console.log("init 45", await getBalance(owner));
            let tokenSymbols = [
                web3.utils.hexToBytes(web3.utils.asciiToHex(tokens.token1.symbol)),
                web3.utils.hexToBytes(web3.utils.asciiToHex(tokens.token2.symbol)),
                web3.utils.hexToBytes(web3.utils.asciiToHex(coins.coin1.symbol)),
                web3.utils.hexToBytes(web3.utils.asciiToHex(coins.coin2.symbol)),
            ];
            let tokenPrices = [
                web3.utils.toWei(toNonExponential(tokens.token1.price)),
                web3.utils.toWei(toNonExponential(tokens.token2.price)),
                web3.utils.toWei(toNonExponential(coins.coin1.price)),
                web3.utils.toWei(toNonExponential(coins.coin2.price)),
            ];
            let priceLogger = await oracle.updatePrice(tokenSymbols, tokenPrices);
            console.log("init 46", await getBalance(owner));
            let oraclePrices = await oracle.getValues(tokenSymbols);
            assert.equal(oraclePrices[0].eq(new BN(tokenPrices[0])), true);
            assert.equal(oraclePrices[1].eq(new BN(tokenPrices[1])), true);
            assert.equal(oraclePrices[2].eq(new BN(tokenPrices[2])), true);
            assert.equal(oraclePrices[3].eq(new BN(tokenPrices[3])), true);
            // console.log(oraclePrices);

            // quota config
            let quota1ConfigReceipt = await quota1.config(
                oracle.address,
                crossApproach.chain1.instance.address,
                crossApproach.chain1.instance.address,
                smgAdminProxy.address,
                tokenManager.address,
                quotaDepositRate,
                coins.coin1.symbol,
                {from: owner}
            );
            console.log("init 47", await getBalance(owner));

            let quota2ConfigReceipt = await quota2.config(
                oracle.address,
                crossApproach.chain2.instance.address,
                crossApproach.chain2.instance.address,
                oracle.address,
                tokenManager.address,
                quotaDepositRate,
                coins.coin2.symbol,
                {from: owner}
            );
            console.log("init 48", await getBalance(owner));

        } catch (err) {
            // console.log(err);
            assert.fail(err);
        }
    });

    it('init...   -> getStoremanFee success', async () => {
        try {
            let smgFee = await crossApproach.chain1.instance.getStoremanFee(storemanGroups[1].ID);
            assert.equal(new BN(smgFee).eq(new BN(0)), true);
            smgFee = await crossApproach.chain2.instance.getStoremanFee(storemanGroups[2].ID);
            assert.equal(new BN(smgFee).eq(new BN(0)), true);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('Others getPartners  ==> The config value', async () => {
        try {
            let ret = await crossApproach.chain1.instance.getPartners();
            assert.equal(crossApproach.chain1.parnters.tokenManager.address, ret[0]);
            assert.equal(crossApproach.chain1.parnters.smgAdminProxy.address, ret[1]);
            assert.equal(crossApproach.chain1.parnters.smgFeeProxy, ret[2]);
            assert.equal(crossApproach.chain1.parnters.quota.address, ret[3]);
            assert.equal(crossApproach.chain1.parnters.sigVerifier.address, ret[4]);

            ret = await crossApproach.chain2.instance.getPartners();
            assert.equal(crossApproach.chain2.parnters.tokenManager.address, ret[0]);
            assert.equal(crossApproach.chain2.parnters.smgAdminProxy.address, ret[1]);
            assert.equal(ADDRESS_0, ret[2]);
            assert.equal(crossApproach.chain2.parnters.quota.address, ret[3]);
            assert.equal(crossApproach.chain2.parnters.sigVerifier.address, ret[4]);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('Others setEconomics  ==> Parameter is invalid', async () => {
        try {
            await crossApproach.chain1.instance.setPartners(ADDRESS_0, ADDRESS_0, crossApproach.chain1.parnters.smgFeeProxy, ADDRESS_0, ADDRESS_0);
            assert.fail(ERROR_INFO)
        } catch (err) {
            assert.include(err.toString(), "Parameter is invalid");
        }
    });

    it('Others setWithdrawFeeTimeout  ==> Not owner', async () => {
        try {
            await crossApproach.chain1.instance.setWithdrawFeeTimeout(0, {from: accounts[9]});
            assert.fail(ERROR_INFO)
        } catch (err) {
            assert.include(err.toString(), "Not owner");
        }
    });

    it('Others setWithdrawFeeTimeout  ==> Success', async () => {
        try {
            await crossApproach.chain1.instance.setWithdrawFeeTimeout(600, {from: owner});
        } catch (err) {
            assert.fail(err)
        }
    });

    it('Others getLeftLockedTime  ==> invalid xHash', async () => {
        try {
            await crossApproach.chain1.instance.getLeftLockedTime(xInfo.wrong.hash);
            assert.fail(ERROR_INFO)
        } catch (err) {
            assert.include(err.toString(), "invalid xHash");
        }
    });

    it('Others getFees  ==> The config value', async () => {
        try {
            let ret = await crossApproach.chain1.instance.getFees(defaultChainID.chain1, defaultChainID.chain2);
            assert.equal(crossApproach.chain1.origLockFee, ret[0]);
            assert.equal(crossApproach.chain1.origRevokeFee, ret[1]);
            // console.log("chain1 orig fees", ret[0], ret[1]);

            ret = await crossApproach.chain1.instance.getFees(defaultChainID.chain2, defaultChainID.chain1);
            assert.equal(crossApproach.chain1.shadowLockFee, ret[0]);
            assert.equal(crossApproach.chain1.shadowRevokeFee, ret[1]);
            // console.log("chain1 shadow fees", ret[0], ret[1]);

            ret = await crossApproach.chain2.instance.getFees(defaultChainID.chain2, defaultChainID.chain1);
            assert.equal(crossApproach.chain2.origLockFee, ret[0]);
            assert.equal(crossApproach.chain2.origRevokeFee, ret[1]);
            // console.log("chain2 orig fees", ret[0], ret[1]);

            ret = await crossApproach.chain2.instance.getFees(defaultChainID.chain1, defaultChainID.chain2);
            assert.equal(crossApproach.chain2.shadowLockFee, ret[0]);
            assert.equal(crossApproach.chain2.shadowRevokeFee, ret[1]);
            // console.log("chain1 shadow fees", ret[0], ret[1]);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('Others lockedTime  ==> The config value', async () => {
        try {
            let ret = await crossApproach.chain1.instance._lockedTime();
            assert.equal(htlcLockedTime, ret);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('Proxy   -> get the implementation address', async () => {
        try {
            let crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
            let address = await crossProxy.implementation();
            assert.equal(address, crossApproach.chain1.delegate.address);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('Proxy   -> upgradeTo', async () => {
        try {
            let crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
            await crossProxy.upgradeTo(ADDRESS_CROSS_PROXY_IMPL);

            let address = await crossProxy.implementation();
            assert.equal(address, ADDRESS_CROSS_PROXY_IMPL);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('Proxy   -> upgradeTo with the same implementation address', async () => {
        try {
            let crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
            await crossProxy.upgradeTo(ADDRESS_CROSS_PROXY_IMPL);

            let address = await crossProxy.implementation();
            assert.equal(address, ADDRESS_CROSS_PROXY_IMPL);
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Cannot upgrade to the same implementation");
        }
    });

    it('Proxy   -> upgradeTo with 0x address', async () => {
        try {
            let crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
            await crossProxy.upgradeTo(ADDRESS_0);

            let address = await crossProxy.implementation();
            assert.equal(address, ADDRESS_0);
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Cannot upgrade to invalid address");
        }
    });

    it('Proxy   -> restore', async () => {
        try {
            let crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
            let ret = await crossProxy.upgradeTo(crossApproach.chain1.delegate.address);
            let address = await crossProxy.implementation();
            assert.equal(address, crossApproach.chain1.delegate.address);

            assert.checkWeb3Event(ret, {
                event: 'Upgraded',
                args: {
                    implementation:address
                }
            });
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // chain1 MintBridge
    it("Original[1] -> userMintLock  ==> Invalid parnters", async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1MintTokenRedeem.hash;
            await crossDelegateNotInit.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                web3.utils.toWei(userLockParamsTemp.value.toString()),
                userLockParamsTemp.shadowUserAccount,
                {from: userLockParamsTemp.origUserAccount}
            );

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Invalid parnters");
        }
    });

    it('Original[1] -> userMintLock  ==> Halted', async () => {
        let crossProxy;
        try {
            crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
            await crossProxy.setHalt(true, {from: owner});
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1MintTokenRedeem.hash;
            await crossApproach.chain1.instance.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                web3.utils.toWei(userLockParamsTemp.value.toString()),
                userLockParamsTemp.shadowUserAccount,
                {from: userLockParamsTemp.origUserAccount}
            );
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it("Original[1] -> Token1 -> userMintLock  ==> Token does not exist", async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1MintTokenRedeem.hash;

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // user mint lock
            await crossApproach.chain1.instance.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                InvalidTokenPairID,
                value,
                userLockParamsTemp.shadowUserAccount,
                {from: userLockParamsTemp.origUserAccount, value: crossApproach.chain1.origLockFee}
            );

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Token does not exist");
        }
    });

    it("Original[1] -> Token1 -> userMintLock  ==> Value is null", async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1MintTokenRedeem.hash;

            let value = web3.utils.toWei("0");
            // user mint lock
            await crossApproach.chain1.instance.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.shadowUserAccount,
                {from: userLockParamsTemp.origUserAccount, value: crossApproach.chain1.origLockFee}
            );

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Value is null");
        }
    });

    it('Shadow[2] -> Token1 -> smgMintLock  ==> Halted', async () => {
        let crossProxy;
        try {
            crossProxy = await CrossProxy.at(crossApproach.chain2.instance.address);
            await crossProxy.setHalt(true, {from: owner});
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[3];
            smgLockParamsTemp.shadowUserAccount = accounts[4];
            smgLockParamsTemp.xHash = xInfo.chain1MintTokenRedeem.hash;

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 2;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

            // storeman mint lock
            let smgMintLockReceipt = await crossApproach.chain2.instance.smgMintLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.shadowUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );
            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it('Original[1] -> Token1 -> smgMintRedeem ==> Smart contract is halted', async () => {
        crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
        await crossProxy.setHalt(true, {from: owner});
        try {
            await crossApproach.chain1.instance.smgMintRedeem(xInfo.chain1MintTokenRedeem.x);
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it('Original[1] -> Token1 -> userMintLock  ==> [revoke] success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1MintTokenRevoke.hash;
            userLockParamsTemp.tokenPairID = tokens.token1.tokenPairID;

            // let mintOracleValue = await crossApproach.chain1.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("Token1 -> mintOracleValue", mintOracleValue);

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("Token1 -> before MintQuotaValue", beforeMintQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            await tokens.token1.tokenCreator.mintToken(tokens.token1.name, tokens.token1.symbol,
                userLockParamsTemp.origUserAccount, value);
            // get token instance
            let tokenInstance = await getRC20TokenInstance(tokens.token1.origTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.origUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain1.instance.address, 0, {from: userLockParamsTemp.origUserAccount});
            await tokenInstance.approve(crossApproach.chain1.instance.address, value, {from: userLockParamsTemp.origUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.origUserAccount, crossApproach.chain1.instance.address);
            assert.equal(value, allowance.toString());

            // user mint lock
            let userMintLockReceipt = await crossApproach.chain1.instance.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.shadowUserAccount.toLowerCase(),
                {from: userLockParamsTemp.origUserAccount, value: crossApproach.chain1.origLockFee * 2}
            );

            // console.log("Token1 -> userMintLock receipt", userMintLockReceipt.logs);
            assert.checkWeb3Event(userMintLockReceipt, {
                event: 'UserMintLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain1.origLockFee,
                    userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Token1 -> smgMintLock  ==> [revoke] success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[3];
            smgLockParamsTemp.shadowUserAccount = accounts[4];
            smgLockParamsTemp.xHash = xInfo.chain1MintTokenRevoke.hash;

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            // console.log("Token1 -> before MintQuotaValue", beforeMintQuotaValue);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 2;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, web3.utils.toHex(value), smgLockParamsTemp.shadowUserAccount);

            // user mint lock
            let smgMintLockReceipt = await crossApproach.chain2.instance.smgMintLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.shadowUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
            assert.checkWeb3Event(smgMintLockReceipt, {
                event: 'SmgMintLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.shadowUserAccount
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Token1 -> userMintRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            let shadowUserAccount = accounts[4];
            await crossApproach.chain2.instance.userMintRedeem(xInfo.chain1MintTokenRevoke.x, {from: shadowUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Original[1] -> Token1 -> smgMintRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = 2 * htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            await crossApproach.chain1.instance.smgMintRedeem(xInfo.chain1MintTokenRevoke.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Shadow[2] -> Token1 -> smgMintRevoke ==> Smart contract is halted', async () => {
        crossProxy = await CrossProxy.at(crossApproach.chain2.instance.address);
        await crossProxy.setHalt(true, {from: owner});
        try {
            await crossApproach.chain2.instance.smgMintRevoke(xInfo.chain1MintTokenRevoke.hash, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it('Shadow[2] -> Token1 -> smgMintRevoke  ==> success', async () => {
        try {
            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);

            let smgMintRevokeReceipt = await crossApproach.chain2.instance.smgMintRevoke(xInfo.chain1MintTokenRevoke.hash, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgMintRevokeReceipt, {
                event: 'SmgMintRevokeLogger',
                args: {
                    xHash: xInfo.chain1MintTokenRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token1.tokenPairID
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
            let value = web3.utils.toWei(userLockParams.value.toString());
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain1MintTokenRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Token1 -> smgMintRevoke  ==> revoke twice, Status is not locked', async () => {
        try {
            await crossApproach.chain2.instance.smgMintRevoke(xInfo.chain1MintTokenRevoke.hash, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Original[1] -> Token1 -> userMintRevoke ==> Smart contract is halted', async () => {
        crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
        await crossProxy.setHalt(true, {from: owner});
        try {
            let origUserAccount = accounts[3];;
            await crossApproach.chain1.instance.userMintRevoke(xInfo.chain1MintTokenRevoke.hash, {from: origUserAccount, value: crossApproach.chain1.origRevokeFee});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it('Original[1] -> Token1 -> userMintRevoke  ==> success', async () => {
        try {
            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);

            let origUserAccount = accounts[3];
            let value = web3.utils.toWei(userLockParams.value.toString());
            let userMintRevokeReceipt = await crossApproach.chain1.instance.userMintRevoke(xInfo.chain1MintTokenRevoke.hash, {from: origUserAccount, value: crossApproach.chain1.origRevokeFee * 2});
            await tokens.token1.tokenCreator.burnToken(tokens.token1.name, tokens.token1.symbol,
                origUserAccount, value);

            assert.checkWeb3Event(userMintRevokeReceipt, {
                event: 'UserMintRevokeLogger',
                args: {
                    xHash: xInfo.chain1MintTokenRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID:tokens.token1.tokenPairID,
                    fee: crossApproach.chain1.origRevokeFee,
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain1MintTokenRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Token1 -> userMintRevoke  ==> revoke twice, Status is not locked', async () => {
        try {
            let origUserAccount = accounts[3];;
            await crossApproach.chain1.instance.userMintRevoke(xInfo.chain1MintTokenRevoke.hash, {from: origUserAccount, value: crossApproach.chain1.origRevokeFee * 2});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Original[1] -> Token1 -> userMintLock  ==> success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1MintTokenRedeem.hash;

            // let mintOracleValue = await crossApproach.chain1.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before MintQuotaValue", beforeMintQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            await tokens.token1.tokenCreator.mintToken(tokens.token1.name, tokens.token1.symbol,
                userLockParamsTemp.origUserAccount, value);
            // get token instance
            let tokenInstance = await getRC20TokenInstance(tokens.token1.origTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.origUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain1.instance.address, 0, {from: userLockParamsTemp.origUserAccount});
            await tokenInstance.approve(crossApproach.chain1.instance.address, value, {from: userLockParamsTemp.origUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.origUserAccount, crossApproach.chain1.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));
            // user mint lock
            let userMintLockReceipt = await crossApproach.chain1.instance.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.shadowUserAccount,
                {from: userLockParamsTemp.origUserAccount, value: crossApproach.chain1.origLockFee * 2}
            );
            // console.log("userMintLock receipt", userMintLockReceipt.logs);
            assert.checkWeb3Event(userMintLockReceipt, {
                event: 'UserMintLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain1.origLockFee,
                    userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
                }
            });
            // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Token1 -> userMintRevoke  ==> should wait lockedTime, not wait', async () => {
        try {
            let origUserAccount = accounts[3];;
            await crossApproach.chain1.instance.userMintRevoke(xInfo.chain1MintTokenRedeem.hash, {from: origUserAccount, value: crossApproach.chain1.origRevokeFee * 2});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Revoke is not permitted");
        }
    });

    it('Shadow[2] -> Token1 -> smgMintLock  ==> success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[3];
            smgLockParamsTemp.shadowUserAccount = accounts[4];
            smgLockParamsTemp.xHash = xInfo.chain1MintTokenRedeem.hash;

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 2;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

            // user mint lock
            let smgMintLockReceipt = await crossApproach.chain2.instance.smgMintLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.shadowUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
            assert.checkWeb3Event(smgMintLockReceipt, {
                event: 'SmgMintLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.shadowUserAccount
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Token1 -> smgMintRevoke  ==> should wait 2*lockedTime, not wait', async () => {
        try {
            await crossApproach.chain2.instance.smgMintRevoke(xInfo.chain1MintTokenRedeem.hash, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Revoke is not permitted");
        }
    });

    it('Shadow[2] -> Token1 -> userMintRedeem  ==> use wrong x', async () => {
        try {
            let shadowUserAccount = accounts[4];
            await crossApproach.chain2.instance.userMintRedeem(xInfo.wrong.x, {from: shadowUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Shadow[2] -> Token1 -> userMintRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain1MintTokenRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);

            let shadowUserAccount = accounts[4];
            let userMintRedeemReceipt = await crossApproach.chain2.instance.userMintRedeem(xInfo.chain1MintTokenRedeem.x, {from: shadowUserAccount});

            assert.checkWeb3Event(userMintRedeemReceipt, {
                event: 'UserMintRedeemLogger',
                args: {
                    x: xInfo.chain1MintTokenRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token1.tokenPairID
                }
            });

            let value = web3.utils.toWei(userLockParams.value.toString());
            let tokenInstance = await getRC20TokenInstance(tokens.token1.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(shadowUserAccount);
            assert.equal(value, balance.toString());

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Token1 -> userMintRedeem ==> redeem twice, Status is not locked', async () => {
        try {
            let shadowUserAccount = accounts[4];
            await crossApproach.chain2.instance.userMintRedeem(xInfo.chain1MintTokenRedeem.x, {from: shadowUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Original[1] -> Token1 -> smgMintRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain1MintTokenRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);

            let smgMintRedeemReceipt = await crossApproach.chain1.instance.smgMintRedeem(xInfo.chain1MintTokenRedeem.x, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgMintRedeemReceipt, {
                event: 'SmgMintRedeemLogger',
                args: {
                    x: xInfo.chain1MintTokenRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token1.tokenPairID,
                    fee: crossApproach.chain1.origLockFee,
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Token1 -> smgMintRedeem  ==> use wrong x', async () => {
        try {
            await crossApproach.chain1.instance.smgMintRedeem(xInfo.wrong.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Original[1] -> Token1 -> smgMintRedeem ==> redeem twice, Status is not locked', async () => {
        try {
            await crossApproach.chain1.instance.smgMintRedeem(xInfo.chain1MintTokenRedeem.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    // chain2 BurnBridge
    it('Shadow[2] -> Token1 -> userBurnLock  ==> [revoke] success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1BurnTokenRevoke.hash;

            // let mintOracleValue = await crossApproach.chain2.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("mintQuotaValue", mintQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // get token instance
            let tokenInstance = await getRC20TokenInstance(tokens.token1.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain2.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
            await tokenInstance.approve(crossApproach.chain2.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, crossApproach.chain2.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain2.instance.address));
            // user mint lock
            let userBurnLockReceipt = await crossApproach.chain2.instance.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount, value: crossApproach.chain2.shadowLockFee * 2}
            );

            // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
            assert.checkWeb3Event(userBurnLockReceipt, {
                event: 'UserBurnLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain2.shadowLockFee,
                    userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
                }
            });
            // console.log("after shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Token1 -> smgBurnLock  ==> [revoke] success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[3];
            smgLockParamsTemp.shadowUserAccount = accounts[4];
            smgLockParamsTemp.xHash = xInfo.chain1BurnTokenRevoke.hash;

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

            // user mint lock
            let smgBurnLockReceipt = await crossApproach.chain1.instance.smgBurnLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.origUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
            assert.checkWeb3Event(smgBurnLockReceipt, {
                event: 'SmgBurnLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.origUserAccount
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Token1 -> userBurnRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            let origUserAccount = accounts[4];
            await crossApproach.chain1.instance.userBurnRedeem(xInfo.chain1BurnTokenRevoke.x, {from: origUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Shadow[2] -> Token1 -> smgBurnRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = 2 * htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            await crossApproach.chain2.instance.smgBurnRedeem(xInfo.chain1BurnTokenRevoke.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Original[1] -> Token1 -> smgBurnRevoke ==> Smart contract is halted', async () => {
        crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
        await crossProxy.setHalt(true, {from: owner});
        try {
            await crossApproach.chain1.instance.smgMintRevoke(xInfo.chain1BurnTokenRevoke.hash, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it('Original[1] -> Token1 -> smgBurnRevoke  ==> success', async () => {
        try {
            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);

            let smgBurnRevokeReceipt = await crossApproach.chain1.instance.smgBurnRevoke(xInfo.chain1BurnTokenRevoke.hash, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgBurnRevokeReceipt, {
                event: 'SmgBurnRevokeLogger',
                args: {
                    xHash: xInfo.chain1BurnTokenRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token1.tokenPairID
                }
            });

            let value = web3.utils.toWei(userLockParams.value.toString());
            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain1BurnTokenRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Token1 -> smgBurnRevoke  ==> revoke twice, Status is not locked', async () => {
        try {
            await crossApproach.chain1.instance.smgBurnRevoke(xInfo.chain1BurnTokenRevoke.hash, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Shadow[2] -> Token1 -> userBurnRevoke ==> Smart contract is halted', async () => {
        crossProxy = await CrossProxy.at(crossApproach.chain2.instance.address);
        await crossProxy.setHalt(true, {from: owner});
        try {
            let shadowUserAccount = accounts[4];;
            await crossApproach.chain2.instance.userBurnRevoke(xInfo.chain1BurnTokenRevoke.hash, {from: shadowUserAccount, value: crossApproach.chain2.shadowRevokeFee * 2});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it('Shadow[2] -> Token1 -> userBurnRevoke  ==> success', async () => {
        try {
            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);

            let shadowUserAccount = accounts[4];;
            let userBurnRevokeReceipt = await crossApproach.chain2.instance.userBurnRevoke(xInfo.chain1BurnTokenRevoke.hash, {from: shadowUserAccount, value: crossApproach.chain2.shadowRevokeFee * 2});

            assert.checkWeb3Event(userBurnRevokeReceipt, {
                event: 'UserBurnRevokeLogger',
                args: {
                    xHash: xInfo.chain1BurnTokenRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token1.tokenPairID,
                    fee: crossApproach.chain2.shadowRevokeFee,
                }
            });

            let value = web3.utils.toWei(userLockParams.value.toString());
            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain1BurnTokenRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Token1 -> userBurnRevoke  ==> revoke twice, Status is not locked', async () => {
        try {
            let shadowUserAccount = accounts[4];;
            await crossApproach.chain2.instance.userBurnRevoke(xInfo.chain1BurnTokenRevoke.hash, {from: shadowUserAccount, value: crossApproach.chain2.shadowRevokeFee * 2});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it("Shadow[2] -> userBurnLock  ==> Invalid parnters", async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1BurnTokenRedeem.hash;
            await crossDelegateNotInit.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                web3.utils.toWei(userLockParamsTemp.value.toString()),
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount}
            );

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Invalid parnters");
        }
    });

    it('Shadow[2] -> userBurnLock  ==> Halted', async () => {
        let crossProxy;
        try {
            crossProxy = await CrossProxy.at(crossApproach.chain2.instance.address);
            await crossProxy.setHalt(true, {from: owner});
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1BurnTokenRedeem.hash;
            await crossApproach.chain2.instance.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                web3.utils.toWei(userLockParamsTemp.value.toString()),
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount}
            );

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it("Shadow[2] -> Token1 -> userBurnLock  ==> Token does not exist", async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1BurnTokenRedeem.hash;

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // user mint lock
            await crossApproach.chain2.instance.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                InvalidTokenPairID,
                web3.utils.toWei(userLockParamsTemp.value.toString()),
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount, value: crossApproach.chain2.shadowLockFee * 2}
            );
        } catch (err) {
            assert.include(err.toString(), "Token does not exist");
        }
    });

    it("Shadow[2] -> Token1 -> userBurnLock  ==> Value is null", async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1BurnTokenRedeem.hash;

            let value = web3.utils.toWei("0");
            // user mint lock
            await crossApproach.chain2.instance.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount, value: crossApproach.chain2.shadowLockFee * 2}
            );

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Value is null");
        }
    });

    it('Original[1] -> Token1 -> smgBurnLock  ==> Halted', async () => {
        let crossProxy;
        try {
            crossProxy = await CrossProxy.at(crossApproach.chain2.instance.address);
            await crossProxy.setHalt(true, {from: owner});
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[3];
            smgLockParamsTemp.shadowUserAccount = accounts[4];
            smgLockParamsTemp.xHash = xInfo.chain1BurnTokenRedeem.hash;

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

            // storeman mint lock
            let smgMintLockReceipt = await crossApproach.chain2.instance.smgBurnLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.shadowUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );
            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it('Shadow[2] -> Token1 -> smgBurnRedeem ==> Smart contract is halted', async () => {
        crossProxy = await CrossProxy.at(crossApproach.chain2.instance.address);
        await crossProxy.setHalt(true, {from: owner});
        try {
            await crossApproach.chain2.instance.smgBurnRedeem(xInfo.chain1BurnTokenRedeem.x);
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it('Shadow[2] -> Token1 -> userBurnLock  ==> success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain1BurnTokenRedeem.hash;

            // let mintOracleValue = await crossApproach.chain2.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // get token instance
            let tokenInstance = await getRC20TokenInstance(tokens.token1.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain2.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
            await tokenInstance.approve(crossApproach.chain2.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, crossApproach.chain2.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain2.instance.address));
            // user mint lock
            let userBurnLockReceipt = await crossApproach.chain2.instance.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount, value: crossApproach.chain2.shadowLockFee * 2}
            );

            // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
            // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));
            assert.checkWeb3Event(userBurnLockReceipt, {
                event: 'UserBurnLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain2.shadowLockFee,
                    userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Token1 -> userBurnRevoke  ==> should wait lockedTime, not wait', async () => {
        try {
            let shadowUserAccount = accounts[3];;
            await crossApproach.chain2.instance.userBurnRevoke(xInfo.chain1BurnTokenRedeem.hash, {from: shadowUserAccount, value: crossApproach.chain2.shadowRevokeFee * 2});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Revoke is not permitted");
        }
    });

    it('Original[1] -> Token1 -> smgBurnLock  ==> success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[3];
            smgLockParamsTemp.shadowUserAccount = accounts[4];
            smgLockParamsTemp.xHash = xInfo.chain1BurnTokenRedeem.hash;

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

            // user mint lock
            let smgBurnLockReceipt = await crossApproach.chain1.instance.smgBurnLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.origUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
            assert.checkWeb3Event(smgBurnLockReceipt, {
                event: 'SmgBurnLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.origUserAccount
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Token1 -> smgBurnRevoke  ==> should wait lockedTime, not wait', async () => {
        try {
            await crossApproach.chain1.instance.smgBurnRevoke(xInfo.chain1BurnTokenRedeem.hash, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Revoke is not permitted");
        }
    });

    it('Original[1] -> Token1 -> userBurnRedeem  ==> use wrong x', async () => {
        try {
            let origUserAccount = accounts[3];
            await crossApproach.chain1.instance.userBurnRedeem(xInfo.wrong.x, {from: origUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Original[1] -> Token1 -> userBurnRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain1BurnTokenRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);

            let origUserAccount = accounts[3];
            let userBurnRedeemReceipt = await crossApproach.chain1.instance.userBurnRedeem(xInfo.chain1BurnTokenRedeem.x, {from: origUserAccount});

            assert.checkWeb3Event(userBurnRedeemReceipt, {
                event: 'UserBurnRedeemLogger',
                args: {
                    x: xInfo.chain1BurnTokenRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token1.tokenPairID
                }
            });

            let value = web3.utils.toWei(userLockParams.value.toString());
            let tokenInstance = await getRC20TokenInstance(tokens.token1.origTokenAccount);
            let balance = await tokenInstance.balanceOf(origUserAccount);
            assert.equal(value, balance.toString());

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Token1 -> userBurnRedeem ==> redeem twice, Status is not locked', async () => {
        try {
            let origUserAccount = accounts[3];
            await crossApproach.chain1.instance.userBurnRedeem(xInfo.chain1BurnTokenRedeem.x, {from: origUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Shadow[2] -> Token1 -> smgBurnRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain1BurnTokenRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);

            let smgBurnRedeemReceipt = await crossApproach.chain2.instance.smgBurnRedeem(xInfo.chain1BurnTokenRedeem.x, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgBurnRedeemReceipt, {
                event: 'SmgBurnRedeemLogger',
                args: {
                    x: xInfo.chain1BurnTokenRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token1.tokenPairID,
                    fee: crossApproach.chain2.shadowLockFee,
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Token1 -> smgBurnRedeem  ==> use wrong x', async () => {
        try {
            await crossApproach.chain2.instance.smgBurnRedeem(xInfo.wrong.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Shadow[2] -> Token1 -> smgBurnRedeem ==> redeem twice, Status is not locked', async () => {
        try {
            await crossApproach.chain2.instance.smgBurnRedeem(xInfo.wrong.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    // chain2 MintBridge
    it('Original[2] -> Token2 -> userMintLock  ==> [revoke] success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain2MintTokenRevoke.hash;
            userLockParamsTemp.tokenPairID = tokens.token2.tokenPairID;

            // let mintOracleValue = await crossApproach.chain2.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before MintQuotaValue", beforeMintQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            await tokens.token2.tokenCreator.mintToken(tokens.token2.name, tokens.token2.symbol,
                userLockParamsTemp.origUserAccount, value);
            // get token instance
            let tokenInstance = await getRC20TokenInstance(tokens.token2.origTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.origUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain2.instance.address, 0, {from: userLockParamsTemp.origUserAccount});
            await tokenInstance.approve(crossApproach.chain2.instance.address, value, {from: userLockParamsTemp.origUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.origUserAccount, crossApproach.chain2.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain2.instance.address));
            // user mint lock
            let userMintLockReceipt = await crossApproach.chain2.instance.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.shadowUserAccount,
                {from: userLockParamsTemp.origUserAccount, value: crossApproach.chain2.origLockFee * 2}
            );

            // console.log("userMintLock receipt", userMintLockReceipt.logs);
            assert.checkWeb3Event(userMintLockReceipt, {
                event: 'UserMintLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain2.origLockFee,
                    userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
                }
            });
            // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain2.instance.address));

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Token2 -> smgMintLock  ==> [revoke] success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[3];
            smgLockParamsTemp.shadowUserAccount = accounts[4];
            smgLockParamsTemp.xHash = xInfo.chain2MintTokenRevoke.hash;
            smgLockParamsTemp.tokenPairID = tokens.token2.tokenPairID;

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

            // user mint lock
            let smgMintLockReceipt = await crossApproach.chain1.instance.smgMintLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.shadowUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
            assert.checkWeb3Event(smgMintLockReceipt, {
                event: 'SmgMintLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.shadowUserAccount
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Token2 -> userMintRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            let shadowUserAccount = accounts[4];
            await crossApproach.chain1.instance.userMintRedeem(xInfo.chain2MintTokenRevoke.x, {from: shadowUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Original[2] -> Token2 -> smgMintRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = 2 * htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            await crossApproach.chain2.instance.smgMintRedeem(xInfo.chain2MintTokenRevoke.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Shadow[1] -> Token2 -> smgMintRevoke  ==> success', async () => {
        try {
            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);

            let smgMintRevokeReceipt = await crossApproach.chain1.instance.smgMintRevoke(xInfo.chain2MintTokenRevoke.hash, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgMintRevokeReceipt, {
                event: 'SmgMintRevokeLogger',
                args: {
                    xHash: xInfo.chain2MintTokenRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token2.tokenPairID
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
            let value = web3.utils.toWei(smgLockParams.value.toString());
            assert.equal(value === difference, true);


            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain2MintTokenRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Token2 -> userMintRevoke  ==> success', async () => {
        try {
            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);

            let origUserAccount = accounts[3];
            let value = web3.utils.toWei(userLockParams.value.toString());
            let userMintRevokeReceipt = await crossApproach.chain2.instance.userMintRevoke(xInfo.chain2MintTokenRevoke.hash, {from: origUserAccount, value: crossApproach.chain2.origRevokeFee * 2});
            await tokens.token2.tokenCreator.burnToken(tokens.token2.name, tokens.token2.symbol,
                origUserAccount, value);

            assert.checkWeb3Event(userMintRevokeReceipt, {
                event: 'UserMintRevokeLogger',
                args: {
                    xHash: xInfo.chain2MintTokenRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token2.tokenPairID,
                    fee: crossApproach.chain2.origRevokeFee,
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain2MintTokenRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Token2 -> userMintLock  ==> success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain2MintTokenRedeem.hash;
            userLockParamsTemp.tokenPairID = tokens.token2.tokenPairID;

            // let mintOracleValue = await crossApproach.chain2.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before MintQuotaValue", beforeMintQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            await tokens.token2.tokenCreator.mintToken(tokens.token2.name, tokens.token2.symbol,
                userLockParamsTemp.origUserAccount, value);
            // get token instance
            let tokenInstance = await getRC20TokenInstance(tokens.token2.origTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.origUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain2.instance.address, 0, {from: userLockParamsTemp.origUserAccount});
            await tokenInstance.approve(crossApproach.chain2.instance.address, value, {from: userLockParamsTemp.origUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.origUserAccount, crossApproach.chain2.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain2.instance.address));
            // user mint lock
            let userMintLockReceipt = await crossApproach.chain2.instance.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.shadowUserAccount,
                {from: userLockParamsTemp.origUserAccount, value: crossApproach.chain2.origLockFee * 2}
            );
            // console.log("userMintLock receipt", userMintLockReceipt.logs);
            assert.checkWeb3Event(userMintLockReceipt, {
                event: 'UserMintLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain2.origLockFee,
                    userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
                }
            });            // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain2.instance.address));

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Token2 -> smgMintLock  ==> success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[3];
            smgLockParamsTemp.shadowUserAccount = accounts[4];
            smgLockParamsTemp.xHash = xInfo.chain2MintTokenRedeem.hash;
            smgLockParamsTemp.tokenPairID = tokens.token2.tokenPairID;

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

            // user mint lock
            let smgMintLockReceipt = await crossApproach.chain1.instance.smgMintLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.shadowUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
            assert.checkWeb3Event(smgMintLockReceipt, {
                event: 'SmgMintLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.shadowUserAccount
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Token2 -> userMintRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain2MintTokenRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);

            let shadowUserAccount = accounts[4];
            let userMintRedeemReceipt = await crossApproach.chain1.instance.userMintRedeem(xInfo.chain2MintTokenRedeem.x, {from: shadowUserAccount});

            assert.checkWeb3Event(userMintRedeemReceipt, {
                event: 'UserMintRedeemLogger',
                args: {
                    x: xInfo.chain2MintTokenRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token2.tokenPairID
                }
            });

            let value = web3.utils.toWei(userLockParams.value.toString());
            let tokenInstance = await getRC20TokenInstance(tokens.token2.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(shadowUserAccount);
            assert.equal(value, balance.toString());

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Token2 -> smgMintRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain2MintTokenRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);

            let smgMintRedeemReceipt = await crossApproach.chain2.instance.smgMintRedeem(xInfo.chain2MintTokenRedeem.x, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgMintRedeemReceipt, {
                event: 'SmgMintRedeemLogger',
                args: {
                    x: xInfo.chain2MintTokenRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token2.tokenPairID,
                    fee: crossApproach.chain2.origLockFee,
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    // chain1 BurnBridge
    it('Shadow[1] -> Token2 -> userBurnLock  ==> [revoke] success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain2BurnTokenRevoke.hash;
            userLockParamsTemp.tokenPairID = tokens.token2.tokenPairID;

            // let mintOracleValue = await crossApproach.chain1.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // get token instance
            let tokenInstance = await getRC20TokenInstance(tokens.token2.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain1.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
            await tokenInstance.approve(crossApproach.chain1.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, crossApproach.chain1.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));
            // user mint lock
            let userBurnLockReceipt = await crossApproach.chain1.instance.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount, value: crossApproach.chain1.shadowLockFee * 2}
            );

            // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
            assert.checkWeb3Event(userBurnLockReceipt, {
                event: 'UserBurnLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain1.shadowLockFee,
                    userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
                }
            });
            // console.log("after shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Token2 -> smgBurnLock  ==> [revoke] success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[3];
            smgLockParamsTemp.shadowUserAccount = accounts[4];
            smgLockParamsTemp.xHash = xInfo.chain2BurnTokenRevoke.hash;
            smgLockParamsTemp.tokenPairID = tokens.token2.tokenPairID;

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 2;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

            // user mint lock
            let smgBurnLockReceipt = await crossApproach.chain2.instance.smgBurnLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.origUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
            assert.checkWeb3Event(smgBurnLockReceipt, {
                event: 'SmgBurnLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.origUserAccount
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Token2 -> userBurnRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            let origUserAccount = accounts[4];
            await crossApproach.chain2.instance.userBurnRedeem(xInfo.chain2BurnTokenRevoke.x, {from: origUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Shadow[1] -> Token2 -> smgBurnRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = 2 * htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            await crossApproach.chain1.instance.smgBurnRedeem(xInfo.chain2BurnTokenRevoke.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Original[2] -> Token2 -> smgBurnRevoke  ==> success', async () => {
        try {
            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);

            let smgBurnRevokeReceipt = await crossApproach.chain2.instance.smgBurnRevoke(xInfo.chain2BurnTokenRevoke.hash, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgBurnRevokeReceipt, {
                event: 'SmgBurnRevokeLogger',
                args: {
                    xHash: xInfo.chain2BurnTokenRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token2.tokenPairID
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
            let value = web3.utils.toWei(smgLockParams.value.toString());
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain2BurnTokenRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Token2 -> userBurnRevoke  ==> success', async () => {
        try {
            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);

            let shadowUserAccount = accounts[4];;
            let userBurnRevokeReceipt = await crossApproach.chain1.instance.userBurnRevoke(xInfo.chain2BurnTokenRevoke.hash, {from: shadowUserAccount, value: crossApproach.chain1.shadowRevokeFee * 2});

            assert.checkWeb3Event(userBurnRevokeReceipt, {
                event: 'UserBurnRevokeLogger',
                args: {
                    xHash: xInfo.chain2BurnTokenRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token2.tokenPairID,
                    fee: crossApproach.chain1.shadowRevokeFee,
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
            let value = web3.utils.toWei(userLockParams.value.toString());
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain2BurnTokenRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Token2 -> userBurnLock  ==> success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[3];
            userLockParamsTemp.shadowUserAccount = accounts[4];
            userLockParamsTemp.xHash = xInfo.chain2BurnTokenRedeem.hash;
            userLockParamsTemp.tokenPairID = tokens.token2.tokenPairID;

            // let mintOracleValue = await crossApproach.chain1.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // get token instance
            let tokenInstance = await getRC20TokenInstance(tokens.token2.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain1.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
            await tokenInstance.approve(crossApproach.chain1.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, crossApproach.chain1.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));
            // user mint lock
            let userBurnLockReceipt = await crossApproach.chain1.instance.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount, value: crossApproach.chain1.shadowLockFee * 2}
            );

            // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
            assert.checkWeb3Event(userBurnLockReceipt, {
                event: 'UserBurnLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain1.shadowLockFee,
                    userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
                }
            });
            // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Token2 -> smgBurnLock  ==> success', async () => {
        try {
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[3];
            smgLockParamsTemp.shadowUserAccount = accounts[4];
            smgLockParamsTemp.xHash = xInfo.chain2BurnTokenRedeem.hash;
            smgLockParamsTemp.tokenPairID = tokens.token2.tokenPairID;

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 2;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

            // user mint lock
            let smgBurnLockReceipt = await crossApproach.chain2.instance.smgBurnLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.origUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
            assert.checkWeb3Event(smgBurnLockReceipt, {
                event: 'SmgBurnLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.origUserAccount
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Token2 -> userBurnRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain2BurnTokenRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);

            let origUserAccount = accounts[3];
            let userBurnRedeemReceipt = await crossApproach.chain2.instance.userBurnRedeem(xInfo.chain2BurnTokenRedeem.x, {from: origUserAccount});

            assert.checkWeb3Event(userBurnRedeemReceipt, {
                event: 'UserBurnRedeemLogger',
                args: {
                    x: xInfo.chain2BurnTokenRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token2.tokenPairID
                }
            });

            let value = web3.utils.toWei(userLockParams.value.toString());
            let tokenInstance = await getRC20TokenInstance(tokens.token2.origTokenAccount);
            let balance = await tokenInstance.balanceOf(origUserAccount);
            assert.equal(value, balance.toString());

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Token2 -> smgBurnRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain2BurnTokenRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);

            let smgBurnRedeemReceipt = await crossApproach.chain1.instance.smgBurnRedeem(xInfo.chain2BurnTokenRedeem.x, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgBurnRedeemReceipt, {
                event: 'SmgBurnRedeemLogger',
                args: {
                    x: xInfo.chain2BurnTokenRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: tokens.token2.tokenPairID,
                    fee: crossApproach.chain1.shadowLockFee,
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(tokens.token2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    // chain1 MintBridge
    it('Original[1] -> Coin1 -> userMintLock  ==> [revoke] success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[5];
            userLockParamsTemp.shadowUserAccount = accounts[6];
            userLockParamsTemp.xHash = xInfo.chain1MintCoinRevoke.hash;
            userLockParamsTemp.tokenPairID = coins.coin1.tokenPairID;

            // let mintOracleValue = await crossApproach.chain1.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("mintQuotaValue", mintQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // console.log("lock", value);
            let totalValue = new BN(value).add(new BN(crossApproach.chain1.origLockFee * 2)).toString();
            // console.log("lockFee", crossApproach.chain1.origLockFee);
            // console.log("totalLock", totalValue);

            // user mint lock
            let userMintLockReceipt = await crossApproach.chain1.instance.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.shadowUserAccount,
                {from: userLockParamsTemp.origUserAccount, value: totalValue}
            );

            // console.log("userMintLock receipt", userMintLockReceipt.logs);
            assert.checkWeb3Event(userMintLockReceipt, {
                event: 'UserMintLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain1.origLockFee,
                    userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Coin1 -> smgMintLock  ==> [revoke] success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[5];
            smgLockParamsTemp.shadowUserAccount = accounts[6];
            smgLockParamsTemp.xHash = xInfo.chain1MintCoinRevoke.hash;
            smgLockParamsTemp.tokenPairID = coins.coin1.tokenPairID;

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 2;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

            // user mint lock
            let smgMintLockReceipt = await crossApproach.chain2.instance.smgMintLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.shadowUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
            assert.checkWeb3Event(smgMintLockReceipt, {
                event: 'SmgMintLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.shadowUserAccount
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Coin1 -> userMintRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            let shadowUserAccount = accounts[6];
            await crossApproach.chain2.instance.userMintRedeem(xInfo.chain1MintCoinRevoke.x, {from: shadowUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Original[1] -> Coin1 -> smgMintRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = 2 * htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            await crossApproach.chain1.instance.smgMintRedeem(xInfo.chain1MintCoinRevoke.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Shadow[2] -> Coin1 -> smgMintRevoke  ==> success', async () => {
        try {
            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);

            let smgMintRevokeReceipt = await crossApproach.chain2.instance.smgMintRevoke(xInfo.chain1MintCoinRevoke.hash, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgMintRevokeReceipt, {
                event: 'SmgMintRevokeLogger',
                args: {
                    xHash: xInfo.chain1MintCoinRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin1.tokenPairID
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
            let value = web3.utils.toWei(userLockParams.value.toString());
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain1MintCoinRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Coin1 -> userMintRevoke  ==> success', async () => {
        try {
            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);

            let origUserAccount = accounts[5];
            let value = web3.utils.toWei(userLockParams.value.toString());
            let balance1 = await getBalance(origUserAccount);
            let userMintRevokeReceipt = await crossApproach.chain1.instance.userMintRevoke(xInfo.chain1MintCoinRevoke.hash, {from: origUserAccount, value: crossApproach.chain2.origRevokeFee * 2});
            let balance2 = await getBalance(origUserAccount);
            assert.equal(value >= balance2 - balance1, true);

            assert.checkWeb3Event(userMintRevokeReceipt, {
                event: 'UserMintRevokeLogger',
                args: {
                    xHash: xInfo.chain1MintCoinRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin1.tokenPairID,
                    fee: crossApproach.chain1.origRevokeFee,
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain1MintCoinRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Coin1 -> userMintLock  ==> success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[5];
            userLockParamsTemp.shadowUserAccount = accounts[6];
            userLockParamsTemp.xHash = xInfo.chain1MintCoinRedeem.hash;
            userLockParamsTemp.tokenPairID = coins.coin1.tokenPairID;

            // let mintOracleValue = await crossApproach.chain1.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before MintQuotaValue", beforeMintQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            let totalValue = new BN(value).add(new BN(crossApproach.chain1.origLockFee * 2)).toString();

            // user mint lock
            let userMintLockReceipt = await crossApproach.chain1.instance.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.shadowUserAccount,
                {from: userLockParamsTemp.origUserAccount, value: totalValue}
            );
            // console.log("userMintLock receipt", userMintLockReceipt.logs);
            assert.checkWeb3Event(userMintLockReceipt, {
                event: 'UserMintLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain1.origLockFee,
                    userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
                }
            });
            // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Coin1 -> smgMintLock  ==> success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[5];
            smgLockParamsTemp.shadowUserAccount = accounts[6];
            smgLockParamsTemp.xHash = xInfo.chain1MintCoinRedeem.hash;
            smgLockParamsTemp.tokenPairID = coins.coin1.tokenPairID;

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 2;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

            // user mint lock
            let smgMintLockReceipt = await crossApproach.chain2.instance.smgMintLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.shadowUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
            assert.checkWeb3Event(smgMintLockReceipt, {
                event: 'SmgMintLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.shadowUserAccount
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Coin1 -> userMintRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain1MintCoinRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);

            let shadowUserAccount = accounts[6];
            let userMintRedeemReceipt = await crossApproach.chain2.instance.userMintRedeem(xInfo.chain1MintCoinRedeem.x, {from: shadowUserAccount});

            assert.checkWeb3Event(userMintRedeemReceipt, {
                event: 'UserMintRedeemLogger',
                args: {
                    x: xInfo.chain1MintCoinRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin1.tokenPairID
                }
            });

            let value = web3.utils.toWei(userLockParams.value.toString());
            let tokenInstance = await getRC20TokenInstance(coins.coin1.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(shadowUserAccount);
            assert.equal(value, balance.toString());

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getSmgMintQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Coin1 -> smgMintRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain1MintCoinRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);

            let smgMintRedeemReceipt = await crossApproach.chain1.instance.smgMintRedeem(xInfo.chain1MintCoinRedeem.x, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgMintRedeemReceipt, {
                event: 'SmgMintRedeemLogger',
                args: {
                    x: xInfo.chain1MintCoinRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin1.tokenPairID,
                    fee: crossApproach.chain1.origLockFee,
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    // chain2 BurnBridge
    it('Shadow[2] -> Coin1 -> userBurnLock  ==> [revoke] success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[5];
            userLockParamsTemp.shadowUserAccount = accounts[6];
            userLockParamsTemp.xHash = xInfo.chain1BurnCoinRevoke.hash;
            userLockParamsTemp.tokenPairID = coins.coin1.tokenPairID;

            // let mintOracleValue = await crossApproach.chain2.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // get token instance
            let tokenInstance = await getRC20TokenInstance(coins.coin1.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain2.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
            await tokenInstance.approve(crossApproach.chain2.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, crossApproach.chain2.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain2.instance.address));
            // user mint lock
            let userBurnLockReceipt = await crossApproach.chain2.instance.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount, value: crossApproach.chain2.shadowLockFee * 2}
            );

            // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
            assert.checkWeb3Event(userBurnLockReceipt, {
                event: 'UserBurnLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain2.shadowLockFee,
                    userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
                }
            });
            // console.log("after shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain2.instance.address));

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Coin1 -> smgBurnLock  ==> [revoke] success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[5];
            smgLockParamsTemp.shadowUserAccount = accounts[6];
            smgLockParamsTemp.xHash = xInfo.chain1BurnCoinRevoke.hash;
            smgLockParamsTemp.tokenPairID = coins.coin1.tokenPairID;

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

            // user mint lock
            let smgBurnLockReceipt = await crossApproach.chain1.instance.smgBurnLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.origUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
            assert.checkWeb3Event(smgBurnLockReceipt, {
                event: 'SmgBurnLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.origUserAccount
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Coin1 -> userBurnRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            let origUserAccount = accounts[6];
            await crossApproach.chain1.instance.userBurnRedeem(xInfo.chain1BurnCoinRevoke.x, {from: origUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Shadow[2] -> Coin1 -> smgBurnRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = 2 * htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            await crossApproach.chain2.instance.smgBurnRedeem(xInfo.chain1BurnCoinRevoke.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Original[1] -> Coin1 -> smgBurnRevoke  ==> success', async () => {
        try {
            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);

            let smgBurnRevokeReceipt = await crossApproach.chain1.instance.smgBurnRevoke(xInfo.chain1BurnCoinRevoke.hash, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgBurnRevokeReceipt, {
                event: 'SmgBurnRevokeLogger',
                args: {
                    xHash: xInfo.chain1BurnCoinRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin1.tokenPairID
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
            let value = web3.utils.toWei(smgLockParams.value.toString());
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain1BurnCoinRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Coin1 -> userBurnRevoke  ==> success', async () => {
        try {
            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);

            let shadowUserAccount = accounts[6];;
            let userBurnRevokeReceipt = await crossApproach.chain2.instance.userBurnRevoke(xInfo.chain1BurnCoinRevoke.hash, {from: shadowUserAccount, value: crossApproach.chain2.shadowRevokeFee * 2});

            assert.checkWeb3Event(userBurnRevokeReceipt, {
                event: 'UserBurnRevokeLogger',
                args: {
                    xHash: xInfo.chain1BurnCoinRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin1.tokenPairID,
                    fee: crossApproach.chain2.shadowRevokeFee,
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
            let value = web3.utils.toWei(userLockParams.value.toString());
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain1BurnCoinRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Coin1 -> userBurnLock  ==> success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[5];
            userLockParamsTemp.shadowUserAccount = accounts[6];
            userLockParamsTemp.xHash = xInfo.chain1BurnCoinRedeem.hash;
            userLockParamsTemp.tokenPairID = coins.coin1.tokenPairID;

            // let mintOracleValue = await crossApproach.chain2.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // get token instance
            let tokenInstance = await getRC20TokenInstance(coins.coin1.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain2.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
            await tokenInstance.approve(crossApproach.chain2.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, crossApproach.chain2.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain2.instance.address));
            // user mint lock
            let userBurnLockReceipt = await crossApproach.chain2.instance.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount, value: crossApproach.chain2.shadowLockFee * 2}
            );
            // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
            assert.checkWeb3Event(userBurnLockReceipt, {
                event: 'UserBurnLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain2.shadowLockFee,
                    userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
                }
            });
            // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain2.instance.address));

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Coin1 -> smgBurnLock  ==> success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[5];
            smgLockParamsTemp.shadowUserAccount = accounts[6];
            smgLockParamsTemp.xHash = xInfo.chain1BurnCoinRedeem.hash;
            smgLockParamsTemp.tokenPairID = coins.coin1.tokenPairID;

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

            // user mint lock
            let smgBurnLockReceipt = await crossApproach.chain1.instance.smgBurnLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.origUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
            assert.checkWeb3Event(smgBurnLockReceipt, {
                event: 'SmgBurnLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.origUserAccount
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[1] -> Coin1 -> userBurnRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain1BurnCoinRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);

            let origUserAccount = accounts[5];
            let userBurnRedeemReceipt = await crossApproach.chain1.instance.userBurnRedeem(xInfo.chain1BurnCoinRedeem.x, {from: origUserAccount});
            // let balance2 = await getBalance(origUserAccount);

            assert.checkWeb3Event(userBurnRedeemReceipt, {
                event: 'UserBurnRedeemLogger',
                args: {
                    x: xInfo.chain1BurnCoinRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin1.tokenPairID
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getSmgBurnQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[2] -> Coin1 -> smgBurnRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain1BurnCoinRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);

            let smgBurnRedeemReceipt = await crossApproach.chain2.instance.smgBurnRedeem(xInfo.chain1BurnCoinRedeem.x, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgBurnRedeemReceipt, {
                event: 'SmgBurnRedeemLogger',
                args: {
                    x: xInfo.chain1BurnCoinRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin1.tokenPairID,
                    fee: crossApproach.chain2.shadowLockFee,
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getUserBurnQuota(coins.coin1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    // chain2 MintBridge
    it('Original[2] -> Coin2 -> userMintLock  ==> [revoke] success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[5];
            userLockParamsTemp.shadowUserAccount = accounts[6];
            userLockParamsTemp.xHash = xInfo.chain2MintCoinRevoke.hash;
            userLockParamsTemp.tokenPairID = coins.coin2.tokenPairID;

            // let mintOracleValue = await crossApproach.chain2.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before MintQuotaValue", beforeMintQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // console.log("lock", value);
            let totalValue = new BN(value).add(new BN(crossApproach.chain2.origLockFee * 2)).toString();
            // console.log("lockFee", crossApproach.chain2.origLockFee);
            // console.log("totalLock", totalValue);

            // user mint lock
            let userMintLockReceipt = await crossApproach.chain2.instance.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.shadowUserAccount,
                {from: userLockParamsTemp.origUserAccount, value: totalValue}
            );

            // console.log("userMintLock receipt", userMintLockReceipt.logs);
            assert.checkWeb3Event(userMintLockReceipt, {
                event: 'UserMintLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain2.origLockFee,
                    userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Coin2 -> smgMintLock  ==> [revoke] success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[5];
            smgLockParamsTemp.shadowUserAccount = accounts[6];
            smgLockParamsTemp.xHash = xInfo.chain2MintCoinRevoke.hash;
            smgLockParamsTemp.tokenPairID = coins.coin2.tokenPairID;

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

            // user mint lock
            let smgMintLockReceipt = await crossApproach.chain1.instance.smgMintLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.shadowUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
            assert.checkWeb3Event(smgMintLockReceipt, {
                event: 'SmgMintLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.shadowUserAccount
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Coin2 -> userMintRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            let shadowUserAccount = accounts[6];
            await crossApproach.chain1.instance.userMintRedeem(xInfo.chain2MintCoinRevoke.x, {from: shadowUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Original[2] -> Coin2 -> smgMintRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = 2 * htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            let smgMintRedeemReceipt = await crossApproach.chain2.instance.smgMintRedeem(xInfo.chain2MintCoinRevoke.x, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgMintRedeemReceipt, {
                event: 'SmgMintRedeemLogger',
                args: {
                    x: xInfo.chain2MintCoinRevoke.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin2.tokenPairID,
                    fee: crossApproach.chain2.origLockFee,
                }
            });
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Shadow[1] -> Coin2 -> smgMintRevoke  ==> success', async () => {
        try {
            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);

            let smgMintRevokeReceipt = await crossApproach.chain1.instance.smgMintRevoke(xInfo.chain2MintCoinRevoke.hash, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgMintRevokeReceipt, {
                event: 'SmgMintRevokeLogger',
                args: {
                    xHash: xInfo.chain2MintCoinRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin2.tokenPairID
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
            let value = web3.utils.toWei(smgLockParams.value.toString());
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain2MintCoinRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Coin2 -> userMintRevoke  ==> success', async () => {
        try {
            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);

            let origUserAccount = accounts[5];
            let value = web3.utils.toWei(userLockParams.value.toString());
            let balance1 = await getBalance(origUserAccount);
            let userMintRevokeReceipt = await crossApproach.chain2.instance.userMintRevoke(xInfo.chain2MintCoinRevoke.hash, {from: origUserAccount, value: crossApproach.chain2.origRevokeFee * 2});
            let balance2 = await getBalance(origUserAccount);
            assert.equal(value >= balance2 - balance1, true);

            assert.checkWeb3Event(userMintRevokeReceipt, {
                event: 'UserMintRevokeLogger',
                args: {
                    xHash: xInfo.chain2MintCoinRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin2.tokenPairID,
                    fee: crossApproach.chain2.origRevokeFee,
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain2MintCoinRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Coin2 -> userMintLock  ==> success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[5];
            userLockParamsTemp.shadowUserAccount = accounts[6];
            userLockParamsTemp.xHash = xInfo.chain2MintCoinRedeem.hash;
            userLockParamsTemp.tokenPairID = coins.coin2.tokenPairID;

            // let mintOracleValue = await crossApproach.chain2.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before MintQuotaValue", beforeMintQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            let totalValue = new BN(value).add(new BN(crossApproach.chain2.origLockFee * 2)).toString();

            // user mint lock
            let userMintLockReceipt = await crossApproach.chain2.instance.userMintLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.shadowUserAccount,
                {from: userLockParamsTemp.origUserAccount, value: totalValue}
            );

            // console.log("userMintLock receipt", userMintLockReceipt.logs);
            assert.checkWeb3Event(userMintLockReceipt, {
                event: 'UserMintLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain2.origLockFee,
                    userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
                }
            });
            // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain2.instance.address));

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Coin2 -> smgMintLock  ==> success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[5];
            smgLockParamsTemp.shadowUserAccount = accounts[6];
            smgLockParamsTemp.xHash = xInfo.chain2MintCoinRedeem.hash;
            smgLockParamsTemp.tokenPairID = coins.coin2.tokenPairID;

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

            // user mint lock
            let smgMintLockReceipt = await crossApproach.chain1.instance.smgMintLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.shadowUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
            assert.checkWeb3Event(smgMintLockReceipt, {
                event: 'SmgMintLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.shadowUserAccount
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Coin2 -> userMintRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain2MintCoinRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);

            let shadowUserAccount = accounts[6];
            let userMintRedeemReceipt = await crossApproach.chain1.instance.userMintRedeem(xInfo.chain2MintCoinRedeem.x, {from: shadowUserAccount});

            assert.checkWeb3Event(userMintRedeemReceipt, {
                event: 'UserMintRedeemLogger',
                args: {
                    x: xInfo.chain2MintCoinRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin2.tokenPairID
                }
            });

            let value = web3.utils.toWei(userLockParams.value.toString());
            let tokenInstance = await getRC20TokenInstance(coins.coin2.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(shadowUserAccount);
            assert.equal(value, balance.toString());

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Coin2 -> smgMintRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain2MintCoinRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);

            let smgMintRedeemReceipt = await crossApproach.chain2.instance.smgMintRedeem(xInfo.chain2MintCoinRedeem.x, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgMintRedeemReceipt, {
                event: 'SmgMintRedeemLogger',
                args: {
                    x: xInfo.chain2MintCoinRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin2.tokenPairID,
                    fee: crossApproach.chain2.origLockFee,
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    // chain1 BurnBridge
    it('Shadow[1] -> Coin2 -> userBurnLock  ==> [revoke] success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[5];
            userLockParamsTemp.shadowUserAccount = accounts[6];
            userLockParamsTemp.xHash = xInfo.chain2BurnCoinRevoke.hash;
            userLockParamsTemp.tokenPairID = coins.coin2.tokenPairID;

            // let mintOracleValue = await crossApproach.chain1.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // get token instance
            let tokenInstance = await getRC20TokenInstance(coins.coin2.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain1.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
            await tokenInstance.approve(crossApproach.chain1.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, crossApproach.chain1.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));
            // user mint lock
            let userBurnLockReceipt = await crossApproach.chain1.instance.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount, value: crossApproach.chain1.shadowLockFee * 2}
            );

            // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
            assert.checkWeb3Event(userBurnLockReceipt, {
                event: 'UserBurnLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain1.shadowLockFee,
                    userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
                }
            });
            // console.log("after shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Coin2 -> smgBurnLock  ==> [revoke] success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[5];
            smgLockParamsTemp.shadowUserAccount = accounts[6];
            smgLockParamsTemp.xHash = xInfo.chain2BurnCoinRevoke.hash;
            smgLockParamsTemp.tokenPairID = coins.coin2.tokenPairID;

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 2;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

            // user mint lock
            let smgBurnLockReceipt = await crossApproach.chain2.instance.smgBurnLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.origUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
            assert.checkWeb3Event(smgBurnLockReceipt, {
                event: 'SmgBurnLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.origUserAccount
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Coin2 -> userBurnRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            let origUserAccount = accounts[6];
            await crossApproach.chain2.instance.userBurnRedeem(xInfo.chain2BurnCoinRevoke.x, {from: origUserAccount});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Shadow[1] -> Coin2 -> smgBurnRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = 2 * htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            await crossApproach.chain1.instance.smgBurnRedeem(xInfo.chain2BurnCoinRevoke.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Original[2] -> Coin2 -> smgBurnRevoke  ==> success', async () => {
        try {
            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);

            let smgBurnRevokeReceipt = await crossApproach.chain2.instance.smgBurnRevoke(xInfo.chain2BurnCoinRevoke.hash, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgBurnRevokeReceipt, {
                event: 'SmgBurnRevokeLogger',
                args: {
                    xHash: xInfo.chain2BurnCoinRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin2.tokenPairID
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
            let value = web3.utils.toWei(smgLockParams.value.toString());
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain2BurnCoinRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Coin2 -> userBurnRevoke  ==> success', async () => {
        try {
            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);

            let shadowUserAccount = accounts[6];;
            let userBurnRevokeReceipt = await crossApproach.chain1.instance.userBurnRevoke(xInfo.chain2BurnCoinRevoke.hash, {from: shadowUserAccount, value: crossApproach.chain1.shadowRevokeFee * 2});

            assert.checkWeb3Event(userBurnRevokeReceipt, {
                event: 'UserBurnRevokeLogger',
                args: {
                    xHash: xInfo.chain2BurnCoinRevoke.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin2.tokenPairID,
                    fee: crossApproach.chain1.shadowRevokeFee,
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
            let value = web3.utils.toWei(userLockParams.value.toString());
            assert.equal(value === difference, true);

            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain2BurnCoinRevoke.hash);
            assert.equal(leftTime.toNumber() === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Coin2 -> userBurnLock  ==> success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[5];
            userLockParamsTemp.shadowUserAccount = accounts[6];
            userLockParamsTemp.xHash = xInfo.chain2BurnCoinRedeem.hash;
            userLockParamsTemp.tokenPairID = coins.coin2.tokenPairID;

            // let mintOracleValue = await crossApproach.chain1.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

            let value = web3.utils.toWei(userLockParamsTemp.value.toString());
            // get token instance
            let tokenInstance = await getRC20TokenInstance(coins.coin2.shadowTokenAccount);
            let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain1.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
            await tokenInstance.approve(crossApproach.chain1.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
            let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, crossApproach.chain1.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));
            // user mint lock
            let userBurnLockReceipt = await crossApproach.chain1.instance.userBurnLock(
                userLockParamsTemp.xHash,
                userLockParamsTemp.smgID,
                userLockParamsTemp.tokenPairID,
                value,
                userLockParamsTemp.origUserAccount,
                {from: userLockParamsTemp.shadowUserAccount, value: crossApproach.chain1.shadowLockFee * 2}
            );

            // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
            assert.checkWeb3Event(userBurnLockReceipt, {
                event: 'UserBurnLockLogger',
                args: {
                    xHash: userLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                    tokenPairID: userLockParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain1.shadowLockFee,
                    userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
                }
            });
            // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Coin2 -> smgBurnLock  ==> success', async () => {
        try {
            // accounts[5] is the chain1 original address of the user.
            // accounts[6] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[5];
            smgLockParamsTemp.shadowUserAccount = accounts[6];
            smgLockParamsTemp.xHash = xInfo.chain2BurnCoinRedeem.hash;
            smgLockParamsTemp.tokenPairID = coins.coin2.tokenPairID;

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 2;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
                smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

            // console.log("pk1:", storemanGroups[1].gpk1);
            // console.log("pk2:", storemanGroups[1].gpk2);
            // user mint lock
            let smgBurnLockReceipt = await crossApproach.chain2.instance.smgBurnLock(
                smgLockParamsTemp.xHash,
                smgLockParamsTemp.smgID,
                smgLockParamsTemp.tokenPairID,
                value,
                smgLockParamsTemp.origUserAccount,
                R,
                s,
                {from: storemanGroups[1].account}
            );

            // console.log("smgBurnLock receipt", smgBurnLockReceipt);
            // console.log("smgBurnLock receipt logs", smgBurnLockReceipt.logs);
            assert.checkWeb3Event(smgBurnLockReceipt, {
                event: 'SmgBurnLockLogger',
                args: {
                    xHash: smgLockParamsTemp.xHash,
                    smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                    tokenPairID: smgLockParamsTemp.tokenPairID,
                    value: value,
                    userAccount: smgLockParamsTemp.origUserAccount
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Original[2] -> Coin2 -> userBurnRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain2BurnCoinRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);

            let origUserAccount = accounts[5];
            let userBurnRedeemReceipt = await crossApproach.chain2.instance.userBurnRedeem(xInfo.chain2BurnCoinRedeem.x, {from: origUserAccount});
            // let balance2 = await getBalance(origUserAccount);

            assert.checkWeb3Event(userBurnRedeemReceipt, {
                event: 'UserBurnRedeemLogger',
                args: {
                    x: xInfo.chain2BurnCoinRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin2.tokenPairID
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Shadow[1] -> Coin2 -> smgBurnRedeem  ==> success', async () => {
        try {
            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain2BurnCoinRedeem.hash);
            assert.equal(leftTime.toNumber() > 0, true);

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);

            let smgBurnRedeemReceipt = await crossApproach.chain1.instance.smgBurnRedeem(xInfo.chain2BurnCoinRedeem.x, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgBurnRedeemReceipt, {
                event: 'SmgBurnRedeemLogger',
                args: {
                    x: xInfo.chain2BurnCoinRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID: coins.coin2.tokenPairID,
                    fee: crossApproach.chain1.shadowLockFee,
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(coins.coin2.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Chain[1] -> smgWithdrawFee  ==> The receiver address expired', async () => {
        try {
            let timestamp = parseInt(Date.now() / 1000); //s
            let timeout = await crossApproach.chain1.instance._smgFeeReceiverTimeout();
            timestamp -= timeout;

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgWithdrawFee, timestamp, storemanGroups[1].account);
            let smgWithdrawFeeReceipt = await crossApproach.chain1.instance.smgWithdrawFee(storemanGroups[1].ID, timestamp, storemanGroups[1].account, R, s, {from: storemanGroups[1].account});

            let smgFee = await crossApproach.chain1.instance.getStoremanFee(storemanGroups[1].ID);

            assert.checkWeb3Event(smgWithdrawFeeReceipt, {
                event: 'SmgWithdrawFeeLogger',
                args: {
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    // timeStamp: coins.coin2.tokenPairID,
                    receiver: storemanGroups[1].account,
                    fee: smgFee
                }
            });

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "The receiver address expired");
        }
    });

    it('Chain[1] -> smgWithdrawFee  ==> Invalid storeman group ID', async () => {
        try {
            let timestamp = parseInt(Date.now() / 1000); //s
            // let smgFee = await crossApproach.chain1.instance.getStoremanFee(storemanGroups.wrong.ID);
            // console.log("chain1 storeman wrong fee", smgFee);

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgWithdrawFee, timestamp, storemanGroups[1].account);
            let smgWithdrawFeeReceipt = await crossApproach.chain1.instance.smgWithdrawFee(storemanGroups.wrong.ID, timestamp, storemanGroups[1].account, R, s, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgWithdrawFeeReceipt, {
                event: 'SmgWithdrawFeeLogger',
                args: {
                    smgID: web3.utils.padRight(storemanGroups.wrong.ID, 64),
                    receiver: storemanGroups[1].account,
                    fee: smgFee
                }
            });
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "revert");
        }
    });

    it('Chain[1] -> smgWithdrawFee  ==> Fee is null', async () => {
        try {
            let timestamp = parseInt(Date.now() / 1000); //s
            let smgFee = await crossApproach.chain1.instance.getStoremanFee(storemanGroups[1].ID);
            console.log("chain1 storeman 1 fee", smgFee);

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgWithdrawFee, timestamp, storemanGroups[1].account);
            let smgWithdrawFeeReceipt = await crossApproach.chain1.instance.smgWithdrawFee(storemanGroups[1].ID, timestamp, storemanGroups[1].account, R, s, {from: storemanGroups[1].account});

            assert.checkWeb3Event(smgWithdrawFeeReceipt, {
                event: 'SmgWithdrawFeeLogger',
                args: {
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    receiver: storemanGroups[1].account,
                    fee: smgFee
                }
            });
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Fee is null");
        }
    });

    it('Chain[2] -> smgWithdrawFee  ==> The receiver address expired', async () => {
        try {
            let timestamp = parseInt(Date.now() / 1000); //s
            let timeout = await crossApproach.chain1.instance._smgFeeReceiverTimeout();
            timestamp -= timeout;

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.smgWithdrawFee, timestamp, storemanGroups[1].account);
            let smgWithdrawFeeReceipt = await crossApproach.chain2.instance.smgWithdrawFee(storemanGroups[1].ID, timestamp, storemanGroups[1].account, R, s, {from: storemanGroups[1].account});

            let smgFee = await crossApproach.chain2.instance.getStoremanFee(storemanGroups[1].ID);

            assert.checkWeb3Event(smgWithdrawFeeReceipt, {
                event: 'SmgWithdrawFeeLogger',
                args: {
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    // timeStamp: coins.coin2.tokenPairID,
                    receiver: storemanGroups[1].account,
                    fee: smgFee
                }
            });

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "The receiver address expired");
        }
    });

    it('Chain[2] -> smgWithdrawFee  ==> success', async () => {
        try {
            let timestamp = parseInt(Date.now() / 1000); //s

            let smgFee = await crossApproach.chain2.instance.getStoremanFee(storemanGroups[1].ID);
            console.log("chain2 storeman 1 fee", smgFee);

            let pkId = 2;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.smgWithdrawFee, timestamp, storemanGroups[1].account);
            let smgWithdrawFeeReceipt = await crossApproach.chain2.instance.smgWithdrawFee(storemanGroups[1].ID, timestamp, storemanGroups[1].account, R, s, {from: storemanGroups[1].account});

            // let smgFee = await crossApproach.chain2.instance.getStoremanFee(storemanGroups[1].ID);

            assert.checkWeb3Event(smgWithdrawFeeReceipt, {
                event: 'SmgWithdrawFeeLogger',
                args: {
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    receiver: storemanGroups[1].account,
                    fee: smgFee
                }
            });
        } catch (err) {
            assert.fail(err);
        }
    });
});

async function testInit() {
    if (typeof assert !== 'undefined') {
        assert.getWeb3Log = function(receipt, expectedEvent) {
            let entries = receipt.logs.filter(log => log.event === expectedEvent.event);
            if(!entries.length){
                assert.fail("Not get the expected event: event is null");
            }
            let entry = entries[0];
            assert.equal(entry.event, expectedEvent.event);
            return entry;
        };

        assert.checkWeb3Event = function(receipt, expectedEvent, message) {
            // console.log("receipt", receipt);
            // console.log("expectedEvent", expectedEvent);
            let events = parseEventsBy(receipt, [expectedEvent], true);
            let entry = events[0];
            if(entry == null){
                assert.fail("Not get the expected event: event is null");
            }

            // console.log("parsed event", entry);
            assert.equal(entry.event, expectedEvent.event);
            let expectArgs = expectedEvent.args;
            let entryArgs = entry.args;
            let needKeys = Object.keys(expectArgs);
            for(let key of needKeys){
                if(expectArgs[key] != entryArgs[key]){
                    // console.log(expectArgs[key])
                    // console.log(entryArgs[key])
                    assert.fail("Not get the expected event args: " + key);
                    break;
                }
            }
        };
    }
}
