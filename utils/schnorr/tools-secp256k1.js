const crypto = require('crypto');
const BigInteger = require('bigi');
const ecurve = require('ecurve');
const Web3EthAbi = require('web3-eth-abi');
const ecparams = ecurve.getCurveByName('secp256k1');
const Web3Utils = require("web3-utils");

// buffer
const r = Buffer.from("e7e59bebdcee876e84d03832544f5a517e96a9e3f60cd8f564bece6719d5af52", 'hex');
// buffer
let R = baseScarMulti(r);

// sk*G
// return: buff
function baseScarMulti(sk) {
    let curvePt = ecparams.G.multiply(BigInteger.fromBuffer(sk));
    let ret = curvePt.getEncoded(false);
    let str = ret.toString('hex');
    str = str.slice(2);
    return Buffer.from(str, 'hex');
}

// hash
// return:buffer
function h(buff) {
    let sha = crypto.createHash('sha256').update(buff).digest();
    return sha;
}

// get s
// s = r+sk*m
// return: buffer
function getSBuff(sk, m) {
    let rBig = BigInteger.fromBuffer(r);
    let skBig = BigInteger.fromBuffer(sk);
    let mBig = BigInteger.fromBuffer(m);
    let retBig;
    retBig = rBig.add(skBig.multiply(mBig).mod(ecparams.n)).mod(ecparams.n);
    return retBig.toBuffer(32);
}

// return: buffer
function computeM1(M) {
    let M1 = h(M);
    return M1;
}

// compute m
// M1=hash(M)
// m=hash(M1||R)
// M: buffer
// R: buffer
// return: buffer
function computem(M1, R) {
    let list = [];
    list.push(M1);
    list.push(R);
    // hash(M1||R)
    let m = Buffer.concat(list);
    return h(m)
}

// input:pk Buffer
// return buffer (1byte)
function getPararity(pk) {
    let b = BigInteger.fromBuffer(pk.slice(32))  // get pkY
    if (b.testBit(0)) {     // odd
        return Buffer.from("1c", 'hex');
    } else {
        return Buffer.from("1b", 'hex');
    }
}

// pk: Buffer
// return buffer (20bytes)
function getAddrFromPk(pk) {
    console.log("len of pk", pk.length);
    const publicKeyToAddress = require('ethereum-public-key-to-address')
    return publicKeyToAddress(pk)
}

// pk: Buffer (64bytes)
// return buffer (32bytes)
function getXBytesFromPk(pk) {
    return pk.slice(0, 32)
}

function getYBytesFromPk(pk) {
    return pk.slice(32)
}

//  input Buffer
//  
//  output Buffer
//  hash(R_addr||gpk[0]+27-2||gpk.XBytes||message_hash)
function computeE(RBuf, pararityBuf, gpkXBuf, MBuf) {
    let list = [];
    //list.push(RBuf);
    console.log("RBuf", bufferToHexString(RBuf));
    let RAddr = getAddrFromPk(Buffer.concat([Buffer.from("04", 'hex'), RBuf]));
    console.log("RAddr", RAddr)


    let RAddrBytes = Buffer.from(RAddr.substring(2), 'hex');

    list.push(RAddrBytes);
    console.log("R_addr", bufferToHexString(RAddrBytes))

    list.push(pararityBuf);
    console.log("pararityBuf", bufferToHexString(pararityBuf));

    list.push(gpkXBuf);
    console.log("gpkXBuf", bufferToHexString(gpkXBuf));

    list.push(MBuf);
    console.log("MBuf", bufferToHexString(MBuf));

    let eBuffer = Buffer.concat(list);
    console.log("eBuf before hash", bufferToHexString(eBuffer));
    return (Web3Utils.keccak256(eBuffer))
}


//typesArray:['uint256','string']
//parameters: ['2345675643', 'Hello!%']
//return : buff
function computeM(typesArray, parameters) {
    let mStrHex = Web3EthAbi.encodeParameters(typesArray, parameters);
    return new Buffer(mStrHex.substring(2), 'hex');
}

// return : hexString
function getR() {
    return "0x" + R.toString('hex');
}

// return: hexString
function bufferToHexString(buff) {
    return "0x" + buff.toString('hex');
}

// sk: buff
// return: hexString
function getPKBySk(sk) {
    return bufferToHexString(baseScarMulti(sk));
}

//typesArray:['uint256','string']
//parameters: ['2345675643', 'Hello!%']
//return :hexString
function getS(sk, typesArray, parameters) {
    let MBuff = computeM(typesArray, parameters);
    let M1Buff = computeM1(MBuff);
    let mBuff = computem(M1Buff, R);
    let sBuff = getSBuff(sk, mBuff);
    return bufferToHexString(sBuff);
}

//typesArray:['uint256','string']
//parameters: ['2345675643', 'Hello!%']
//return :hexString
function getSecSchnorrS(sk, typesArray, parameters) {
    let MBuff = computeM(typesArray, parameters);
    let M1Buff = computeM1(MBuff);
    let pk = getPKBySk(sk);
    let pkBuf = Buffer.from(pk.substring(2), 'hex');
    let eBuffHexStr = computeE(R, getPararity(pkBuf), getXBytesFromPk(pkBuf), M1Buff);
    console.log("eBuf after hash", eBuffHexStr);
    let sBuff = getSBuff(sk, Buffer.from(eBuffHexStr.substring(2), 'hex'));
    return {
        s: bufferToHexString(sBuff),
        e: (eBuffHexStr),
        p: bufferToHexString(getPararity(pkBuf)),
        pkX: bufferToHexString(getXBytesFromPk(pkBuf)),
        pkY: bufferToHexString(getYBytesFromPk(pkBuf)),
        msgHash: bufferToHexString(M1Buff),
    }
}
// msgHash: buffer
function getSecSchnorrSByMsgHash(sk, msgHash) {
    // let MBuff = computeM(typesArray, parameters);
    // let M1Buff = computeM1(MBuff);

    let pk = getPKBySk(sk);
    let pkBuf = Buffer.from(pk.substring(2), 'hex');
    let eBuffHexStr = computeE(R, getPararity(pkBuf), getXBytesFromPk(pkBuf), msgHash);
    console.log("eBuf after hash", eBuffHexStr);
    let sBuff = getSBuff(sk, Buffer.from(eBuffHexStr.substring(2), 'hex'));
    return {
        s: bufferToHexString(sBuff),
        e: eBuffHexStr,
        p: bufferToHexString(getPararity(pkBuf)),
        pkX: bufferToHexString(getXBytesFromPk(pkBuf)),
        pkY: bufferToHexString(getYBytesFromPk(pkBuf)),
        msgHash: bufferToHexString(msgHash),
    }
}

module.exports = {
    getS: getS,
    getPKBySk: getPKBySk,
    getR: getR,
    computeE: computeE,
    getPararity: getPararity,
    getSecSchnorrS: getSecSchnorrS,
    getSecSchnorrSByMsgHash:getSecSchnorrSByMsgHash,
};
