const hre = require("hardhat");

async function main() {
    let deployer = (await hre.ethers.getSigner()).address;
    console.log("deployer:", deployer)
    const network = hre.network.name
    const scAddr = require('../deployed/'+network+'.json')
    const OWNER_ADDRESS = scAddr.groupApprove;
    console.log("new owner:", OWNER_ADDRESS)

    let tokenManager = await hre.ethers.getContractAt("TokenManagerDelegateV2", scAddr.tokenManagerProxy);
    let cross = await hre.ethers.getContractAt("CrossDelegateV4", scAddr.crossProxy);
    let oracle = await hre.ethers.getContractAt("OracleDelegate", scAddr.oracleProxy);
    let signatureVerifier = await hre.ethers.getContractAt("SignatureVerifier", scAddr.signatureVerifier);

    console.log('transfer owner start...');

    let tx
    console.log('tokenManager old owner:', await tokenManager.owner());
    tx = await tokenManager.transferOwner(OWNER_ADDRESS);
    await tx.wait()
    console.log('tokenManager new owner:', await tokenManager.owner());

    console.log('oracle old owner:', await oracle.owner());
    tx = await oracle.transferOwner(OWNER_ADDRESS);
    await tx.wait()
    console.log('oracle new owner:', await oracle.owner());

    console.log('cross old owner:', await cross.owner());
    tx = await cross.transferOwner(OWNER_ADDRESS);
    await tx.wait()
    console.log('cross new owner:', await cross.owner());

    console.log('signatureVerifier old owner:', await signatureVerifier.owner());
    tx = await signatureVerifier.transferOwner(OWNER_ADDRESS);
    await tx.wait()
    console.log('signatureVerifier new owner:', await signatureVerifier.owner());

    console.log('transfer owner finished.');
    
    
}

main()