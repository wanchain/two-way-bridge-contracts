const hre = require("hardhat");

const proposers = ["0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9"];
const executors = ["0x0000000000000000000000000000000000000000"];
const admin = '0x4Cf0A877E906DEaD748A41aE7DA8c220E4247D9e';

// An example of a deploy script that will deploy and call a simple contract.
async function main() {
  let deployer = (await hre.ethers.getSigner()).address;
  console.log("Deploying contracts with the account:", deployer);

  let TimelockController = await hre.ethers.getContractFactory("TimelockController");
  let timelockController = await TimelockController.deploy(86400, proposers, executors, admin);

  console.log("TimelockController deployed to:", timelockController.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
