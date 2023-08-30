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
  const provider = new Provider(hre.userConfig.networks?.zkSyncTestnet?.url);
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
// const ORACLE_ADMIN = '0x390CC3173EE7F425Fe7659df215B13959FD468E1';
// const CROSS_ADMIN = '0xa35B3C55626188015aC79F396D0B593947231976';
// const TOKEN_MANAGER_OPERATOR = '0xa35B3C55626188015aC79F396D0B593947231976';
// const SMG_FEE_PROXY = "0x82bf94d159b15a587c45c9d70e0fab7fd87889eb";
// const QUOTA_PROXY = '0x0000000000000000000000000000000000000000';
// const BIP44_CHAIN_ID = 0x8000032a; // ASTAR

const PROXY_ADMIN_OWNER = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
const ORACLE_ADMIN = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
const CROSS_ADMIN = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
const TOKEN_MANAGER_OPERATOR = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9';
const SMG_FEE_PROXY = "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9";
const QUOTA_PROXY = '0x0000000000000000000000000000000000000000';
// const BIP44_CHAIN_ID = 0x800003d1; // TELOS EVM
// const BIP44_CHAIN_ID = 1073741830; // Function X EVM
const BIP44_CHAIN_ID = 1073741837; // zkSync Era Testnet
const etherTransferGasLimit = 20000; // zkSync Era Testnet

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script...`);

  let deployer = getDeployer(hre);

  // First you need to deploy the libraries

  // let NFTLibV1 = await getArtifact(deployer, "NFTLibV1");
  // let nftLib = await deploy(deployer, NFTLibV1, []);
  // console.log("NFTLibV1 deployed to:", nftLib.address);
  // let RapidityLibV4 = await getArtifact(deployer, "RapidityLibV4");
  // let rapidityLib = await deploy(deployer, RapidityLibV4, []);
  // console.log("RapidityLibV4 deployed to:", rapidityLib.address);
  // return;


  let TokenManagerDelegateV2 = await getArtifact(deployer, "TokenManagerDelegateV2");
  let tokenManagerDelegate = await deploy(deployer, TokenManagerDelegateV2, []);

  console.log("TokenManagerDelegateV2 deployed to:", tokenManagerDelegate.address);


  let Multicall2 = await getArtifact(deployer, "Multicall2");
  let multicall = await deploy(deployer, Multicall2, []);

  console.log("Multicall2 deployed to:", multicall.address);

  let ProxyAdmin = await getArtifact(deployer, "ProxyAdmin");
  let proxyAdmin = await deploy(deployer, ProxyAdmin, []);

  console.log("Multicall2 deployed to:", multicall.address);




  let TokenManagerProxy = await getArtifact(deployer, "TokenManagerProxy");
  let tokenManagerProxy = await deploy(deployer, TokenManagerProxy, [tokenManagerDelegate.address, proxyAdmin.address, '0x']);

  console.log("TokenManagerProxy deployed to:", tokenManagerProxy.address);


  let CrossDelegateV4 = await getArtifact(deployer, "CrossDelegateV4");

  let crossDelegate = await deploy(deployer, CrossDelegateV4, []);

  console.log("CrossDelegateV4 deployed to:", crossDelegate.address);

  let CrossProxy = await getArtifact(deployer, "CrossProxy");
  let crossProxy = await deploy(deployer, CrossProxy, [crossDelegate.address, proxyAdmin.address, '0x']);

  console.log("CrossProxy deployed to:", crossProxy.address);
  let OracleDelegate = await getArtifact(deployer, "OracleDelegate");
  let oracleDelegate = await deploy(deployer, OracleDelegate, []);

  console.log("OracleDelegate deployed to:", oracleDelegate.address);
  let OracleProxy = await getArtifact(deployer, "OracleProxy");
  let oracleProxy = await deploy(deployer, OracleProxy, [oracleDelegate.address, proxyAdmin.address, '0x']);

  console.log("OracleProxy deployed to:", oracleProxy.address);
  let Bn128SchnorrVerifier = await getArtifact(deployer, "Bn128SchnorrVerifier");
  let bn128SchnorrVerifier = await deploy(deployer, Bn128SchnorrVerifier, []);

  console.log("bn128SchnorrVerifier deployed to:", bn128SchnorrVerifier.address);
  let SignatureVerifier = await getArtifact(deployer, "SignatureVerifier");
  let signatureVerifier = await deploy(deployer, SignatureVerifier, []);

  console.log("SignatureVerifier deployed to:", signatureVerifier.address);
  // config

  console.log('deploy finished start to config...');
  let tx;

  let tokenManager = getContract(hre, TokenManagerDelegateV2, tokenManagerProxy.address);
  let cross = getContract(hre, CrossDelegateV4, crossProxy.address);
  let oracle = getContract(hre, OracleDelegate, oracleProxy.address);
  console.log('initialise...');
  tx = await tokenManager.initialize();
  await tx.wait();
  console.log('tokenManager initialize finished.')
  tx = await cross.initialize();
  await tx.wait();
  console.log('cross initialize finished.')
  tx = await oracle.initialize();
  await tx.wait();
  console.log('oracle initialize finished.')

  console.log('oracle set admin...');

  tx = await oracle.setAdmin(ORACLE_ADMIN);
  await tx.wait();
  console.log('oracle set admin finished.')
  console.log('tokenManager add admin...')
  tx = await tokenManager.addAdmin(crossProxy.address);
  await tx.wait();
  console.log('tokenManager add admin finished.')

  console.log('tokenManager set operator...')
  tx = await tokenManager.setOperator(TOKEN_MANAGER_OPERATOR);
  await tx.wait();
  console.log('tokenManager set operator finished.')

  console.log('verifier register...')
  tx = await signatureVerifier.register(1, bn128SchnorrVerifier.address);
  await tx.wait();
  console.log('verifier register finished.')

  console.log('cross set partner...');
  tx = await cross.setPartners(tokenManagerProxy.address, oracleProxy.address, SMG_FEE_PROXY, QUOTA_PROXY, signatureVerifier.address);
  await tx.wait();
  console.log('cross set partner finished.');

  console.log('cross add admin...')
  let wallet = getWallet();
  tx = await cross.setAdmin(wallet.address);
  await tx.wait();
  console.log('cross set chainID...');
  tx = await cross.setChainID(BIP44_CHAIN_ID);
  console.log('cross set etherTransferGasLimit...');
  tx = await cross.setEtherTransferGasLimit(etherTransferGasLimit);
  await tx.wait();
  console.log('cross add admin2...')
  tx = await cross.setAdmin(CROSS_ADMIN);
  await tx.wait();
  console.log('config finished.');
  // console.log('transfer owner...');
  // transfer owner
  // await proxyAdmin.transferOwnership(PROXY_ADMIN_OWNER);
  // await tokenManager.transferOwner(OWNER_ADDRESS);
  // await cross.transferOwner(OWNER_ADDRESS);
  // await oracle.transferOwner(OWNER_ADDRESS);
  // await signatureVerifier.transferOwner(OWNER_ADDRESS);
  // console.log('transfer owner finished.');
  const deployed = {
    signatureVerifier: signatureVerifier.address,
    bn128SchnorrVerifier: bn128SchnorrVerifier.address,
    crossDelegate: crossDelegate.address,
    crossProxy: crossProxy.address,
    tokenManagerDelegate: tokenManagerDelegate.address,
    tokenManagerProxy: tokenManagerProxy.address,
    oracleDelegate: oracleDelegate.address,
    oracleProxy: oracleProxy.address,
    proxyAdmin: proxyAdmin.address,
    multicall2: multicall.address,
  };

  fs.writeFileSync(`deployed/zkSyncEraTestnet.json`, JSON.stringify(deployed, null, 2));

  await verify(hre, TokenManagerDelegateV2, tokenManagerDelegate.address, "contracts/tokenManager/TokenManagerDelegateV2.sol:TokenManagerDelegateV2", []);
  await verify(hre, CrossDelegateV4, crossDelegate.address, "contracts/crossApproach/CrossDelegateV4.sol:CrossDelegateV4", []);
  await verify(hre, OracleDelegate, oracleDelegate.address, "contracts/oracle/OracleDelegate.sol:OracleDelegate", []);
  await verify(hre, Bn128SchnorrVerifier, bn128SchnorrVerifier.address, "contracts/schnorr/Bn128SchnorrVerifier.sol:Bn128SchnorrVerifier", []);
  await verify(hre, SignatureVerifier, signatureVerifier.address, "contracts/schnorr/SignatureVerifier.sol:SignatureVerifier", []);
  // await verify(hre, ProxyAdmin, proxyAdmin.address, "node_modules/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin", []);
  await verify(hre, Multicall2, multicall.address, "contracts/lib/Multicall2.sol:Multicall2", []);
  await verify(hre, TokenManagerProxy, tokenManagerProxy.address, "contracts/tokenManager/TokenManagerProxy.sol:TokenManagerProxy", [tokenManagerDelegate.address, proxyAdmin.address, '0x']);
  await verify(hre, CrossProxy, crossProxy.address, "contracts/crossApproach/CrossProxy.sol:CrossProxy", [crossDelegate.address, proxyAdmin.address, '0x']);
  await verify(hre, OracleProxy, oracleProxy.address, "contracts/oracle/OracleProxy.sol:OracleProxy", [oracleDelegate.address, proxyAdmin.address, '0x']);

}
