const hre = require("hardhat");

const foundation = "0x4cEd9c0EA79Ee6181600777D5B6badE7F3D301bF";
const signatureVerifier = "0x5B0B9D1A58cacb8E3f7Cb72225996fc535530f6B";
const oracle = "0x8D42d317B2bd6B60183461ed41bd00F17C3f3fE8";
const cross = "0xc21E5553c8dDDf2E4a93E5bEDBaE436d4291F603";

// An example of a deploy script that will deploy and call a simple contract.
async function main() {
  let deployer = (await hre.ethers.getSigner()).address;
  console.log("Deploying contracts with the account:", deployer);

  let GroupApprove = await hre.ethers.getContractFactory("GroupApprove");
  let groupApprove = await GroupApprove.deploy(foundation, signatureVerifier, oracle, cross);
  await groupApprove.deployed();
  console.log("GroupApprove deployed to:", groupApprove.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
