const hre = require("hardhat");

async function main() {
    let deployer = (await hre.ethers.getSigner()).address;
    console.log("deployer:", deployer)
    const network = hre.network.name
    const scAddr = require('../deployed/'+network+'.json')
    const OWNER_ADDRESS = scAddr.groupApprove
    console.log("New OWNER_ADDRESS groupApprove address:", OWNER_ADDRESS)
    
    let tokenManager = await hre.ethers.getContractAt("TokenManagerDelegateV2", scAddr.tokenManagerProxy);
    let cross = await hre.ethers.getContractAt("CrossDelegateV4", scAddr.crossProxy);
    let oracle = await hre.ethers.getContractAt("OracleDelegate", scAddr.oracleProxy);
    let signatureVerifier = await hre.ethers.getContractAt("SignatureVerifier", scAddr.signatureVerifier);

    let tx, oldOwner, nwOwner
    oldOwner = await tokenManager.owner();
    console.log("tokenManager oldOwner:", oldOwner)
    oldOwner = await cross.owner();
    console.log("cross oldOwner:", oldOwner)
    oldOwner = await oracle.owner();
    console.log("oracle oldOwner:", oldOwner)
    oldOwner = await signatureVerifier.owner();
    console.log("signatureVerifier oldOwner:", oldOwner)
    
    console.log("NoTryRun:", process.env.NoTryRun)
    if(process.env.NoTryRun != 'yes') {
        console.log("please check above information, then try again setting NoTryRun='yes' in env")
        return
    }

    tx = await tokenManager.transferOwner(OWNER_ADDRESS);
    await tx.wait()
    tx = await oracle.transferOwner(OWNER_ADDRESS);
    await tx.wait()

    tx = await cross.transferOwner(OWNER_ADDRESS);
    await tx.wait()
    tx = await signatureVerifier.transferOwner(OWNER_ADDRESS);
    await tx.wait()
    console.log('transfer owner finished.');
    
    nwOwner = await tokenManager.owner();
    console.log("tokenManager nwOwner:", nwOwner)
    nwOwner = await cross.owner();
    console.log("cross nwOwner:", nwOwner)
    nwOwner = await oracle.owner();
    console.log("oracle nwOwner:", nwOwner)
    nwOwner = await signatureVerifier.owner();
    console.log("signatureVerifier nwOwner:", nwOwner)
}

main()