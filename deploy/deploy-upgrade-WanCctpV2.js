const hre = require("hardhat");
const fs = require("fs");
const path = require("path");


const zeroAddress = "0x0000000000000000000000000000000000000000";
const CCTP_DOMAIN = {
  ethereum: 0, avalanche: 1, optimism: 2, arbitrum: 3, solana: 5, base: 6, linea: 11,
  sonic: 13, worldChain: 14
  // codex: 12, sonic: 13, worldChain: 14
};
const CCTP_BIP44 = {
  ethereum: 2147483708, avalanche: 2147492648, optimism: 2147484262, arbitrum: 1073741826, solana: 2147484149, base: 1073741841, linea: 1073741842,
  sonic: 2147493655, worldChain: 1073741857
  // codex: 12, sonic: 2147493655, worldChain: 14
};
const BIP44_DOMAIN_SET_PARAMS = Object.values(Object.keys(CCTP_BIP44).reduce((reduced, chain) => {
  const bip44ChainId = CCTP_BIP44[chain];
  const domain = CCTP_DOMAIN[chain];
  if (bip44ChainId && domain != undefined) {
    reduced[chain] = [bip44ChainId, domain];
  }
  return reduced;
}, {}));
console.log("BIP44_DOMAIN_SET_PARAMS:", BIP44_DOMAIN_SET_PARAMS)
console.log("networkConfig.cctpV2:", hre.network.config.cctpV2)

const BIP44_CHAIN_ID = hre.network.config.bip44ChainId;
if(!BIP44_CHAIN_ID) {
  console.log("please set BIP44_CHAIN_ID")
  process.exit()
}
const {
  proxyAdmin,
  delegateAdmin,
  feeToAddress,
  feeReadSC,
  tokenMessenger,
  messageTransmitter,
} = Object.assign({}, {feeReadSC: zeroAddress}, hre.network.config.cctpV2);
if(!proxyAdmin) {
  console.log("please set proxyAdmin")
  process.exit()
}
if(!feeToAddress) {
  console.log("please set feeToAddress")
  process.exit()
}
if(!tokenMessenger) {
  console.log("please set tokenMessenger")
  process.exit()
}
if(!messageTransmitter) {
  console.log("please set messageTransmitter")
  process.exit()
}


const verify = async (hre, artifact, address, pathName, constructorArgs) => {
  const etherscanChain = hre.config.etherscan.customChains.find(item => item.network === hre.network.name);
  console.log(hre.network.name, address, "etherscanChain?.urls?.apiURL:", etherscanChain?.urls?.apiURL, "isV2:", etherscanChain?.urls?.apiURL?.includes('api.etherscan.io/v2/api'));

  try {
    let network = await hre.ethers.provider.getNetwork();
    console.log("network:", network)

    let verificationId = await hre.run("verify:verify", {
      address: address,
      contract: pathName,
      constructorArguments: constructorArgs || [],
      bytecode: artifact.bytecode,
      noCompile: true, // Skip compilation if already compiled
      chainid: network.chainId,
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

  const deployer = (await hre.ethers.getSigner()).address;
  console.log("Deploying contracts with the account:", deployer);
  if (BigInt(deployer) != BigInt(proxyAdmin)) {
    console.log("proxyAdmin should be deployer", deployer)
    process.exit()
  }

  let admin = proxyAdmin;
  if (!admin || admin == zeroAddress) {
    admin = deployer;
  };
  console.log("admin:", admin);

  const WanCctpV2 = await hre.ethers.getContractFactory("WanCctpV2");
  const wanCctpV2 = await WanCctpV2.deploy();
  await wanCctpV2.deployed();
  console.log("WanCctpV2 deployed to:", wanCctpV2.address);
  await verify(hre, WanCctpV2, wanCctpV2.address, "contracts/cctp/v2/WanCctpV2.sol:WanCctpV2");

  const commonProxy = await hre.ethers.getContractAt("CommonProxy", scAddr.CommonProxy);

  console.log('WanCctpV2 upgradeTo...');
  const gasLimit = await commonProxy.estimateGas.upgradeTo(wanCctpV2.address);
  console.log("gasLimit:", gasLimit)
  const tx = await commonProxy.upgradeTo(wanCctpV2.address, { gasLimit });
  await tx.wait();
  console.log('WanCctpV2 upgradeTo finished.');

  const deployed = {
    WanCctpV2: wanCctpV2.address,
    CommonProxy: commonProxy.address,
  };
  fs.writeFileSync(`deployed/${hre.network.name}-WanCctpV2.json`, JSON.stringify(deployed, null, 2));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
