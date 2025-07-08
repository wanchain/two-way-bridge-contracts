import {Address, toNano} from "@ton/core";
import {getSecureRandomNumber} from '@ton/crypto';
import {logger} from '../utils/logger'
import {DEFAUT_PARTNER} from "../const/const-value";

export const randomAddress = (wc: number = 0) => {
    const buf = Buffer.alloc(32);
    for (let i = 0; i < buf.length; i++) {
        buf[i] = Math.floor(Math.random() * 256);
    }
    return new Address(wc, buf);
};
87


const getRandom = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
}

export const getRandomTon = (min: number, max: number): bigint => {
    return toNano(getRandom(min, max).toFixed(9));
}

export const BufferrToHexString = (buff: Buffer): string => {
    return "0x" + buff.toString('hex');
}

export const HexStringToBuffer = (str: String): Buffer => {
    return Buffer.from(str, 'hex')
}

export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export async function getQueryID() {
    while (true) {
        let queryID = await getSecureRandomNumber(1, Math.pow(2, 52) - 1);
        if (queryID > 0) {
            return queryID;
        }
    }
}

export function bigIntReviver(key, value) {
    if (typeof value === "string" && value.endsWith("n")) {
        return BigInt(value.slice(0, -1));
    }
    if (typeof value === "string") {
        return BigInt(value);
    }
    return value;
}

export function bigIntReplacer(key, value) {
    if (typeof value === "bigint") {
        return value.toString(10);
    }
    return value;
}

export function isAddressEqual(src: Address | string, dst: Address | string) {
    let srcAddr: Address;
    let dstAddr: Address;
    if (!(src instanceof Address)) {
        srcAddr = Address.parse(src)
    } else {
        srcAddr = src
    }

    if (!(dst instanceof Address)) {
        dstAddr = Address.parse(dst)
    } else {
        dstAddr = dst
    }

    return srcAddr.equals(dstAddr);
}

