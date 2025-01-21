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

const SNAKE_PREFIX = 0x00;
const ONCHAIN_CONTENT_PREFIX = 0x00;
const KEYLEN = 256;
const jettonOnChainMetadataSpec = {
    name: "utf8",
    description: "utf8",
    image: "ascii",
    symbol: "utf8",
    decimals: 'utf8'
};

export async function buildWrappedJettonContent(opts:any):Promise<Cell>{
    const dict = Dictionary.empty(Dictionary.Keys.BigUint(KEYLEN), Dictionary.Values.Cell());

    Object.entries(opts).forEach(([k, v]: [string, string | undefined]) => {
        if (!jettonOnChainMetadataSpec[k])
            throw new Error(`Unsupported token key: ${k}`);
        if (v === undefined || v === "") return;

        let bufferToStore = Buffer.from(v, jettonOnChainMetadataSpec[k]);

        const rootCell = beginCell();
        rootCell.storeUint(SNAKE_PREFIX, 8);
        let currentCell = rootCell;

        const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8); 
        while (bufferToStore.length > 0) {
            currentCell.storeBuffer(bufferToStore.slice(0, CELL_MAX_SIZE_BYTES));
            bufferToStore = bufferToStore.slice(CELL_MAX_SIZE_BYTES);
            if (bufferToStore.length > 0) {
                const newCell = beginCell();
                currentCell.storeRef(newCell);
                currentCell = newCell;
            }
        }

        const keyHash = BigInt("0x" + sha256_sync(k).toString('hex'));
        dict.set(keyHash, rootCell.endCell());
    });

    return beginCell()
        .storeUint(ONCHAIN_CONTENT_PREFIX, 8)
        .storeDict(dict)
        .endCell();
}

export async function parseWrappedJettonContent(cell:Cell){
    const keys = Dictionary.Keys.BitString(256);
    const values = Dictionary.Values.Buffer(16);

    const keyName = new BitString(sha256_sync("name"),0,256);
    const keySymbol = new BitString(sha256_sync("symbol"),0,256);
    const keyDecimals = new BitString(sha256_sync("decimals"),0,256);

    let cs = cell.beginParse();
    cs.skip(8);
    let dictDs = Dictionary.loadDirect(keys, values, cs)

    return {
        name:dictDs.get(keyName).toString('utf-8').trim(),
        symbol:dictDs.get(keySymbol).toString('utf-8').trim(),
        decimals:dictDs.get(keyDecimals).toString('utf-8').trim(),
    }
}