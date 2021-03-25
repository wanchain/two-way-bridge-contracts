const deployer = require('wanchain-sc-sdk');
const scDict = require('./contract');
const {
  curveMap,
  priceSymbol,
  quotaDepositRate,
  htlcTimeTestnet,
  ADDRESS_0
} = require('../utils/config');

async function deploy(cfg, isMainnet) {
    let contract = {};
    let abi = {};
    let txData;

    await deployer.config(cfg);

    // ***********two-way-bridge*****************

    // token manager
    await deployer.deploy(scDict.TokenManagerDelegate);
    await deployer.deploy(scDict.TokenManagerProxy);
    let tokenManagerProxy = await deployer.deployed(scDict.TokenManagerProxy);
    let tokenManagerDelegate = await deployer.deployed(scDict.TokenManagerDelegate);
    txData = await tokenManagerProxy.methods.upgradeTo(tokenManagerDelegate.address).encodeABI();
    await deployer.sendTx(tokenManagerProxy.address, txData);
    let tokenManager = await deployer.at(scDict.TokenManagerDelegate, tokenManagerProxy.address);

    contract[scDict.TokenManagerProxy] = tokenManagerProxy.address;
    contract[scDict.TokenManagerDelegate] = tokenManagerDelegate.address;
    abi[scDict.TokenManagerDelegate] = tokenManagerDelegate.abi;

    // quota
    await deployer.deploy(scDict.QuotaDelegate);
    await deployer.deploy(scDict.QuotaProxy);
    let quotaProxy = await deployer.deployed(scDict.QuotaProxy);
    let quotaDelegate = await deployer.deployed(scDict.QuotaDelegate);
    txData = await quotaProxy.methods.upgradeTo(quotaDelegate.address).encodeABI();
    await deployer.sendTx(quotaProxy.address, txData);
    let quota = await deployer.at(scDict.QuotaDelegate, quotaProxy.address);

    contract[scDict.QuotaProxy] = quotaProxy.address;
    contract[scDict.QuotaDelegate] = quotaDelegate.address;
    abi[scDict.QuotaDelegate] = quotaDelegate.abi;

    // oracle
    await deployer.deploy(scDict.OracleDelegate);
    await deployer.deploy(scDict.OracleProxy);
    let oracleProxy = await deployer.deployed(scDict.OracleProxy);
    let oracleDelegate = await deployer.deployed(scDict.OracleDelegate);
    txData = await oracleProxy.methods.upgradeTo(oracleDelegate.address).encodeABI();
    await deployer.sendTx(oracleProxy.address, txData);
    let oracle = await deployer.at(scDict.OracleDelegate, oracleProxy.address);

    contract[scDict.OracleProxy] = oracleProxy.address;
    contract[scDict.OracleDelegate] = oracleDelegate.address;
    abi[scDict.OracleDelegate] = oracleDelegate.abi;

    // signature verifier
    await deployer.deploy(scDict.SignatureVerifier);
    await deployer.deploy(scDict.Bn128SchnorrVerifier);
    await deployer.deploy(scDict.Secp256k1SchnorrVerifier);

    // cross approach smart contracts
    await deployer.deploy(scDict.HTLCTxLib);
    let htlcTxLib = await deployer.deployed(scDict.HTLCTxLib);
    contract[scDict.HTLCTxLib] = htlcTxLib.address;

    await deployer.link(scDict.HTLCDebtLib, scDict.HTLCTxLib);
    await deployer.deploy(scDict.HTLCDebtLib);
    let htlcDebtLib = await deployer.deployed(scDict.HTLCDebtLib);
    contract[scDict.HTLCDebtLib] = htlcDebtLib.address;

    await deployer.deploy(scDict.RapidityLib);
    let rapidityLib = await deployer.deployed(scDict.RapidityLib);
    contract[scDict.RapidityLib] = rapidityLib.address;

    await deployer.link(scDict.CrossDelegate, scDict.HTLCTxLib);
    await deployer.link(scDict.CrossDelegate, scDict.HTLCDebtLib);

    await deployer.link(scDict.CrossDelegate, scDict.RapidityLib);
    await deployer.deploy(scDict.CrossDelegate);

    await deployer.deploy(scDict.CrossProxy);

    let crossProxy = await deployer.deployed(scDict.CrossProxy);
    let crossDelegate = await deployer.deployed(scDict.CrossDelegate);
    txData = await crossProxy.methods.upgradeTo(crossDelegate.address).encodeABI();
    await deployer.sendTx(crossProxy.address, txData);
    let crossApproach = await deployer.at(scDict.CrossDelegate, crossProxy.address);

    contract[scDict.CrossProxy] = crossProxy.address;
    contract[scDict.CrossDelegate] = crossDelegate.address;
    abi[scDict.CrossDelegate] = crossDelegate.abi;

    // config SignatureVerifier
    let signatureVerifier = await deployer.deployed(scDict.SignatureVerifier);
    let bn128 = await deployer.deployed(scDict.Bn128SchnorrVerifier);
    let secp256K1 = await deployer.deployed(scDict.Secp256k1SchnorrVerifier);

    txData = await signatureVerifier.methods.register(curveMap.get('bn256'), bn128.address).encodeABI();
    await deployer.sendTx(signatureVerifier.address, txData);
    txData = await signatureVerifier.methods.register(curveMap.get('secp256k1'), secp256K1.address).encodeABI();
    await deployer.sendTx(signatureVerifier.address, txData);

    contract[scDict.SignatureVerifier] = signatureVerifier.address;
    contract[scDict.Bn128SchnorrVerifier] = bn128.address;
    contract[scDict.Secp256k1SchnorrVerifier] = secp256K1.address;
    abi[scDict.SignatureVerifier] = signatureVerifier.abi;

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
    // config tokenManager admin
    txData = await tokenManager.methods.addAdmin(crossApproach.address).encodeABI();
    await deployer.sendTx(tokenManager.address, txData);
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