export function bigIntToBytes32(value: bigint) {

    if (value < 0n || value >= 2n ** 256n) {
        throw new Error("Value must be a 256-bit unsigned integer");
    }
    const hex = value.toString(16).padStart(64, '0');
    return Buffer.from(hex, 'hex');
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

export function remove0x(str: string) {
    return (str.slice(0, 2).toLowerCase() == '0x') ? str.slice(2) : str;
}

export function add0x(str: string) {
    return (str.slice(0, 2).toLowerCase() == '0x') ? str : '0x' + str;
}


const fs = require('node:fs/promises');
const path = require('node:path');

export async function ensureFileAndPath(fullFilePath: string): Promise<boolean> {
    try {
        await fs.access(fullFilePath);
        logger.info(`file exist: ${fullFilePath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const directoryPath = path.dirname(fullFilePath);

            try {
                await fs.access(directoryPath);
            } catch (dirError) {
                if (dirError.code === 'ENOENT') {
                    logger.info(`mkdir: ${directoryPath}`);
                    await fs.mkdir(directoryPath, {recursive: true});
                } else {
                    logger.error(`mkdir (${directoryPath}):`, dirError);
                    return false;
                }
            }

            try {
                await fs.writeFile(fullFilePath, '');
                logger.info(`file created: ${fullFilePath}`);
            } catch (fileError) {
                logger.error(`create file fail (${fullFilePath}):`, fileError);
                return false;
            }
        } else {
            logger.error(`access file fail (${fullFilePath}):`, error);
            return false
        }
    }
    return true;
}

export async function ensurePath(fullFilePath: string): Promise<boolean> {
    try {
        await fs.access(fullFilePath);
        logger.info(`file exist: ${fullFilePath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const directoryPath = path.dirname(fullFilePath);

            try {
                await fs.access(directoryPath);
            } catch (dirError) {
                if (dirError.code === 'ENOENT') {
                    logger.info(`mkdir: ${directoryPath}`);
                    await fs.mkdir(directoryPath, {recursive: true});
                } else {
                    logger.error(`mkdir (${directoryPath}):`, dirError);
                    return false;
                }
            }
        } else {
            logger.error(`access file fail (${fullFilePath}):`, error);
            return false
        }
    }
    return true;
}

export async function ensureDirectoryExists(directoryPath) {
    try {
        await fs.access(directoryPath);
        logger.info(`目录 "${directoryPath}" 已存在。`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            try {
                await fs.mkdir(directoryPath, {recursive: true});
                logger.info(`目录 "${directoryPath}" 创建成功。`);
            } catch (mkdirError) {
                logger.error(`创建目录 "${directoryPath}" 失败:`, mkdirError);
                throw mkdirError; // Re-throw the error if directory creation fails
            }
        } else {
            logger.error(`检查目录 "${directoryPath}" 失败:`, error);
            throw error; // Re-throw other errors during access check
        }
    }
}


export async function removeFile(fullFilePath: string): Promise<boolean> {
    try {
        await fs.access(fullFilePath);
        logger.info(`file exist: ${fullFilePath}`);
        await fs.unlink(fullFilePath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return true
        } else {
            logger.error(`access file fail (${fullFilePath}):`, formatError(error));
            return false
        }
    }
}


const util = require('util');

const ERROR_WHITELIST = new Set(['message', 'code', 'cause', 'name', 'status']);

function formatErrorStack(error: Error): string[] {
    if (!error.stack) return [];
    const stackLines = error.stack.split('\n');
    return stackLines.slice(1).map(line => line.trim());
}

function extractErrorDetails(err, depth = 0, maxDepth = 3) {
    if (depth > maxDepth) return '[Max Depth Exceeded]';
    if (!err || typeof err !== 'object') return err;

    const details = {};
    ERROR_WHITELIST.forEach((key) => {

        const value = err[key];
        if (value !== undefined) {
            details[key] = key === 'cause'
                ? extractErrorDetails(value, depth + 1, maxDepth)
                : value;
        }
    });

    if (err.response?.config?.data) {
        details['response.config.data'] = err.response?.config?.data;
    }
    if (err.response?.data) {
        details['response.data.error'] = err.response?.data;
    }

    if (err instanceof Error) {
        details['stack'] = formatErrorStack(err);
    }
    return details;
}


export function formatError(err: any): string {
    return JSON.stringify(extractErrorDetails(err), null, 2)
}

function isHexStringWithPrefix(str) {
    return /^(0x)?[0-9a-fA-F]+$/.test(str);
}

function isEvenLengthHex(str) {
    return (/^[0-9a-fA-F]+$/.test(str)) && (str.length % 2 === 0);
}

export function isValidHexString(str: string) {
    return isEvenLengthHex(remove0x(str));
}


export function isNotBase64(str) {
    // 同时匹配标准Base64和URL安全Base64的正则表达式
    const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$|^(?:[A-Za-z0-9\-_]{4})*(?:[A-Za-z0-9\-_]{2}==|[A-Za-z0-9\-_]{3}=)?$/;

    // 类型检查
    if (typeof str !== 'string') return true;

    // 基础校验
    const len = str.length;
    if (len === 0) return false;        // 空字符串视为有效
    if (len % 4 !== 0) return true;     // 长度必须是4的倍数

    // 检查编码格式
    return !BASE64_REGEX.test(str);
}

export function toBase64(str) {
    if (isValidHexString(str)) {
        return Buffer.from(remove0x(str), 'hex').toString('base64');
    } else {
        if (!isNotBase64(str)) {
            return str;
        } else {
            throw new Error(`invalid string ${str}`)
        }
    }
}

export function BigToAddress(big: bigint): Address {
    let bufHash = bigIntToBuffer(big);

    return new Address(0, bufHash);
}

export function bigIntToBuffer(big: bigint) {
    let buffer = Buffer.from(big.toString(16), 'hex')
    let bufferLeft = Buffer.alloc(32 - buffer.length);
    return Buffer.concat([bufferLeft, buffer]);
}

export function bufferToBigInt(buffer: Buffer, isBigEndian = true): bigint {
    let result = 0n;
    const bytes = isBigEndian ? buffer : [...buffer].reverse();
    for (const byte of bytes) {
        result = (result << 8n) | BigInt(byte);
    }
    return result;
}

export function AddressToBig(addr: Address) {
    let hash = addr.hash;
    return bufferToBigInt(hash);
}

export function toNumberByDecimal(src: number | string | bigint, decimal: number): bigint {
    logger.info("toNumberByDecimal", "src", src, "decimal", decimal)
    if (typeof src === 'bigint') {
        return src * BigInt(10) ** BigInt(decimal);
    } else {
        if (typeof src === 'number') {
            if (!Number.isFinite(src)) {
                throw Error('Invalid number');
            }

            if (Math.log10(src) <= decimal) {
                src = src.toLocaleString('en', {minimumFractionDigits: decimal, useGrouping: false});
            } else if (src - Math.trunc(src) === 0) {
                src = src.toLocaleString('en', {maximumFractionDigits: 0, useGrouping: false});
            } else {
                throw Error('Not enough precision for a number value. Use string value instead');
            }
        }

        // Check sign
        let neg = false;
        while (src.startsWith('-')) {
            neg = !neg;
            src = src.slice(1);
        }

        // Split string
        if (src === '.') {
            throw Error('Invalid number');
        }
        let parts = src.split('.');
        if (parts.length > 2) {
            throw Error('Invalid number');
        }

        // Prepare parts
        let whole = parts[0];
        let frac = parts[1];
        logger.info("whole", whole);
        logger.info("frac", frac);
        if (!whole) {
            whole = '0';
        }
        if (!frac) {
            frac = '0';
        }
        if (frac.length > decimal) {
            throw Error('Invalid number');
        }
        while (frac.length < decimal) {
            frac += '0';
        }

        // Convert
        let r = BigInt(whole) * BigInt(10) ** BigInt(decimal) + BigInt(frac);
        if (neg) {
            r = -r;
        }
        return r;
    }
}

export function fromStringToBuffer(str: string, targetLen: number) {
    let strRet: string = '';
    if (!str) {
        strRet = DEFAUT_PARTNER;
    } else {
        if (str.length >= targetLen) {
            strRet = str.slice(0, targetLen);
        } else {
            strRet = str.padStart(targetLen);
        }
    }
    return Buffer.from(strRet, 'utf-8');
}
