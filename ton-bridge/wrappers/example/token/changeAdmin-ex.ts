import {configMainnet, configTestTonApiNoDb} from "../../config/config-ex";
import {Address} from '@ton/core';
import {getSenderByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {JettonMinter} from "../../JettonMinter";
import {WanTonClient} from "../../client/client-interface";

const prvList = require('../../testData/prvlist.json')

let deployer, client;


const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('tokenAddr', 'tokenAddress')
    .describe('newAdminAddr', 'new admin address')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 4) {
    optimist.showHelp();
    process.exit(0);
}


global.network = argv["network"];
const config = require('../../config/config');

let contractProvider = null;

async function init() {
    if (global.network == 'testnet') {
        await wanTonSdkInit(configTestTonApiNoDb);
    } else {
        await wanTonSdkInit(configMainnet);
    }
    client = await getClient();
    deployer = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
}

async function changeAdmin(client: WanTonClient, tokenAddress: Address, newAdmin: Address) {
    let via = deployer;

    let jettonMinter = JettonMinter.createFromAddress(tokenAddress);
    let contractProvider = client.provider(jettonMinter.address);

    let changeResult = await jettonMinter.sendChangeAdmin(contractProvider, via, newAdmin)
    console.log("changeResult", changeResult);

}

async function main() {
    console.log("argv", process.argv);
    console.log("Entering main function");
    await init();
    let tokenAddr = Address.parse(argv['tokenAddr']);
    let newAdmin = Address.parse(argv['newAdminAddr']);
    await changeAdmin(client, tokenAddr, newAdmin);
}

main();
//wan

// ts-node changeAdmin-ex.ts <tokenAddress> <newAdminAddr>
// ts-node changeAdmin-ex.ts --network testnet --tokenAddr kQA_L8-V29GTQwfi9LruGuQf9JwqLggBIB3ByDC8KLReK0x3 --newAdminAddr EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c

// change to zero, disable mint
// ts-node changeAdmin-ex.ts --network testnet --tokenAddr kQA_L8-V29GTQwfi9LruGuQf9JwqLggBIB3ByDC8KLReK0x3 --newAdminAddr EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c

// ts-node changeAdmin-ex.ts --network testnet --tokenAddr kQA_L8-V29GTQwfi9LruGuQf9JwqLggBIB3ByDC8KLReK0x3 --newAdminAddr EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c