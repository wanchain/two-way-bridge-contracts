const StoremanUtil = artifacts.require('StoremanUtil');


const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const CommonTool = artifacts.require('CommonTool');
const GpkLib = artifacts.require('GpkLibV2');
const GpkProxy = artifacts.require('GpkProxy');
const GpkDelegate = artifacts.require('GpkDelegateV2');

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

    let gpkProxyAddr = '0xf0bFfF373EEF7b787f5aecb808A59dF714e2a6E7';

    await deployer.link(CommonTool, GpkLib);
    await deployer.deploy(GpkLib);

    await deployer.link(GpkLib, GpkDelegate);
    await deployer.deploy(GpkDelegate);
    let gpkDelegate = await GpkDelegate.deployed();

    let gpkProxy = await GpkProxy.at(gpkProxyAddr);
    await gpkProxy.upgradeTo(gpkDelegate.address);

}


// truffle deploy --f 3 --to 3 --network testnetRpc