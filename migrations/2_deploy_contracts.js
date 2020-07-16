const HTLCTxLib = artifacts.require('HTLCTxLib');
const HTLCBurnLib = artifacts.require('HTLCBurnLib');
const HTLCDebtLib = artifacts.require('HTLCDebtLib');
const HTLCMintLib = artifacts.require('HTLCMintLib');
const RapidityTxLib = artifacts.require('RapidityTxLib');
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

module.exports = async function(deployer,network, accounts) {
    // token manager
    await deployer.deploy(TokenManagerDelegate);
    await deployer.deploy(TokenManagerProxy);
    let tokenManagerProxy = await TokenManagerProxy.deployed();
    let tokenManagerDelegate = await TokenManagerDelegate.deployed();
    await tokenManagerProxy.upgradeTo(tokenManagerDelegate.address);

    // quota
    await deployer.deploy(QuotaDelegate);
    await deployer.deploy(QuotaProxy);
    let quotaProxy = await QuotaProxy.deployed();
    let quotaDelegate = await QuotaDelegate.deployed();
    await quotaProxy.upgradeTo(quotaDelegate.address);

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

    await deployer.deploy(RapidityTxLib);

    await deployer.link(RapidityTxLib, RapidityLib);
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
    let crossProxyDelegate = await CrossDelegate.at(crossDelegate.address);
};

