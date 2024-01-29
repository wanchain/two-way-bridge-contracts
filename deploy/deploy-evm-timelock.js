const hre = require("hardhat");

const proposers = ["0x390CC3173EE7F425Fe7659df215B13959FD468E1"];
const executors = ["0x0000000000000000000000000000000000000000"];
const admin = '0xa35B3C55626188015aC79F396D0B593947231976';

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
