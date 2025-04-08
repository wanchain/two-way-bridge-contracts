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
if (!process.env.PK)
  throw "⛔️ Private key not detected! Add it to the .env file!";
// mainnet
const ORACLE_ADMIN = '0x390CC3173EE7F425Fe7659df215B13959FD468E1';
const CROSS_ADMIN = '0xa35B3C55626188015aC79F396D0B593947231976';
const TOKEN_MANAGER_OPERATOR = '0xa35B3C55626188015aC79F396D0B593947231976';
const SMG_FEE_PROXY = "0x82bf94d159b15a587c45c9d70e0fab7fd87889eb";
const QUOTA_PROXY = '0x0000000000000000000000000000000000000000';

const proposers = ["0x390CC3173EE7F425Fe7659df215B13959FD468E1"];
const executors = ["0x0000000000000000000000000000000000000000"];
const admin = CROSS_ADMIN;
const cancellers = [
  "0x7521eda00e2ce05ac4a9d8353d096ccb970d5188",
  "0xae693fb903559f8856a3c21d6c0aa4a4e9682ae9",
  CROSS_ADMIN
];



// // testnet
// const ORACLE_ADMIN = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
// const CROSS_ADMIN = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
// const TOKEN_MANAGER_OPERATOR = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
// const SMG_FEE_PROXY = "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9";
// const QUOTA_PROXY = '0x0000000000000000000000000000000000000000';

// const proposers = ["0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9"];
// const executors = ["0x0000000000000000000000000000000000000000"];
// const admin = CROSS_ADMIN;
// const cancellers = [
//   "0x7521eda00e2ce05ac4a9d8353d096ccb970d5188",
//   "0xae693fb903559f8856a3c21d6c0aa4a4e9682ae9",
//   CROSS_ADMIN
// ];



