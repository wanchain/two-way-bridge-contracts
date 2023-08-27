const hre = require("hardhat");

const scAddr = require('../deployed/polyZkTestnet.json')
async function main() {
    const OWNER_ADDRESS = '0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9' 

    let TokenManagerDelegateV2 = await hre.ethers.getContractFactory("TokenManagerDelegateV2");
    let tokenManager = TokenManagerDelegateV2.attach(scAddr.tokenManagerProxy)

    let CrossDelegateV4 = await hre.ethers.getContractFactory("CrossDelegateV4", {
        libraries: {
          NFTLibV1: scAddr.NFTLibV1,
          RapidityLibV4: scAddr.RapidityLibV4,
        }
      });
    let cross = CrossDelegateV4.attach(scAddr.crossProxy)

    let OracleDelegate = await hre.ethers.getContractFactory("OracleDelegate");
    let oracle = OracleDelegate.attach(scAddr.oracleProxy)

    let SignatureVerifier = await hre.ethers.getContractFactory("SignatureVerifier");
    let signatureVerifier = SignatureVerifier.attach(scAddr.signatureVerifier)

    await tokenManager.transferOwner(OWNER_ADDRESS);
    await cross.transferOwner(OWNER_ADDRESS);
    await oracle.transferOwner(OWNER_ADDRESS);
    await signatureVerifier.transferOwner(OWNER_ADDRESS);
    console.log('transfer owner finished.');
    
    
}

main()