import {Cell, toNano} from "@ton/core";
import {buildInternalMessageRelaxed,buildSignData,signData,buildRawTransaction,sendRawTransaction} from "./rawTrans";
import {OP_FEE_SetTokenPairFee, OP_TOKENPAIR_Upsert} from "../opcodes"
import {BIP44_CHAINID, TON_COIN_ACCOUT} from "../const/const-value";
import {codeTable} from "../code/encode-decode";
import {getClient} from "../client/client";
import {getSenderByPrvKey, getWalletByPrvKey, openWalletByPrvKey} from "../wallet/walletContract";
import {sign} from "@ton/crypto";
import {SendMode} from "@ton/core";

let tokenInfo = {
    tokenOrg:{tokenPairId:0x01,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',},
    tokenWrapped:{tokenPairId:0x02,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',},
    coin:{tokenPairId:0x03,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:''},
}
let queryID = 1;
let tokenPairId3 = tokenInfo.coin.tokenPairId;
let srcChainId3 = tokenInfo.coin.srcChainId;
let dstChainId3 = tokenInfo.coin.dstChainId;
let srcTokenAcc3 = tokenInfo.coin.srcTokenAcc;
let dstTokenAcc3 = tokenInfo.coin.dstTokenAcc;
tokenInfo.coin.dstTokenAcc = TON_COIN_ACCOUT;

const scAddresses = require('../testData/contractAddress.json');
let prvList = require('../testData/prvlist.json')

let client = null;
let wallet = null;
let walletOpenned = null;
let privateKey = Buffer.from(prvList[0],'hex')

describe('decode', () => {

    beforeAll(async () => {
        client = await getClient('testnet');
        wallet = await getWalletByPrvKey(privateKey);
        walletOpenned = await openWalletByPrvKey(client , privateKey);
    },50000);

    it('build rawTrans, sign, and send rawTrans', async () => {
        // build body
        let opt = {
            value: toNano('0.005'),
            queryID,
            tokenPairId: tokenPairId3,
            fromChainID: srcChainId3,
            fromAccount: srcTokenAcc3,
            toChainID: dstChainId3,
            toAccount: dstTokenAcc3,
        }
        let bodyCell = codeTable[OP_TOKENPAIR_Upsert]["enCode"](opt);

        // build message
        let message = await buildInternalMessageRelaxed({
            to:scAddresses.bridgeAddress,
            value:toNano('0.005'),
            bounce:true,
            body:bodyCell,
        })

        // build data for sign
        let seqno = await walletOpenned.getSeqno();
        let walletId = 698983191; // provide by user
        let dataNeedSign = await buildSignData({
            seqno:seqno,
            sendMode:SendMode.PAY_GAS_SEPARATELY,
            walletId:walletId,
            messages:[message]
        });

        // sign data
        let signature = sign(dataNeedSign.hash,privateKey);

        // build rawTrans
        let rawTrans = await buildRawTransaction(signature,dataNeedSign.rawDataBuilder);

        // send raw trans
        console.log("wallet.address=>",wallet.address);
        let ret = await sendRawTransaction(wallet.address,rawTrans);
        console.log(ret);

    },500000);

});