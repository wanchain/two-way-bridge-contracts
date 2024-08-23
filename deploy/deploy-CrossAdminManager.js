const hre = require("hardhat");

const ADMIN = '0xa35B3C55626188015aC79F396D0B593947231976';
const OPERATOR = '0x390cc3173ee7f425fe7659df215b13959fd468e1';
// const CROSS = '0x62de27e16f6f31d9aa5b02f4599fc6e21b339e79'; // wan testnet 
// const CROSS = '0xfceaaaeb8d564a9d0e71ef36f027b9d162bc334e'; // eth testnet 
// const CROSS = '0x3e18014f7c11f4d70b0023d8f61350a3ef8f0978'; // arb testnet
// const CROSS = '0x4c200a0867753454db78af84d147bd03e567f234'; // fuji testnet
// const CROSS = '0x589e12d073020f99febf32b739e58216748c9ed4'; // sepolia testnet
// const CROSS = '0x08bad1a48b0b08bf769f83ba30c1dad0f8bb8b6b'; // arb sepolia testnet
// const CROSS = '0xb12513cfcb13b7be59ba431c040b7206b0a211b9'; // bsc testnet
// const CROSS = '0x08bad1a48b0b08bf769f83ba30c1dad0f8bb8b6b'; // op testnet
// const CROSS = '0xfb06346e587ffb494438102515d576086be750f4'; // polygon testnet
// const CROSS = '0x1B71456BF3A0A7BEb8Ec07A8E322C0c2D088C322'; // base testnet
const CROSS = '0xc6ae1db6c66d909f7bfeeeb24f9adb8620bf9dbf'; // OP mainnet

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

