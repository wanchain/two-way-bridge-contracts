const deployer = require('wanchain-sc-sdk');
const scDict = require('./contract');
const {
    curveMap,
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
    // const admin = deployer.getAddressString(cfg.adminPrivateKey);
    // console.log("admin", admin);

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

    await deployer.link(scDict.HTLCDebtLibV2, scDict.HTLCTxLib);
    await deployer.deploy(scDict.HTLCDebtLibV2);
    let htlcDebtLib = await deployer.deployed(scDict.HTLCDebtLibV2);
    // let htlcDebtLib = await deployer.at(scDict.HTLCDebtLibV2, "0xc928c8e48647c8b0ce550C2352087B1cF5c6111e");
    contract[scDict.HTLCDebtLib] = htlcDebtLib.address;

    await sleep(SLEEPTIME);


    await deployer.deploy(scDict.RapidityLibV2);
    let rapidityLib = await deployer.deployed(scDict.RapidityLibV2);
    // let rapidityLib = await deployer.deployed(scDict.RapidityLibV2, "0x97Ce40AeB600F3A1e2Cac32208FC58C937676688");
    contract[scDict.RapidityLib] = rapidityLib.address;

    await sleep(SLEEPTIME);


    await deployer.link(scDict.CrossDelegateV2, scDict.HTLCTxLib);
    await deployer.link(scDict.CrossDelegateV2, scDict.HTLCDebtLibV2);

    await sleep(SLEEPTIME);

    console.log('Linking: RapidityLib');

    await deployer.link(scDict.CrossDelegateV2, scDict.RapidityLibV2);


    console.log('CrossDelegate linked finished, waiting 20 seconds...');

    await sleep(20000);

    await deployer.deploy(scDict.CrossDelegateV2);
    console.log('CrossDelegate deployed finished');


    await sleep(SLEEPTIME);


    await deployer.deploy(scDict.CrossProxy);

    await sleep(SLEEPTIME);


    let crossProxy = await deployer.deployed(scDict.CrossProxy);
    let crossDelegate = await deployer.deployed(scDict.CrossDelegateV2);
    txData = await crossProxy.methods.upgradeTo(crossDelegate.address).encodeABI();
    await deployer.sendTx(crossProxy.address, txData);
    await sleep(SLEEPTIME);

    let crossApproach = await deployer.at(scDict.CrossDelegate, crossProxy.address);

    await sleep(SLEEPTIME);

    // const chainID = 2153201998;
    // try {
    //   txData = await crossApproach.methods.setAdmin(admin).encodeABI();
    //   await deployer.sendTx(crossApproach.address, txData);

    //   txData = await crossApproach.methods.setChainID(chainID).encodeABI();
    //   await deployer.sendTx(crossApproach.address, txData);
    // } catch (err) {
    //   console.log("setChainID error", err, chainID);
    // }

    contract[scDict.CrossProxy] = crossProxy.address;
    contract[scDict.CrossDelegate] = crossDelegate.address;
    abi[scDict.CrossDelegate] = crossDelegate.abi;

    // config SignatureVerifier
    let signatureVerifier = await deployer.deployed(scDict.SignatureVerifier);
    let bn128 = await deployer.deployed(scDict.Bn128SchnorrVerifier);
    let secp256K1 = await deployer.deployed(scDict.Secp256k1SchnorrVerifier);

    await sleep(SLEEPTIME);


    txData = await signatureVerifier.methods.register(curveMap.get('bn256'), bn128.address).encodeABI();
    await deployer.sendTx(signatureVerifier.address, txData);
    txData = await signatureVerifier.methods.register(curveMap.get('secp256k1'), secp256K1.address).encodeABI();
    await deployer.sendTx(signatureVerifier.address, txData);
    await sleep(SLEEPTIME);

    contract[scDict.SignatureVerifier] = signatureVerifier.address;
    contract[scDict.Bn128SchnorrVerifier] = bn128.address;
    contract[scDict.Secp256k1SchnorrVerifier] = secp256K1.address;
    abi[scDict.SignatureVerifier] = signatureVerifier.abi;

    await sleep(SLEEPTIME);

    // ***********osm*****************
    
    // storeman group admin sc
    let posLib = await deployer.deploy(scDict.PosLib);
    contract[scDict.PosLib] = posLib.address;

    let commonTool = await deployer.deploy(scDict.CommonTool);
    contract[scDict.CommonTool] = commonTool.address;

    await deployer.link(scDict.StoremanUtil, scDict.CommonTool);
    let storemanUtil = await deployer.deploy(scDict.StoremanUtil);
    contract[scDict.StoremanUtil] = storemanUtil.address;

    await deployer.link(scDict.StoremanLib, scDict.StoremanUtil);
    let storemanLib = await deployer.deploy(scDict.StoremanLib);
    contract[scDict.StoremanLib] = storemanLib.address;

    //await deployer.link(scDict.IncentiveLib, scDict.PosLib);
    await deployer.link(scDict.IncentiveLib, scDict.StoremanUtil);
    let incentiveLib = await deployer.deploy(scDict.IncentiveLib);
    contract[scDict.IncentiveLib] = incentiveLib.address;

    let deposit = await deployer.deploy(scDict.Deposit);
    contract[scDict.Deposit] = deposit.address;

    //await deployer.link(scDict.StoremanGroupDelegate, scDict.PosLib);
    await deployer.link(scDict.StoremanGroupDelegate, scDict.StoremanUtil);
    await deployer.link(scDict.StoremanGroupDelegate, scDict.StoremanLib);
    await deployer.link(scDict.StoremanGroupDelegate, scDict.IncentiveLib);
    await deployer.link(scDict.StoremanGroupDelegate, scDict.Deposit);
    await deployer.deploy(scDict.StoremanGroupDelegate);
    await deployer.deploy(scDict.StoremanGroupProxy);
    let smgDelegate = await deployer.deployed(scDict.StoremanGroupDelegate);
    let smgProxy = await deployer.deployed(scDict.StoremanGroupProxy);
    // let smgProxy = await deployer.deploy(scDict.StoremanGroupProxy);

    contract[scDict.StoremanGroupProxy] = smgProxy.address;
    contract[scDict.StoremanGroupDelegate] = smgDelegate.address;
    abi[scDict.StoremanGroupDelegate] = smgDelegate.abi;

    txData = await smgProxy.methods.upgradeTo(smgDelegate.address).encodeABI();
    await deployer.sendTx(smgProxy.address, txData);
    console.log("smg address:", smgProxy.address);

    // storm group admin dependence
    let smg = await deployer.at(scDict.StoremanGroupDelegate, smgProxy.address);
    txData = await smg.methods.addAdmin(admin).encodeABI();
    await deployer.sendTx(smg.address, txData);

    // ListGroup
    await deployer.link(scDict.ListGroup, scDict.StoremanUtil);
    let listGroup = await deployer.deploy(scDict.ListGroup, smgProxy.address, posLib.address);
    contract[scDict.ListGroup] = listGroup.address;
    abi[scDict.ListGroup] = listGroup.abi;

    // storm group global dependence
    txData = await smg.methods.setGlobalGroupScAddr(listGroup.address).encodeABI();
    await deployer.sendTx(smg.address, txData);

    //deploy metric
    await deployer.link(scDict.MetricLib, scDict.CommonTool);
    //await deployer.link(scDict.MetricLib, scDict.PosLib);
    let metricLib = await deployer.deploy(scDict.MetricLib);
    contract[scDict.MetricLib] = metricLib.address;

    await deployer.link(scDict.MetricDelegate, scDict.CommonTool);
    await deployer.link(scDict.MetricDelegate, scDict.MetricLib);
    //await deployer.link(scDict.MetricDelegate, scDict.PosLib);
    await deployer.deploy(scDict.MetricDelegate);

    await deployer.deploy(scDict.MetricProxy);
    let metricProxy = await deployer.deployed(scDict.MetricProxy);
    let metricDlg = await deployer.deployed(scDict.MetricDelegate);

    contract[scDict.MetricProxy] = metricProxy.address;
    contract[scDict.MetricDelegate] = metricDlg.address;
    abi[scDict.MetricDelegate] = metricDlg.abi;

    txData = await metricProxy.methods.upgradeTo(metricDlg.address).encodeABI();
    await deployer.sendTx(metricProxy.address, txData);
    console.log("metric address:", metricProxy.address);

    let metric = await deployer.at(scDict.MetricDelegate, metricProxy.address);

    // create gpk sc
    await deployer.link(scDict.GpkLib, scDict.CommonTool);
    let gpkLib = await deployer.deploy(scDict.GpkLib);
    contract[scDict.GpkLib] = gpkLib.address;

    await deployer.link(scDict.GpkDelegate, scDict.GpkLib);
    await deployer.deploy(scDict.GpkDelegate);

    await deployer.deploy(scDict.GpkProxy);
    let gpkProxy = await deployer.deployed(scDict.GpkProxy);
    let gpkDelegate = await deployer.deployed(scDict.GpkDelegate);

    contract[scDict.GpkProxy] = gpkProxy.address;
    contract[scDict.GpkDelegate] = gpkDelegate.address;
    abi[scDict.GpkDelegate] = gpkDelegate.abi;

    txData = await gpkProxy.methods.upgradeTo(gpkDelegate.address).encodeABI();
    await deployer.sendTx(gpkProxy.address, txData);
    console.log("gpk address:", gpkProxy.address);

    let gpk = await deployer.at(scDict.GpkDelegate, gpkProxy.address);
    txData = await gpk.methods.addAdmin(admin).encodeABI();
    await deployer.sendTx(gpk.address, txData);

    // config
    await deployer.deploy(scDict.ConfigProxy);
    let cnfProxy = await deployer.deployed(scDict.ConfigProxy);
    await deployer.deploy(scDict.ConfigDelegate);
    let cnfDelegate = await deployer.deployed(scDict.ConfigDelegate);

    contract[scDict.ConfigProxy] = cnfProxy.address;
    contract[scDict.ConfigDelegate] = cnfDelegate.address;
    abi[scDict.ConfigDelegate] = cnfDelegate.abi;

    txData = await cnfProxy.methods.upgradeTo(cnfDelegate.address).encodeABI();
    await deployer.sendTx(cnfProxy.address, txData);
    let cnf = await deployer.at(scDict.ConfigDelegate, cnfProxy.address);
    txData = await cnf.methods.addAdmin(admin).encodeABI();
    await deployer.sendTx(cnf.address, txData);

    await deployer.deploy(scDict.Secp256k1Curve);
    let secp256k1 = await deployer.deployed(scDict.Secp256k1Curve);
    await deployer.deploy(scDict.Bn256Curve);
    let bn256 = await deployer.deployed(scDict.Bn256Curve);
    txData = await cnf.methods.setCurve([curveMap.get('secp256k1'), curveMap.get('bn256')], [secp256k1.address, bn256.address]).encodeABI();
    await deployer.sendTx(cnf.address, txData, {privateKey: cfg.adminPrivateKey});

    contract[scDict.Secp256k1Curve] = secp256k1.address;
    contract[scDict.Bn256Curve] = bn256.address;

    // dependence
    txData = await smg.methods.setDependence(metricProxy.address, gpkProxy.address, quotaProxy.address,posLib.address).encodeABI();
    await deployer.sendTx(smg.address, txData);

    txData = await gpk.methods.setDependence(cnfProxy.address, smgProxy.address).encodeABI();
    await deployer.sendTx(gpk.address, txData);
    txData = await metric.methods.setDependence(cnfProxy.address, smgProxy.address, posLib.address).encodeABI();
    await deployer.sendTx(metric.address, txData);

    // config crossApproach
    if (!isMainnet) {
      txData = await crossApproach.methods.setLockedTime(htlcTimeTestnet).encodeABI();
      await deployer.sendTx(crossApproach.address, txData);
    }
    console.log("TokenManagerProxy", tokenManager.address);
    console.log("StoremanGroupProxy", smg.address);
    console.log("smgFeeProxyAddr", smg.address);
    console.log("QuotaProxy", ADDRESS_0);
    console.log("SignatureVerifier", signatureVerifier.address);
    console.log("OracleProxy", oracle.address);
    console.log("CrossProxy", crossApproach.address);

    txData = await crossApproach.methods.setPartners(
        tokenManager.address, // tokenManager
        smg.address, // smgAdminProxy
        smg.address, // smgFeeProxy
        ADDRESS_0, // quota
        signatureVerifier.address // sigVerifier
    ).encodeABI();
    await deployer.sendTx(crossApproach.address, txData);

    await sleep(SLEEPTIME);


    // config tokenManager admin
    txData = await tokenManager.methods.addAdmin(crossApproach.address).encodeABI();
    await deployer.sendTx(tokenManager.address, txData);
    await sleep(SLEEPTIME);

    return {address:contract, abi:abi};
}

module.exports = { deploy };
