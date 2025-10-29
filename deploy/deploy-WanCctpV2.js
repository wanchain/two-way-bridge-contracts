const hre = require("hardhat");
const fs = require("fs");


const zeroAddress = "0x0000000000000000000000000000000000000000";
const CCTP_DOMAIN = {
  ethereum: 0, avalanche: 1, optimism: 2, arbitrum: 3, base: 6, polygon: 7, linea: 11, worldChain: 14, unichain: 10, sonic: 13, sei: 16, xdc: 18
  // ,solana: 5,  codex: 12, 
};
const CCTP_BIP44 = {
  ethereum: 2147483708, avalanche: 2147492648, optimism: 2147484262, arbitrum: 1073741826, base: 1073741841, polygon: 2147484614, linea: 1073741842, worldChain: 1073741857, unichain: 1073741858, sonic: 2147493655, sei: 2166483766, xdc: 2147484198
  // ,solana: 2147484149,  codex: xxx, 
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
    let verificationId = await hre.run("verify:verify", {
      address: address,
      contract: pathName,
      constructorArguments: constructorArgs || [],
      bytecode: artifact.bytecode,
      // noCompile: true, // Skip compilation if already compiled
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
  const deployer = (await hre.ethers.getSigner()).address;
  console.log("Deploying contracts with the account:", deployer);
  if (BigInt(deployer) == BigInt(proxyAdmin)) {
    console.log("proxyAdmin should not be deployer", deployer)
    process.exit()
  }

  let admin = delegateAdmin;
  if (!admin || admin == zeroAddress) {
    admin = deployer;
  };
  console.log("admin:", admin);
  console.log("proxy admin:", proxyAdmin);

  const WanCctpV2 = await hre.ethers.getContractFactory("WanCctpV2");

  const wanCctpV2 = await WanCctpV2.deploy();
  await wanCctpV2.deployed();
  console.log("WanCctpV2 deployed to:", wanCctpV2.address);
  await verify(hre, WanCctpV2, wanCctpV2.address, "contracts/cctp/v2/WanCctpV2.sol:WanCctpV2");

  const CommonProxy = await hre.ethers.getContractFactory("CommonProxy");
  const commonProxy = await CommonProxy.deploy(wanCctpV2.address, proxyAdmin, "0x");
  await commonProxy.deployed();
  console.log("CommonProxy deployed to:", commonProxy.address);
  await verify(hre, CommonProxy, commonProxy.address, "contracts/cctp/proxy/CommonProxy.sol:CommonProxy", [wanCctpV2.address, proxyAdmin, "0x"]);

  const sc = await hre.ethers.getContractAt("WanCctpV2", commonProxy.address);

  let tx, gasLimit;
  console.log('WanCctpV2 initialize...');
  gasLimit = await sc.estimateGas.initialize(deployer, feeToAddress, feeReadSC, BIP44_CHAIN_ID, tokenMessenger, messageTransmitter);
  console.log("WanCctpV2 initialize gasLimit:", gasLimit)
  tx = await sc.initialize(deployer, feeToAddress, feeReadSC, BIP44_CHAIN_ID, tokenMessenger, messageTransmitter, {gasLimit});
  await tx.wait();

  console.log('WanCctpV2 setCirclePathToBip44...');
  tx = await sc.setCirclePathToBip44(BIP44_DOMAIN_SET_PARAMS);
  await tx.wait();
  console.log('WanCctpV2 config finished.');

  if (BigInt(admin) != BigInt(deployer)) {
    console.log('setting admin', admin);
    let tx = await sc.grantRole(sc.DEFAULT_ADMIN_ROLE(), admin);
    await tx.wait();
    console.log('set admin ok', admin);

    console.log('revoking deployer admin', deployer);
    tx = await sc.revokeRole(sc.DEFAULT_ADMIN_ROLE(), deployer);
    await tx.wait();
    console.log('revoked deployer admin', deployer);
  }

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
