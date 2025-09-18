
const hre = require("hardhat");
const fs = require('fs');

// mainnet
const proposers = ["0x05CAF88FF0b089a9F31eA7275BCAA90F8Ad90fB9"];
const executors = ["0x0000000000000000000000000000000000000000"];

// testnet
// const proposers = ["0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9"];
// const executors = ["0x0000000000000000000000000000000000000000"];


const verify = async (hre, artifact, address, pathName, constructorArgs) => {
  try {
    const verificationId = await hre.run("verify:verify", {
      address: address,
      contract: pathName,
      constructorArguments: constructorArgs || [],
      bytecode: artifact.bytecode,
    });
    console.log(`${pathName} verified! VerificationId: ${verificationId}`)
  } catch (error) {
    if (error.message.includes("Contract source code already verified")) {
      console.log(`${pathName} already verified!`);
      return;
    } else if (error.message.includes("Reason: Already Verified")) {
      console.log(`${pathName} already verified!`);
      return;
    } else if (error.message.includes("Reason: Contract source code already verified")) {
      console.log(`${pathName} already verified!`);
      return;
    } else if (error.message.includes("Reason: Contract source code not verified")) {
      console.log(`${pathName} not verified!`);
      return;
    } else if (error.message.includes("Reason: Contract source code not found")) {
      console.log(`${pathName} not verified! Contract source code not found.`);
      return;
    } else if (error.message.includes("Reason: Contract source code not provided")) {
      console.log(`${pathName} not verified! Contract source code not provided.`);
      return;
    } else if (error.message.includes("Reason: Contract source code not available")) {
      console.log(`${pathName} not verified! Contract source code not available.`);
      return;
    } else if (error.message.includes("Reason: Contract source code not found in the provided sources")) {
      console.log(`${pathName} not verified! Contract source code not found in the provided sources.`);
      return;
    } else {
      console.log(`${pathName} verify failed!`, error);
      return;
    }
  }
    // const verificationId = await hre.run("verify:verify", {
    //   address: address,
    //   contract: pathName,
    //   constructorArguments: constructorArgs || [],
    //   bytecode: artifact.bytecode,
    // });
    // console.log(`${pathName} verified! VerificationId: ${verificationId}`)
}

async function main() {
    let deployer = (await hre.ethers.getSigner()).address;
    const network = hre.network.name
    const scAddr = require('../deployed/'+network+'.json')

    let TokenManagerDelegateV2 = await hre.ethers.getContractFactory("TokenManagerDelegateV2");
    let EcSchnorrVerifier = await hre.ethers.getContractFactory("EcSchnorrVerifier");
    let SignatureVerifier = await hre.ethers.getContractFactory("SignatureVerifier");
    let Bn128SchnorrVerifier = await hre.ethers.getContractFactory("Bn128SchnorrVerifier");
    

    let NFTLibV1 = await hre.ethers.getContractFactory("NFTLibV1");
    let RapidityLibV4 = await hre.ethers.getContractFactory("RapidityLibV4");

    let CrossDelegateV4 = await hre.ethers.getContractFactory("CrossDelegateV4", {
        libraries: {
          NFTLibV1: scAddr.NFTLibV1,
          RapidityLibV4: scAddr.RapidityLibV4,
        }
      });
    
    let OracleDelegate = await hre.ethers.getContractFactory("OracleDelegate");
    let Multicall2 = await hre.ethers.getContractFactory("Multicall2");
    let TokenManagerProxy = await hre.ethers.getContractFactory("TokenManagerProxy");
    let CrossProxy = await hre.ethers.getContractFactory("CrossProxy");
    let OracleProxy = await hre.ethers.getContractFactory("OracleProxy");
    let GroupApprove = await hre.ethers.getContractFactory("GroupApprove");
    let TimelockController = await hre.ethers.getContractFactory("TimelockController");

    await verify(hre, TokenManagerDelegateV2, scAddr.tokenManagerDelegate);
    await verify(hre, SignatureVerifier, scAddr.signatureVerifier);
    if(scAddr.EcSchnorrVerifier) {
        await verify(hre, EcSchnorrVerifier, scAddr.EcSchnorrVerifier);
    }
    if(scAddr.bn128SchnorrVerifier) {
        await verify(hre, Bn128SchnorrVerifier, scAddr.bn128SchnorrVerifier);
    }
    
    await verify(hre, NFTLibV1, scAddr.NFTLibV1);
    await verify(hre, RapidityLibV4, scAddr.RapidityLibV4);
    await verify(hre, CrossDelegateV4, scAddr.crossDelegate);
    await verify(hre, OracleDelegate, scAddr.oracleDelegate);
    await verify(hre, Multicall2, scAddr.multicall2);
    await verify(hre, TokenManagerProxy, scAddr.tokenManagerProxy);
    await verify(hre, CrossProxy, scAddr.crossProxy);
    await verify(hre, OracleProxy, scAddr.oracleProxy);

    await verify(hre, GroupApprove, scAddr.groupApprove, "contracts/GroupApprove/GroupApprove.sol:GroupApprove", [deployer, scAddr.signatureVerifier, scAddr.oracleProxy, scAddr.crossProxy]);
    await verify(hre, TimelockController, scAddr.timelock, "contracts/components/TimelockController.sol:TimelockController", [86400, proposers, executors, deployer]);

}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
