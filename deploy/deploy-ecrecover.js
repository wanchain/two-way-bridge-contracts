// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const Deployer=require("@matterlabs/hardhat-zksync-deploy").Deployer;
const Wallet = require("zksync-web3").Wallet;
const fs = require('fs');
const {sleep} = require("@nomiclabs/hardhat-ethers");


const waitForReceipt = true;
if (!process.env.PK)
    throw "⛔️ Private key not detected! Add it to the .env file!";


const BIP44_CHAIN_ID = hre.network.config.bip44ChainId
if (!BIP44_CHAIN_ID) {
    console.log("please set BIP44_CHAIN_ID")
    process.exit()
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

async function main() {
  const wallet = new Wallet(process.env.PK)
  const deployer = new Deployer(hre, wallet);
  const artifact = await deployer.loadArtifact("EcSchnorrJacob");

    //let deployer = (await hre.ethers.getSigner()).address;
    //console.log("depolyer",deployer)
    //let EcSchnorrVerifier = await hre.ethers.getContractFactory("EcSchnorrJacob");
    //let ecSchnorrVerifier = await EcSchnorrVerifier.deploy();
    let  ecSchnorrVerifier = await deployer.deploy(artifact);

    if (waitForReceipt) {
        await ecSchnorrVerifier.deployed();
    }
    console.log("EcSchnorrVerifier deployed to:", ecSchnorrVerifier.address);
    // config

    await verify(hre,artifact,ecSchnorrVerifier.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
