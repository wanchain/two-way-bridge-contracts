const hre = require("hardhat");

async function main() {
  let QueryCurrentSmgId = await hre.ethers.getContractFactory("QueryCurrentSmgId");
  let queryCurrentSmgId = await QueryCurrentSmgId.deploy("0x1E7450D5d17338a348C5438546f0b4D0A5fbeaB6");
  await queryCurrentSmgId.deployed();
  console.log("queryCurrentSmgId deployed to:", queryCurrentSmgId.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

