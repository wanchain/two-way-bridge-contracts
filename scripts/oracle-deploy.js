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

// const OWNER_ADDRESS = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
// const SMG_FEE_PROXY = "0x0000000000000000000000000000000000000000";
// const QUOTA_PROXY = '0x0000000000000000000000000000000000000000';

async function main() {
  
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


  await oracleProxy.upgradeTo(oracleDelegate.address);
  console.log('oracleProxy upgraded to:', oracleDelegate.address);
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
