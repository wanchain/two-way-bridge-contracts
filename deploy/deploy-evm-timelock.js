const hre = require("hardhat");

const proposers = ["0x390CC3173EE7F425Fe7659df215B13959FD468E1"];
const executors = ["0x0000000000000000000000000000000000000000"];
const admin = '0xa35B3C55626188015aC79F396D0B593947231976';
const cancellers = [
  "0x7521eda00e2ce05ac4a9d8353d096ccb970d5188",
  "0xae693fb903559f8856a3c21d6c0aa4a4e9682ae9",
  "0xa35b3c55626188015ac79f396d0b593947231976"
]

// An example of a deploy script that will deploy and call a simple contract.
async function main() {
  let deployer = (await hre.ethers.getSigner()).address;
  console.log("Deploying contracts with the account:", deployer);

  let TimelockController = await hre.ethers.getContractFactory("TimelockController");
  let timelockController = await TimelockController.deploy(86400, proposers, executors, deployer);
  await timelockController.deployed();
  console.log("TimelockController deployed to:", timelockController.address);
  for (let i=0; i<cancellers.length; i++) {
    console.log('adding canceller', i, cancellers[i]);
    let tx = await timelockController.grantRole(timelockController.CANCELLER_ROLE(), cancellers[i]);
    await tx.wait();
    console.log('added canceller', i, cancellers[i]);
  }

  console.log('setting admin', admin);
  let tx = await timelockController.grantRole(timelockController.TIMELOCK_ADMIN_ROLE(), admin);
  await tx.wait();
  console.log('set admin ok', admin);

  console.log('revoking deployer admin', deployer);
  tx = await timelockController.revokeRole(timelockController.TIMELOCK_ADMIN_ROLE(), deployer);
  await tx.wait();
  console.log('revoked deployer admin', deployer);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
