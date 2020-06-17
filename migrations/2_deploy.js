const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const Secp256k1 = artifacts.require('Secp256k1');
const SchnorrVerifier = artifacts.require('SchnorrVerifier');
const QuotaLib = artifacts.require('QuotaLib');
const PosLib = artifacts.require('PosLib');

const HTLCLib = artifacts.require('HTLCLib');
const HTLCDebtLib = artifacts.require('HTLCDebtLib');
const HTLCSmgLib = artifacts.require('HTLCSmgLib');
const HTLCUserLib = artifacts.require('HTLCUserLib');
const HTLCProxy = artifacts.require('HTLCProxy');
const HTLCDelegate = artifacts.require('HTLCDelegate');
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const TestSmg = artifacts.require('TestSmg');


const CommonTool = artifacts.require('CommonTool');
const MetricProxy = artifacts.require('MetricProxy');
const MetricDelegate = artifacts.require('MetricDelegate');
const MetricLib = artifacts.require('MetricLib');
const FakeSmg = artifacts.require('FakeSmg');

const Encrypt = artifacts.require('Encrypt');

const CreateGpkProxy = artifacts.require('CreateGpkProxy');
const CreateGpkDelegate = artifacts.require('CreateGpkDelegate');
const Deposit = artifacts.require('Deposit');
const StoremanLib = artifacts.require('StoremanLib');
const IncentiveLib = artifacts.require('IncentiveLib');

module.exports = async function (deployer, network) {
    if (network === 'nodeploy') return;

    // token manager sc
    await deployer.deploy(TokenManagerProxy);
    let tmProxy = await TokenManagerProxy.deployed();
    await deployer.deploy(TokenManagerDelegate);
    let tmDelegate = await TokenManagerDelegate.deployed();
    await tmProxy.upgradeTo(tmDelegate.address);

    // htlc sc
    await deployer.deploy(Secp256k1);
    await deployer.link(Secp256k1, SchnorrVerifier);

    await deployer.deploy(SchnorrVerifier);
    await deployer.deploy(QuotaLib);
    await deployer.deploy(HTLCLib);

    await deployer.link(SchnorrVerifier, HTLCDebtLib);
    await deployer.link(QuotaLib, HTLCDebtLib);
    await deployer.link(HTLCLib, HTLCDebtLib);
    await deployer.deploy(HTLCDebtLib);

    await deployer.link(SchnorrVerifier, HTLCSmgLib);
    await deployer.link(QuotaLib, HTLCSmgLib);
    await deployer.link(HTLCLib, HTLCSmgLib);
    await deployer.deploy(HTLCSmgLib);

    await deployer.link(QuotaLib, HTLCUserLib);
    await deployer.link(HTLCLib, HTLCUserLib);
    await deployer.deploy(HTLCUserLib);

    await deployer.link(SchnorrVerifier, HTLCDelegate);
    await deployer.link(QuotaLib, HTLCDelegate);
    await deployer.link(HTLCLib, HTLCDelegate);
    await deployer.link(HTLCDebtLib, HTLCDelegate);
    await deployer.link(HTLCSmgLib, HTLCDelegate);
    await deployer.link(HTLCUserLib, HTLCDelegate);
    await deployer.deploy(HTLCProxy);
    let htlcProxy = await HTLCProxy.deployed();
    await deployer.deploy(HTLCDelegate);
    let htlcDelegate = await HTLCDelegate.deployed();
    await htlcProxy.upgradeTo(htlcDelegate.address);

    // storeman group admin sc
    let poslibAddr = await deployer.deploy(PosLib);
    console.log("================== poslib address:", poslibAddr.address);
    await deployer.link(PosLib,StoremanGroupDelegate)

    await deployer.deploy(Deposit);
    await deployer.link(Deposit,StoremanGroupDelegate)
    await deployer.deploy(StoremanLib);
    await deployer.link(StoremanLib,StoremanGroupDelegate)
    await deployer.link(PosLib,IncentiveLib)
    await deployer.deploy(IncentiveLib);
    await deployer.link(IncentiveLib,StoremanGroupDelegate)


    await deployer.deploy(StoremanGroupProxy);
    let smgProxy = await StoremanGroupProxy.deployed();
    await deployer.deploy(StoremanGroupDelegate);
    let smgDelegate = await StoremanGroupDelegate.deployed();
    console.log("smgDelegate.address:", smgDelegate.address)
    await smgProxy.upgradeTo(smgDelegate.address);

    await deployer.deploy(TestSmg);
    let tsmg = await TestSmg.deployed();
    await tsmg.setSmgAddr(smgProxy.address)

    // token manager dependence
    let tm = await TokenManagerDelegate.at(tmProxy.address);
    await tm.setHtlcAddr(htlcProxy.address);

    // htlc dependence
    let htlc = await HTLCDelegate.at(htlcProxy.address);
    await htlc.setEconomics(tmProxy.address, smgProxy.address, 0);

    // storm group admin dependence
    let smg = await StoremanGroupDelegate.at(smgProxy.address)

    // console.log("impold:", await smgProxy.implementation())
    // console.log("smgDelegate.address:", smgDelegate.address)
    // await smgProxy.upgradeTo(smgDelegate.address);

    await smg.setDependence(tmProxy.address, htlcProxy.address);

    // console.log("impold:", await smgProxy.implementation())
    // console.log("smgDelegate.address:", smgDelegate.address)
    // await smgProxy.upgradeTo(smgDelegate.address);


    //deploy CommonTool lib
    //deploy metric
    await deployer.deploy(PosLib);
    await deployer.deploy(FakeSmg);
    await deployer.deploy(CommonTool);
    await deployer.link(CommonTool, MetricLib);
    await deployer.link(PosLib, MetricLib);
    await deployer.deploy(MetricLib);


    await deployer.link(CommonTool, MetricDelegate);
    await deployer.link(MetricLib, MetricDelegate);
    await deployer.link(PosLib, MetricDelegate);

    await deployer.deploy(MetricProxy);
    let metricProxy = await MetricProxy.deployed();
    await deployer.deploy(MetricDelegate);
    let metricDlg = await MetricDelegate.deployed();
    await metricProxy.upgradeTo(metricDlg.address);

    let metric = await MetricDelegate.at(metricProxy.address);
    await metric.setDependence(smgProxy.address, smgProxy.address);


    // precompile contract
    await deployer.deploy(Encrypt);
    let encrypt = await Encrypt.deployed();

    // create gpk sc
    await deployer.deploy(CreateGpkProxy);
    let gpkProxy = await CreateGpkProxy.deployed();
    await deployer.deploy(CreateGpkDelegate);
    let gpkDelegate = await CreateGpkDelegate.deployed();
    await gpkProxy.upgradeTo(gpkDelegate.address);

    let gpk = await CreateGpkDelegate.at(CreateGpkProxy.address);
    await gpk.setDependence(smgProxy.address, encrypt.address);
}
