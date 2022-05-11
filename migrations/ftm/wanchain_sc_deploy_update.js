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

async function deploy(cfg, isMainnet) {
    let contract = {};
    let abi = {};
    let txData;

    await deployer.config(cfg);

    // ***********two-way-bridge*****************

    // token manager
    // await deployer.deploy(scDict.TokenManagerDelegate);
    // await sleep(5000);
    // await deployer.deploy(scDict.TokenManagerProxy);
    // await sleep(5000);
    //
    // let tokenManagerProxy = await deployer.deployed(scDict.TokenManagerProxy);
    // await sleep(5000);
    //
    // let tokenManagerDelegate = await deployer.deployed(scDict.TokenManagerDelegate);
    // await sleep(5000);
    //
    // txData = await tokenManagerProxy.methods.upgradeTo(tokenManagerDelegate.address).encodeABI();
    //
    // await deployer.sendTx(tokenManagerProxy.address, txData);
    // await sleep(5000);
    //
    // let tokenManager = await deployer.at(scDict.TokenManagerDelegate, tokenManagerProxy.address);
    //
    // contract[scDict.TokenManagerProxy] = tokenManagerProxy.address;
    // contract[scDict.TokenManagerDelegate] = tokenManagerDelegate.address;
    // abi[scDict.TokenManagerDelegate] = tokenManagerDelegate.abi;
    //
    // await sleep(5000);
    //
    //
    // // quota
    // await deployer.deploy(scDict.QuotaDelegate);
    // await sleep(5000);
    //
    // await deployer.deploy(scDict.QuotaProxy);
    // await sleep(5000);
    //
    // let quotaProxy = await deployer.deployed(scDict.QuotaProxy);
    // let quotaDelegate = await deployer.deployed(scDict.QuotaDelegate);
    // txData = await quotaProxy.methods.upgradeTo(quotaDelegate.address).encodeABI();
    // await deployer.sendTx(quotaProxy.address, txData);
    // await sleep(5000);
    //
    // let quota = await deployer.at(scDict.QuotaDelegate, quotaProxy.address);
    //
    // contract[scDict.QuotaProxy] = quotaProxy.address;
    // contract[scDict.QuotaDelegate] = quotaDelegate.address;
    // abi[scDict.QuotaDelegate] = quotaDelegate.abi;
    //
    // await sleep(5000);
    //
    //
    // // oracle
    // await deployer.deploy(scDict.OracleDelegate);
    // await sleep(5000);
    //
    // await deployer.deploy(scDict.OracleProxy);
    // await sleep(5000);
    //
    // let oracleProxy = await deployer.deployed(scDict.OracleProxy);
    // let oracleDelegate = await deployer.deployed(scDict.OracleDelegate);
    // txData = await oracleProxy.methods.upgradeTo(oracleDelegate.address).encodeABI();
    // await deployer.sendTx(oracleProxy.address, txData);
    // let oracle = await deployer.at(scDict.OracleDelegate, oracleProxy.address);
    //
    // contract[scDict.OracleProxy] = oracleProxy.address;
    // contract[scDict.OracleDelegate] = oracleDelegate.address;
    // abi[scDict.OracleDelegate] = oracleDelegate.abi;
    //
    // await sleep(5000);
    //
    //
    // // signature verifier
    // await deployer.deploy(scDict.SignatureVerifier);
    // await sleep(5000);
    //
    // await deployer.deploy(scDict.Bn128SchnorrVerifier);
    // // await deployer.deploy(scDict.Secp256k1SchnorrVerifier);
    //
    // await sleep(5000);


    // cross approach smart contracts
    await deployer.deploy(scDict.HTLCTxLib);
    await sleep(5000);

    let htlcTxLib = await deployer.deployed(scDict.HTLCTxLib);
    contract[scDict.HTLCTxLib] = htlcTxLib.address;

    await deployer.link(scDict.HTLCDebtLib, scDict.HTLCTxLib);
    await deployer.deploy(scDict.HTLCDebtLib);
    await sleep(5000);

    let htlcDebtLib = await deployer.deployed(scDict.HTLCDebtLib);
    contract[scDict.HTLCDebtLib] = htlcDebtLib.address;

    await sleep(5000);


    await deployer.deploy(scDict.RapidityLib);
    let rapidityLib = await deployer.deployed(scDict.RapidityLib);
    contract[scDict.RapidityLib] = rapidityLib.address;

    await sleep(5000);


    await deployer.link(scDict.CrossDelegate, scDict.HTLCTxLib);
    await deployer.link(scDict.CrossDelegate, scDict.HTLCDebtLib);

    await sleep(5000);

    console.log('Linking: RapidityLib');

    await deployer.link(scDict.CrossDelegate, scDict.RapidityLib);


    console.log('CrossDelegate linked finished, waiting 20 seconds...');

    await sleep(20000);

    await deployer.deploy(scDict.CrossDelegate);
    console.log('CrossDelegate deployed finished');


    await sleep(5000);


    //await deployer.deploy(scDict.CrossProxy);


    let crossProxy = await deployer.at(scDict.CrossProxy,"0xbf0deB5CD8E072018632e9646b4fE998d4047a86");
    let crossDelegate = await deployer.deployed(scDict.CrossDelegate);
    txData = await crossProxy.methods.upgradeTo(crossDelegate.address).encodeABI();
    await deployer.sendTx(crossProxy.address, txData);
    await sleep(5000);

    let crossApproach = await deployer.at(scDict.CrossDelegate, crossProxy.address);

    await sleep(5000);


    contract[scDict.CrossProxy] = crossProxy.address;
    contract[scDict.CrossDelegate] = crossDelegate.address;
    abi[scDict.CrossDelegate] = crossDelegate.abi;

    // // config SignatureVerifier
    // let signatureVerifier = await deployer.deployed(scDict.SignatureVerifier);
    // let bn128 = await deployer.deployed(scDict.Bn128SchnorrVerifier);
    // // let secp256K1 = await deployer.deployed(scDict.Secp256k1SchnorrVerifier);
    //
    // await sleep(5000);
    //
    //
    // txData = await signatureVerifier.methods.register(curveMap.get('bn256'), bn128.address).encodeABI();
    // await deployer.sendTx(signatureVerifier.address, txData);
    // // txData = await signatureVerifier.methods.register(curveMap.get('secp256k1'), secp256K1.address).encodeABI();
    // // await deployer.sendTx(signatureVerifier.address, txData);
    // await sleep(5000);
    //
    // contract[scDict.SignatureVerifier] = signatureVerifier.address;
    // contract[scDict.Bn128SchnorrVerifier] = bn128.address;
    // // contract[scDict.Secp256k1SchnorrVerifier] = secp256K1.address;
    // abi[scDict.SignatureVerifier] = signatureVerifier.abi;
    //
    // await sleep(5000);
    //
    // // config crossApproach
    // if (!isMainnet) {
    //   txData = await crossApproach.methods.setLockedTime(htlcTimeTestnet).encodeABI();
    //   await deployer.sendTx(crossApproach.address, txData);
    // }
    // console.log("TokenManagerProxy", tokenManager.address);
    // console.log("StoremanGroupProxy", oracle.address);
    // console.log("smgFeeProxyAddr", ADDRESS_0);
    // console.log("QuotaProxy", quota.address);
    // console.log("SignatureVerifier", signatureVerifier.address);
    // console.log("OracleProxy", oracle.address);
    // console.log("CrossProxy", crossApproach.address);
    // txData = await crossApproach.methods.setPartners(
    //     tokenManager.address, // tokenManager
    //     oracle.address, // smgAdminProxy
    //     ADDRESS_0, // smgFeeProxy
    //     quota.address, // quota
    //     signatureVerifier.address // sigVerifier
    // ).encodeABI();
    // await deployer.sendTx(crossApproach.address, txData);
    //
    // await sleep(5000);
    //
    //
    // // config tokenManager admin
    // txData = await tokenManager.methods.addAdmin(crossApproach.address).encodeABI();
    // await deployer.sendTx(tokenManager.address, txData);
    // await sleep(5000);
    //
    // // config quota
    // txData = await quota.methods.config(
    //     oracle.address,
    //     crossApproach.address,
    //     crossApproach.address,
    //     oracle.address,
    //     tokenManager.address,
    //     quotaDepositRate,
    //     priceSymbol
    // ).encodeABI();
    // await deployer.sendTx(quota.address, txData);

    return {address:contract, abi:abi};
}

module.exports = { deploy };
