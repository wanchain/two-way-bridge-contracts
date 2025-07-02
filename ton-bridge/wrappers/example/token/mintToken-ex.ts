import {configMainnet, configTestTonApiNoDb} from "../../config/config-ex";
import {Address} from '@ton/core';
import {getSenderByPrvKey} from "../../wallet/walletContract";
import {getClient, wanTonSdkInit} from "../../client/client";
import {JettonMinter} from "../../JettonMinter";
import {CoinBalance, TokenBalance} from "../../wallet/balance";
import {TON_FEE} from "../../fee/fee";
import {WanTonClient} from "../../client/client-interface";
import {toNumberByDecimal} from "../../utils/utils";

const prvList = require('../../testData/prvlist.json')

let deployer, client;

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('tokenAddr', 'tokenAddr')
    .describe('decimal', 'decimal')
    .describe('decimal', 'decimal')
    .describe('toAddr', 'address recieve token')
    .describe('amount', 'amount')
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

async function mintToken(client: WanTonClient, tokenAddress: Address, to: Address, amount: bigint) {
    let jettonTokenAddr = tokenAddress
    console.log("tokenAddress = %s,to= %s,amount=%d", jettonTokenAddr, to.toString(), amount)
    console.log("before mintToken to:%s, coin:%d,token:%d", to.toString(), await CoinBalance(client, to), await TokenBalance(client, jettonTokenAddr, to));
    let via = deployer;


    let jettonMinter = JettonMinter.createFromAddress(jettonTokenAddr);
    let contractProvider = client.provider(jettonMinter.address);

    //let mintResult = await jettonMinter.sendMint(contractProvider, via, to, amount, TON_FEE.FWD_FEE_MINT_JETTON, TON_FEE.TOTAL_FEE_MINT_JETTON)
    let mintResult = await jettonMinter.sendMint(contractProvider, via, to, amount, BigInt(0), TON_FEE.TOTAL_FEE_MINT_JETTON)
    console.log("mintResult", mintResult);
    console.log("after mintToken to:%s, coin:%d,token:%d", to.toString(), await CoinBalance(client, to), await TokenBalance(client, jettonTokenAddr, to));

}

async function main() {
    console.log("argv", process.argv);
    console.log("Entering main function");
    await init();
    let tokenAddr = Address.parse(argv['tokenAddr']);
    let decimal = argv['decimal'];
    let rcvAddress = Address.parse(argv['toAddr']);
    let amount = (toNumberByDecimal(BigInt(argv['amount']), decimal));
    await mintToken(client, tokenAddr, rcvAddress, amount);
}

main();

// ts-node mintToken-ex.ts <tokenAddress> <decimal> <rcvAddress> <amount>
//usdt
// ts-node mintToken-ex.ts --network testnet --tokenAddr kQDPFoyEUdur7g9c0nNn8rGX08TedRsvc_aik0nohFn8v-wP --decimal 6 --toAddr EQCGOHmrNm3u_ilZ5qdtpIDmfVfkQsWsqxyvPywT_7_fOzZh  --amount 1000

//wan
// ts-node mintToken-ex.ts --network testnet --tokenAddr kQA_L8-V29GTQwfi9LruGuQf9JwqLggBIB3ByDC8KLReK0x3 --decimal 18 --toAddr kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr  --amount 210000000

