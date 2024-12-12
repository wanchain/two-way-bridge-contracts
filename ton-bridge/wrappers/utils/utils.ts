
import { Address, toNano, fromNano } from "@ton/core";

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
