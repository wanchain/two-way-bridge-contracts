import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {getClient, TonClientConfig, wanTonSdkInit} from "../../client/client";
let client,deployer,via;

import {WanTonClient} from "../../client/client-interface";
import {configTestTonApiNoDb} from "../../config/config-ex";
import {Address, Sender} from "@ton/core";
import {sendCoin} from "../../wallet/send";
import {CoinBalance} from "../../wallet/balance";
import {sleep} from "../../utils/utils";

const prvList = require('../../testData/prvlist.json')

async function init(){
    await wanTonSdkInit(configTestTonApiNoDb);
    client = await getClient();
    deployer = await getWalletByPrvKey(Buffer.from(prvList[1],'hex'));
    via = await getSenderByPrvKey(client,Buffer.from(prvList[1],'hex'));
}

async function send(client:WanTonClient,via:Sender,amount:bigint,dest:Address){
    return (await sendCoin(client,via,dest,amount))
}
let argv = process.argv
async function main() {
    console.log("Entering main function");
    console.log(process.argv);
    await init();
    let destAddr = Address.parse(argv[2])
    let amount = BigInt(argv[3]);  // decimal 9
    let balance = await CoinBalance(client,destAddr);
    console.log(`before balance of ${argv[2]} is ${balance}`);
    let ret = await send(client,via,amount,destAddr)
    await sleep(5000)
    console.log(`After balance of ${argv[2]} is ${ret}`);
}

main();
// ts-node sendCoin.ts <destAddress> <amount>
// ts-node sendCoin.ts EQCGOHmrNm3u_ilZ5qdtpIDmfVfkQsWsqxyvPywT_7_fOzZh 1000
// ts-node sendCoin.ts 0QALz9kOW8wETujt9zDgLCaEfevg3PU6sljgead4op81Jixq 1000000000
