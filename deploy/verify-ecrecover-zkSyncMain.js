const hre = require("hardhat");
const optimist = require('optimist');
const {Wallet} = require("zksync-web3");
const {Deployer} = require("@matterlabs/hardhat-zksync-deploy");
let argv = optimist
    .usage("Usage: $0  ")
    .alias('h', 'help')
    .describe('scAddr', 'scAddr')
    .string('scAddr')
    .argv;

if (parseInt(Object.getOwnPropertyNames(optimist.argv).length) <= 1) {
    optimist.showHelp();
    process.exit(0);
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
    console.log(argv)
    const wallet = new Wallet(process.env.PK)
    const deployer = new Deployer(hre, wallet);
    const artifact = await deployer.loadArtifact("EcSchnorrJacob");
    await verify(hre,artifact,argv["scAddr"])
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// HARDHAT_NETWORK=zkSyncSepolia node ./verify-ecrecover.js   --scAddr 0xb8080463D592E382A7edE83404A5e2e067Bd9ac2
