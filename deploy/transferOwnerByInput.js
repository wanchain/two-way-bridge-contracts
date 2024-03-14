const hre = require("hardhat");
const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0  ")
    .alias('h', 'help')
    .describe('newOwner', 'new owner address.')
    .describe('dryRun', 'dryRun')
    .string('newOwner')
    .boolean('dryRun')
    .default('dryRun',true)
    .argv;

if (parseInt(Object.getOwnPropertyNames(optimist.argv).length) <= 1) {
    optimist.showHelp();
    process.exit(0);
}

async function main() {
    let deployer = (await hre.ethers.getSigner()).address;
    console.log("deployer:", deployer)
    const network = hre.network.name
    const scAddr = require('../deployed/' + network + '.json')
    let OWNER_ADDRESS = ''
    if (argv["newOwner"]) {
        OWNER_ADDRESS = argv["newOwner"]
        console.log("New OWNER_ADDRESS address:", OWNER_ADDRESS)
    } else {
        OWNER_ADDRESS = scAddr.groupApprove
        console.log("New OWNER_ADDRESS groupApprove address:", OWNER_ADDRESS)
    }

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

    console.log("dryRun", argv["dryRun"])
    if (argv["dryRun"]) {
        console.log("please check above information, then try again setting remove --dryRun")
        return
    }

    /*
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
     */
}

main()

// HARDHAT_NETWORK=opBnbTestnet node ./transferOwnerByInput.js --newOwner "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9"
// HARDHAT_NETWORK=opBnbTestnet node ./transferOwnerByInput.js --newOwner "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9" --dryRun false

// HARDHAT_NETWORK=opBnbTestnet node ./transferOwnerByInput.js                  //use groupApprove dryRun
// HARDHAT_NETWORK=opBnbTestnet node ./transferOwnerByInput.js   --dryRun false //use groupApprove dryRun