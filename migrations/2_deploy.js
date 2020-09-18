const PosLib = artifacts.require('PosLib');
const StoremanUtil = artifacts.require('StoremanUtil');
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const FakePosLib = artifacts.require('FakePosLib');
const Deposit = artifacts.require('Deposit');
const StoremanLib = artifacts.require('StoremanLib');
const IncentiveLib = artifacts.require('IncentiveLib');
const fakeQuota = artifacts.require('fakeQuota');
const RapidityLib = artifacts.require('RapidityLib');
const CrossDelegate = artifacts.require('CrossDelegate');
const CrossProxy = artifacts.require('CrossProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const QuotaDelegate = artifacts.require('QuotaDelegate');
const QuotaProxy = artifacts.require('QuotaProxy');
const OracleDelegate = artifacts.require('OracleDelegate');
const OracleProxy = artifacts.require('OracleProxy');
const SignatureVerifier = artifacts.require('SignatureVerifier');
const config = require("../truffle-config");

const coinSymbol = "WAN";
const quotaDepositRate = 15000;

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
    await deployer.deploy(fakeQuota);
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

    await deployer.deploy(RapidityLib);
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
      quotaProxy = await fakeQuota.deployed()
    } 
        
    //await deployer.link(PosLib,StoremanUtil);
    await deployer.deploy(StoremanUtil);
    await deployer.link(StoremanUtil,StoremanLib);
    await deployer.link(StoremanUtil,IncentiveLib);
    //await deployer.link(PosLib,StoremanGroupDelegate);
    await deployer.deploy(Deposit);
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

    // dependence
    await smg.setDependence(quotaProxy.address, quotaProxy.address, quotaProxy.address, posLib.address);

    // config SignatureVerifier
    let signatureVerifier = await SignatureVerifier.deployed();

    // config crossApproach
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
