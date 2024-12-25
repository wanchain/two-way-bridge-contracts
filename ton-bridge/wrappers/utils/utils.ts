
import { Address, toNano, fromNano } from "@ton/core";
import {getSecureRandomNumber} from '@ton/crypto';

export const randomAddress = (wc: number = 0) => {
    const buf = Buffer.alloc(32);
    for (let i = 0; i < buf.length; i++) {
        buf[i] = Math.floor(Math.random() * 256);
    }
    return new Address(wc, buf);
};

const getRandom = (min:number, max:number) => {
    return Math.random() * (max - min) + min;
}

export const getRandomTon = (min:number, max:number): bigint => {
    return toNano(getRandom(min, max).toFixed(9));
}

export const BufferrToHexString = (buff:Buffer): string =>{
    return "0x" + buff.toString('hex');
}

export const HexStringToBuffer = (str:String): Buffer =>{
    return Buffer.from(str,'hex')
}

export async function sleep(ms:number)  {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export async function getQueryID(){
    while(true){
        let queryID = await getSecureRandomNumber(1,Math.pow(2,52)-1);
        if(queryID>0){
            return queryID;
        }
    }
}


export function bigIntReviver(key, value) {
    if (typeof value === "string" && value.endsWith("n")) {
        return BigInt(value.slice(0, -1));
    }
    return value;
}

export function bigIntReplacer(key, value) {
    if (typeof value === "bigint") {
        return value.toString() + "n";
    }
    return value;
}
