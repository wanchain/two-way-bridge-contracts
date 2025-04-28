import {formatError, sleep} from "../utils/utils";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}
import {getClient, TonClientConfig} from "../client/client";
import {getEventByTranHash, getEvents, getTransaction} from "../event/getEvents";
import { logger } from "../utils/logger";
import {Address} from "@ton/core";
import {CommonMessageInfoInternal} from "@ton/core/src/types/CommonMessageInfo";

const args = process.argv.slice(2);

async function main(){
    try{
        let client = await getClient(config);
        let scBridgeAddr = args[0];
        let lt = args[1];
        let to_lt:string = args[2];
        let hash:string = '';
        if(args[3] && args[3].length != 0){
            hash = Buffer.from(args[3],'hex').toString('base64');
        }

        let opts = {
            limit:10,lt,to_lt,hash,archival:true
        }
        let trans = await client.getTransactions(Address.parse(scBridgeAddr),opts)

        for(let tran of trans){
            console.log("txHash",tran.hash().toString('hex'),"lt",tran.lt.toString(10));
        }

        client = null;
    }catch(err){
        console.error(formatError(err))
    }

}

main();
// ts-node getTransByRange-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr <lt> <to_lt>
// ts-node getTransByRange-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33315421000001 33315399000001

//===========================
// all data
// txHash d736f95ca13f3996ea9b2845e2c4a5ee006dd4cef9b5b9e157ce17afac162278 lt 33575480000001
// txHash eb9aa12ef19e8d002cd4f31570b2baaf78abcd8805394b9cbbb87e270dc66cdf lt 33569263000001
// txHash 20d9edb7bce69613e2c4b7132c2135c238da39187f5a6fafaccbcb32c55f1b05 lt 33540621000001
// txHash de83f2ce8ff82ba64c2d98d8d29a8d65d86b50a515cf13ab0e43ce148ef40974 lt 33503753000001
// txHash 1403f17162199c475ca71a190ab3255da1e5ebafdd67fdaaca5e2ff63f66478c lt 33503457000001
// txHash 05daacf6fe56349b70509805eefe81afed95ab8a5413ac3c655a2308f5863d59 lt 33503157000001
// txHash a2cb94e69f32c03e635a60a384b293450fd38af0c1a43232e9fd00bce5c11e14 lt 33502935000001
// txHash d195f8f1840584887bd8606dae9fd24804c646c33dd703037e52da709f3ef53a lt 33502857000001
// txHash 9bf198f751fffb7a3bb8c6522937cb1866b9a4f2ac842138e488e8d8e41e67e7 lt 33498115000001
// txHash 5e654b1798cca9b63adcb8091b0962b364581538bc4431449f9e9c674bb0d5f6 lt 33315421000001

// ts-node getTransByRange-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33498115000001 0
// [33315421000001,33575480000001]
// why ? should [33498115000001,33575480000001]
// rpc cache?

//ts-node getTransByRange-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 0 33498115000001
// [33502857000001,33575480000001] = (33498115000001,33575480000001]
// *******
// **to_lt and lt are all scan latest txs to to_lt|lt, the differt, (to_lt,latest],  [lt,latest]
// *******

// ts-node getTransByRange-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33498115000001 33502857000001
// (33502857000001,33575480000001]


// ts-node getTransByRange-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr 33502857000001 33498115000001
// [33502857000001,33575480000001]


// *******
// ** <bigger> <smaller>  [bigger,latest]
// ** <smaller> <bigger>  (bigger,latest]

// *******
