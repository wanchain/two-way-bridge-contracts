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
const schnorr                   = require('../utils/schnorr/tools');
const {
    sleep,
    stringToBytes,
    getBalance,
    getRC20TokenInstance,
    getRC20TokenBalance,
    toNonExponential
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

let defaultCurve = {
    curve1                    : 1,
    curve2                    : 2
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
        price                 : 23e-18
    },
    coin2: {
        tokenPairID           : 1,
        origChainID           : defaultChainID.chain1,
        shadowChainID         : defaultChainID.chain2,
        origTokenAccount      : ADDRESS_0,
        shadowTokenAccount    : "",
        decimals              : 18,
        name                  : 'ETH',
        symbol                : 'ETH',
        price                 : 243e-18
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
        price                 : 3e-18
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
        price                 : 7e-18
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
        gpk1                  : schnorr.getPKBySk(skInfo.smg1[1]),
        gpk2                  : schnorr.getPKBySk(skInfo.smg1[2]),
        startTime             : 0,
        endTime               : Number.MAX_SAFE_INTEGER,
        R                     : schnorr.getR(),
        s                     : '0x0c595b48605562a1a6492540b875da4ff203946a9dd0e451cd33d06ef568626b'
    },
    2: {
        ID                    : "0x02",
        account               : "", // accounts 1 or 2
        // deposit               : new BN(web3.utils.padRight(0x2, 50)),
        deposit               : "99000000000000000000000000000000000",
        status                : storemanGroupStatus.none,
        chain1                : defaultChainID.chain1,
        chain2                : defaultChainID.chain2,
        gpk1                  : schnorr.getPKBySk(skInfo.smg2[1]),
        gpk2                  : schnorr.getPKBySk(skInfo.smg2[2]),
        startTime             : 0,
        endTime               : Number.MAX_SAFE_INTEGER,
        R                     : schnorr.getR(),
        s                     : '0x0c595b48605562a1a6492540b875da4ff203946a9dd0e451cd33d06ef568626b'
    },
};

let userMintLockParams       = {
    // xHash: xInfo[1].hash,
    xHash: '',
    smgID: storemanGroups[1].ID,
    tokenPairID: tokens.token1.tokenPairID,
    value: 10,
    origUserAccount: '', // accounts 3 or 4
    shadowUserAccount: '', // accounts 3 or 4
    lockFee: crossApproach.chain1.origLockFee + 1,
    revokeFee: crossApproach.chain1.origRevokeFee + 2
};

