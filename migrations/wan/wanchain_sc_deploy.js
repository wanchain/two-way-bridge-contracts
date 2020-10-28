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

    const admin = deployer.getAddressString(cfg.adminPrivateKey);
    console.log("admin", admin);

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
    // abi[scDict.TokenManagerProxy] = tokenManagerDelegate.abi;
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
    // abi[scDict.QuotaProxy] = quotaDelegate.abi;
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
    // abi[scDict.OracleProxy] = oracleDelegate.abi;
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
    console.log("QuotaProxy", quota.address);
    console.log("SignatureVerifier", signatureVerifier.address);
    console.log("OracleProxy", oracle.address);
    console.log("CrossProxy", crossApproach.address);

    txData = await crossApproach.methods.setPartners(
        tokenManager.address, // tokenManager
        smg.address, // smgAdminProxy
        smg.address, // smgFeeProxy
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
        smg.address,
        tokenManager.address,
        quotaDepositRate,
        priceSymbol
    ).encodeABI();
    await deployer.sendTx(quota.address, txData);

    return {address:contract, abi:abi};
}

module.exports = { deploy };
