import { Wallet, utils, Provider } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import fs from 'fs';


// load env file
import dotenv from "dotenv";
dotenv.config();

if (!process.env.PK)
  throw "⛔️ Private key not detected! Add it to the .env file!";

const getWallet = () => {
  return new Wallet(process.env.PK || "");
}

const getDeployer = (hre: HardhatRuntimeEnvironment) => {
  const wallet = getWallet();
  console.log('wallet addr', wallet.address);
  return new Deployer(hre, wallet);
}

const getArtifact = async (deployer: Deployer, name: string) => {
  return await deployer.loadArtifact(name);
}

const deploy = async (dp, artifact, args) => {
  const contract = await dp.deploy(artifact, args || []);
  console.log(`Deployed ${artifact.contractName} to ${contract.address}`);
  return contract;
}

const verify = async (hre, artifact, address, pathName, constructorArgs) => {
  const verificationId = await hre.run("verify:verify", {
    address: address,
    contract: pathName,
    constructorArguments: constructorArgs || [],
    bytecode: artifact.bytecode,
  });
  console.log(`${pathName} verified! VerificationId: ${verificationId}`)
}

const getSigner = (hre: HardhatRuntimeEnvironment) => {
  const provider = new Provider(hre.userConfig.networks?.zkSyncMainnet?.url);
  const signer = new ethers.Wallet(process.env.PK || '', provider);
  return signer;
}

const getContract = (hre: HardhatRuntimeEnvironment, artifact, address) => {
  const signer = getSigner(hre);
  const contract = new ethers.Contract(address, artifact.abi, signer);
  return contract;
}

const proposers = ["0x390CC3173EE7F425Fe7659df215B13959FD468E1"];
const executors = ["0x0000000000000000000000000000000000000000"];
const admin = '0xa35B3C55626188015aC79F396D0B593947231976';
const cancellers = [
  "0x7521eda00e2ce05ac4a9d8353d096ccb970d5188",
  "0xae693fb903559f8856a3c21d6c0aa4a4e9682ae9",
  "0xa35b3c55626188015ac79f396d0b593947231976"
]

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script...`);

  let deployer = getDeployer(hre);

  let TimelockController = await getArtifact(deployer, "TimelockController");
  // const TimelockAddr = '0xfA1D6FE6E5a2a7f294aD1DF0c36E70D612dC622D';
  // const timelockController = getContract(hre, TimelockController, TimelockAddr);
  let timelockController = await deploy(deployer, TimelockController, [86400, proposers, executors, deployer.ethWallet.address]);

  console.log("TimelockController deployed to:", timelockController.address);

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

  console.log('revoking deployer admin', deployer.ethWallet.address);
  tx = await timelockController.revokeRole(timelockController.TIMELOCK_ADMIN_ROLE(), deployer.ethWallet.address);
  await tx.wait();
  console.log('revoked deployer admin', deployer.ethWallet.address  );

  await verify(hre, TimelockController, timelockController.address, "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController", [86400, proposers, executors, deployer.ethWallet.address]);
}
