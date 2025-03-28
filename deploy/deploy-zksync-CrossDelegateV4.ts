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

// const OWNER_ADDRESS = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
// mainnet
const ORACLE_ADMIN = '0x390CC3173EE7F425Fe7659df215B13959FD468E1';
const CROSS_ADMIN = '0xa35B3C55626188015aC79F396D0B593947231976';
const TOKEN_MANAGER_OPERATOR = '0xa35B3C55626188015aC79F396D0B593947231976';
const SMG_FEE_PROXY = "0x82bf94d159b15a587c45c9d70e0fab7fd87889eb";
const QUOTA_PROXY = '0x0000000000000000000000000000000000000000';
// const BIP44_CHAIN_ID = 0x8000032a; // ASTAR

// const PROXY_ADMIN_OWNER = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
// const ORACLE_ADMIN = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
// const CROSS_ADMIN = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
// const TOKEN_MANAGER_OPERATOR = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
// const SMG_FEE_PROXY = "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9";
// const QUOTA_PROXY = '0x0000000000000000000000000000000000000000';
// const BIP44_CHAIN_ID = 0x800003d1; // TELOS EVM
// const BIP44_CHAIN_ID = 1073741830; // Function X EVM
const BIP44_CHAIN_ID = 1073741837; // zkSync Era Testnet
const etherTransferGasLimit = 50000; // zkSync Era Testnet

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script...`);

  let deployer = getDeployer(hre);
  let depolyer = getSigner(hre).address;

  // First you need to deploy the libraries
  // and after write the libraries to the config file, 
  // you must rm -rf artifacts-zk and compile it again!!!

  let NFTLibV1 = await getArtifact(deployer, "NFTLibV1");
  let nftLib = await deploy(deployer, NFTLibV1, []);
  console.log("NFTLibV1 deployed to:", nftLib.address);
  let RapidityLibV4 = await getArtifact(deployer, "RapidityLibV4");
  let rapidityLib = await deploy(deployer, RapidityLibV4, []);
  console.log("RapidityLibV4 deployed to:", rapidityLib.address);
  return;


  let CrossDelegateV4 = await getArtifact(deployer, "CrossDelegateV4");
  let crossDelegate = await deploy(deployer, CrossDelegateV4, []);
  console.log("CrossDelegateV4 deployed to:", crossDelegate.address);

  try {
    await verify(hre, CrossDelegateV4, crossDelegate.address, "contracts/crossApproach/CrossDelegateV4.sol:CrossDelegateV4", []);
  } catch (error) {
    console.log(error);
  }
}
