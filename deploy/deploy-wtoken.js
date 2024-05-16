// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const fs = require('fs');
const { sleep } = require("@nomiclabs/hardhat-ethers");


const name = "wanALGO@wanchain"
const symbol = "wanALGO"
const decimal = 6

const waitForReceipt = true;
const deployedFile = `deployed/${hre.network.name}.json`
if (!process.env.PK)
  throw "Private key not detected! Add it to the .env file!";


async function main() {
  let deployer = (await hre.ethers.getSigner()).address;
  console.log("deployer:", deployer)
  let deployed = {}
  if(fs.existsSync(deployedFile)) {
    deployed = JSON.parse(fs.readFileSync().trim()) 
  }
  
  let WrappedToken = await hre.ethers.getContractFactory("WrappedToken");
  let wrappedToken = await WrappedToken.deploy(name, symbol, decimal);
  if (waitForReceipt) {
    await wrappedToken.deployed();
  }
  console.log("wrappedToken deployed to:", wrappedToken.address);



  fs.writeFileSync(`deployed/${hre.network.name}.json`, JSON.stringify(deployed, null, 2));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
