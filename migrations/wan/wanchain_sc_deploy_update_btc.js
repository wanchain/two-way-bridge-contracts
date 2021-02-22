const deployer = require('wanchain-sc-sdk');
const scDict = require('./contract');

async function deploy(cfg, isMainnet) {
    let contract = {};
    let abi = {};

    await deployer.config(cfg);

    // ***********two-way-bridge*****************

    // token manager
    await deployer.deploy(scDict.TokenManagerDelegate);
    let tokenManagerDelegate = await deployer.deployed(scDict.TokenManagerDelegate);
    contract[scDict.TokenManagerDelegate] = tokenManagerDelegate.address;
    abi[scDict.TokenManagerDelegate] = tokenManagerDelegate.abi;

    // quota
    await deployer.deploy(scDict.QuotaDelegate);
    let quotaDelegate = await deployer.deployed(scDict.QuotaDelegate);
    contract[scDict.QuotaDelegate] = quotaDelegate.address;
    abi[scDict.QuotaDelegate] = quotaDelegate.abi;

    // oracle
    await deployer.deploy(scDict.OracleDelegate);
    let oracleDelegate = await deployer.deployed(scDict.OracleDelegate);
    contract[scDict.OracleDelegate] = oracleDelegate.address;
    abi[scDict.OracleDelegate] = oracleDelegate.abi;

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
    let crossDelegate = await deployer.deployed(scDict.CrossDelegate);

    contract[scDict.CrossDelegate] = crossDelegate.address;
    abi[scDict.CrossDelegate] = crossDelegate.abi;

    return {address:contract, abi:abi};
}

module.exports = { deploy };
