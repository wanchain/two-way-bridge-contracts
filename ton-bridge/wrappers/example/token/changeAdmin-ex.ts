import {configTestnet, configMainnet, configTestTonApiNoDb} from "../../config/config-ex";
import {Address,Sender} from '@ton/core';
import {getSenderByPrvKey, getTonAddrByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, TonClientConfig, wanTonSdkInit} from "../../client/client";
import{JettonMinter} from "../../JettonMinter";
import {CoinBalance,TokenBalance} from "../../wallet/balance";
import {TON_FEE} from "../../fee/fee";
import {WanTonClient} from "../../client/client-interface";
import {toNumberByDecimal} from "../../utils/utils";

const args = process.argv.slice(2);
const prvList = require('../../testData/prvlist.json')

let deployer , client;

let contractProvider =null;
async function init(){
    //await wanTonSdkInit(configMainnet);
    await wanTonSdkInit(configTestTonApiNoDb);
    client = await getClient();
    deployer = await getSenderByPrvKey(client,Buffer.from(prvList[0],'hex'));
}
async function changeAdmin(client:WanTonClient,tokenAddress: Address, newAdmin: Address) {
    let via = deployer;

    let jettonMinter = JettonMinter.createFromAddress(tokenAddress);
    let contractProvider = client.provider(jettonMinter.address);

    let changeResult = await jettonMinter.sendChangeAdmin(contractProvider, via, newAdmin)
    console.log("changeResult",changeResult);

}

async function main(){
    console.log("argv",process.argv);
    console.log("Entering main function");
    await init();
    let tokenAddr = Address.parse(args[0]);
    let newAdmin = Address.parse(args[1]);
    await changeAdmin(client,tokenAddr,newAdmin);
};

main();
//wan

// ts-node changeAdmin-ex.ts <tokenAddress> <newAdminAddr>
// ts-node changeAdmin-ex.ts kQA_L8-V29GTQwfi9LruGuQf9JwqLggBIB3ByDC8KLReK0x3 <newAdminAddr>

// change to zero, disable mint
// ts-node changeAdmin-ex.ts kQA_L8-V29GTQwfi9LruGuQf9JwqLggBIB3ByDC8KLReK0x3 EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c

