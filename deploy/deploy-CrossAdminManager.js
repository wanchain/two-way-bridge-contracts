const hre = require("hardhat");

const ADMIN = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
const OPERATOR = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
const CROSS = '0x62de27e16f6f31d9aa5b02f4599fc6e21b339e79'; // wan testnet 

async function main() {
  let CrossAdminManager = await hre.ethers.getContractFactory("CrossAdminManager");
  let crossAdminManager = await CrossAdminManager.deploy(ADMIN, OPERATOR, CROSS);
  await crossAdminManager.deployed();
  console.log("crossAdminManager deployed to:", crossAdminManager.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

