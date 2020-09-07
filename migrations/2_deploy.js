

//const QuotaLib = artifacts.require('QuotaLib');
let PosLib = artifacts.require('PosLib');
const StoremanUtil = artifacts.require('StoremanUtil');


const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');

const CommonTool = artifacts.require('CommonTool');
const MetricProxy = artifacts.require('MetricProxy');
const MetricDelegate = artifacts.require('MetricDelegate');
const MetricLib = artifacts.require('MetricLib');
const FakeSmg = artifacts.require('FakeSmg');
const FakeSkCurve = artifacts.require('FakeSkCurve');
const FakeBnCurve = artifacts.require('FakeBnCurve');
const FakePosLib = artifacts.require('FakePosLib');
const FakeCommonTool = artifacts.require('FakeCommonTool');

const Secp256k1Curve = artifacts.require('Secp256k1Curve');
const Bn256Curve = artifacts.require('Bn256Curve');
const GpkLib = artifacts.require('GpkLib');
const GpkProxy = artifacts.require('GpkProxy');
const GpkDelegate = artifacts.require('GpkDelegate');
const Deposit = artifacts.require('Deposit');
const TestDeposit = artifacts.require('TestDeposit');
const StoremanLib = artifacts.require('StoremanLib');
const IncentiveLib = artifacts.require('IncentiveLib');

const fakeQuota = artifacts.require('fakeQuota');

const HTLCTxLib = artifacts.require('HTLCTxLib');
const HTLCBurnLib = artifacts.require('HTLCBurnLib');
const HTLCDebtLib = artifacts.require('HTLCDebtLib');
const HTLCMintLib = artifacts.require('HTLCMintLib');
const RapidityLib = artifacts.require('RapidityLib');
const CrossDelegate = artifacts.require('CrossDelegate');
const CrossProxy = artifacts.require('CrossProxy');

const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const TokenManagerProxy = artifacts.require('TokenManagerProxy');

const QuotaDelegate = artifacts.require('QuotaDelegate');
const QuotaProxy = artifacts.require('QuotaProxy');

const OracleDelegate = artifacts.require('OracleDelegate');
const OracleProxy = artifacts.require('OracleProxy');

const Bn128SchnorrVerifier = artifacts.require('Bn128SchnorrVerifier');
const Secp256k1SchnorrVerifier = artifacts.require('Secp256k1SchnorrVerifier');
const SignatureVerifier = artifacts.require('SignatureVerifier');

const ConfigDelegate = artifacts.require('ConfigDelegate');
const ConfigProxy = artifacts.require('ConfigProxy');

const config = require("../truffle-config");

const curveMap = new Map([
    ['secp256k1', 0],
    ['bn256', 1]
])
const coinSymbol = "WAN";
const htlcLockedTime = 60*60; //unit: s
const quotaDepositRate = 15000;

function replaceLib(contract, from, to) {
  let placeholder = '__' + from.contractName + Array(40 - from.contractName.length - 2).fill('_').join("");
  let newPlaceholder = '__' + to.contractName + Array(40 - to.contractName.length - 2).fill('_').join("");
  let re = new RegExp(placeholder, 'g');
  contract.bytecode = contract.bytecode.replace(re, newPlaceholder);
}

