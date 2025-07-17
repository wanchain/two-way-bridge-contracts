const hre = require("hardhat");
const path = require("path");


const {
  proxyAdmin,
} = Object.assign({}, {}, hre.network.config.cctpV2);
if(!proxyAdmin) {
  console.log("please set proxyAdmin")
  process.exit()
}


const verify = async (hre, artifact, address, pathName, constructorArgs) => {
  try {
    let verificationId = await hre.run("verify:verify", {
      address: address,
      contract: pathName,
      constructorArguments: constructorArgs || [],
      bytecode: artifact.bytecode,
      noCompile: true, // Skip compilation if already compiled
    });
    console.log(`${pathName || artifact.contractName || "Contract"} verified! VerificationId: ${verificationId}`)
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log(`${pathName || artifact.contractName || "Contract"} already verified at address: ${address}`);
    } else {
      console.error(`Error verifying ${pathName || artifact.contractName || "Contract"} at address ${address}:`, error);
    }
  }
}

// An example of a deploy script that will deploy and call a simple contract.
async function main() {
  const scAddr = require(path.join(path.dirname(__dirname), `deployed/${hre.network.name}-WanCctpV2.json`))

  const WanCctpV2 = await hre.ethers.getContractFactory("WanCctpV2");
  const wanCctpV2 = await hre.ethers.getContractAt("WanCctpV2", scAddr.WanCctpV2);
  await verify(hre, WanCctpV2, wanCctpV2.address, "contracts/cctp/v2/WanCctpV2.sol:WanCctpV2");


  const CommonProxy = await hre.ethers.getContractFactory("CommonProxy");
  const commonProxy = await hre.ethers.getContractAt("CommonProxy", scAddr.CommonProxy);
  await verify(hre, CommonProxy, commonProxy.address, "contracts/cctp/proxy/CommonProxy.sol:CommonProxy", [wanCctpV2.address, proxyAdmin, "0x"]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
