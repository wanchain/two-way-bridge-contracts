

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

    // before upgrade
    // MetricProxy: 0x94971AF22185b63A4111ee5A920179c5DDFBC7df
    // StoremanGroupProxy: 0x07EbFA72F59d0C121Df58d9960Ba0b814098EbE9
    // GpkProxy: 0x1538B85575CC151b868E76ff44Ab6964D21B1a56
    // ConfigProxy: 0xB1AbD22fbb083e12f0Ca227Eb3aCd72fbeBBca5D
    // QuotaProxy: 0x9A4aD54485245BDa7426754Fe08bfb1da3cc8e5c

    // update:
    // 1. smg contract
    // 2. posLib
    let metricProxyAddr = '0x94971AF22185b63A4111ee5A920179c5DDFBC7df';
    let gpkProxyAddr = '0x1538B85575CC151b868E76ff44Ab6964D21B1a56';
    let cnfProxyAddr = '0xB1AbD22fbb083e12f0Ca227Eb3aCd72fbeBBca5D';
    let quotaProxyAddr = '0x9A4aD54485245BDa7426754Fe08bfb1da3cc8e5c';
    let smgProxyAddr = '0x63687EAAdeBfB529da387275771c20cA0FeE6e5B';

    // ***********osm*****************
    // storeman group admin sc

    await deployer.deploy(PosLib);
    let posLib = await PosLib.deployed();

    await deployer.deploy(StoremanUtil);
    await deployer.link(StoremanUtil,StoremanLib);
    await deployer.link(StoremanUtil,IncentiveLib);

    await deployer.deploy(Deposit);
    await deployer.link(Deposit,StoremanGroupDelegate);
    await deployer.deploy(StoremanLib);
    await deployer.link(StoremanLib,StoremanGroupDelegate);

    await deployer.deploy(IncentiveLib);
    await deployer.link(IncentiveLib,StoremanGroupDelegate);
    await deployer.link(StoremanUtil,StoremanGroupDelegate);

    // await deployer.deploy(StoremanGroupProxy);
    // let smgProxy = await StoremanGroupProxy.deployed();


    await deployer.deploy(StoremanGroupDelegate);
    let smgDelegate = await StoremanGroupDelegate.deployed();

    let smgProxy = await StoremanGroupProxy.at(smgProxyAddr);
    await smgProxy.upgradeTo(smgDelegate.address);
    console.log("smg address:", smgProxy.address);

    // storm group admin dependence
    let smg = await StoremanGroupDelegate.at(smgProxy.address);
    await smg.addAdmin(config.networks[network].admin);
    await smg.setDependence(metricProxyAddr, gpkProxyAddr, quotaProxyAddr,posLib.address);

    // dependence
    let metric = await MetricDelegate.at(metricProxyAddr);
    await metric.setDependence(cnfProxyAddr, smgProxy.address, posLib.address);

}
