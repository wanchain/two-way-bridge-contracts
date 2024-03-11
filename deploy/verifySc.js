
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
    let deployer = (await hre.ethers.getSigner()).address;
    const network = hre.network.name
    const scAddr = require('../deployed/'+network+'.json')

    let TokenManagerDelegateV2 = await hre.ethers.getContractFactory("TokenManagerDelegateV2");
    let EcSchnorrVerifier = await hre.ethers.getContractFactory("EcSchnorrVerifier");
    let SignatureVerifier = await hre.ethers.getContractFactory("SignatureVerifier");
    let Bn128SchnorrVerifier = await hre.ethers.getContractFactory("Bn128SchnorrVerifier");
    

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

    // add try catch for each verify,because no try catch, if fail to  verify the first, there is no way to verfiy second
    // for example error: HardhatEtherscanPluginError: Contract source code already verified
    try{
        await verify(hre, TokenManagerDelegateV2, scAddr.tokenManagerDelegate);
    }catch(e){
        console.log(e)
    }

    try{
        await verify(hre, SignatureVerifier, scAddr.signatureVerifier);
    }catch(e){
        console.log(e)
    }


    if(scAddr.ecSchnorrVerifier) {
        try{
            await verify(hre, EcSchnorrVerifier, scAddr.ecSchnorrVerifier);
        }catch(e){
            console.log(e)
        }
    }
    if(scAddr.bn128SchnorrVerifier) {
        try{
            await verify(hre, Bn128SchnorrVerifier, scAddr.bn128SchnorrVerifier);
        }catch(e){
            console.log(e)
        }
    }
    try{
        await verify(hre, CrossDelegateV4, scAddr.crossDelegate);
    }catch(e){
        console.log(e)
    }
    try{
        await verify(hre, OracleDelegate, scAddr.oracleDelegate);
    }catch(e){
        console.log(e)
    }
    try{
        await verify(hre, Multicall2, scAddr.multicall2);
    }catch(e){
        console.log(e)
    }
    try{
        await verify(hre, TokenManagerProxy, scAddr.tokenManagerProxy);
    }catch(e){
        console.log(e)
    }
    try{
        await verify(hre, CrossProxy, scAddr.crossProxy);
    }catch(e){
        console.log(e)
    }
    try{
        await verify(hre, OracleProxy, scAddr.oracleProxy);
    }catch(e){
        console.log(e)
    }
    try{
        await verify(hre, GroupApprove, scAddr.groupApprove, "contracts/GroupApprove/GroupApprove.sol:GroupApprove", [deployer, scAddr.signatureVerifier, scAddr.oracleProxy, scAddr.crossProxy]);
    }catch(e){
        console.log(e)
    }
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
