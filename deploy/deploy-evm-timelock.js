const hre = require("hardhat");

const proposers = ["0x390CC3173EE7F425Fe7659df215B13959FD468E1"];
const executors = ["0x0000000000000000000000000000000000000000"];
const admin = '0x6f0889f42BaA6a0F815cE3E93530bcf2d6a711bE';
const cancellers = [
  "0xf0619c7e4d442961731c0721628b8156294cd578",
  "0xa32220d02acff019e3c4075b4c086b5f4cdff5be",
  "0x6f0889f42BaA6a0F815cE3E93530bcf2d6a711bE"
]

// An example of a deploy script that will deploy and call a simple contract.
async function main() {
  let deployer = (await hre.ethers.getSigners())[0].address;
  console.log("Deploying contracts with the account:", deployer);

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