let smgMintLockParams       = {
    xHash: '',
    smgID: storemanGroups[1].ID,
    tokenPairID: tokens.token1.tokenPairID,
    value: userMintLockParams.value,
    origUserAccount: '', // accounts 3 or 4
    shadowUserAccount: '', // accounts 3 or 4
    R: '',
    s: ''
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
            await sigVerifier.register(defaultCurve.curve1, secp256K1.address, {from: owner});
            console.log("init 3", await getBalance(owner));
            // await sigVerifier.register(defaultCurve.curve2, bn128.address, {from: owner});
            await sigVerifier.register(defaultCurve.curve2, secp256K1.address, {from: owner});
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
            tokens.token2.origTokenAccount = await tokens.token2.tokenCreator.getTokenAddr.call(tokens.token2.name, tokens.token1.symbol);
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
                web3.utils.toWei(storemanGroups[1].deposit), [storemanGroups[1].chain1, storemanGroups[1].chain1],
                [web3.utils.padRight(web3.utils.toHex(defaultCurve.curve2), 64),
                web3.utils.padRight(web3.utils.toHex(defaultCurve.curve1), 64)],
                storemanGroups[1].gpk2, storemanGroups[1].gpk1,
                storemanGroups[1].startTime, storemanGroups[1].endTime, {from: owner});
            // console.log("smg1ConfigReceipt", smg1ConfigReceipt.logs);
            console.log("init 42", await getBalance(owner));

            let smg2ConfigReceipt = await oracle.setStoremanGroupConfig(storemanGroups[2].ID, storemanGroups[2].status,
                web3.utils.toWei(storemanGroups[2].deposit), [storemanGroups[2].chain2, storemanGroups[2].chain1],
                [web3.utils.padRight(web3.utils.toHex(defaultCurve.curve2), 64),
                web3.utils.padRight(web3.utils.toHex(defaultCurve.curve1), 64)],
                storemanGroups[2].gpk2, storemanGroups[2].gpk1,
                storemanGroups[2].startTime, storemanGroups[2].endTime, {from: owner});
            // console.log("smg2ConfigReceipt", smg2ConfigReceipt.logs);
            console.log("init 43", await getBalance(owner));
            let smg1DepositReceipt = await oracle.updateDeposit(storemanGroups[1].ID, web3.utils.toWei(storemanGroups[1].deposit), {from: owner});
            // assert.checkWeb3Event(smg1DepositReceipt, {
            //     event: 'UpdateDeposit',
            //     args: {
            //         smgID: web3.utils.padRight(storemanGroups[1].ID, 32),
            //         amount:web3.utils.toWei(storemanGroups[1].deposit)
            //     }
            // });
            // console.log("smg1DepositReceipt", smg1DepositReceipt.logs);
            console.log("init 44", await getBalance(owner));
            let smg2DepositReceipt = await oracle.updateDeposit(storemanGroups[2].ID, web3.utils.toWei(storemanGroups[2].deposit), {from: owner});
            // assert.checkWeb3Event(smg2DepositReceipt, {
            //     event: 'UpdateDeposit',
            //     args: {
            //         smgID: web3.utils.padRight(storemanGroups[2].ID, 32),
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
                toNonExponential(tokens.token1.price),
                toNonExponential(tokens.token2.price),
                toNonExponential(coins.coin1.price),
                toNonExponential(coins.coin2.price),
                // web3.utils.toWei(toNonExponential(tokens.token1.price)),
                // web3.utils.toWei(toNonExponential(tokens.token2.price)),
                // web3.utils.toWei(toNonExponential(coins.coin1.price)),
                // web3.utils.toWei(toNonExponential(coins.coin2.price)),
            ];
            let priceLogger = await oracle.updatePrice(tokenSymbols, tokenPrices);
            console.log("init 46", await getBalance(owner));
            let oraclePrices = await oracle.getValues(tokenSymbols);
            assert.equal(oraclePrices[0].eq(new BN(tokenPrices[0])), true);
            assert.equal(oraclePrices[1].eq(new BN(tokenPrices[1])), true);
            assert.equal(oraclePrices[2].eq(new BN(tokenPrices[2])), true);
            assert.equal(oraclePrices[3].eq(new BN(tokenPrices[3])), true);

            // quota config
            let quota1ConfigReceipt = await quota1.config(
                oracle.address,
                crossApproach.chain1.instance.address,
                crossApproach.chain1.instance.address,
                smgAdminProxy.address,
                tokenManager.address,
                quotaDepositRate,
                web3.utils.hexToBytes(web3.utils.asciiToHex(coins.coin1.symbol)),
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
                web3.utils.hexToBytes(web3.utils.asciiToHex(coins.coin2.symbol)),
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
        } catch (err) {
            assert.include(err.toString(), "Parameter is invalid");
        }
    });

    it('Others getFees  ==> The config value', async () => {
        try {
            let ret = await crossApproach.chain1.instance.getFees(defaultChainID.chain1, defaultChainID.chain2);
            assert.equal(crossApproach.chain1.origLockFee, ret[0]);
            assert.equal(crossApproach.chain1.origRevokeFee, ret[1]);

            ret = await crossApproach.chain1.instance.getFees(defaultChainID.chain2, defaultChainID.chain1);
            assert.equal(crossApproach.chain1.shadowLockFee, ret[0]);
            assert.equal(crossApproach.chain1.shadowRevokeFee, ret[1]);

            ret = await crossApproach.chain2.instance.getFees(defaultChainID.chain2, defaultChainID.chain1);
            assert.equal(crossApproach.chain2.origLockFee, ret[0]);
            assert.equal(crossApproach.chain2.origRevokeFee, ret[1]);

            ret = await crossApproach.chain2.instance.getFees(defaultChainID.chain1, defaultChainID.chain2);
            assert.equal(crossApproach.chain2.shadowLockFee, ret[0]);
            assert.equal(crossApproach.chain2.shadowRevokeFee, ret[1]);

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

    it('Token1 -> userMintLock  ==> Halted', async () => {
        let crossProxy;
        try {
            crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
            await crossProxy.setHalt(true, {from: owner});
            // accounts[1] is the chain1 original address of the user.
            let userMintLockParamsTemp = Object.assign({}, userMintLockParams);
            userMintLockParamsTemp.origUserAccount = accounts[3];
            userMintLockParamsTemp.shadowUserAccount = accounts[4];
            userMintLockParamsTemp.xHash = xInfo[1].hash;
            await crossApproach.chain1.instance.userMintLock(
                userMintLockParamsTemp.xHash,
                userMintLockParamsTemp.smgID,
                userMintLockParamsTemp.tokenPairID,
                web3.utils.toWei(userMintLockParamsTemp.value.toString()),
                userMintLockParamsTemp.shadowUserAccount, {from: userMintLockParamsTemp.origUserAccount});
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it("Token1 -> userMintLock  ==> Invalid parnters", async () => {
        try {
            // accounts[1] is the chain1 original address of the user.
            let userMintLockParamsTemp = Object.assign({}, userMintLockParams);
            userMintLockParamsTemp.origUserAccount = accounts[3];
            userMintLockParamsTemp.shadowUserAccount = accounts[4];
            userMintLockParamsTemp.xHash = xInfo[1].hash;
            await crossDelegateNotInit.userMintLock(
                userMintLockParamsTemp.xHash,
                userMintLockParamsTemp.smgID,
                userMintLockParamsTemp.tokenPairID,
                web3.utils.toWei(userMintLockParamsTemp.value.toString()),
                userMintLockParamsTemp.shadowUserAccount, {from: userMintLockParamsTemp.origUserAccount});
        } catch (err) {
            //assert.fail(err);
            assert.include(err.toString(), "Invalid parnters");
        }
    });

    it("Token1 -> userMintLock  ==> Token does not exist", async () => {
        try {
            // accounts[1] is the chain1 original address of the user.
            let userMintLockParamsTemp = Object.assign({}, userMintLockParams);
            userMintLockParamsTemp.origUserAccount = accounts[3];
            userMintLockParamsTemp.shadowUserAccount = accounts[4];
            userMintLockParamsTemp.xHash = xInfo[1].hash;

            let value = web3.utils.toWei(userMintLockParamsTemp.value.toString());
            // user mint lock
            await crossApproach.chain1.instance.userMintLock(
                userMintLockParamsTemp.xHash,
                userMintLockParamsTemp.smgID,
                InvalidTokenPairID,
                value,
                userMintLockParamsTemp.shadowUserAccount,
                {from: userMintLockParamsTemp.origUserAccount, value: crossApproach.chain1.origLockFee});
        } catch (err) {
            assert.include(err.toString(), "Token does not exist");
        }
    });

    it("Token1 -> userMintLock  ==> Value is null", async () => {
        try {
            // accounts[1] is the chain1 original address of the user.
            let userMintLockParamsTemp = Object.assign({}, userMintLockParams);
            userMintLockParamsTemp.origUserAccount = accounts[3];
            userMintLockParamsTemp.shadowUserAccount = accounts[4];
            userMintLockParamsTemp.xHash = xInfo[1].hash;

            let value = web3.utils.toWei("0");
            // user mint lock
            await crossApproach.chain1.instance.userMintLock(
                userMintLockParamsTemp.xHash,
                userMintLockParamsTemp.smgID,
                userMintLockParamsTemp.tokenPairID,
                value,
                userMintLockParamsTemp.shadowUserAccount,
                {from: userMintLockParamsTemp.origUserAccount, value: crossApproach.chain1.origLockFee});
        } catch (err) {
            assert.include(err.toString(), "Value is null");
        }
    });

    it('Token1 -> smgMintLock  ==> Halted', async () => {
        let crossProxy;
        try {
            crossProxy = await CrossProxy.at(crossApproach.chain2.instance.address);
            await crossProxy.setHalt(true, {from: owner});
            // accounts[3] is the chain1 original address of the user.
            // accounts[4] is the chain2 shadow address of the user.
            let smgMintLockParamsTemp = Object.assign({}, smgMintLockParams);
            smgMintLockParamsTemp.origUserAccount = accounts[3];
            smgMintLockParamsTemp.shadowUserAccount = accounts[4];
            smgMintLockParamsTemp.xHash = xInfo[1].hash;
            smgMintLockParamsTemp.R = storemanGroups[1].R;
            smgMintLockParamsTemp.s = storemanGroups[1].s;

            let value = web3.utils.toWei(smgMintLockParamsTemp.value.toString());

            // storeman mint lock
            let smgMintLockReceipt = await crossApproach.chain2.instance.smgMintLock(
                smgMintLockParamsTemp.xHash,
                smgMintLockParamsTemp.smgID,
                smgMintLockParamsTemp.tokenPairID,
                value,
                smgMintLockParamsTemp.shadowUserAccount,
                smgMintLockParamsTemp.R,
                smgMintLockParamsTemp.s,
                {from: storemanGroups[1].account});
            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it('Token1 -> userMintLock  ==>success', async () => {
        try {
            // accounts[1] is the chain1 original address of the user.
            let userMintLockParamsTemp = Object.assign({}, userMintLockParams);
            userMintLockParamsTemp.origUserAccount = accounts[3];
            userMintLockParamsTemp.shadowUserAccount = accounts[4];
            userMintLockParamsTemp.xHash = xInfo[1].hash;

            let mintOracleValue = await crossApproach.chain1.parnters.oracle.getDeposit(userMintLockParamsTemp.smgID);
            console.log("mintOracleValue", mintOracleValue);

            let mintQuotaValue = await crossApproach.chain1.parnters.quota.getMintQuota(userMintLockParamsTemp.tokenPairID, userMintLockParamsTemp.smgID);
            console.log("mintQuotaValue", mintQuotaValue);

            let value = web3.utils.toWei(userMintLockParamsTemp.value.toString());
            await tokens.token1.tokenCreator.mintToken(tokens.token1.name, tokens.token1.symbol,
                userMintLockParamsTemp.origUserAccount, value);
            // get token instance
            let tokenInstance = await getRC20TokenInstance(tokens.token1.origTokenAccount);
            let balance = await tokenInstance.balanceOf(userMintLockParamsTemp.origUserAccount);
            assert.equal(value, balance.toString());

            // approve value
            await tokenInstance.approve(crossApproach.chain1.instance.address, 0, {from: userMintLockParamsTemp.origUserAccount});
            await tokenInstance.approve(crossApproach.chain1.instance.address, value, {from: userMintLockParamsTemp.origUserAccount});
            let allowance = await tokenInstance.allowance(userMintLockParamsTemp.origUserAccount, crossApproach.chain1.instance.address);
            assert.equal(value, allowance.toString());

            // console.log("before origUserAccount", await web3.eth.getBalance(userMintLockParamsTemp.origUserAccount));
            // console.log("before crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));
            // user mint lock
            let userMintLockReceipt = await crossApproach.chain1.instance.userMintLock(
                userMintLockParamsTemp.xHash,
                userMintLockParamsTemp.smgID,
                userMintLockParamsTemp.tokenPairID,
                value,
                userMintLockParamsTemp.shadowUserAccount,
                {from: userMintLockParamsTemp.origUserAccount, value: crossApproach.chain1.origLockFee});
            // console.log("userMintLock receipt", userMintLockReceipt.logs);
            // console.log("after origUserAccount", await web3.eth.getBalance(userMintLockParamsTemp.origUserAccount));
            // console.log("after crossApproach", await web3.eth.getBalance(crossApproach.chain1.instance.address));
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Token1 -> smgMintLock  ==>success', async () => {
        try {
            // accounts[1] is the chain1 original address of the user.
            let smgMintLockParamsTemp = Object.assign({}, smgMintLockParams);
            smgMintLockParamsTemp.origUserAccount = accounts[3];
            smgMintLockParamsTemp.shadowUserAccount = accounts[4];
            smgMintLockParamsTemp.xHash = xInfo[1].hash;
            smgMintLockParamsTemp.R = storemanGroups[1].R;
            smgMintLockParamsTemp.s = storemanGroups[1].s;

            let value = web3.utils.toWei(smgMintLockParamsTemp.value.toString());

            // user mint lock
            let smgMintLockReceipt = await crossApproach.chain2.instance.smgMintLock(
                smgMintLockParamsTemp.xHash,
                smgMintLockParamsTemp.smgID,
                smgMintLockParamsTemp.tokenPairID,
                value,
                smgMintLockParamsTemp.shadowUserAccount,
                smgMintLockParamsTemp.R,
                smgMintLockParamsTemp.s,
                {from: storemanGroups[1].account});
            // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Token1 -> userMintRevoke  ==> should wait 2*lockedTime, not wait', async () => {
        try {
            let origUserAccount = accounts[3];;
            await crossApproach.chain2.instance.userMintRevoke(xInfo[1].hash, {from: origUserAccount, value: crossApproach.chain1.origRevokeFee});
        } catch (err) {
            assert.include(err.toString(), "Revoke is not permitted");
        }
    });

    it('Token1 -> userMintRedeem  ==>success', async () => {
        try {
            let shadowUserAccount = accounts[4];
            await crossApproach.chain2.instance.userMintRedeem(xInfo[1].x, {from: shadowUserAccount});
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Token1 -> userMintRedeem ==> redeem twice, Status is not locked', async () => {
        try {
            let shadowUserAccount = accounts[4];
            await crossApproach.chain2.instance.userMintRedeem(xInfo[1].x, {from: shadowUserAccount});
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

    it('Token1 -> smgMintRedeem ==> Smart contract is halted', async () => {
        crossProxy = await CrossProxy.at(crossApproach.chain1.instance.address);
        await crossProxy.setHalt(true, {from: owner});
        try {
            await crossApproach.chain1.instance.smgMintRedeem(xInfo[1].x);
        } catch (err) {
            assert.include(err.toString(), "Smart contract is halted");
        } finally {
            await crossProxy.setHalt(false, {from: owner});
        }
    });

    it('Token1 -> smgMintRedeem  ==>success', async () => {
        try {
            await crossApproach.chain1.instance.smgMintRedeem(xInfo[1].x, {from: storemanGroups[1].account});
        } catch (err) {
            assert.fail(err);
        }
    });

    it('Token1 -> smgMintRedeem ==> redeem twice, Status is not locked', async () => {
        try {
            await crossApproach.chain1.instance.smgMintRedeem(xInfo[1].x, {from: storemanGroups[1].account});
        } catch (err) {
            assert.include(err.toString(), "Status is not locked");
        }
    });

});

function parseEventsBy(receipt, expectedEvents, filterByName) {
    let events = new Array();

    receipt.logs.forEach(function(logEntry) {
        let expectedEntry = expectedEvents.find(function(evt) {
            return (evt.event === logEntry.event)
        });

        // When filtering, ignore events that are not expected
        if ((! filterByName) || expectedEntry) {
            // Event name
            let event = {
                event: logEntry.event
            };

            // Event arguments
            // Ignore the arguments when they are not tested
            // (ie. expectedEntry.args is undefined)
            if ((! expectedEntry) || (expectedEntry && expectedEntry.args)) {
                event.args = Object.keys(logEntry.args).reduce(function(previous, current) {
                    previous[current] =
                        (typeof logEntry.args[current].toNumber === 'function')
                            ? logEntry.args[current].toString()
                            : logEntry.args[current];
                    // console.log("previous:", previous);
                    return previous;
                }, {});
            }
            // console.log("parseEventsBy:", event);
            events.push(event);
        }
    });

    return events;
}

async function testInit(){
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
                    assert.fail("Not get the expected event args: " + key);
                    break;
                }
            }
        };
    }
}
