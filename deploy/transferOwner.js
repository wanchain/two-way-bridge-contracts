const hre = require("hardhat");

async function main() {
    const OWNER_ADDRESS = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9' 
    let deployer = (await hre.ethers.getSigner()).address;
    console.log("deployer:", deployer)
    const network = hre.network.name
    const scAddr = require('../deployed/'+network+'.json')

    let tokenManager = await hre.ethers.getContractAt("TokenManagerDelegateV2", scAddr.tokenManagerProxy);
    let cross = await hre.ethers.getContractAt("CrossDelegateV4", scAddr.crossProxy);
    let oracle = await hre.ethers.getContractAt("OracleDelegate", scAddr.oracleProxy);
    let signatureVerifier = await hre.ethers.getContractAt("SignatureVerifier", scAddr.signatureVerifier);

    let tx
    tx = await tokenManager.transferOwner(OWNER_ADDRESS);
    await tx.wait()
    tx = await oracle.transferOwner(OWNER_ADDRESS);
    await tx.wait()

    // tx = await cross.transferOwner(OWNER_ADDRESS);
    // await tx.wait()
    // tx = await signatureVerifier.transferOwner(OWNER_ADDRESS);
    // await tx.wait()
    console.log('transfer owner finished.');
    
    
}

main()