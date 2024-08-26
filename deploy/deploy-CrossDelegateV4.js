const hre = require("hardhat");

const waitForReceipt = true;

async function main() {

  let NFTLibV1 = await hre.ethers.getContractFactory("NFTLibV1");
  let nftLib = await NFTLibV1.deploy();
  if (waitForReceipt) {
    await nftLib.deployed();
  }
  console.log("NFTLibV1 deployed to:", nftLib.address);

  let RapidityLibV4 = await hre.ethers.getContractFactory("RapidityLibV4");
  let rapidityLib = await RapidityLibV4.deploy();
  if (waitForReceipt) {
    await rapidityLib.deployed();
  }
  console.log("RapidityLibV4 deployed to:", rapidityLib.address);
  
  let CrossDelegateV4 = await hre.ethers.getContractFactory("CrossDelegateV4", {
    libraries: {
      NFTLibV1: nftLib.address,
      RapidityLibV4: rapidityLib.address,
    }
  });

  let crossDelegate = await CrossDelegateV4.deploy();
  if (waitForReceipt) {
    await crossDelegate.deployed();
  }

  console.log("CrossDelegateV4 deployed to:", crossDelegate.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

