const StoremanUtil = artifacts.require('StoremanUtil');
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const Deposit = artifacts.require('Deposit');
const TestDeposit = artifacts.require('TestDeposit');
const StoremanLib = artifacts.require('StoremanLib');
const IncentiveLib = artifacts.require('IncentiveLib');

const FakePosLib = artifacts.require('FakePosLib');
const FakeQuota = artifacts.require('FakeQuota');
const FakeMetric = artifacts.require('FakeMetric');
const FakeGpk = artifacts.require('FakeGpk');


module.exports = async function (deployer, network) {

    await deployer.deploy(FakePosLib);
    let fakePosLib = await FakePosLib.deployed();

    await deployer.deploy(FakeMetric);
    let metric = await FakeMetric.deployed();

    await deployer.deploy(FakeGpk);
    let gpk = await FakeGpk.deployed();

    await deployer.deploy(FakeQuota);
    let quota = await FakeQuota.deployed();

    await deployer.deploy(StoremanUtil);
    await deployer.link(StoremanUtil, StoremanLib);
    await deployer.link(StoremanUtil, IncentiveLib);

    await deployer.deploy(Deposit);
    await deployer.deploy(TestDeposit);
    await deployer.link(Deposit, StoremanGroupDelegate);
    await deployer.deploy(StoremanLib);
    await deployer.link(StoremanLib, StoremanGroupDelegate);

    await deployer.deploy(IncentiveLib);
    await deployer.link(IncentiveLib, StoremanGroupDelegate);
    await deployer.link(StoremanUtil, StoremanGroupDelegate);

    await deployer.deploy(StoremanGroupProxy);
    let smgProxy = await StoremanGroupProxy.deployed();
    await deployer.deploy(StoremanGroupDelegate);
    let smgDelegate = await StoremanGroupDelegate.deployed();
    await smgProxy.upgradeTo(smgDelegate.address);
    console.log("smg address:", smgProxy.address);

    // storm group admin dependence
    let smg = await StoremanGroupDelegate.at(smgProxy.address);
    await smg.addAdmin(config.networks[network].admin);
    // dependence
    await smg.setDependence(metric.address, gpk.address, quota.address, fakePosLib.address);
}
