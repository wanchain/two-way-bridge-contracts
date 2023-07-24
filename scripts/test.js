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
  let EcdsaVerifier = await hre.ethers.getContractFactory("EcdsaVerifier");
  //let ec = EcdsaVerifier.attach('0x6BF1fB4f10F92DD175E53a6a7396C81366f4F21c') // poligen zk
  let ec = EcdsaVerifier.attach('0x731e13C4024E50F57A6956bB8951ab7DF06a0Af2') // linea zk

  
  //gpk:0x501f1e8c8e135e2311397ac1812b59e0736cc8ec37765a8945dfcbf831e0d4bc0b99db98637d628dacb978239e683a30852558bb2bb0029fb10e61f10883010d
  let pkx = '0x501f1e8c8e135e2311397ac1812b59e0736cc8ec37765a8945dfcbf831e0d4bc'
  let pky = '0x0b99db98637d628dacb978239e683a30852558bb2bb0029fb10e61f10883010d'
  let hash = '0x5c37529010e2f7a9ec225e516e6b79478f117cdf45d1796cd034d48b901d8d41'
  let r = '0x8c2c751ac9c7c6eab6d45b4cdf2fdecddc453f91ae5e68235d7e9bca8c6f1fb2'
  let s = '0xbf1df10b199fe190c493d25fe1bd6a2eec71429fc5f3ccacc9c29a47cbd896fe'
  let v = '0x0000000000000000000000000000000000000000000000000000000000000001'


  let tx =  await ec.test(s,pkx, pky, r,v, hash)
  console.log("tx:", tx)
}
// https://testnet-zkevm.polygonscan.com/tx/0x15488d452955fd62ce2be21d7c9f341b987879b0611cc1cacec602846f7c87ae
// https://goerli.lineascan.build/tx/0x6113655167229f5a4474e2440cb59dc818f474a86ade8c3f178a9b4ac24e2512



// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
