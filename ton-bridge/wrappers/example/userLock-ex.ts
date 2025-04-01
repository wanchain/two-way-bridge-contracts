import {TonClient} from "@ton/ton";
import {getClient, TonClientConfig} from "../client/client";
import {getSenderByPrvKey, getWalletByPrvKey} from "../wallet/walletContract";
import {buildUserLockMessages} from "../code/userLock";
import {toNano} from "@ton/core";
import {BridgeAccess} from "../contractAccess/bridgeAccess";
import {sleep} from "../utils/utils";
import {TON_FEE} from "../fee/fee";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}
const prvList = require('../testData/prvlist')
const prvAlice = Buffer.from(prvList[1],'hex');
const prvBob = Buffer.from(prvList[2],'hex');

const scAddresses = require('../testData/contractAddress.json');

const smgCfg = require('../testData/smg.json');
const tokenInfo = require('../testData/tokenInfo.json');
let smgID = smgCfg.smgId
let crossValue = toNano('0.1')
let bridgeScAddr = scAddresses.bridgeAddress
//let transValueUserLock = toNano('0.4')
let transValueUserLock = toNano('1')
let dstUserAccount = "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9"
let aliceSender;



let client = null;
let aliceWallet,aliceAddress;
async function init(){
    client = await getClient(config);
     aliceWallet = await getWalletByPrvKey(prvAlice);
     aliceAddress = aliceWallet.address.toString();
     aliceSender = await getSenderByPrvKey(client,prvAlice);
}

async function userLock(){
    try{
        let transValue:bigint = transValueUserLock;
        let ba = BridgeAccess.create(client,bridgeScAddr);
        for(let key of Object.keys(tokenInfo)) {
            console.log("key:",key);
            if(key.toString().toLowerCase() !== ("coin").toLowerCase()){
                continue;
            }

            if(key.toString().toLowerCase() !== ("coin").toLowerCase()){
                transValue = TON_FEE.TRANS_FEE_USER_LOCK_TOKEN;
            }

            let ret = await ba.writeContract('sendUserLock', aliceSender, {
                value: transValue,
                smgID,
                tokenPairID: tokenInfo[key].tokenPairId,
                crossValue,
                dstUserAccount,
                bridgeScAddr,
                client,
                senderAccount: aliceAddress
            })
            await sleep(3000);
            console.log("key = %s, ret of userLock is %s",key,ret);
        }

    }catch(e){
        console.log("err  =%s",e.Error);
    }
}
async function main() {

    await init();
    await userLock();

}
main();