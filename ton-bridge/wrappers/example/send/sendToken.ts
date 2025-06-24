import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, TonClientConfig, wanTonSdkInit} from "../../client/client";
let client,deployer,via;

import {WanTonClient} from "../../client/client-interface";
import {configTestTonApiNoDb} from "../../config/config-ex";
import {Address, Sender} from "@ton/core";
import {sendCoin, sendToken} from "../../wallet/send";
import {CoinBalance, TokenBalance} from "../../wallet/balance";
import {sleep} from "../../utils/utils";

const prvList = require('../../testData/prvlist.json')

async function init(){
    await wanTonSdkInit(configTestTonApiNoDb);
    client = await getClient();
    deployer = await getWalletByPrvKey(Buffer.from(prvList[2],'hex'));
    via = await getSenderByPrvKey(client,Buffer.from(prvList[2],'hex'));
}

async function send(client:WanTonClient,via:Sender,senderAddr:Address,tokenAccount:Address,dest:Address,amount:bigint){
    return (await sendToken(client,via,senderAddr,tokenAccount,dest,amount))
}
let argv = process.argv
async function main() {
    console.log(process.argv);
    await init();
    console.log("via",via);
    console.log("Entering main function", "fromAddress",deployer.address);
    let tokenAccountAddr = Address.parse(argv[2])
    let destAddr = Address.parse(argv[3])
    let amount = BigInt(argv[4]);  // decimal 9
    let balance = await TokenBalance(client,tokenAccountAddr,destAddr);
    console.log(`before balance of ${argv[3]} is ${balance}`);
    let ret = await send(client,via,deployer.address,tokenAccountAddr,destAddr,amount)
    await sleep(5000)
    console.log(`After balance of ${argv[3]} is ${ret}`);
}

main();
// ts-node sendToken.ts <tokenAccount> <destAddress> <amount>
// ts-node sendToken.ts EQA_L8-V29GTQwfi9LruGuQf9JwqLggBIB3ByDC8KLReK_f9 0QALz9kOW8wETujt9zDgLCaEfevg3PU6sljgead4op81Jixq 1000

