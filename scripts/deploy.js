// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const fs = require('fs');
const { sleep } = require("@nomiclabs/hardhat-ethers");


const waitForReceipt = false;

const OWNER_ADDRESS = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
const SMG_FEE_PROXY = '0x0000000000000000000000000000000000000000';
const QUOTA_PROXY = '0x0000000000000000000000000000000000000000';

async function main() {
  let TokenManagerDelegateV2 = await hre.ethers.getContractFactory("TokenManagerDelegateV2");
  let tokenManagerDelegate = await TokenManagerDelegateV2.deploy();
  if (waitForReceipt) {
    await tokenManagerDelegate.deployed();
  }
  console.log("TokenManagerDelegateV2 deployed to:", tokenManagerDelegate.address);

  let TokenManagerProxy = await hre.ethers.getContractFactory("TokenManagerProxy");
  let tokenManagerProxy = await TokenManagerProxy.deploy();
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
  let crossProxy = await CrossProxy.deploy();
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
  let oracleProxy = await OracleProxy.deploy();
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
  let SignatureVerifier = await hre.ethers.getContractFactory("SignatureVerifier");
  let signatureVerifier = await SignatureVerifier.deploy();
  if (waitForReceipt) {
    await signatureVerifier.deployed();
  }

  console.log("SignatureVerifier deployed to:", signatureVerifier.address);
  // config

  console.log('config...');
  await tokenManagerProxy.upgradeTo(tokenManagerDelegate.address);
  console.log('tokenManagerProxy upgradeTo finished.');
  await crossProxy.upgradeTo(crossDelegate.address);
  console.log('crossProxy upgradeTo finished.');
  await oracleProxy.upgradeTo(oracleDelegate.address);
  console.log('oracleProxy upgradeTo finished.');
  let tokenManager = await hre.ethers.getContractAt("TokenManagerDelegateV2", tokenManagerProxy.address);
  let cross = await hre.ethers.getContractAt("CrossDelegateV4", crossProxy.address);
  let oracle = await hre.ethers.getContractAt("OracleDelegate", oracleProxy.address);

  await tokenManager.addAdmin(crossProxy.address);
  console.log('tokenManager addAdmin finished.');
  await signatureVerifier.register(1, bn128SchnorrVerifier.address);
  console.log('signatureVerifier register finished.');

  await cross.setPartners(tokenManagerProxy.address, oracleProxy.address, SMG_FEE_PROXY, QUOTA_PROXY, signatureVerifier.address);
  
  console.log('cross setPartners finished.');
  console.log('config finished.');
  console.log('transfer owner...');
  // transfer owner
  await tokenManager.transferOwner(OWNER_ADDRESS);
  console.log('tokenManager transferOwner finished.');
  await cross.transferOwner(OWNER_ADDRESS);
  console.log('cross transferOwner finished.');
  await oracle.transferOwner(OWNER_ADDRESS);
  console.log('oracle transferOwner finished.');
  await signatureVerifier.transferOwner(OWNER_ADDRESS);
  console.log('signatureVerifier transferOwner finished.');
  console.log('transfer owner finished.');
  const deployed = {
    tokenManagerDelegate: tokenManagerDelegate.address,
    tokenManagerProxy: tokenManagerProxy.address,
    crossDelegate: crossDelegate.address,
    crossProxy: crossProxy.address,
    oracleDelegate: oracleDelegate.address,
    oracleProxy: oracleProxy.address,
    signatureVerifier: signatureVerifier.address,
    bn128SchnorrVerifier: bn128SchnorrVerifier.address,
    RapidityLibV4: rapidityLib.address,
    NFTLibV1: nftLib.address,
    owner: OWNER_ADDRESS,
  };

  fs.writeFileSync(`deployed/${hre.network.name}.json`, JSON.stringify(deployed, null, 2));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
