import {Address, beginCell, BitString, Cell, Dictionary} from "@ton/core";
import {TonClient} from "@ton/ton";
import {JettonMaster,JettonWallet} from "@ton/ton";
import {DictionaryKey, DictionaryKeyTypes, DictionaryValue} from "@ton/core"
import {sha256_sync} from "@ton/crypto";

export async function getJettonBalance(client:TonClient,jettonMasterAddr:Address, userAddress:Address): Promise<bigint> {
    let jettonWalletAddress = await getJettonAddress(client,jettonMasterAddr,userAddress);
    let jettonWalletContract = JettonWallet.create(jettonWalletAddress);
    return  await (client.open(jettonWalletContract)).getBalance();
}

export async function getJettonAddress(client:TonClient,jettonMasterAddr:Address,userAddress:Address){
    let jettonMasterContract = JettonMaster.create(jettonMasterAddr);
    return await (client.open(jettonMasterContract).getWalletAddress(userAddress));
}

export async function getJettonData(client:TonClient,jettonMasterAddr:Address){
    let jettonMasterContract = JettonMaster.create(jettonMasterAddr);
    return await (client.open(jettonMasterContract).getJettonData());
}


export async function getJettonDataContent(client:TonClient,jettonMasterAddr:Address){
    let jettonMasterContract = JettonMaster.create(jettonMasterAddr);
    return (await (client.open(jettonMasterContract).getJettonData())).content;
}

/*
opts= {
    name:'dog',   // string
    symbol:'dog', // string
    decimal:'5',  // string
}
 */

function leftpad(str, len, ch=' ') {
    str = String(str);
    const pad = new Array(len - str.length + 1).join(ch);
    return pad + str;
}

export async function buildWrappedJettonContent(opts:any):Promise<Cell>{


    const keys = Dictionary.Keys.BitString(256);
    const values = Dictionary.Values.Buffer(16);

    let dic = Dictionary.empty(keys, values);

    const keyName = new BitString(sha256_sync("name"),0,256);
    const valueName = Buffer.from(leftpad(opts.name,16),'utf-8');
    dic.set(keyName, valueName);

    const keySymbol = new BitString(sha256_sync("symbol"),0,256);
    const valueSymbol = Buffer.from(leftpad(opts.symbol,16),'utf-8');
    dic.set(keySymbol, valueSymbol);

    const keyDecimal = new BitString(sha256_sync("decimal"),0,256);
    const valueDecimal = Buffer.from(leftpad(opts.decimal,16),'utf-8');
    dic.set(keyDecimal, valueDecimal);

    return beginCell()
        .storeUint(0,8)
        .storeDictDirect(dic,keys,values)
        .endCell()
}

export async function parseWrappedJettonContent(cell:Cell){
    const keys = Dictionary.Keys.BitString(256);
    const values = Dictionary.Values.Buffer(16);

    const keyName = new BitString(sha256_sync("name"),0,256);
    const keySymbol = new BitString(sha256_sync("symbol"),0,256);
    const keyDecimal = new BitString(sha256_sync("decimal"),0,256);

    let cs = cell.beginParse();
    cs.skip(8);
    let dictDs = Dictionary.loadDirect(keys, values, cs)

    return {
        name:dictDs.get(keyName).toString('utf-8').trim(),
        symbol:dictDs.get(keySymbol).toString('utf-8').trim(),
        decimal:dictDs.get(keyDecimal).toString('utf-8').trim(),
    }
}