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
    skInfo,
    uniqueInfo
}                               = require('./config');

const BN                        = web3.utils.BN;

let crossDelegateNotInit;
let origTokenOwner;
let debtLaunchChain;
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
};

let smgLockParams       = {
    xHash: '',
    smgID: storemanGroups[1].ID,
    tokenPairID: tokens.token1.tokenPairID,
    value: userLockParams.value,
    origUserAccount: '', // accounts 3 or 4
    shadowUserAccount: '', // accounts 3 or 4
};

let userFastParams       = {
    uniqueID: '',
    smgID: storemanGroups[1].ID,
    tokenPairID: tokens.token1.tokenPairID,
    value: userLockParams.value,
    origUserAccount: '', // accounts 7
    shadowUserAccount: '', // accounts 8
};

let smgFastParams       = {
    uniqueID: '',
    smgID: storemanGroups[1].ID,
    tokenPairID: tokens.token1.tokenPairID,
    value: userFastParams.value,
    origUserAccount: '', // accounts 7 or 8
    shadowUserAccount: '', // accounts 7 or 8
};

let debtLockParams       = {
    xHash: '',
    srcSmgID: storemanGroups[1].ID,
    destSmgID: storemanGroups[2].ID,
};

let typesArrayList             = {
    //xHash   destSmgID
    srcDebtLock: ['bytes32', 'bytes32'],
    //xHash   srcSmgID
    destDebtLock: ['bytes32', 'bytes32'],
    //xHash   tokenPairID   value   userAccount
    smgBurnLock: ['bytes32', 'uint', 'uint', 'address'],
    //uniqueID   tokenPairID   value   userAccount
    smgFastMint: ['bytes32', 'uint', 'uint', 'address'],
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
            // schnorr.curve1 = schnorrTool.secp256k1;
            // schnorr.curve2 = schnorrTool.secp256k1;
            schnorr.curve1 = schnorrTool.bn128;
            schnorr.curve2 = schnorrTool.bn128;
            // await sigVerifier.register(defaultCurve.curve1, secp256K1.address, {from: owner});
            // schnorr.curve1 = schnorrTool.secp256k1;
            storemanGroups[1].gpk1 = schnorr.curve1.getPKBySk(skInfo.smg1[1]);
            storemanGroups[1].gpk2 = schnorr.curve1.getPKBySk(skInfo.smg1[2]);
            console.log("init 3", await getBalance(owner));

            await sigVerifier.register(defaultCurve.curve2, bn128.address, {from: owner});
            // schnorr.curve2 = schnorrTool.bn128;
            // await sigVerifier.register(defaultCurve.curve2, secp256K1.address, {from: owner});
            // schnorr.curve2 = schnorrTool.secp256k1;
            storemanGroups[2].gpk1 = schnorr.curve2.getPKBySk(skInfo.smg2[1]);
            storemanGroups[2].gpk2 = schnorr.curve2.getPKBySk(skInfo.smg2[2]);
            console.log("init 4", await getBalance(owner));
            // console.log("1 pk1:", storemanGroups[1].gpk1);
            // console.log("1 pk2:", storemanGroups[1].gpk2);
            // console.log("2 pk1:", storemanGroups[2].gpk1);
            // console.log("2 pk2:", storemanGroups[2].gpk2);

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

    it("Debt -> srcDebtLock  ==> Invalid parnters", async () => {
        try {
            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain1DebtMintLock.hash;

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

            let srcDebtLockReceipt = await crossDelegateNotInit.srcDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[1].account});

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Invalid parnters");
        }
    });

    it('Debt -> srcDebtLock  ==> Halted', async () => {
        let crossProxy;
        try {
            crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
            await crossProxy.setHalt(true, {from: owner});

            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain1DebtMintLock.hash;

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

            let srcDebtLockReceipt = await crossApproach.chain1.instance.srcDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[1].account});

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it("Debt -> srcDebtLock  ==> Destination storeman group ID is invalid, source storeman group ID is ready", async () => {
        try {
            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups.wrong.ID;
            debtLockParamsTemp.xHash = xInfo.chain1DebtMintLock.hash;

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

            let srcDebtLockReceipt = await crossApproach.chain1.instance.srcDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[1].account});

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "PK is not ready");
        }
    });

    it("Debt -> srcDebtLock  ==> Destination storeman group ID is not ready, source storeman group ID is ready", async () => {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        try {
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain1DebtMintLock.hash;

            await crossApproach.chain1.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.dismissed);
            await crossApproach.chain2.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.dismissed);

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

            let srcDebtLockReceipt = await crossApproach.chain1.instance.srcDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[1].account});

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "PK is not ready");
        } finally {
            await crossApproach.chain1.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.ready);
            await crossApproach.chain2.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.ready);
        }
    });

    it("Debt -> srcDebtLock  ==> Destination storeman group ID is ready, source storeman group ID is ready", async () => {
        try {
            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain1DebtMintLock.hash;

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

            let srcDebtLockReceipt = await crossApproach.chain1.instance.srcDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[1].account});

            assert.fail(ERROR_INFO);
            } catch (err) {
            assert.include(err.toString(), "PK is not unregistered");
        }
    });

    it("Debt -> srcDebtLock [revoke]  ==> Destination storeman group ID is ready, source storeman group ID is unregistered ==> success", async () => {
        try {
            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain1DebtRevoke.hash;

            await crossApproach.chain1.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);
            await crossApproach.chain2.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

            let srcDebtLockReceipt = await crossApproach.chain1.instance.srcDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[1].account});

            // console.log(srcDebtLockReceipt.logs);
            assert.checkWeb3Event(srcDebtLockReceipt, {
                event: 'SrcDebtLockLogger',
                args: {
                    xHash: debtLockParamsTemp.xHash,
                    srcSmgID: web3.utils.padRight(debtLockParamsTemp.srcSmgID, 64),
                    destSmgID: web3.utils.padRight(debtLockParamsTemp.destSmgID, 64),
                }
            });
        } catch (err) {
            assert.fail(err);
        }
    });

    it("Debt -> userFastMint  ==> Disable rapidity cross chain while debt", async () => {
        try {
            // accounts[7] is the chain1 original address of the user.
            // accounts[8] is the chain2 shadow address of the user.
            let userFastParamsTemp = Object.assign({}, userFastParams);
            userFastParamsTemp.origUserAccount = accounts[7];
            userFastParamsTemp.shadowUserAccount = accounts[8];
            userFastParamsTemp.uniqueID = uniqueInfo.chain1DebtFastMint;
            userFastParamsTemp.smgID = storemanGroups[1].ID;
            userFastParamsTemp.tokenPairID = coins.coin2.tokenPairID;

            let value = web3.utils.toWei(userFastParamsTemp.value.toString());

            let srcDebtLockReceipt = await crossApproach.chain1.instance.userFastMint(
                userFastParamsTemp.uniqueID,
                userFastParamsTemp.smgID,
                userFastParamsTemp.tokenPairID,
                value,
                userFastParamsTemp.shadowUserAccount,
                {from: storemanGroups[1].account});

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "PK is not ready");
        }
    });

    it("Debt -> userMintLock  ==> Disable htlc cross chain while debt", async () => {
        let value;
        let origUserAccount;
        try {
            // accounts[7] is the chain1 original address of the user.
            // accounts[8] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[7];
            userLockParamsTemp.shadowUserAccount = accounts[8];
            userLockParamsTemp.xHash = xInfo.chain1DebtMintLock.hash;
            userLockParamsTemp.tokenPairID = tokens.token1.tokenPairID;

            value = web3.utils.toWei(userLockParamsTemp.value.toString());
            origUserAccount = userLockParamsTemp.origUserAccount;

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
                {from: userLockParamsTemp.origUserAccount, value: crossApproach.chain1.origLockFee});

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "PK is not ready");
        } finally {
            await tokens.token1.tokenCreator.burnToken(tokens.token1.name, tokens.token1.symbol,
                origUserAccount, value);
        }
    });

    it('Debt -> destDebtRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = 2 * htlcLockedTime * 1000 + 1;
            // let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain1DebtRevoke.hash);
            // let lockedTime = leftTime * 1000 + 1;

            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms

            let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain1DebtRevoke.hash);
            assert.equal(Number(leftTime) === 0, true);

            await crossApproach.chain1.instance.destDebtRedeem(xInfo.chain1DebtRevoke.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Debt -> srcDebtRevoke  ==> success', async () => {
        try {
            // console.log("revoke hash", xInfo.chain1DebtRevoke.hash);
            let srcDebtRevokeReceipt = await crossApproach.chain1.instance.srcDebtRevoke(xInfo.chain1DebtRevoke.hash, {from: storemanGroups[1].account});

            // console.log("srcDebtRevokeReceipt", srcDebtRevokeReceipt.logs);
            assert.checkWeb3Event(srcDebtRevokeReceipt, {
                event: 'SrcDebtRevokeLogger',
                args: {
                    xHash: xInfo.chain1DebtRevoke.hash,
                    srcSmgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    destSmgID: web3.utils.padRight(storemanGroups[2].ID, 64),
                }
            });
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Asset -> Original[1] -> Token1 -> userMintLock  ==> success', async () => {
        try {
            // accounts[7] is the chain1 original address of the user.
            // accounts[8] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[7];
            userLockParamsTemp.shadowUserAccount = accounts[8];
            userLockParamsTemp.xHash = xInfo.chain1DebtMintLock.hash;

            await crossApproach.chain1.parnters.smgAdminProxy.setStoremanGroupStatus(userLockParamsTemp.smgID, storemanGroupStatus.ready);
            await crossApproach.chain2.parnters.smgAdminProxy.setStoremanGroupStatus(userLockParamsTemp.smgID, storemanGroupStatus.ready);

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
                {from: userLockParamsTemp.origUserAccount, value: crossApproach.chain1.origLockFee});
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

    it("Chain[1] -> Asset -> srcDebtLock  ==> There are asset_receivable or asset_payable in src storeman", async () => {
        try {
            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain1NoDebtRedeem.hash;

            await crossApproach.chain1.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);
            await crossApproach.chain2.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

            let srcDebtLockReceipt = await crossApproach.chain1.instance.srcDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[1].account});

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "There are asset_receivable or asset_payable in src storeman");
        }
    });

    it('Asset -> Original[1] -> Token1 -> smgMintRedeem  ==> Redeem timeout', async () => {
        try {
            let lockedTime = 2 * htlcLockedTime * 1000 + 1;
            console.log("await", lockedTime, "ms");
            await sleep(lockedTime); // ms
            await crossApproach.chain1.instance.smgMintRedeem(xInfo.chain1DebtMintLock.x, {from: storemanGroups[1].account});
        } catch (err) {
            assert.include(err.toString(), "Redeem timeout");
        }
    });

    it('Asset -> Original[1] -> Token1 -> userMintRevoke  ==> success', async () => {
        try {
            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);

            let origUserAccount = accounts[7];
            let value = web3.utils.toWei(userLockParams.value.toString());
            let userMintRevokeReceipt = await crossApproach.chain1.instance.userMintRevoke(xInfo.chain1DebtMintLock.hash, {from: origUserAccount, value: crossApproach.chain1.origRevokeFee});
            await tokens.token1.tokenCreator.burnToken(tokens.token1.name, tokens.token1.symbol,
                origUserAccount, value);

            assert.checkWeb3Event(userMintRevokeReceipt, {
                event: 'UserMintRevokeLogger',
                args: {
                    xHash: xInfo.chain1DebtMintLock.hash,
                    smgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    tokenPairID:tokens.token1.tokenPairID,
                    fee: crossApproach.chain1.origRevokeFee,
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getUserMintQuota(tokens.token1.tokenPairID, storemanGroups[1].ID);
            let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    // ready for debt
    it('Asset -> Original[2] -> Coin2 -> userFastMint  ==> success', async () => {
        try {
            // accounts[7] is the chain1 original address of the user.
            // accounts[8] is the chain2 shadow address of the user.
            let fastMintParamsTemp = Object.assign({}, userFastParams);
            fastMintParamsTemp.origUserAccount = accounts[7];
            fastMintParamsTemp.shadowUserAccount = accounts[8];
            fastMintParamsTemp.uniqueID = uniqueInfo.chain1DebtFastMint;
            fastMintParamsTemp.tokenPairID = coins.coin2.tokenPairID;

            // console.log(fastMintParamsTemp);

            await crossApproach.chain1.parnters.smgAdminProxy.setStoremanGroupStatus(fastMintParamsTemp.smgID, storemanGroupStatus.ready);
            await crossApproach.chain2.parnters.smgAdminProxy.setStoremanGroupStatus(fastMintParamsTemp.smgID, storemanGroupStatus.ready);

            let beforeMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(fastMintParamsTemp.tokenPairID, fastMintParamsTemp.smgID);

            let value = web3.utils.toWei(fastMintParamsTemp.value.toString());
            let totalValue = new BN(value).add(new BN(crossApproach.chain2.origLockFee)).toString();

            // console.log("1 balance accounts[7]", await getBalance(fastMintParamsTemp.origUserAccount));
            // console.log("value accounts[7]", value);
            // user mint lock
            let userFastMintReceipt = await crossApproach.chain2.instance.userFastMint(
                fastMintParamsTemp.uniqueID,
                fastMintParamsTemp.smgID,
                fastMintParamsTemp.tokenPairID,
                value,
                fastMintParamsTemp.shadowUserAccount,
                {from: fastMintParamsTemp.origUserAccount, value: totalValue});

            // console.log("2 balance accounts[7]", await getBalance(fastMintParamsTemp.origUserAccount));

            // console.log("userFastMint receipt", userFastMintReceipt.logs);
            assert.checkWeb3Event(userFastMintReceipt, {
                event: 'UserFastMintLogger',
                args: {
                    uniqueID: fastMintParamsTemp.uniqueID,
                    smgID: web3.utils.padRight(fastMintParamsTemp.smgID, 64),
                    tokenPairID: fastMintParamsTemp.tokenPairID,
                    value: value,
                    fee: crossApproach.chain2.origLockFee,
                    userAccount: fastMintParamsTemp.shadowUserAccount.toLowerCase(),
                }
            });

            let afterMintQuotaValue = await crossApproach.chain2.parnters.quota.getUserMintQuota(fastMintParamsTemp.tokenPairID, fastMintParamsTemp.smgID);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Debt -> Shadow[1] -> Coin2 -> smgFastMint  ==> success', async () => {
        try {
            // accounts[7] is the chain1 original address of the user.
            // accounts[8] is the chain2 shadow address of the user.
            let fastMintParamsTemp = Object.assign({}, smgFastParams);
            fastMintParamsTemp.origUserAccount = accounts[7];
            fastMintParamsTemp.shadowUserAccount = accounts[8];
            fastMintParamsTemp.uniqueID = uniqueInfo.chain1DebtFastMint;
            fastMintParamsTemp.tokenPairID = coins.coin2.tokenPairID;

            let beforeMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(fastMintParamsTemp.tokenPairID, fastMintParamsTemp.smgID);
            // console.log("beforeMintQuotaValue", beforeMintQuotaValue)

            let value = web3.utils.toWei(fastMintParamsTemp.value.toString());

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.smgFastMint, fastMintParamsTemp.uniqueID,
                fastMintParamsTemp.tokenPairID, value, fastMintParamsTemp.shadowUserAccount);

            // user fast mint
            let userFastMintReceipt = await crossApproach.chain1.instance.smgFastMint(
                fastMintParamsTemp.uniqueID,
                fastMintParamsTemp.smgID,
                fastMintParamsTemp.tokenPairID,
                value,
                fastMintParamsTemp.shadowUserAccount,
                R,
                s,
                {from: storemanGroups[1].account});
            // console.log("smgFastMint receipt", userFastMintReceipt.logs);

            assert.checkWeb3Event(userFastMintReceipt, {
                event: 'SmgFastMintLogger',
                args: {
                    uniqueID: fastMintParamsTemp.uniqueID,
                    smgID: web3.utils.padRight(fastMintParamsTemp.smgID, 64),
                    tokenPairID: fastMintParamsTemp.tokenPairID,
                    value: value,
                    userAccount: fastMintParamsTemp.shadowUserAccount,
                }
            });

            let afterMintQuotaValue = await crossApproach.chain1.parnters.quota.getSmgMintQuota(fastMintParamsTemp.tokenPairID, fastMintParamsTemp.smgID);
            // console.log("afterMintQuotaValue", afterMintQuotaValue)
            // console.log("value", value);
            let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
            // console.log("difference", difference);
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    // chain 1 debt clean
    it("Chain[1] -> Asset -> srcDebtLock  ==> success", async () => {
        try {
            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain1NoDebtRedeem.hash;

            await crossApproach.chain1.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);
            await crossApproach.chain2.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

            let srcDebtLockReceipt = await crossApproach.chain1.instance.srcDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[1].account});

            // console.log(srcDebtLockReceipt.logs);
            assert.checkWeb3Event(srcDebtLockReceipt, {
                event: 'SrcDebtLockLogger',
                args: {
                    xHash: debtLockParamsTemp.xHash,
                    srcSmgID: web3.utils.padRight(debtLockParamsTemp.srcSmgID, 64),
                    destSmgID: web3.utils.padRight(debtLockParamsTemp.destSmgID, 64),
                }
            });
        } catch (err) {
            assert.fail(err);
        }
    });

    it("Chain[1] -> Asset -> srcDebtLock  ==> Lock twice, Debt tx exists", async () => {
        try {
            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain1NoDebtRedeem.hash;

            await crossApproach.chain1.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);
            await crossApproach.chain2.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);

            let pkId = 1;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

            let srcDebtLockReceipt = await crossApproach.chain1.instance.srcDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[1].account});

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Debt tx exists");
        }
    });

    it("Chain[2] -> Debt -> destDebtLock  ==> success", async () => {
        try {
            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain1NoDebtRedeem.hash;

            // await crossApproach.chain1.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.ready);
            // await crossApproach.chain2.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.ready);

            let pkId = 2;
            let sk = skInfo.smg2[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.destDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.srcSmgID);

            let srcDebtLockReceipt = await crossApproach.chain2.instance.destDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[2].account});

            // console.log(srcDebtLockReceipt.logs);
            assert.checkWeb3Event(srcDebtLockReceipt, {
                event: 'DestDebtLockLogger',
                args: {
                    xHash: debtLockParamsTemp.xHash,
                    srcSmgID: web3.utils.padRight(debtLockParamsTemp.srcSmgID, 64),
                    destSmgID: web3.utils.padRight(debtLockParamsTemp.destSmgID, 64),
                }
            });
        } catch (err) {
            assert.fail(err);
        }
    });

    it("Chain[2] -> Debt -> destDebtLock  ==> Lock twice, Debt tx exists", async () => {
        try {
            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain1NoDebtRedeem.hash;

            let pkId = 2;
            let sk = skInfo.smg2[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.destDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.srcSmgID);

            let srcDebtLockReceipt = await crossApproach.chain2.instance.destDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[2].account});

            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Debt tx exists");
        }
    });

    it('Chain[2] -> Debt -> srcDebtRedeem  ==> success', async () => {
        try {

            let srcDebtRedeemReceipt = await crossApproach.chain2.instance.srcDebtRedeem(xInfo.chain1NoDebtRedeem.x, {from: storemanGroups[1].account});

            // console.log(destDebtRedeemReceipt.logs);
            assert.checkWeb3Event(srcDebtRedeemReceipt, {
                event: 'SrcDebtRedeemLogger',
                args: {
                    x: xInfo.chain1NoDebtRedeem.x,
                    srcSmgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    destSmgID: web3.utils.padRight(storemanGroups[2].ID, 64),
                }
            });

            // let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain1NoDebtRedeem.hash);
            // assert.equal(Number(leftTime) === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Chain[2] -> Debt -> srcDebtRedeem  ==> Redeem twice, Status is not locked', async () => {
        try {
            let srcDebtRedeemReceipt = await crossApproach.chain2.instance.srcDebtRedeem(xInfo.chain1NoDebtRedeem.x, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Chain[2] -> Debt -> destDebtRevoke  ==> Revoke the redeemed Debt, Status is not locked', async () => {
        try {
            let destDebtRevokeReceipt = await crossApproach.chain2.instance.destDebtRevoke(xInfo.chain1NoDebtRedeem.hash, {from: storemanGroups[2].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Chain[1] -> Asset -> destDebtRedeem  ==> success', async () => {
        try {

            let destDebtRedeemReceipt = await crossApproach.chain1.instance.destDebtRedeem(xInfo.chain1NoDebtRedeem.x, {from: storemanGroups[2].account});

            // console.log(destDebtRedeemReceipt.logs);
            assert.checkWeb3Event(destDebtRedeemReceipt, {
                event: 'DestDebtRedeemLogger',
                args: {
                    x: xInfo.chain1NoDebtRedeem.x,
                    srcSmgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    destSmgID: web3.utils.padRight(storemanGroups[2].ID, 64),
                }
            });

            // let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain1NoDebtRedeem.hash);
            // assert.equal(Number(leftTime) === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Chain[1] -> Asset -> destDebtRedeem  ==> Redeem twice, Status is not locked', async () => {
        try {

            let destDebtRedeemReceipt = await crossApproach.chain1.instance.destDebtRedeem(xInfo.chain1NoDebtRedeem.x, {from: storemanGroups[2].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Chain[1] -> Asset -> srcDebtRevoke  ==> Revoke the redeemed Debt, Status is not locked', async () => {
        try {
            let destDebtRedeemReceipt = await crossApproach.chain1.instance.destDebtRedeem(xInfo.chain1NoDebtRedeem.hash, {from: storemanGroups[1].account});
            assert.fail(ERROR_INFO);
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    // chain 2 debt clean
    it("Chain[2] -> Asset -> srcDebtLock  ==> success", async () => {
        try {
            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain2NoDebtRedeem.hash;

            let pkId = 2;
            let sk = skInfo.smg1[pkId];
            let {R, s} = buildMpcSign(schnorr.curve2, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

            let srcDebtLockReceipt = await crossApproach.chain2.instance.srcDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[1].account});

            // console.log(srcDebtLockReceipt.logs);
            assert.checkWeb3Event(srcDebtLockReceipt, {
                event: 'SrcDebtLockLogger',
                args: {
                    xHash: debtLockParamsTemp.xHash,
                    srcSmgID: web3.utils.padRight(debtLockParamsTemp.srcSmgID, 64),
                    destSmgID: web3.utils.padRight(debtLockParamsTemp.destSmgID, 64),
                }
            });
        } catch (err) {
            assert.fail(err);
        }
    });

    it("Chain[1] -> Debt -> destDebtLock  ==> success", async () => {
        try {
            let debtLockParamsTemp = Object.assign({}, debtLockParams);
            debtLockParamsTemp.srcSmgID = storemanGroups[1].ID;
            debtLockParamsTemp.destSmgID = storemanGroups[2].ID;
            debtLockParamsTemp.xHash = xInfo.chain2NoDebtRedeem.hash;

            let pkId = 1;
            let sk = skInfo.smg2[pkId];
            let {R, s} = buildMpcSign(schnorr.curve1, sk, typesArrayList.destDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.srcSmgID);

            let srcDebtLockReceipt = await crossApproach.chain1.instance.destDebtLock(
                debtLockParamsTemp.xHash,
                debtLockParamsTemp.srcSmgID,
                debtLockParamsTemp.destSmgID,
                R,
                s,
                {from: storemanGroups[2].account});

            // console.log(srcDebtLockReceipt.logs);
            assert.checkWeb3Event(srcDebtLockReceipt, {
                event: 'DestDebtLockLogger',
                args: {
                    xHash: debtLockParamsTemp.xHash,
                    srcSmgID: web3.utils.padRight(debtLockParamsTemp.srcSmgID, 64),
                    destSmgID: web3.utils.padRight(debtLockParamsTemp.destSmgID, 64),
                }
            });
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Chain[1] -> Debt -> srcDebtRedeem  ==> success', async () => {
        try {

            let srcDebtRedeemReceipt = await crossApproach.chain1.instance.srcDebtRedeem(xInfo.chain2NoDebtRedeem.x, {from: storemanGroups[1].account});

            // console.log(destDebtRedeemReceipt.logs);
            assert.checkWeb3Event(srcDebtRedeemReceipt, {
                event: 'SrcDebtRedeemLogger',
                args: {
                    x: xInfo.chain2NoDebtRedeem.x,
                    srcSmgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    destSmgID: web3.utils.padRight(storemanGroups[2].ID, 64),
                }
            });

            // let leftTime = await crossApproach.chain2.instance.getLeftLockedTime(xInfo.chain2NoDebtRedeem.hash);
            // assert.equal(Number(leftTime) === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Chain[2] -> Asset -> destDebtRedeem  ==> success', async () => {
        try {

            let destDebtRedeemReceipt = await crossApproach.chain2.instance.destDebtRedeem(xInfo.chain2NoDebtRedeem.x, {from: storemanGroups[2].account});

            // console.log(destDebtRedeemReceipt.logs);
            assert.checkWeb3Event(destDebtRedeemReceipt, {
                event: 'DestDebtRedeemLogger',
                args: {
                    x: xInfo.chain2NoDebtRedeem.x,
                    srcSmgID: web3.utils.padRight(storemanGroups[1].ID, 64),
                    destSmgID: web3.utils.padRight(storemanGroups[2].ID, 64),
                }
            });

            // let leftTime = await crossApproach.chain1.instance.getLeftLockedTime(xInfo.chain2NoDebtRedeem.hash);
            // assert.equal(Number(leftTime) === 0, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    // chain1 BurnBridge
    it('Debt -> Shadow[1] -> Coin2 -> userBurnLock  ==> success', async () => {
        try {
            // accounts[7] is the chain1 original address of the user.
            // accounts[8] is the chain2 shadow address of the user.
            let userLockParamsTemp = Object.assign({}, userLockParams);
            userLockParamsTemp.origUserAccount = accounts[7];
            userLockParamsTemp.shadowUserAccount = accounts[8];
            userLockParamsTemp.xHash = xInfo.chain2BurnCoinRedeem.hash;
            userLockParamsTemp.tokenPairID = coins.coin2.tokenPairID;
            userLockParamsTemp.smgID = storemanGroups[2].ID;

            // let mintOracleValue = await crossApproach.chain1.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
            // console.log("mintOracleValue", mintOracleValue);

            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
            // console.log("chain1 beforeBurnQuotaValue", beforeBurnQuotaValue);

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
                {from: userLockParamsTemp.shadowUserAccount, value: crossApproach.chain1.shadowLockFee});

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
            // console.log("chain1 getUserBurnQuota OK");
            // console.log("chain1 afterBurnQuotaValue", afterBurnQuotaValue);
            // console.log("chain1 value", value);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            // console.log("chain1 difference", difference);
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Debt -> Original[2] -> Coin2 -> smgBurnLock  ==> success', async () => {
        try {
            // accounts[7] is the chain1 original address of the user.
            // accounts[8] is the chain2 shadow address of the user.
            let smgLockParamsTemp = Object.assign({}, smgLockParams);
            smgLockParamsTemp.origUserAccount = accounts[7];
            smgLockParamsTemp.shadowUserAccount = accounts[8];
            smgLockParamsTemp.xHash = xInfo.chain2BurnCoinRedeem.hash;
            smgLockParamsTemp.tokenPairID = coins.coin2.tokenPairID;
            smgLockParamsTemp.smgID = storemanGroups[2].ID;

            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            // console.log("chain2 beforeBurnQuotaValue", beforeBurnQuotaValue);

            let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

            let pkId = 2;
            let sk = skInfo.smg2[pkId];
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
                {from: storemanGroups[2].account});

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

            // console.log("chain2 check SmgBurnLockLogger OK");
            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
            // console.log("chain2 getSmgBurnQuota OK");
            // console.log("chain2 afterBurnQuotaValue", afterBurnQuotaValue);
            // console.log("chain2 value", value);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            // console.log("chain2 difference", difference);
            assert.equal(value === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Debt -> Original[2] -> Coin2 -> userBurnRedeem  ==> success', async () => {
        try {
            let beforeBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(coins.coin2.tokenPairID, storemanGroups[2].ID);
            // console.log("chain2 beforeBurnQuotaValue", beforeBurnQuotaValue);

            let origUserAccount = accounts[7];
            let userBurnRedeemReceipt = await crossApproach.chain2.instance.userBurnRedeem(xInfo.chain2BurnCoinRedeem.x, {from: origUserAccount});
            // let balance2 = await getBalance(origUserAccount);

            assert.checkWeb3Event(userBurnRedeemReceipt, {
                event: 'UserBurnRedeemLogger',
                args: {
                    x: xInfo.chain2BurnCoinRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[2].ID, 64),
                    tokenPairID: coins.coin2.tokenPairID
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain2.parnters.quota.getSmgBurnQuota(coins.coin2.tokenPairID, storemanGroups[2].ID);
            // console.log("chain2 afterBurnQuotaValue", afterBurnQuotaValue);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            // console.log("chain2 difference", difference);
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Debt -> Shadow[1] -> Coin2 -> smgBurnRedeem  ==> success', async () => {
        try {
            let beforeBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(coins.coin2.tokenPairID, storemanGroups[2].ID);

            let smgBurnRedeemReceipt = await crossApproach.chain1.instance.smgBurnRedeem(xInfo.chain2BurnCoinRedeem.x, {from: storemanGroups[2].account});

            assert.checkWeb3Event(smgBurnRedeemReceipt, {
                event: 'SmgBurnRedeemLogger',
                args: {
                    x: xInfo.chain2BurnCoinRedeem.x,
                    smgID: web3.utils.padRight(storemanGroups[2].ID, 64),
                    tokenPairID: coins.coin2.tokenPairID,
                    fee: crossApproach.chain1.shadowLockFee,
                }
            });

            let afterBurnQuotaValue = await crossApproach.chain1.parnters.quota.getUserBurnQuota(coins.coin2.tokenPairID, storemanGroups[2].ID);
            let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
            assert.equal(new BN(0).toString() === difference, true);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Debt Cleaned -> Cross Cleaned  ==> success', async () => {
        try {
            let chain1Smg1AssetQuotaValue = await crossApproach.chain1.parnters.quota.getAsset(coins.coin2.tokenPairID, storemanGroups[1].ID);
            let chain1Smg1DebtQuotaValue = await crossApproach.chain1.parnters.quota.getDebt(coins.coin2.tokenPairID, storemanGroups[1].ID);
            // console.log("chain1Smg1AssetQuotaValue", chain1Smg1AssetQuotaValue);
            // console.log("chain1Smg1DebtQuotaValue", chain1Smg1DebtQuotaValue);

            let chain2Smg1AssetQuotaValue = await crossApproach.chain2.parnters.quota.getAsset(coins.coin2.tokenPairID, storemanGroups[1].ID);
            let chain2Smg1DebtQuotaValue = await crossApproach.chain2.parnters.quota.getDebt(coins.coin2.tokenPairID, storemanGroups[1].ID);
            // console.log("chain2Smg1AssetQuotaValue", chain2Smg1AssetQuotaValue);
            // console.log("chain2Smg1DebtQuotaValue", chain2Smg1DebtQuotaValue);

            let chain1Smg2AssetQuotaValue = await crossApproach.chain1.parnters.quota.getAsset(coins.coin2.tokenPairID, storemanGroups[2].ID);
            let chain1Smg2DebtQuotaValue = await crossApproach.chain1.parnters.quota.getDebt(coins.coin2.tokenPairID, storemanGroups[2].ID);
            // console.log("chain1Smg2AssetQuotaValue", chain1Smg2AssetQuotaValue);
            // console.log("chain1Smg2DebtQuotaValue", chain1Smg2DebtQuotaValue);

            let chain2Smg2AssetQuotaValue = await crossApproach.chain2.parnters.quota.getAsset(coins.coin2.tokenPairID, storemanGroups[2].ID);
            let chain2Smg2DebtQuotaValue = await crossApproach.chain2.parnters.quota.getDebt(coins.coin2.tokenPairID, storemanGroups[2].ID);
            // console.log("chain2Smg2AssetQuotaValue", chain2Smg2AssetQuotaValue);
            // console.log("chain2Smg2DebtQuotaValue", chain2Smg2DebtQuotaValue);

            assert.equal(chain1Smg1AssetQuotaValue.asset.eq(chain1Smg2AssetQuotaValue.asset), true);
            assert.equal(chain1Smg1AssetQuotaValue.asset_receivable.eq(chain1Smg2AssetQuotaValue.asset_receivable), true);
            assert.equal(chain1Smg1AssetQuotaValue.asset_payable.eq(chain1Smg2AssetQuotaValue.asset_payable), true);

            assert.equal(chain1Smg1DebtQuotaValue.debt.eq(chain1Smg2DebtQuotaValue.debt), true);
            assert.equal(chain1Smg1DebtQuotaValue.debt_receivable.eq(chain1Smg2DebtQuotaValue.debt_receivable), true);
            assert.equal(chain1Smg1DebtQuotaValue.debt_payable.eq(chain1Smg2DebtQuotaValue.debt_payable), true);

            assert.equal(chain2Smg1AssetQuotaValue.asset.eq(chain2Smg2AssetQuotaValue.asset), true);
            assert.equal(chain2Smg1AssetQuotaValue.asset_receivable.eq(chain2Smg2AssetQuotaValue.asset_receivable), true);
            assert.equal(chain2Smg1AssetQuotaValue.asset_payable.eq(chain2Smg2AssetQuotaValue.asset_payable), true);

            assert.equal(chain2Smg1DebtQuotaValue.debt.eq(chain2Smg2DebtQuotaValue.debt), true);
            assert.equal(chain2Smg1DebtQuotaValue.debt_receivable.eq(chain2Smg2DebtQuotaValue.debt_receivable), true);
            assert.equal(chain2Smg1DebtQuotaValue.debt_payable.eq(chain2Smg2DebtQuotaValue.debt_payable), true);
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
