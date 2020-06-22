const BigInteger = require('bigi');
const crypto = require('crypto');
const ecurve = require('ecurve');
const secp256k1 = ecurve.getCurveByName('secp256k1');
const Point = ecurve.Point;
const ecies = require("./ecies");

const N = BigInteger.fromHex('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');

const PK_STR_LEN = 130;

function genRandomBuffer(bytes) {
  return crypto.randomBytes(bytes);
};

function genRandomCoef(bytes) {
  let random = BigInteger.fromBuffer(crypto.randomBytes(bytes));
  return random.mod(N).add(BigInteger.valueOf(1));
};

function mulG(n) {
   return secp256k1.G.multiply(n);
}

function pk2sha256(pk) {
  if (pk.indexOf('0x') == 0) {
    pk = pk.substr(2);
  }
  return crypto.createHash('sha256').update(Buffer.from(pk, 'hex')).digest();
}

function genSij(polyCoef, pk) {
  let hj = BigInteger.fromBuffer(pk2sha256(pk)).mod(N);
  let sij = null;
  let order = polyCoef.length;
  for (let o = 0; o < order; o++) {
    let poly = BigInteger.fromHex(polyCoef[o].substr(2));
    let temp = hj.modPowInt(o, N).multiply(poly).mod(N);
    if (!sij) {
      sij = temp;
    } else {
      sij = sij.add(temp).mod(N);
    }
  }
  return sij;
};

async function encryptSij(pk, sij) {
  let toPk = Buffer.from(pk.substr(2), 'hex');
  let M = sij.substr(2);
  try {
    let enc = await ecies.eccEncrypt(toPk, M);
    console.log("%s encryptSij: %s", pk, '0x' + enc.ciphertext);
    return enc;
  } catch (err) {
    console.error("%s encryptSij err: %O", pk, err);
    return null;
  }
};

async function decryptSij(sk, encSij) {
  try {
    console.log("decryptSij: %s", encSij);
    let skBuf = Buffer.from(sk.substr(2), 'hex');
    let M = await ecies.eccDecrypt(skBuf, encSij.substr(2));
    return '0x' + M;
  } catch (err) {
    console.error("decryptSij err: %O", err);
    return null;
  }
};

function verifySij(sij, polyCommit, selfPk) {
   let order = (polyCommit.length -2) / PK_STR_LEN;
   let expected = mulG(BigInteger.fromHex(sij.substr(2)));
   let committed = null;
   let hij = BigInteger.fromBuffer(pk2sha256(selfPk)).mod(N);
   for (let i = 0; i < order; i++) {
    let pci = polyCommit.substr(2 + i * PK_STR_LEN, PK_STR_LEN);
    let tp = Point.decodeFrom(secp256k1, Buffer.from(pci, 'hex'));
    let temp = tp.multiply(hij.modPowInt(i, N));
    if (!committed) {
      committed = temp;
    } else {
      committed = committed.add(temp);
    }
   }
   return expected.equals(committed);
};

function addSij(s1, s2) {
  return s1.add(s2).mod(N);
};

function takePolyCommit(polyCommit, pk) {
  let hi = BigInteger.fromBuffer(pk2sha256(pk)).mod(N);
  let share = null;
  let order = (polyCommit.length - 2) / PK_STR_LEN;
  for (let o = 0; o < order; o++) {
    let pci = polyCommit.substr(2 + o * PK_STR_LEN, PK_STR_LEN);
    let tp = Point.decodeFrom(secp256k1, Buffer.from(pci, 'hex'));
    let scale = hi.modPowInt(o, N);
    let temp = tp.multiply(scale);
    if (!share) {
      share = temp;
    } else {
      share = share.add(temp);
    }
  }
  return share;
};

function recoverSiG(polyCommit) {
  let siG = Point.decodeFrom(secp256k1, Buffer.from(polyCommit.substr(2, PK_STR_LEN), 'hex'));
  return siG;
};

module.exports = {
  genRandomBuffer,
  genRandomCoef,
  mulG,
  genSij,
  encryptSij,
  decryptSij,
  verifySij,
  addSij,
  takePolyCommit,
  recoverSiG
}