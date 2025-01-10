
import {Bridge} from "../wrappers/Bridge"; // this is the interface class from step 7
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient,  WalletContractV4, Address } from "@ton/ton";
import { Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';
import { GroupApprove } from "../wrappers/GroupApprove";
const {BIP44_CHAINID} = require("../wrappers/const/const-value")


const scAddr = require('../deployed.json')




function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export async function run() {
    let mnemonic = process.env.WALLET_MNEMONIC?  process.env.WALLET_MNEMONIC : ""
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    // const endpoint = await getHttpEndpoint({ network: "testnet"});
    const endpoint = 'https://testnet.toncenter.com/api/v2/jsonRPC'
    const client = new TonClient({ endpoint, timeout:60000,
        apiKey: 'b70dc1b6d3c1b95acfe5c04c6f0489a7c4f407fd2218cd4a763df295711f2e2e' });
    const walletContract = client.open(wallet);
    const walletSender = walletContract.sender(key.secretKey);

    const SC = await Bridge.createFromAddress(Address.parseFriendly(scAddr.bridge).address);
    const bridge = client.open(SC);
    let ret


    // 1. add storeman group config
    // const skSmg = Buffer.from("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex');
    // const gpkX = "0xcb54bc900646fe8de5c8db04e4120e38cb61b3e000ae37e4ecdaf71b777f7ec7"
    // const gpkY = "0x1f81f87d21eb46e372105a3d123af9a94e0760f9c13738b8ca1abf248a9104f2"
    // const smgId = "0x000000000000000000000000000000000000000000746573746e65745f303638";
    // let cur = new Date("2024-12-30 00:00:00")
    // let startTime = Math.floor(cur.getTime()/1000)
    // let endTime = Math.floor(cur.getTime()/1000) + 3600*24*365
    // ret = await bridge.sendSetStoremanGroupConfig(walletSender,{
    //     id: BigInt(smgId),
    //     gpkX:BigInt(gpkX), gpkY:BigInt(gpkY),
    //     startTime,
    //     endTime,
    //     value: toNano('0.051'),
    //     queryID: 1,
    // });
    // console.log("ret:", ret)
    // await sleep(20000);
    // ret = await bridge.sendSetStoremanGroupConfigCommit(walletSender,{
    //     id: BigInt(smgId),
    //     gpkX:BigInt(gpkX), gpkY:BigInt(gpkY),
    //     startTime,
    //     endTime,
    //     value: toNano('0.061'),
    //     queryID: 1,
    // });
    // await sleep(21000);
    // let smgInfo = await bridge.getStoremanGroupConfig(BigInt(smgId))
    // console.log("smgInfo1", smgInfo)
    // let get_first_smg_id_Commited = await bridge.getFirstStoremanGroupIDCommited();
    // console.log("get_first_smg_id_Commited:",get_first_smg_id_Commited);
    // let smgInfo2 = await bridge.getStoremanGroupConfigCommited(BigInt(smgId))
    // console.log("smgInfo2", smgInfo2)

    // 2. add tokenPair to bridge
    const wanChainID = 2153201998
    console.log("BIP44_CHAINID:", BIP44_CHAINID)
    ret = await bridge.sendAddTokenPair(walletSender, {
        value: toNano('0.1'),
        queryID: 1,
        tokenPairId:100,
        fromChainID: BIP44_CHAINID,
        fromAccount: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
        toChainID: wanChainID,
        toAccount:  '0x7ff465746e4f47e1cbbb80c864cd7de9f1333788',
        jettonAdminAddr: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'
    })
    await sleep(20000);

    // list tokenpair
    let firstTokenPairId = await bridge.getFirstTokenPairID()
    console.log("firstToken pair:", firstTokenPairId)
    let curTokenPairId =   firstTokenPairId
    if(curTokenPairId != 0) {
        let tokenPair = await bridge.getTokenPair(curTokenPairId);
        console.log("token pair:", tokenPair)
        let tokenPairFee = await bridge.getTokenPairFee(curTokenPairId)
        console.log("token pair fee:", tokenPairFee)
        curTokenPairId = await bridge.getNextTokenPairID(curTokenPairId)
    }
}


