// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const fs = require('fs');
const { sleep } = require("@nomiclabs/hardhat-ethers");


const waitForReceipt = true;

// mainnet
// const ORACLE_ADMIN = '0x390CC3173EE7F425Fe7659df215B13959FD468E1';
// const CROSS_ADMIN = '0xa35B3C55626188015aC79F396D0B593947231976';
// const TOKEN_MANAGER_OPERATOR = '0xa35B3C55626188015aC79F396D0B593947231976';
// const SMG_FEE_PROXY = "0x82bf94d159b15a587c45c9d70e0fab7fd87889eb";
// const QUOTA_PROXY = '0x0000000000000000000000000000000000000000';
// const BIP44_CHAIN_ID = 0x8000032a; // ASTAR

// testnet
const ORACLE_ADMIN = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
const CROSS_ADMIN = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
const TOKEN_MANAGER_OPERATOR = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
const SMG_FEE_PROXY = "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9";
const QUOTA_PROXY = '0x0000000000000000000000000000000000000000';
// const BIP44_CHAIN_ID = 0x800003d1; // TELOS EVM
// const BIP44_CHAIN_ID = 1073741830; // Function X EVM
// const BIP44_CHAIN_ID = 1073741833; // GATHER CHAIN
// const BIP44_CHAIN_ID = 1073741834; // METIS CHAIN
//const BIP44_CHAIN_ID = 1073741835; // OKB CHAIN
const BIP44_CHAIN_ID = 1073741838; // polyZkEvm CHAIN


