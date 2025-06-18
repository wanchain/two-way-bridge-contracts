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
async function mintToken(client:WanTonClient,tokenAddress: Address, to: Address, amount: bigint) {
    let jettonTokenAddr = tokenAddress
    console.log("tokenAddress = %s,to= %s,amount=%d",jettonTokenAddr,to.toString(),amount)
    console.log("before mintToken to:%s, coin:%d,token:%d", to.toString(), await CoinBalance(client, to), await TokenBalance(client,jettonTokenAddr, to));
    let via = deployer;


    let jettonMinter = JettonMinter.createFromAddress(jettonTokenAddr);
    let contractProvider = client.provider(jettonMinter.address);

    //let mintResult = await jettonMinter.sendMint(contractProvider, via, to, amount, TON_FEE.FWD_FEE_MINT_JETTON, TON_FEE.TOTAL_FEE_MINT_JETTON)
    let mintResult = await jettonMinter.sendMint(contractProvider, via, to, amount, BigInt(0), TON_FEE.TOTAL_FEE_MINT_JETTON)
    console.log("mintResult",mintResult);
    console.log("after mintToken to:%s, coin:%d,token:%d", to.toString(), await CoinBalance(client, to), await TokenBalance(client, jettonTokenAddr, to));

}

async function main(){
    console.log("argv",process.argv);
    console.log("Entering main function");
    await init();
    let tokenAddr = Address.parse(args[0]);
    let decimal = parseInt(args[1]);
    let rcvAddress = Address.parse(args[2]);
    let amount = (toNumberByDecimal(BigInt(args[3]),decimal));
    await mintToken(client,tokenAddr,rcvAddress,amount);
};

main();

// ts-node mintToken-ex.ts tokenWrapped  1.0
// ts-node mintToken-ex.ts tokenOrg     1.0

// ts-node mintToken-ex.ts <tokenAddress> <decimal> <rcvAddress> <amount>
//usdt
// ts-node mintToken-ex.ts kQDPFoyEUdur7g9c0nNn8rGX08TedRsvc_aik0nohFn8v-wP 6 EQCGOHmrNm3u_ilZ5qdtpIDmfVfkQsWsqxyvPywT_7_fOzZh  1000
// ts-node mintToken-ex.ts kQDPFoyEUdur7g9c0nNn8rGX08TedRsvc_aik0nohFn8v-wP 6 kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr  1000


//wan
// ts-node mintToken-ex.ts kQA_L8-V29GTQwfi9LruGuQf9JwqLggBIB3ByDC8KLReK0x3 18 kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr  210000000