// const BIP44_CHAIN_ID = 0x800003d1; // TELOS EVM
// const BIP44_CHAIN_ID = 1073741830; // Function X EVM
// const BIP44_CHAIN_ID = 1073741833; // GATHER CHAIN
// const BIP44_CHAIN_ID = 1073741834; // METIS CHAIN
//const BIP44_CHAIN_ID = 1073741835; // OKB CHAIN
// const BIP44_CHAIN_ID = 1073741838; // polyZkEvm CHAIN
const BIP44_CHAIN_ID = hre.network.config.bip44ChainId
if(!BIP44_CHAIN_ID) {
  console.log("please set BIP44_CHAIN_ID")
  process.exit()
}
async function main() {
  let deployer = (await hre.ethers.getSigners())[0].address;

  let Multicall2 = await hre.ethers.getContractFactory("Multicall2");
  let multicall2 = await Multicall2.deploy();
  if (waitForReceipt) {
    await (multicall2.deployed ?  multicall2.deployed() : multicall2.waitForDeployment());
  }
  console.log("Multicall2 deployed to:", multicall2.target);

  let TokenManagerDelegateV2 = await hre.ethers.getContractFactory("TokenManagerDelegateV2");
  let tokenManagerDelegate = await TokenManagerDelegateV2.deploy();
  if (waitForReceipt) {
    await (tokenManagerDelegate.deployed ?  tokenManagerDelegate.deployed() : tokenManagerDelegate.waitForDeployment());
  }
  console.log("TokenManagerDelegateV2 deployed to:", tokenManagerDelegate.target);

  let TokenManagerProxy = await hre.ethers.getContractFactory("TokenManagerProxy");
  let tokenManagerProxy = await TokenManagerProxy.deploy();
  if (waitForReceipt) {
    await (tokenManagerProxy.deployed ?  tokenManagerProxy.deployed() : tokenManagerProxy.waitForDeployment());
  }
  console.log("TokenManagerProxy deployed to:", tokenManagerProxy.target);

  let NFTLibV1 = await hre.ethers.getContractFactory("NFTLibV1");
  let nftLib = await NFTLibV1.deploy();
  if (waitForReceipt) {
    await (nftLib.deployed ?  nftLib.deployed() : nftLib.waitForDeployment());
  }
  console.log("NFTLibV1 deployed to:", nftLib.target);

  let RapidityLibV4 = await hre.ethers.getContractFactory("RapidityLibV4");
  let rapidityLib = await RapidityLibV4.deploy();
  if (waitForReceipt) {
    await (rapidityLib.deployed ?  rapidityLib.deployed() : rapidityLib.waitForDeployment());
  }
  console.log("RapidityLibV4 deployed to:", rapidityLib.target);
  
  let CrossDelegateV4 = await hre.ethers.getContractFactory("CrossDelegateV4", {
    libraries: {
      NFTLibV1: nftLib.target,
      RapidityLibV4: rapidityLib.target,
    }
  });

  let crossDelegate = await CrossDelegateV4.deploy();
  if (waitForReceipt) {
    await (crossDelegate.deployed ?  crossDelegate.deployed() : crossDelegate.waitForDeployment());
  }

  console.log("CrossDelegateV4 deployed to:", crossDelegate.target);

  let CrossProxy = await hre.ethers.getContractFactory("CrossProxy");
  let crossProxy = await CrossProxy.deploy();
  if (waitForReceipt) {
    await (crossProxy.deployed ?  crossProxy.deployed() : crossProxy.waitForDeployment());
  }

  console.log("CrossProxy deployed to:", crossProxy.target);
  let OracleDelegate = await hre.ethers.getContractFactory("OracleDelegate");
  let oracleDelegate = await OracleDelegate.deploy();
  if (waitForReceipt) {
    await (oracleDelegate.deployed ?  oracleDelegate.deployed() : oracleDelegate.waitForDeployment());
  }

  console.log("OracleDelegate deployed to:", oracleDelegate.target);
  let OracleProxy = await hre.ethers.getContractFactory("OracleProxy");
  let oracleProxy = await OracleProxy.deploy();
  if (waitForReceipt) {
    await (oracleProxy.deployed ?  oracleProxy.deployed() : oracleProxy.waitForDeployment());
  }
  console.log("OracleProxy deployed to:", oracleProxy.target);

 
  let SignatureVerifier = await hre.ethers.getContractFactory("SignatureVerifier");
  let signatureVerifier = await SignatureVerifier.deploy();
  if (waitForReceipt) {
    await (signatureVerifier.deployed ?  signatureVerifier.deployed() : signatureVerifier.waitForDeployment());
  }
  console.log('verifier register...')
  // 1: common EVM, bn128, 0: ZK, ECDSA
  //tx = await signatureVerifier.register(1, bn128SchnorrVerifier.target);
  let signCurveId = 1
  let tx
  if(hre.network.config.signCurveId != undefined) {
    signCurveId = hre.network.config.signCurveId
  }
  let bn128SchnorrVerifier = {}
  let ecSchnorrVerifier = {}
  if(signCurveId == 1) {
    let Bn128SchnorrVerifier = await hre.ethers.getContractFactory("Bn128SchnorrVerifier");
    bn128SchnorrVerifier = await Bn128SchnorrVerifier.deploy();
    if (waitForReceipt) {
      await (bn128SchnorrVerifier.deployed ?  bn128SchnorrVerifier.deployed() : bn128SchnorrVerifier.waitForDeployment());
    }
    console.log("bn128SchnorrVerifier deployed to:", bn128SchnorrVerifier.target);
    tx = await signatureVerifier.register(1, bn128SchnorrVerifier.target);
  }else {
    let EcSchnorrVerifier = await hre.ethers.getContractFactory("EcSchnorrVerifier");
    ecSchnorrVerifier = await EcSchnorrVerifier.deploy();
    if (waitForReceipt) {
      await (ecSchnorrVerifier.deployed ?  ecSchnorrVerifier.deployed() : ecSchnorrVerifier.waitForDeployment());
    }
    console.log("EcSchnorrVerifier deployed to:", ecSchnorrVerifier.target);
    tx = await signatureVerifier.register(0, ecSchnorrVerifier.target);
  }
  await tx.wait();
  console.log('verifier register finished.')
  console.log("SignatureVerifier deployed to:", signatureVerifier.target);
  // config

  console.log('config...');
  tx = await tokenManagerProxy.upgradeTo(tokenManagerDelegate.target);
  await tx.wait();
  console.log('tokenManagerProxy upgradeTo finished.');
  tx = await crossProxy.upgradeTo(crossDelegate.target);
  await tx.wait();
  console.log('crossProxy upgradeTo finished.');
  tx = await oracleProxy.upgradeTo(oracleDelegate.target);
  await tx.wait();
  console.log('oracleProxy upgradeTo finished.');
  console.log('deploy finished start to config...');
  let tokenManager = await hre.ethers.getContractAt("TokenManagerDelegateV2", tokenManagerProxy.target);
  let cross = await hre.ethers.getContractAt("CrossDelegateV4", crossProxy.target);
  let oracle = await hre.ethers.getContractAt("OracleDelegate", oracleProxy.target);

  // deploy time lock------------------------------
  console.log('deploy time lock...');
  let TimelockController = await hre.ethers.getContractFactory("TimelockController");
  let timelockController = await TimelockController.deploy(86400, proposers, executors, deployer);
  await (timelockController.deployed ?  timelockController.deployed() : timelockController.waitForDeployment());
  console.log("TimelockController deployed to:", timelockController.target);
  for (let i=0; i<cancellers.length; i++) {
    console.log('adding canceller', i, cancellers[i]);
    let tx = await timelockController.grantRole(timelockController.CANCELLER_ROLE(), cancellers[i]);
    await tx.wait();
    console.log('added canceller', i, cancellers[i]);
  }

  console.log('setting admin', admin);
  tx = await timelockController.grantRole(timelockController.TIMELOCK_ADMIN_ROLE(), admin);
  await tx.wait();
  console.log('set admin ok', admin);

  console.log('revoking deployer admin', deployer);
  tx = await timelockController.revokeRole(timelockController.TIMELOCK_ADMIN_ROLE(), deployer);
  await tx.wait();
  console.log('revoked deployer admin', deployer);
  //------------------------------------------------

  console.log('oracle set admin...')
  tx = await oracle.setAdmin(timelockController.target);
  await tx.wait();
  console.log('oracle set admin finished.')
  console.log('tokenManager add admin...')
  tx = await tokenManager.addAdmin(crossProxy.target);
  await tx.wait();
  console.log('tokenManager add admin finished.')

  console.log('tokenManager set operator...')
  tx = await tokenManager.setOperator(TOKEN_MANAGER_OPERATOR);
  await tx.wait();
  console.log('tokenManager set operator finished.')

  console.log('cross set partner...');
  tx = await cross.setPartners(tokenManagerProxy.target, oracleProxy.target, SMG_FEE_PROXY, QUOTA_PROXY, signatureVerifier.target);
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
  if(hre.network.config.hashType) {
    tx = await cross.setHashType(hre.network.config.hashType);
    await tx.wait();
    console.log('set hash type:', hre.network.config.hashType)
  }
  console.log('config finished.');


  let GroupApprove = await hre.ethers.getContractFactory("GroupApprove");
  let groupApprove = await GroupApprove.deploy(deployer, signatureVerifier.target, oracleProxy.target, crossProxy.target);
  if (waitForReceipt) {
    await (groupApprove.deployed ?  groupApprove.deployed() : groupApprove.waitForDeployment());
  }
  console.log("groupApprove deployed to:", groupApprove.target);

  const deployed = {
    multicall2: multicall2.target,
    signatureVerifier: signatureVerifier.target,
    bn128SchnorrVerifier: bn128SchnorrVerifier.target,
    EcSchnorrVerifier: ecSchnorrVerifier.target,
    RapidityLibV4: rapidityLib.target,
    NFTLibV1: nftLib.target,
    crossDelegate: crossDelegate.target,
    crossProxy: crossProxy.target,
    tokenManagerDelegate: tokenManagerDelegate.target,
    tokenManagerProxy: tokenManagerProxy.target,
    oracleDelegate: oracleDelegate.target,
    oracleProxy: oracleProxy.target,
    groupApprove: groupApprove.target,
    timelock: timelockController.target,
  };

  fs.writeFileSync(`deployed/${hre.network.name}.json`, JSON.stringify(deployed, null, 2));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