async function main() {
  let deployer = (await hre.ethers.getSigner()).address;

  let MulticallV2 = await hre.ethers.getContractFactory("MulticallV2");
  let multicallV2 = await MulticallV2.deploy();
  if (waitForReceipt) {
    await multicallV2.deployed();
  }
  console.log("MulticallV2 deployed to:", multicallV2.address);

  let ProxyAdmin = await hre.ethers.getContractFactory("ProxyAdmin");
  let proxyAdmin = await ProxyAdmin.deploy();
  if (waitForReceipt) {
    await proxyAdmin.deployed();
  }
  console.log("ProxyAdmin deployed to:", proxyAdmin.address);


  let TokenManagerDelegateV2 = await hre.ethers.getContractFactory("TokenManagerDelegateV2");
  let tokenManagerDelegate = await TokenManagerDelegateV2.deploy();
  if (waitForReceipt) {
    await tokenManagerDelegate.deployed();
  }
  console.log("TokenManagerDelegateV2 deployed to:", tokenManagerDelegate.address);

  let TokenManagerProxy = await hre.ethers.getContractFactory("TokenManagerProxy");
  let tokenManagerProxy = await TokenManagerProxy.deploy(tokenManagerDelegate.address, proxyAdmin.address, '0x');
  if (waitForReceipt) {
    await tokenManagerProxy.deployed();
  }
  console.log("TokenManagerProxy deployed to:", tokenManagerProxy.address);

  let NFTLibV1 = await hre.ethers.getContractFactory("NFTLibV1");
  let nftLib = await NFTLibV1.deploy();
  if (waitForReceipt) {
    await nftLib.deployed();
  }
  console.log("NFTLibV1 deployed to:", nftLib.address);

  let RapidityLibV4 = await hre.ethers.getContractFactory("RapidityLibV4");
  let rapidityLib = await RapidityLibV4.deploy();
  if (waitForReceipt) {
    await rapidityLib.deployed();
  }
  console.log("RapidityLibV4 deployed to:", rapidityLib.address);
  
  let CrossDelegateV4 = await hre.ethers.getContractFactory("CrossDelegateV4", {
    libraries: {
      NFTLibV1: nftLib.address,
      RapidityLibV4: rapidityLib.address,
    }
  });

  let crossDelegate = await CrossDelegateV4.deploy();
  if (waitForReceipt) {
    await crossDelegate.deployed();
  }

  console.log("CrossDelegateV4 deployed to:", crossDelegate.address);

  let CrossProxy = await hre.ethers.getContractFactory("CrossProxy");
  let crossProxy = await CrossProxy.deploy(crossDelegate.address, proxyAdmin.address, '0x');
  if (waitForReceipt) {
    await crossProxy.deployed();
  }

  console.log("CrossProxy deployed to:", crossProxy.address);
  let OracleDelegate = await hre.ethers.getContractFactory("OracleDelegate");
  let oracleDelegate = await OracleDelegate.deploy();
  if (waitForReceipt) {
    await oracleDelegate.deployed();
  }

  console.log("OracleDelegate deployed to:", oracleDelegate.address);
  let OracleProxy = await hre.ethers.getContractFactory("OracleProxy");
  let oracleProxy = await OracleProxy.deploy(oracleDelegate.address, proxyAdmin.address, '0x');
  if (waitForReceipt) {
    await oracleProxy.deployed();
  }

  console.log("OracleProxy deployed to:", oracleProxy.address);
  let Bn128SchnorrVerifier = await hre.ethers.getContractFactory("Bn128SchnorrVerifier");
  let bn128SchnorrVerifier = await Bn128SchnorrVerifier.deploy();
  if (waitForReceipt) {
    await bn128SchnorrVerifier.deployed();
  }

  console.log("bn128SchnorrVerifier deployed to:", bn128SchnorrVerifier.address);

  /* there are 2 verify contract. 
    0: use bn256 schnorr for EVM
    1: use ecdsa schnorr for zk L2. for example: zksync zkEVM
  */
  let EcSchnorrVerifier = await hre.ethers.getContractFactory("EcSchnorrVerifier");
  let ecSchnorrVerifier = await EcSchnorrVerifier.deploy();
  if (waitForReceipt) {
    await ecSchnorrVerifier.deployed();
  }
  console.log("EcSchnorrVerifier deployed to:", ecSchnorrVerifier.address);
  
  let SignatureVerifier = await hre.ethers.getContractFactory("SignatureVerifier");
  let signatureVerifier = await SignatureVerifier.deploy();
  if (waitForReceipt) {
    await signatureVerifier.deployed();
  }

  console.log("SignatureVerifier deployed to:", signatureVerifier.address);
  // config

  console.log('config...');
  // let tx = await tokenManagerProxy.upgradeTo(tokenManagerDelegate.address);
  // await tx.wait();
  // console.log('tokenManagerProxy upgradeTo finished.');
  // tx = await crossProxy.upgradeTo(crossDelegate.address);
  // await tx.wait();
  // console.log('crossProxy upgradeTo finished.');
  // tx = await oracleProxy.upgradeTo(oracleDelegate.address);
  // await tx.wait();
  // console.log('oracleProxy upgradeTo finished.');
  let tokenManager = await hre.ethers.getContractAt("TokenManagerDelegateV2", tokenManagerProxy.address);
  let cross = await hre.ethers.getContractAt("CrossDelegateV4", crossProxy.address);
  let oracle = await hre.ethers.getContractAt("OracleDelegate", oracleProxy.address);

  console.log('initialise...');
  tx = await tokenManager.initialize();
  await tx.wait();
  console.log('tokenManager initialize finished.')
  tx = await cross.initialize();
  await tx.wait();
  console.log('cross initialize finished.')
  tx = await oracle.initialize();
  await tx.wait();
  console.log('oracle initialize finished.')

  console.log('oracle set admin...')
  tx = await oracle.setAdmin(ORACLE_ADMIN);
  await tx.wait();
  console.log('oracle set admin finished.')
  console.log('tokenManager add admin...')
  tx = await tokenManager.addAdmin(crossProxy.address);
  await tx.wait();
  console.log('tokenManager add admin finished.')

  console.log('tokenManager set operator...')
  tx = await tokenManager.setOperator(TOKEN_MANAGER_OPERATOR);
  await tx.wait();
  console.log('tokenManager set operator finished.')

  console.log('verifier register...')
  // 1: common EVM, bn128, 0: ZK, ECDSA
  //tx = await signatureVerifier.register(1, bn128SchnorrVerifier.address);
  tx = await signatureVerifier.register(0, ecSchnorrVerifier.address);
  await tx.wait();
  console.log('verifier register finished.')

  console.log('cross set partner...');
  tx = await cross.setPartners(tokenManagerProxy.address, oracleProxy.address, SMG_FEE_PROXY, QUOTA_PROXY, signatureVerifier.address);
  await tx.wait();
  console.log('cross set partner finished.');

  console.log('cross add admin...')
  tx = await cross.setAdmin(deployer);
  await tx.wait();
  console.log('cross set chainID...')
  tx = await cross.setChainID(BIP44_CHAIN_ID);
  await tx.wait();
  console.log('cross add admin2...')
  tx = await cross.setAdmin(CROSS_ADMIN);
  await tx.wait();
  console.log('config finished.');
  // console.log('transfer owner...');
  // transfer owner
  // await tokenManager.transferOwner(OWNER_ADDRESS);
  // await cross.transferOwner(OWNER_ADDRESS);
  // await oracle.transferOwner(OWNER_ADDRESS);
  // await signatureVerifier.transferOwner(OWNER_ADDRESS);
  // console.log('transfer owner finished.');
  const deployed = {
    multicallV2: multicallV2.address,
    signatureVerifier: signatureVerifier.address,
    bn128SchnorrVerifier: bn128SchnorrVerifier.address,
    EcSchnorrVerifier: ecSchnorrVerifier.address,
    RapidityLibV4: rapidityLib.address,
    NFTLibV1: nftLib.address,
    crossDelegate: crossDelegate.address,
    crossProxy: crossProxy.address,
    tokenManagerDelegate: tokenManagerDelegate.address,
    tokenManagerProxy: tokenManagerProxy.address,
    oracleDelegate: oracleDelegate.address,
    oracleProxy: oracleProxy.address,
  };

  fs.writeFileSync(`deployed/${hre.network.name}.json`, JSON.stringify(deployed, null, 2));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
