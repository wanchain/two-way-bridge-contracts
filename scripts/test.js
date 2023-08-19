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
  console.log('hre', (await hre.ethers.getSigner()).address);  
  let SmgMultiSigCtrl = await hre.ethers.getContractFactory("SmgMultiSigCtrl");
  let smgMultiSigCtrl = await SmgMultiSigCtrl.deploy("0x4Cf0A877E906DEaD748A41aE7DA8c220E4247D9e", "0x08bad1A48b0B08Bf769f83ba30c1DaD0F8Bb8b6B", "0x0F0Bf93bf16fD28294c637D855fc73b917ef5fCc", "0xb8460eeaa06bc6668dad9fd42b661c0b96b3be57");
  await smgMultiSigCtrl.deployed();
  console.log("smgMultiSigCtrl deployed to:", smgMultiSigCtrl.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
