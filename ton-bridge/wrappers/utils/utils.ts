
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

export const BufferrToHexString = (buff: Buffer): string =>{
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

export function isAddressEqual(src:Address|string,dst:Address|string){
    let srcAddr :Address;
    let dstAddr :Address;
    if(!(src instanceof  Address)){
        srcAddr = Address.parse(src)
    }else{
        srcAddr = src
    }

    if(!(dst instanceof  Address)){
        dstAddr = Address.parse(dst)
    }else{
        dstAddr = dst
    }

    return srcAddr.equals(dstAddr);
}


export function int64ToByte32(int64Value) {
    // 确保输入是 BigInt
    if (typeof int64Value !== 'bigint') {
        throw new Error('Input must be a BigInt');
    }

    // 创建一个 8 字节的缓冲区（64 位）
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);

    // 将 BigInt 写入缓冲区（小端序）
    view.setBigUint64(0, int64Value, true);

    // 将缓冲区转换为字节数组
    const byteArray = new Uint8Array(buffer);

    // 创建一个 32 字节的缓冲区
    const byte32Buffer = new ArrayBuffer(32);
    const byte32Array = new Uint8Array(byte32Buffer);

    // 将 8 字节的 int64 复制到 32 字节缓冲区的末尾（右对齐）
    byte32Array.set(byteArray, 24); // 24 = 32 - 8

    // 将字节数组转换为十六进制字符串
    let hexString = '0x';
    byte32Array.forEach(byte => {
        hexString += byte.toString(16).padStart(2, '0');
    });

    return hexString;
}