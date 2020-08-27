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

const schnorrTool               = require('../utils/schnorr/tools');

const {
    BN,
    defaultCurve,
    ADDRESS_0,
    skInfo,
    htlcLockedTime,
    quotaDepositRate,
    schnorr,
    from,
    chains,
    storemanGroupStatus,
    storemanGroups,
    assert,
    testInit
}                               = require('./crossApproach/lib');

const {
    getBalance,
    toNonExponential,
    importMochaTest,
    setGlobal
}                               = require('./utils');

contract('Test Cross Approach', (accounts) => {
    before("init...   -> success", async () => {
        try {
            testInit();

            setGlobal("accounts", accounts);
            setGlobal("chains", chains);
            setGlobal("schnorr", schnorr);
            setGlobal("storemanGroups", storemanGroups);
            // set owner
            setGlobal("owner", from ? (accounts.includes(from) ? from : accounts[0]) : accounts[0]);

            console.log("init 1", await getBalance(global.owner));

            let crossDelegateNotInit = await CrossDelegate.new();
            setGlobal("crossDelegateNotInit", crossDelegateNotInit);
            console.log("init 2", await getBalance(global.owner));

            // storeman admin proxy
            let smgAdminProxy = await TestStoremanAdmin.new();
            console.log("init 3", await getBalance(global.owner));

            // signature verifier
            let bn128 = await Bn128SchnorrVerifier.deployed();
            let secp256K1 = await Secp256k1SchnorrVerifier.deployed();
            let sigVerifier = await SignatureVerifier.deployed();
            // register signature verifier contracts
            await sigVerifier.register(defaultCurve.curve1, bn128.address, {from: global.owner});
            schnorr.curve1 = schnorrTool.bn128;
            // await sigVerifier.register(defaultCurve.curve1, secp256K1.address, {from: global.owner});
            // global.schnorr.curve1 = schnorrTool.secp256k1;
            global.storemanGroups[1].gpk1 = schnorr.curve1.getPKBySk(skInfo.smg1[1]);
            global.storemanGroups[1].gpk2 = schnorr.curve1.getPKBySk(skInfo.smg1[2]);
            console.log("init 4", await getBalance(global.owner));

            await sigVerifier.register(defaultCurve.curve2, bn128.address, {from: global.owner});
            global.schnorr.curve2 = schnorrTool.bn128;
            // await sigVerifier.register(defaultCurve.curve2, secp256K1.address, {from: global.owner});
            // global.schnorr.curve2 = schnorrTool.secp256k1;
            global.storemanGroups[2].gpk1 = global.schnorr.curve2.getPKBySk(skInfo.smg2[1]);
            global.storemanGroups[2].gpk2 = global.schnorr.curve2.getPKBySk(skInfo.smg2[2]);
            console.log("init 5", await getBalance(global.owner));

            // quota1
            let quotaProxy = await QuotaProxy.deployed();
            let quotaDelegate = await QuotaDelegate.deployed();
            let quota1 = await QuotaDelegate.at(quotaProxy.address);
            console.log("init 6", await getBalance(global.owner));

            // quota2
            let quota2 = await QuotaDelegate.new();
            console.log("init 7", await getBalance(global.owner));

            // oracle
            let oracleProxy = await OracleProxy.deployed();
            let oracleDelegate = await OracleDelegate.deployed();
            let oracle = await OracleDelegate.at(oracleProxy.address);
            console.log("init 8", await getBalance(global.owner));

            // token manager proxy
            let tokenManagerProxy = await TokenManagerProxy.deployed();
            let tokenManagerDelegate = await TokenManagerDelegate.deployed();
            let tokenManager = await TokenManagerDelegate.at(tokenManagerProxy.address);
            console.log("init 9", await getBalance(global.owner));

            // cross approach
            let crossProxy = await CrossProxy.deployed();
            let crossDelegate = await CrossDelegate.deployed();
            global.chains[1].approach.instance = await CrossDelegate.at(crossProxy.address);
            console.log("init 10", await getBalance(global.owner));
            await global.chains[1].approach.instance.setLockedTime(htlcLockedTime) //second
            console.log("init 11", await getBalance(global.owner));
            await global.chains[1].approach.instance.setPartners(tokenManager.address, smgAdminProxy.address, smgAdminProxy.address, quota1.address, sigVerifier.address);
            console.log("init 12", await getBalance(global.owner));
            await global.chains[1].approach.instance.setFees(global.chains[1].ID, global.chains[2].ID, global.chains[1].approach.origLockFee, global.chains[1].approach.origRevokeFee);
            console.log("init 13", await getBalance(global.owner));
            await global.chains[1].approach.instance.setFees(global.chains[2].ID, global.chains[1].ID, global.chains[1].approach.shadowLockFee, global.chains[1].approach.shadowRevokeFee);
            console.log("init 14", await getBalance(global.owner));
            global.chains[1].approach.parnters.tokenManager = tokenManager;
            global.chains[1].approach.parnters.smgAdminProxy = smgAdminProxy;
            global.chains[1].approach.parnters.smgFeeProxy = smgAdminProxy.address;
            global.chains[1].approach.parnters.quota = quota1;
            global.chains[1].approach.parnters.oracle = oracle;
            global.chains[1].approach.parnters.sigVerifier = sigVerifier;
            global.chains[1].approach.delegate = crossDelegate;

            // storeman admin setup
            await smgAdminProxy.addChainInfo(global.chains[1].ID, global.chains[2].ID, defaultCurve.curve1, defaultCurve.curve2);
            console.log("init 15", await getBalance(global.owner));
            var totalChainPair = await smgAdminProxy.getChainPairIDCount.call();
            var chainPairID = Number(totalChainPair) - 1;
            // console.log("deposit", typeof(global.storemanGroups[1].deposit));
            // console.log("deposit", web3.utils.toWei(global.storemanGroups[1].deposit));
            // storeman group 1
            await smgAdminProxy.addStoremanGroup(global.storemanGroups[1].ID, storemanGroupStatus.ready,
                web3.utils.toWei(global.storemanGroups[1].deposit), chainPairID, global.storemanGroups[1].gpk1,
                global.storemanGroups[1].gpk2, global.storemanGroups[1].startTime, global.storemanGroups[1].endTime);
            global.storemanGroups[1].status = storemanGroupStatus.ready;
            console.log("init 16", await getBalance(global.owner));
            let regSmg1Info = await smgAdminProxy.getStoremanGroupConfig.call(global.storemanGroups[1].ID);
            assert.equal(global.storemanGroups[1].status, regSmg1Info[1]);
            assert.equal(web3.utils.toWei(global.storemanGroups[1].deposit), regSmg1Info[2]);
            assert.equal(global.storemanGroups[1].chain1, Number(regSmg1Info[3]));
            assert.equal(global.storemanGroups[1].chain2, Number(regSmg1Info[4]));
            assert.equal(defaultCurve.curve1, Number(regSmg1Info[5]));
            assert.equal(defaultCurve.curve2, Number(regSmg1Info[6]));
            assert.equal(global.storemanGroups[1].gpk1, regSmg1Info[7]);
            assert.equal(global.storemanGroups[1].gpk2, regSmg1Info[8]);
            assert.equal(global.storemanGroups[1].startTime, Number(regSmg1Info[9]));
            assert.equal(global.storemanGroups[1].endTime, Number(regSmg1Info[10]));
            global.storemanGroups[1].account = accounts[2];

            // storeman group 2
            await smgAdminProxy.addStoremanGroup(global.storemanGroups[2].ID, storemanGroupStatus.ready,
                web3.utils.toWei(global.storemanGroups[2].deposit), chainPairID, global.storemanGroups[2].gpk1,
                global.storemanGroups[2].gpk2, global.storemanGroups[2].startTime, global.storemanGroups[2].endTime);
            console.log("init 17", await getBalance(global.owner));
            global.storemanGroups[2].status = storemanGroupStatus.ready;
            let regSmg2Info = await smgAdminProxy.getStoremanGroupConfig.call(global.storemanGroups[2].ID);
            assert.equal(global.storemanGroups[2].status, regSmg2Info[1]);
            assert.equal(web3.utils.toWei(global.storemanGroups[2].deposit), regSmg2Info[2]);
            assert.equal(global.storemanGroups[2].chain1, Number(regSmg2Info[3]));
            assert.equal(global.storemanGroups[2].chain2, Number(regSmg2Info[4]));
            assert.equal(defaultCurve.curve1, Number(regSmg2Info[5]));
            assert.equal(defaultCurve.curve2, Number(regSmg2Info[6]));
            // console.log("curve1", regSmg2Info[5], "curve2", regSmg2Info[6]);
            assert.equal(global.storemanGroups[2].gpk1, regSmg2Info[7]);
            assert.equal(global.storemanGroups[2].gpk2, regSmg2Info[8]);
            assert.equal(global.storemanGroups[2].startTime, Number(regSmg2Info[9]));
            assert.equal(global.storemanGroups[2].endTime, Number(regSmg2Info[10]));
            global.storemanGroups[2].account = accounts[3];

            global.chains[2].approach.delegate = await CrossDelegate.new({from: global.owner});
            console.log("init 18", await getBalance(global.owner));
            let chain2CrossProxy = await CrossProxy.new({from: global.owner});
            console.log("init 19", await getBalance(global.owner));
            await chain2CrossProxy.upgradeTo(global.chains[2].approach.delegate.address, {from: global.owner});
            console.log("init 20", await getBalance(global.owner));
            global.chains[2].approach.instance = await CrossDelegate.at(chain2CrossProxy.address);
            console.log("init 21", await getBalance(global.owner));
            await global.chains[2].approach.instance.setLockedTime(htlcLockedTime) //second
            console.log("init 22", await getBalance(global.owner));
            await global.chains[2].approach.instance.setPartners(tokenManager.address, oracle.address, ADDRESS_0, quota2.address, sigVerifier.address);
            console.log("init 23", await getBalance(global.owner));
            await global.chains[2].approach.instance.setFees(global.chains[2].ID, global.chains[1].ID, global.chains[2].approach.origLockFee, global.chains[2].approach.origRevokeFee);
            console.log("init 24", await getBalance(global.owner));
            await global.chains[2].approach.instance.setFees(global.chains[1].ID, global.chains[2].ID, global.chains[2].approach.shadowLockFee, global.chains[2].approach.shadowRevokeFee);
            console.log("init 25", await getBalance(global.owner));
            global.chains[2].approach.parnters.tokenManager = tokenManager;
            global.chains[2].approach.parnters.smgAdminProxy = oracle;
            global.chains[2].approach.parnters.smgFeeProxy = ADDRESS_0;
            global.chains[2].approach.parnters.quota = quota2;
            global.chains[2].approach.parnters.oracle = oracle;
            global.chains[2].approach.parnters.sigVerifier = sigVerifier;

            // original token creator contract
            global.chains[1].token.tokenCreator = await TestOrigTokenCreator.new();
            console.log("init 26", await getBalance(global.owner));
            await global.chains[1].token.tokenCreator.setAdmin(global.chains[1].approach.instance.address, {from: global.owner})
            console.log("init 27", await getBalance(global.owner));
            await global.chains[1].token.tokenCreator.createToken(global.chains[1].token.name, global.chains[1].token.symbol, global.chains[1].token.decimals);
            console.log("init 28", await getBalance(global.owner));
            global.chains[1].token.origTokenAccount = await global.chains[1].token.tokenCreator.getTokenAddr.call(global.chains[1].token.name, global.chains[1].token.symbol);
            // let origTokenContract = new web3.eth.Contract(tokenRC20Abi, global.chains[1].token.origTokenAccount);

            // /* change original token contract global.owner request */
            // let changeOwnerTx = await global.chains[1].token.tokenCreator.changeOwner(global.chains[1].token.name, global.chains[1].token.symbol, origTokenOwner, {from: global.owner});
            // /* accept change original token contract global.owner request */
            // await origTokenContract.methods.acceptOwnership().send({from: origTokenOwner});
            // var mintTokenTx = await global.chains[1].token.tokenCreator.mintToken(global.chains[1].token.name, global.chains[1].token.symbol, origUser, web3.utils.toWei(origUserBalance.toString()))

            global.chains[2].token.tokenCreator = await TestOrigTokenCreator.new();
            console.log("init 29", await getBalance(global.owner));
            await global.chains[2].token.tokenCreator.setAdmin(global.chains[2].approach.instance.address, {from: global.owner})
            console.log("init 30", await getBalance(global.owner));
            await global.chains[2].token.tokenCreator.createToken(global.chains[2].token.name, global.chains[2].token.symbol, global.chains[2].token.decimals);
            console.log("init 31", await getBalance(global.owner));
            global.chains[2].token.origTokenAccount = await global.chains[2].token.tokenCreator.getTokenAddr.call(global.chains[2].token.name, global.chains[2].token.symbol);
            // let origTokenContract = new web3.eth.Contract(tokenRC20Abi, global.chains[2].token.origTokenAccount);

            // /* change original token contract global.owner request */
            // let changeOwnerTx = await global.chains[2].token.tokenCreator.changeOwner(global.chains[2].token.name, tokenManager.token2.symbol, origTokenOwner, {from: global.owner});
            // /* accept change original token contract global.owner request */
            // await origTokenContract.methods.acceptOwnership().send({from: origTokenOwner});
            // var mintTokenTx = await global.chains[2].token.tokenCreator.mintToken(global.chains[2].token.name, tokenManager.token2.symbol, origUser, web3.utils.toWei(origUserBalance.toString()))

            // token manager admin
            // token1
            let shadowToken1Receipt = await tokenManager.addToken(global.chains[1].token.name, global.chains[1].token.symbol, global.chains[1].token.decimals);
            console.log("init 32", await getBalance(global.owner));
            // console.log(shadowToken1Receipt.logs);
            let shadowToken1Logger = assert.getWeb3Log(shadowToken1Receipt, {
                event: 'AddToken'
            });
            global.chains[1].token.shadowTokenAccount = shadowToken1Logger.args.tokenAddress;
            assert.equal(global.chains[1].token.name, shadowToken1Logger.args.name);
            assert.equal(global.chains[1].token.symbol, shadowToken1Logger.args.symbol);
            assert.equal(global.chains[1].token.decimals, Number(shadowToken1Logger.args.decimals));
            // console.log("check OK");

            let token1PairReceipt = await tokenManager.addTokenPair(global.chains[1].token.tokenPairID,
                [global.chains[1].token.origTokenAccount, global.chains[1].token.name, global.chains[1].token.symbol, global.chains[1].token.decimals, global.chains[1].token.origChainID],
                global.chains[1].token.origChainID, global.chains[1].token.origTokenAccount, global.chains[1].token.shadowChainID, global.chains[1].token.shadowTokenAccount);
            // console.log("token1PairReceipt", token1PairReceipt.logs);
            assert.checkWeb3Event(token1PairReceipt, {
                event: 'AddTokenPair',
                args: {
                    id: global.chains[1].token.tokenPairID,
                    fromChainID: global.chains[1].token.origChainID,
                    fromAccount: global.chains[1].token.origTokenAccount.toLowerCase(),//web3.utils.hexToBytes(global.chains[1].token.origTokenAccount),// web3.utils.padRight(global.chains[1].token.origTokenAccount, 64).toLowerCase(),
                    toChainID: global.chains[1].token.shadowChainID,
                    toAccount: global.chains[1].token.shadowTokenAccount.toLowerCase()
                }
            });
            console.log("init 33", await getBalance(global.owner));

            // token2
            let shadowToken2Receipt = await tokenManager.addToken(global.chains[2].token.name, global.chains[2].token.symbol, global.chains[2].token.decimals);
            console.log("init 34", await getBalance(global.owner));
            let shadowToken2Logger = assert.getWeb3Log(shadowToken2Receipt, {
                event: 'AddToken'
            });
            global.chains[2].token.shadowTokenAccount = shadowToken2Logger.args.tokenAddress;
            assert.equal(global.chains[2].token.name, shadowToken2Logger.args.name);
            assert.equal(global.chains[2].token.symbol, shadowToken2Logger.args.symbol);
            assert.equal(global.chains[2].token.decimals, shadowToken2Logger.args.decimals);
            // console.log("check OK");

            let token2PairReceipt = await tokenManager.addTokenPair(global.chains[2].token.tokenPairID,
                [global.chains[2].token.origTokenAccount, global.chains[2].token.name, global.chains[2].token.symbol, global.chains[2].token.decimals, global.chains[2].token.origChainID],
                global.chains[2].token.origChainID, global.chains[2].token.origTokenAccount, global.chains[2].token.shadowChainID, global.chains[2].token.shadowTokenAccount);
            console.log("init 35", await getBalance(global.owner));
            assert.checkWeb3Event(token2PairReceipt, {
                event: 'AddTokenPair',
                args: {
                    id: global.chains[2].token.tokenPairID,
                    fromChainID: global.chains[2].token.origChainID,
                    fromAccount: global.chains[2].token.origTokenAccount.toLowerCase(),//web3.utils.hexToBytes(global.chains[2].token.origTokenAccount),//web3.utils.padRight(global.chains[2].token.origTokenAccount, 64).toLowerCase(),
                    toChainID: global.chains[2].token.shadowChainID,
                    toAccount: global.chains[2].token.shadowTokenAccount.toLowerCase()
                }
            });

            // coin1
            let shadowCoin1Receipt = await tokenManager.addToken(global.chains[1].coin.name, global.chains[1].coin.symbol, global.chains[1].coin.decimals);
            console.log("init 36", await getBalance(global.owner));
            // console.log(shadowCoin1Receipt.logs);
            let shadowCoin1Logger = assert.getWeb3Log(shadowCoin1Receipt, {
                event: 'AddToken'
            });
            global.chains[1].coin.shadowTokenAccount = shadowCoin1Logger.args.tokenAddress;
            assert.equal(global.chains[1].coin.name, shadowCoin1Logger.args.name);
            assert.equal(global.chains[1].coin.symbol, shadowCoin1Logger.args.symbol);
            assert.equal(global.chains[1].coin.decimals, Number(shadowCoin1Logger.args.decimals));

            let coin1PairReceipt = await tokenManager.addTokenPair(global.chains[1].coin.tokenPairID,
                [global.chains[1].coin.origTokenAccount, global.chains[1].coin.name, global.chains[1].coin.symbol, global.chains[1].coin.decimals, global.chains[1].coin.origChainID],
                global.chains[1].coin.origChainID, global.chains[1].coin.origTokenAccount, global.chains[1].coin.shadowChainID, global.chains[1].coin.shadowTokenAccount);
            assert.checkWeb3Event(coin1PairReceipt, {
                event: 'AddTokenPair',
                args: {
                    id: global.chains[1].coin.tokenPairID,
                    fromChainID: global.chains[1].coin.origChainID,
                    fromAccount: global.chains[1].coin.origTokenAccount.toLowerCase(),//web3.utils.hexToBytes(global.chains[1].coin.origTokenAccount),//web3.utils.padRight(global.chains[1].coin.origTokenAccount, 64).toLowerCase(),
                    toChainID: global.chains[1].coin.shadowChainID,
                    toAccount: global.chains[1].coin.shadowTokenAccount.toLowerCase()
                }
            });
            console.log("init 37", await getBalance(global.owner));

            // coin2
            let shadowCoin2Receipt = await tokenManager.addToken(global.chains[2].coin.name, global.chains[2].coin.symbol, global.chains[2].coin.decimals);
            console.log("init 38", await getBalance(global.owner));
            let shadowCoin2Logger = assert.getWeb3Log(shadowCoin2Receipt, {
                event: 'AddToken'
            });
            global.chains[2].coin.shadowTokenAccount = shadowCoin2Logger.args.tokenAddress;
            assert.equal(global.chains[2].coin.name, shadowCoin2Logger.args.name);
            assert.equal(global.chains[2].coin.symbol, shadowCoin2Logger.args.symbol);
            assert.equal(global.chains[2].coin.decimals, shadowCoin2Logger.args.decimals);
            // console.log("check OK");

            let coin2PairReceipt = await tokenManager.addTokenPair(global.chains[2].coin.tokenPairID,
                [global.chains[2].coin.origTokenAccount, global.chains[2].coin.name, global.chains[2].coin.symbol, global.chains[2].coin.decimals, global.chains[2].coin.origChainID],
                global.chains[2].coin.origChainID, global.chains[2].coin.origTokenAccount, global.chains[2].coin.shadowChainID, global.chains[2].coin.shadowTokenAccount);
            console.log("init 39", await getBalance(global.owner));
            assert.checkWeb3Event(coin2PairReceipt, {
                event: 'AddTokenPair',
                args: {
                    id: global.chains[2].coin.tokenPairID,
                    fromChainID: global.chains[2].coin.origChainID,
                    fromAccount: global.chains[2].coin.origTokenAccount.toLowerCase(),//web3.utils.hexToBytes(global.chains[2].coin.origTokenAccount),//web3.utils.padRight(global.chains[2].coin.origTokenAccount, 64).toLowerCase(),
                    toChainID: global.chains[2].coin.shadowChainID,
                    toAccount: global.chains[2].coin.shadowTokenAccount.toLowerCase()
                }
            });

            // token manager admin
            await tokenManager.addAdmin(global.chains[1].approach.instance.address, {from: global.owner});
            console.log("init 40", await getBalance(global.owner));

            await tokenManager.addAdmin(global.chains[2].approach.instance.address, {from: global.owner});
            console.log("init 41", await getBalance(global.owner));

            // oracle config
            let smg1ConfigReceipt = await oracle.setStoremanGroupConfig(global.storemanGroups[1].ID, global.storemanGroups[1].status,
                web3.utils.toWei(global.storemanGroups[1].deposit), [global.storemanGroups[1].chain2, global.storemanGroups[1].chain1],
                [defaultCurve.curve2, defaultCurve.curve1],
                global.storemanGroups[1].gpk2, global.storemanGroups[1].gpk1,
                global.storemanGroups[1].startTime, global.storemanGroups[1].endTime, {from: global.owner});
            // console.log("smg1ConfigReceipt", smg1ConfigReceipt.logs);
            console.log("init 42", await getBalance(global.owner));

            let smg2ConfigReceipt = await oracle.setStoremanGroupConfig(global.storemanGroups[2].ID, global.storemanGroups[2].status,
                web3.utils.toWei(global.storemanGroups[2].deposit), [global.storemanGroups[2].chain2, global.storemanGroups[2].chain1],
                [defaultCurve.curve2, defaultCurve.curve1],
                global.storemanGroups[2].gpk2, global.storemanGroups[2].gpk1,
                global.storemanGroups[2].startTime, global.storemanGroups[2].endTime, {from: global.owner});
            // console.log("smg2ConfigReceipt", smg2ConfigReceipt.logs);
            console.log("init 43", await getBalance(global.owner));
            let smg1DepositReceipt = await oracle.updateDeposit(global.storemanGroups[1].ID, web3.utils.toWei(global.storemanGroups[1].deposit), {from: global.owner});
            // assert.checkWeb3Event(smg1DepositReceipt, {
            //     event: 'UpdateDeposit',
            //     args: {
            //         smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
            //         amount:web3.utils.toWei(global.storemanGroups[1].deposit)
            //     }
            // });
            // console.log("smg1DepositReceipt", smg1DepositReceipt.logs);
            console.log("init 44", await getBalance(global.owner));
            let smg2DepositReceipt = await oracle.updateDeposit(global.storemanGroups[2].ID, web3.utils.toWei(global.storemanGroups[2].deposit), {from: global.owner});
            // assert.checkWeb3Event(smg2DepositReceipt, {
            //     event: 'UpdateDeposit',
            //     args: {
            //         smgID: web3.utils.padRight(global.storemanGroups[2].ID, 64),
            //         amount:web3.utils.toWei(global.storemanGroups[2].deposit)
            //     }
            // });
            // console.log("smg2DepositReceipt", smg2DepositReceipt.logs);
            console.log("init 45", await getBalance(global.owner));
            let tokenSymbols = [
                web3.utils.hexToBytes(web3.utils.asciiToHex(global.chains[1].token.symbol)),
                web3.utils.hexToBytes(web3.utils.asciiToHex(global.chains[2].token.symbol)),
                web3.utils.hexToBytes(web3.utils.asciiToHex(global.chains[1].coin.symbol)),
                web3.utils.hexToBytes(web3.utils.asciiToHex(global.chains[2].coin.symbol)),
            ];
            let tokenPrices = [
                web3.utils.toWei(toNonExponential(global.chains[1].token.price)),
                web3.utils.toWei(toNonExponential(global.chains[2].token.price)),
                web3.utils.toWei(toNonExponential(global.chains[1].coin.price)),
                web3.utils.toWei(toNonExponential(global.chains[2].coin.price)),
            ];
            let priceLogger = await oracle.updatePrice(tokenSymbols, tokenPrices);
            console.log("init 46", await getBalance(global.owner));
            let oraclePrices = await oracle.getValues(tokenSymbols);
            assert.equal(oraclePrices[0].eq(new BN(tokenPrices[0])), true);
            assert.equal(oraclePrices[1].eq(new BN(tokenPrices[1])), true);
            assert.equal(oraclePrices[2].eq(new BN(tokenPrices[2])), true);
            assert.equal(oraclePrices[3].eq(new BN(tokenPrices[3])), true);
            // console.log(oraclePrices);

            // quota config
            let quota1ConfigReceipt = await quota1.config(
                oracle.address,
                global.chains[1].approach.instance.address,
                global.chains[1].approach.instance.address,
                smgAdminProxy.address,
                tokenManager.address,
                quotaDepositRate,
                global.chains[1].coin.symbol,
                {from: global.owner}
            );
            console.log("init 47", await getBalance(global.owner));

            let quota2ConfigReceipt = await quota2.config(
                oracle.address,
                global.chains[2].approach.instance.address,
                global.chains[2].approach.instance.address,
                oracle.address,
                tokenManager.address,
                quotaDepositRate,
                global.chains[2].coin.symbol,
                {from: global.owner}
            );
            console.log("init 48", await getBalance(global.owner));

        } catch (err) {
            assert.fail(err);
        }
    });

    importMochaTest("Test Common", './crossApproach/common_test');

    importMochaTest("Test Rapidity", './crossApproach/rapidity_test');

    importMochaTest("Test HTLC", './crossApproach/htlc_test');

    importMochaTest("Test Debt", './crossApproach/debt_test');

    after("finish...   -> success", function () {
        global.accounts = null;
        global.storemanGroups = null;
        global.chains = null;
        global.owner = null;
        global.schnorr = null;
        global.crossDelegateNotInit = null;
        console.log("After all tests");
    });
});
