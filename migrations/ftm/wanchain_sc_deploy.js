const deployer = require('wanchain-sc-sdk');
const scDict = require('./contract');
const {
    curveMap,
    priceSymbol,
    quotaDepositRate,
    htlcTimeTestnet,
    ADDRESS_0
} = require('../utils/config');
const sleep = require('ko-sleep');

const SLEEPTIME = 2000; // 20s
async function deploy(cfg, isMainnet) {
    let contract = {};
    let abi = {};
    let txData;

    await deployer.config(cfg);

    // ***********two-way-bridge*****************

    // token manager
    await deployer.deploy(scDict.TokenManagerDelegate);
    await sleep(SLEEPTIME);
    await deployer.deploy(scDict.TokenManagerProxy);
    await sleep(SLEEPTIME);

    let tokenManagerProxy = await deployer.deployed(scDict.TokenManagerProxy);
    await sleep(SLEEPTIME);

    let tokenManagerDelegate = await deployer.deployed(scDict.TokenManagerDelegate);
    await sleep(SLEEPTIME);

    txData = await tokenManagerProxy.methods.upgradeTo(tokenManagerDelegate.address).encodeABI();

    await deployer.sendTx(tokenManagerProxy.address, txData);
    await sleep(SLEEPTIME);

    let tokenManager = await deployer.at(scDict.TokenManagerDelegate, tokenManagerProxy.address);

    contract[scDict.TokenManagerProxy] = tokenManagerProxy.address;
    contract[scDict.TokenManagerDelegate] = tokenManagerDelegate.address;
    abi[scDict.TokenManagerDelegate] = tokenManagerDelegate.abi;

    await sleep(SLEEPTIME);


    // quota
    await deployer.deploy(scDict.QuotaDelegate);
    await sleep(SLEEPTIME);

    await deployer.deploy(scDict.QuotaProxy);
    await sleep(SLEEPTIME);

    let quotaProxy = await deployer.deployed(scDict.QuotaProxy);
    let quotaDelegate = await deployer.deployed(scDict.QuotaDelegate);
    txData = await quotaProxy.methods.upgradeTo(quotaDelegate.address).encodeABI();
    await deployer.sendTx(quotaProxy.address, txData);
    await sleep(SLEEPTIME);

    let quota = await deployer.at(scDict.QuotaDelegate, quotaProxy.address);

    contract[scDict.QuotaProxy] = quotaProxy.address;
    contract[scDict.QuotaDelegate] = quotaDelegate.address;
    abi[scDict.QuotaDelegate] = quotaDelegate.abi;

    await sleep(SLEEPTIME);


    // oracle
    await deployer.deploy(scDict.OracleDelegate);
    await sleep(SLEEPTIME);

    await deployer.deploy(scDict.OracleProxy);
    await sleep(SLEEPTIME);

    let oracleProxy = await deployer.deployed(scDict.OracleProxy);
    let oracleDelegate = await deployer.deployed(scDict.OracleDelegate);
    txData = await oracleProxy.methods.upgradeTo(oracleDelegate.address).encodeABI();
    await deployer.sendTx(oracleProxy.address, txData);
    let oracle = await deployer.at(scDict.OracleDelegate, oracleProxy.address);

    contract[scDict.OracleProxy] = oracleProxy.address;
    contract[scDict.OracleDelegate] = oracleDelegate.address;
    abi[scDict.OracleDelegate] = oracleDelegate.abi;

    await sleep(SLEEPTIME);


    // signature verifier
    await deployer.deploy(scDict.SignatureVerifier);
    await sleep(SLEEPTIME);

    await deployer.deploy(scDict.Bn128SchnorrVerifier);
    // await deployer.deploy(scDict.Secp256k1SchnorrVerifier);

    await sleep(SLEEPTIME);


    // cross approach smart contracts
    await deployer.deploy(scDict.HTLCTxLib);
    await sleep(SLEEPTIME);

    let htlcTxLib = await deployer.deployed(scDict.HTLCTxLib);
    contract[scDict.HTLCTxLib] = htlcTxLib.address;

    await deployer.link(scDict.HTLCDebtLib, scDict.HTLCTxLib);
    await deployer.deploy(scDict.HTLCDebtLib);
    await sleep(SLEEPTIME);

    let htlcDebtLib = await deployer.deployed(scDict.HTLCDebtLib);
    contract[scDict.HTLCDebtLib] = htlcDebtLib.address;

    await sleep(SLEEPTIME);


    await deployer.deploy(scDict.RapidityLib);
    let rapidityLib = await deployer.deployed(scDict.RapidityLib);
    contract[scDict.RapidityLib] = rapidityLib.address;

    await sleep(SLEEPTIME);


    await deployer.link(scDict.CrossDelegate, scDict.HTLCTxLib);
    await deployer.link(scDict.CrossDelegate, scDict.HTLCDebtLib);

    await sleep(SLEEPTIME);

    console.log('Linking: RapidityLib');

    await deployer.link(scDict.CrossDelegate, scDict.RapidityLib);


    console.log('CrossDelegate linked finished, waiting 20 seconds...');

    await sleep(20000);

    await deployer.deploy(scDict.CrossDelegate);
    console.log('CrossDelegate deployed finished');


    await sleep(SLEEPTIME);


    await deployer.deploy(scDict.CrossProxy);

    await sleep(SLEEPTIME);


    let crossProxy = await deployer.deployed(scDict.CrossProxy);
    let crossDelegate = await deployer.deployed(scDict.CrossDelegate);
    txData = await crossProxy.methods.upgradeTo(crossDelegate.address).encodeABI();
    await deployer.sendTx(crossProxy.address, txData);
    await sleep(SLEEPTIME);

    let crossApproach = await deployer.at(scDict.CrossDelegate, crossProxy.address);

    await sleep(SLEEPTIME);


    contract[scDict.CrossProxy] = crossProxy.address;
    contract[scDict.CrossDelegate] = crossDelegate.address;
    abi[scDict.CrossDelegate] = crossDelegate.abi;

    // config SignatureVerifier
    let signatureVerifier = await deployer.deployed(scDict.SignatureVerifier);
    let bn128 = await deployer.deployed(scDict.Bn128SchnorrVerifier);
    // let secp256K1 = await deployer.deployed(scDict.Secp256k1SchnorrVerifier);

    await sleep(SLEEPTIME);


    txData = await signatureVerifier.methods.register(curveMap.get('bn256'), bn128.address).encodeABI();
    await deployer.sendTx(signatureVerifier.address, txData);
    // txData = await signatureVerifier.methods.register(curveMap.get('secp256k1'), secp256K1.address).encodeABI();
    // await deployer.sendTx(signatureVerifier.address, txData);
    await sleep(SLEEPTIME);

    contract[scDict.SignatureVerifier] = signatureVerifier.address;
    contract[scDict.Bn128SchnorrVerifier] = bn128.address;
    // contract[scDict.Secp256k1SchnorrVerifier] = secp256K1.address;
    abi[scDict.SignatureVerifier] = signatureVerifier.abi;

    await sleep(SLEEPTIME);

    // config crossApproach
    if (!isMainnet) {
        txData = await crossApproach.methods.setLockedTime(htlcTimeTestnet).encodeABI();
        await deployer.sendTx(crossApproach.address, txData);
    }
    console.log("TokenManagerProxy", tokenManager.address);
    console.log("StoremanGroupProxy", oracle.address);
    console.log("smgFeeProxyAddr", ADDRESS_0);
    console.log("QuotaProxy", quota.address);
    console.log("SignatureVerifier", signatureVerifier.address);
    console.log("OracleProxy", oracle.address);
    console.log("CrossProxy", crossApproach.address);
    txData = await crossApproach.methods.setPartners(
        tokenManager.address, // tokenManager
        oracle.address, // smgAdminProxy
        ADDRESS_0, // smgFeeProxy
        quota.address, // quota
        signatureVerifier.address // sigVerifier
    ).encodeABI();
    await deployer.sendTx(crossApproach.address, txData);

    await sleep(SLEEPTIME);


    // config tokenManager admin
    txData = await tokenManager.methods.addAdmin(crossApproach.address).encodeABI();
    await deployer.sendTx(tokenManager.address, txData);
    await sleep(SLEEPTIME);

    // config quota
    txData = await quota.methods.config(
        oracle.address,
        crossApproach.address,
        crossApproach.address,
        oracle.address,
        tokenManager.address,
        quotaDepositRate,
        priceSymbol
    ).encodeABI();
    await deployer.sendTx(quota.address, txData);

    return {address:contract, abi:abi};
}

module.exports = { deploy };