module.exports = async function (deployer, network) {
    global.network = network;
    if (network === 'nodeploy') return;
    if (network === 'localTest') return;

    const isMainnet = network.startsWith("mainnet");

    // ***********two-way-bridge*****************
    // token manager
    await deployer.deploy(TokenManagerDelegate);
    await deployer.deploy(TokenManagerProxy);
    let tokenManagerProxy = await TokenManagerProxy.deployed();
    let tokenManagerDelegate = await TokenManagerDelegate.deployed();
    await tokenManagerProxy.upgradeTo(tokenManagerDelegate.address);
    let tokenManager = await TokenManagerDelegate.at(tokenManagerProxy.address);

    // quota
    await deployer.deploy(QuotaDelegate);
    await deployer.deploy(QuotaProxy);
    let quotaProxy = await QuotaProxy.deployed();
    let quotaDelegate = await QuotaDelegate.deployed();
    await quotaProxy.upgradeTo(quotaDelegate.address);
    let quota = await QuotaDelegate.at(quotaProxy.address);

    // oracle
    await deployer.deploy(OracleDelegate);
    await deployer.deploy(OracleProxy);
    let oracleProxy = await OracleProxy.deployed();
    let oracleDelegate = await OracleDelegate.deployed();
    await oracleProxy.upgradeTo(oracleDelegate.address);

    // signature verifier
    await deployer.deploy(SignatureVerifier);
    await deployer.deploy(Bn128SchnorrVerifier);
    await deployer.deploy(Secp256k1SchnorrVerifier);

    // cross approach smart contracts
    await deployer.deploy(HTLCTxLib);

    await deployer.link(HTLCTxLib, HTLCDebtLib);
    await deployer.deploy(HTLCDebtLib);

    await deployer.link(HTLCTxLib, HTLCMintLib);
    await deployer.deploy(HTLCMintLib);

    await deployer.link(HTLCTxLib, HTLCBurnLib);
    await deployer.deploy(HTLCBurnLib);

    await deployer.deploy(RapidityLib);

    await deployer.link(HTLCTxLib, CrossDelegate);
    await deployer.link(HTLCDebtLib, CrossDelegate);
    await deployer.link(HTLCMintLib, CrossDelegate);
    await deployer.link(HTLCBurnLib, CrossDelegate);
    await deployer.link(RapidityLib, CrossDelegate);
    await deployer.deploy(CrossDelegate);

    await deployer.deploy(CrossProxy);
    let crossProxy = await CrossProxy.deployed();
    let crossDelegate = await CrossDelegate.deployed();
    await crossProxy.upgradeTo(crossDelegate.address);
    let crossApproach = await CrossDelegate.at(crossProxy.address);

    // ***********osm*****************
    // storeman group admin sc
    let posLib = await deployer.deploy(PosLib);
    if(network == 'local' || network == 'coverage') {
      posLib = await deployer.deploy(FakePosLib);
    } 
        
    //await deployer.link(PosLib,StoremanUtil);
    await deployer.deploy(StoremanUtil);
    await deployer.link(StoremanUtil,StoremanLib);
    await deployer.link(StoremanUtil,IncentiveLib);
    //await deployer.link(PosLib,StoremanGroupDelegate);
    await deployer.deploy(Deposit);
    await deployer.deploy(TestDeposit);
    await deployer.link(Deposit,StoremanGroupDelegate);
    await deployer.deploy(StoremanLib);
    await deployer.link(StoremanLib,StoremanGroupDelegate);
    //await deployer.link(PosLib,IncentiveLib)
    await deployer.deploy(IncentiveLib);
    await deployer.link(IncentiveLib,StoremanGroupDelegate);
    await deployer.link(StoremanUtil,StoremanGroupDelegate);

    await deployer.deploy(StoremanGroupProxy);
    let smgProxy = await StoremanGroupProxy.deployed();
    await deployer.deploy(StoremanGroupDelegate);
    let smgDelegate = await StoremanGroupDelegate.deployed();
    await smgProxy.upgradeTo(smgDelegate.address);
    console.log("smg address:", smgProxy.address);

    // storm group admin dependence
    let smg = await StoremanGroupDelegate.at(smgProxy.address)
    await smg.addAdmin(config.networks[network].admin);

    // await smgProxy.upgradeTo(smgDelegate.address);
    await deployer.deploy(fakeQuota);
    let fakeQuotaInst = await fakeQuota.deployed();

    //deploy metric
    if(network == 'local' || network == 'coverage') {
        await deployer.deploy(FakeSmg);
    }
    await deployer.deploy(CommonTool);
    await deployer.link(CommonTool, MetricLib);
    //await deployer.link(PosLib, MetricLib);
    await deployer.deploy(MetricLib);

    await deployer.link(CommonTool, MetricDelegate);
    await deployer.link(MetricLib, MetricDelegate);
    //await deployer.link(PosLib, MetricDelegate);

    await deployer.deploy(MetricProxy);
    let metricProxy = await MetricProxy.deployed();
    await deployer.deploy(MetricDelegate);
    let metricDlg = await MetricDelegate.deployed();
    await metricProxy.upgradeTo(metricDlg.address);
    console.log("metric address:", metricProxy.address);

    let metric = await MetricDelegate.at(metricProxy.address);

    // create gpk sc
    if (network == 'local' || network == 'coverage') {
      await deployer.deploy(FakeCommonTool);
      replaceLib(GpkLib, CommonTool, FakeCommonTool);
      await deployer.link(FakeCommonTool, GpkLib);
    } else {
      await deployer.link(CommonTool, GpkLib);
    }
    await deployer.deploy(GpkLib);

    await deployer.link(GpkLib, GpkDelegate);
    await deployer.deploy(GpkDelegate);

    await deployer.deploy(GpkProxy);
    let gpkProxy = await GpkProxy.deployed();
    let gpkDelegate = await GpkDelegate.deployed();
    await gpkProxy.upgradeTo(gpkDelegate.address);
    console.log("gpk address:", gpkProxy.address);
    let gpk = await GpkDelegate.at(GpkProxy.address);
    await gpk.addAdmin(config.networks[network].admin);

    // config
    await deployer.deploy(ConfigProxy);
    let cnfProxy = await ConfigProxy.deployed();
    await deployer.deploy(ConfigDelegate);
    let cnfDelegate = await ConfigDelegate.deployed();
    await cnfProxy.upgradeTo(cnfDelegate.address);
    let cnf = await ConfigDelegate.at(cnfProxy.address);
    await cnf.addAdmin(config.networks[network].admin);

    let secp256k1, bn256;
    if (network == 'local' || network == 'coverage') {
      await deployer.deploy(FakeSkCurve);
      secp256k1 = await FakeSkCurve.deployed();
      await deployer.deploy(FakeBnCurve);
      bn256 = await FakeBnCurve.deployed();
    } else {
      await deployer.deploy(Secp256k1Curve);
      secp256k1 = await Secp256k1Curve.deployed();
      await deployer.deploy(Bn256Curve);
      bn256 = await Bn256Curve.deployed();
    }
    await cnf.setCurve([curveMap.get('secp256k1'), curveMap.get('bn256')], [secp256k1.address, bn256.address], {from: config.networks[network].admin});

    // dependence
    await smg.setDependence(metricProxy.address, gpkProxy.address, quotaProxy.address,posLib.address);

    await gpk.setDependence(cnfProxy.address, smgProxy.address);
    await metric.setDependence(cnfProxy.address, smgProxy.address, posLib.address);

    // config SignatureVerifier
    let signatureVerifier = await SignatureVerifier.deployed();
    let bn128 = await Bn128SchnorrVerifier.deployed();
    let secp256K1 = await Secp256k1SchnorrVerifier.deployed();
    signatureVerifier.register(curveMap.get('bn256'), bn128.address);
    signatureVerifier.register(curveMap.get('secp256k1'), secp256K1.address);

    // config crossApproach
    if (!isMainnet) {
      await crossApproach.setLockedTime(htlcLockedTime)
    }
    await crossApproach.setPartners(
      tokenManager.address, // tokenManager
      smg.address, // smgAdminProxy
      smg.address, // smgFeeProxy
      quota.address, // quota
      signatureVerifier.address // sigVerifier
    );
    // config tokenManager admin
    await tokenManager.addAdmin(crossApproach.address);
    // config quota
    await quota.config(
      oracleProxy.address,
      crossApproach.address,
      crossApproach.address,
      smg.address,
      tokenManager.address,
      quotaDepositRate,
      coinSymbol
  );
}
