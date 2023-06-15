// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const fs = require('fs');
const {sleep} = require("@nomiclabs/hardhat-ethers");
const waitForReceipt = true;

async function main() {
    let deployer = (await hre.ethers.getSigner()).address;
    console.log("deployer:", deployer);

    let CommonTool = await hre.ethers.getContractFactory("CommonTool");
    let commonoTool = await CommonTool.deploy();
    if (waitForReceipt) {
        await commonoTool.deployed();
    }
    console.log("commonoTool deployed to:", commonoTool.address);

    let GpkLibV2 = await hre.ethers.getContractFactory("GpkLibV2", {
        libraries: {
            CommonTool: commonoTool.address,
        }
    });
    let gpkLibV2 = await GpkLibV2.deploy();
    if (waitForReceipt) {
        await gpkLibV2.deployed();
    }
    console.log("gpkLibV2 deployed to:", gpkLibV2.address);


    let GpkDelegateV2 = await hre.ethers.getContractFactory("GpkDelegateV2", {
        libraries: {
            GpkLibV2: gpkLibV2.address,
        }
    });
    let gpkDelegateV2 = await GpkDelegateV2.deploy();
    if (waitForReceipt) {
        await gpkDelegateV2.deployed();
    }
    console.log("gpkDelegateV2 deployed to:", gpkDelegateV2.address);


    const deployed = {
        CommonTool: commonoTool.address,
        GpkLib: gpkLibV2.address,
        GpkDelegateV2: gpkDelegateV2.address,
    };

    fs.writeFileSync(`deployed/${hre.network.name}-gpk3.json`, JSON.stringify(deployed, null, 2));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});



/// npx hardhat --verbose --network wanTestnet run scripts/update-gpk3.js
//  npx hardhat --network wanMainnet run scripts/update-gpk3.js
