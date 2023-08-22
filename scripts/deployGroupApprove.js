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

const TMP_ADMIN = '0x4Cf0A877E906DEaD748A41aE7DA8c220E4247D9e';
const REAL_ADMIN = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
// goerli
// const SIGNATUREER = '0x08bad1a48b0b08bf769f83ba30c1dad0f8bb8b6b';
// const ORACLE = '0x0f0bf93bf16fd28294c637d855fc73b917ef5fcc';
// const CROSS_SC = '0xb8460eeaa06bc6668dad9fd42b661c0b96b3be57';

// fuji
const SIGNATUREER = '0x0a5b5ea60930cca901bce3e3ad1772ebdd5065b8';
const ORACLE = '0x302554d20c92461f4c57bad481797b6d5f422c45';
const CROSS_SC = '0x4c200a0867753454db78af84d147bd03e567f234';

async function main() {
  console.log('hre', (await hre.ethers.getSigner()).address);  
  let GroupApprove = await hre.ethers.getContractFactory("GroupApprove");
  let groupApprove = await GroupApprove.deploy(TMP_ADMIN, SIGNATUREER, ORACLE, CROSS_SC);
  await groupApprove.deployed();
  console.log("groupApprove deployed to:", groupApprove.address);
  console.log("proposaling...");
  let chainId = await groupApprove.chainId();
  console.log('chainId', chainId);
  const data = encodeWithSignature("transferFoundation(address)", REAL_ADMIN);
  console.log(data);

  let tx = await groupApprove.proposal(chainId, groupApprove.address, data);
  console.log("tx", tx.hash);
  await tx.wait();
  console.log("proposal done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function encodeWithSignature(signature, ...args) {
  const functionName = signature.match(/^(\w+)\(/)[1];
  
  const functionSig = ethers.utils.id(signature).slice(0, 10);

  const iface = new ethers.utils.Interface([`function ${signature}`]);
  const encodedParameters = iface.encodeFunctionData(functionName, args);

  return functionSig + encodedParameters.slice(10);
}
