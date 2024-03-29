const StoremanUtil = artifacts.require('StoremanUtil');


const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const CommonTool = artifacts.require('CommonTool');
const GpkLib = artifacts.require('GpkLib');
const Deposit = artifacts.require('Deposit');

const StoremanLib = artifacts.require('StoremanLib');
const IncentiveLib = artifacts.require('IncentiveLib');
const ListGroup = artifacts.require('ListGroup');

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

    // update:
    // 1. smg contract
    // 2. posLib
    //let metricProxyAddr = '0x869276043812B459Cc9d11E255Fb0097D51846EF';
    let gpkProxyAddr = '0xf0bFfF373EEF7b787f5aecb808A59dF714e2a6E7';
    let cnfProxyAddr = '0xc59a6E80E387bdeFa89Efb032aA4EE922Ca78036';
    //let quotaProxyAddr = '0x7585c2ae6a3F3B2998103cB7040F811B550C9930';
    let smgProxyAddr = '0xaA5A0f7F99FA841F410aafD97E8C435c75c22821';
    let posLibAddr = '0x4Ec1e3c0aB865707eEc5F9a97Bcaee2E39b8a2De';

    // smg
    await deployer.deploy(CommonTool);
    await deployer.link(CommonTool,StoremanUtil);
    await deployer.deploy(StoremanUtil);

    await deployer.link(StoremanUtil,StoremanLib);
    await deployer.link(StoremanUtil,IncentiveLib);
    await deployer.link(StoremanUtil,ListGroup);

    await deployer.deploy(Deposit);
    await deployer.link(Deposit,StoremanGroupDelegate);

    await deployer.deploy(StoremanLib);
    await deployer.link(StoremanLib,StoremanGroupDelegate);

    await deployer.deploy(IncentiveLib);
    await deployer.link(IncentiveLib,StoremanGroupDelegate);
    await deployer.link(StoremanUtil,StoremanGroupDelegate);


    await deployer.deploy(StoremanGroupDelegate);
    let smgDelegate = await StoremanGroupDelegate.deployed();

    let smgProxy = await StoremanGroupProxy.at(smgProxyAddr);
    await smgProxy.upgradeTo(smgDelegate.address);
    console.log("smg address:", smgProxy.address);

    // ListGroup
    // await deployer.deploy(ListGroup,smgProxyAddr, posLibAddr);
    // let listGroup = await ListGroup.deployed();
    //
    // let smg = await StoremanGroupDelegate.at(smgProxyAddr);
    // await smg.setGlobalGroupScAddr(listGroup.address);
    // await smg.addActiveGroupId('0x000000000000000000000000000000000000000000746573746e65745f303035',{from: config.networks[network].admin});

    // gpk
    /*
    await deployer.link(CommonTool, GpkLib);
    await deployer.deploy(GpkLib);

    await deployer.link(GpkLib, GpkDelegate);
    await deployer.deploy(GpkDelegate);
    let gpkDelegate = await GpkDelegate.deployed();

    let gpkProxy = await GpkProxy.at(gpkProxyAddr);
    await gpkProxy.upgradeTo(gpkDelegate.address);
    */

}
