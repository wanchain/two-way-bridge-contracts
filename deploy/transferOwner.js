const hre = require("hardhat");

async function main() {
    const deployer = (await hre.ethers.getSigners())[0].address;
    console.log("deployer:", deployer)

    const network = hre.network.name
    const scAddr = require('../deployed/'+network+'.json')
    const OWNER_ADDRESS = scAddr.groupApprove;
    console.log("new owner:", OWNER_ADDRESS, "scAddr:", scAddr)

    const tokenManager = await hre.ethers.getContractAt("TokenManagerDelegateV2", scAddr.tokenManagerProxy);
    const cross = await hre.ethers.getContractAt("CrossDelegateV4", scAddr.crossProxy);
    const oracle = await hre.ethers.getContractAt("OracleDelegate", scAddr.oracleProxy);
    const signatureVerifier = await hre.ethers.getContractAt("SignatureVerifier", scAddr.signatureVerifier);


    let tx, owner;
    { // TokenManager
        owner = await tokenManager.owner();
        console.log(`TokenManager ${tokenManager.address || tokenManager.target} owner old:`, owner);
        if (owner.toLowerCase() != OWNER_ADDRESS.toLowerCase()) {
            tx = await tokenManager.transferOwner(OWNER_ADDRESS);
            await tx.wait()
        }
        owner = await tokenManager.owner();
        console.log(`TokenManager ${tokenManager.address || tokenManager.target} owner new:`, owner);
    }

    { // Oracle
        owner = await oracle.owner();
        console.log(`Oracle ${oracle.address || oracle.target} owner old:`, owner);
        if (owner.toLowerCase() != OWNER_ADDRESS.toLowerCase()) {
            tx = await oracle.transferOwner(OWNER_ADDRESS);
            await tx.wait()
        }
        owner = await oracle.owner();
        console.log(`Oracle ${oracle.address || oracle.target} owner new:`, owner);
    }

    { // Cross
        owner = await cross.owner();
        console.log(`Cross ${cross.address || cross.target} owner old:`, owner);
        if (owner.toLowerCase() != OWNER_ADDRESS.toLowerCase()) {
            tx = await cross.transferOwner(OWNER_ADDRESS);
            await tx.wait()
        }
        owner = await cross.owner();
        console.log(`Cross ${cross.address || cross.target} owner new:`, owner);
    }

    { // SignatureVerifier
        owner = await signatureVerifier.owner();
        console.log(`SignatureVerifier ${signatureVerifier.address || signatureVerifier.target} owner old:`, owner);
        if (owner.toLowerCase() != OWNER_ADDRESS.toLowerCase()) {
            tx = await signatureVerifier.transferOwner(OWNER_ADDRESS);
            await tx.wait()
        }
        owner = await signatureVerifier.owner();
        console.log(`SignatureVerifier ${signatureVerifier.address || signatureVerifier.target} owner new:`, owner);
        console.log('transfer owner finished.');
    }

}

main()