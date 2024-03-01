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
if (!process.env.PK)
    throw "⛔️ Private key not detected! Add it to the .env file!";
let COMMON_TOOL_LIB_ADDR = ''
if (hre.network.name.toLowerCase().indexOf('testnet') != -1) {
// testnet
    COMMON_TOOL_LIB_ADDR = '0xF53218eC14978E8d7f1335701BbF209386C3B9b4'
} else {
    // mainnet
    COMMON_TOOL_LIB_ADDR = '0x813A7b85090aA563a46b040135014470E60DC19F'
}

async function main() {
    let deployer = (await hre.ethers.getSigner()).address;


    let GpkLib = await hre.ethers.getContractFactory("GpkLib", {
        libraries: {
            CommonTool: COMMON_TOOL_LIB_ADDR,
        }
    });
    let gpkLib = await GpkLib.deploy();
    if (waitForReceipt) {
        await gpkLib.deployed();
    }
    console.log("GpkLib deployed to:", gpkLib.address);

    let GpkDelegate = await hre.ethers.getContractFactory("GpkDelegate", {
        libraries: {
            GpkLib: gpkLib.address,
        }
    });
    let gpkDelegate = await GpkDelegate.deploy();
    if (waitForReceipt) {
        await gpkDelegate.deployed();
    }
    console.log("gpkDelegate deployed to:", gpkDelegate.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
