const hre = require("hardhat");

const ADMIN = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
const OPERATOR = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
// const CROSS = '0x62de27e16f6f31d9aa5b02f4599fc6e21b339e79'; // wan testnet 
// const CROSS = '0xfceaaaeb8d564a9d0e71ef36f027b9d162bc334e'; // eth testnet 
// const CROSS = '0x3e18014f7c11f4d70b0023d8f61350a3ef8f0978'; // arb testnet
// const CROSS = '0x4c200a0867753454db78af84d147bd03e567f234'; // fuji testnet
// const CROSS = '0x589e12d073020f99febf32b739e58216748c9ed4'; // sepolia testnet
const CROSS = '0x08bad1a48b0b08bf769f83ba30c1dad0f8bb8b6b'; // arb sepolia testnet


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

