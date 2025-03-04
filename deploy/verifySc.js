
const hre = require("hardhat");
const fs = require('fs');



const verify = async (hre, artifact, address, pathName, constructorArgs) => {
    const verificationId = await hre.run("verify:verify", {
      address: address,
      contract: pathName,
      constructorArguments: constructorArgs || [],
      bytecode: artifact.bytecode,
    });
    console.log(`${pathName} verified! VerificationId: ${verificationId}`)
}

async function main() {
    let deployer = (await hre.ethers.getSigners())[0].address;
    const network = hre.network.name
    const scAddr = require('../deployed/'+network+'.json')

    let TokenManagerDelegateV2 = await hre.ethers.getContractFactory("TokenManagerDelegateV2");
    let EcSchnorrVerifier = await hre.ethers.getContractFactory("EcSchnorrVerifier");
    let SignatureVerifier = await hre.ethers.getContractFactory("SignatureVerifier");
    let Bn128SchnorrVerifier = await hre.ethers.getContractFactory("Bn128SchnorrVerifier");
    

    let CrossDelegateV5 = await hre.ethers.getContractFactory("CrossDelegateV5", {
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

    await verify(hre, TokenManagerDelegateV2, scAddr.tokenManagerDelegate);
    await verify(hre, SignatureVerifier, scAddr.signatureVerifier);
    if(scAddr.ecSchnorrVerifier) {
        await verify(hre, EcSchnorrVerifier, scAddr.ecSchnorrVerifier);
    }
    if(scAddr.bn128SchnorrVerifier) {
        await verify(hre, Bn128SchnorrVerifier, scAddr.bn128SchnorrVerifier);
    }
    
    await verify(hre, CrossDelegateV5, scAddr.crossDelegate);
    await verify(hre, OracleDelegate, scAddr.oracleDelegate);
    await verify(hre, Multicall2, scAddr.multicall2);
    await verify(hre, TokenManagerProxy, scAddr.tokenManagerProxy);
    await verify(hre, CrossProxy, scAddr.crossProxy);
    await verify(hre, OracleProxy, scAddr.oracleProxy);
    await verify(hre, GroupApprove, scAddr.groupApprove, "contracts/GroupApprove/GroupApprove.sol:GroupApprove", [deployer, scAddr.signatureVerifier, scAddr.oracleProxy, scAddr.crossProxy]);

}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
