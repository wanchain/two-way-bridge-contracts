const BigInteger = require('bigi');
const crypto = require('crypto');
const eccrypto = require("eccrypto");
const ecurve = require('ecurve');
const secp256k1 = ecurve.getCurveByName('secp256k1');
const Point = ecurve.Point;

const N = BigInteger.fromHex('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');

const PK_STR_LEN = 130;

function genRandom() {
  let random = BigInteger.fromBuffer(crypto.randomBytes(32));
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
    let temp = hj.modPowInt(o, N).multiply(polyCoef[o]);
    if (!sij) {
      sij = temp;
    } else {
      sij = sij.add(temp).mod(N);
    }
  }
  return sij;
};

async function encryptSij(sij, pk) {
  let key = Buffer.from(pk.substr(2), 'hex');
  let M = Buffer.from(sij.toRadix(16), 'hex');
  try {
    let result = await eccrypto.encrypt(key, M);
    return result;
  } catch (err) {
    console.error("encryptSij pk %s err: %O", pk, err);
    return null;
  }
};

function decryptSij(encSij, sk) {
  // TODO: confirm algorithms, return bigi
};

function verifySij(sij, polyCommit, selfPk) {
   let order = (polyCommit.length -2) / PK_STR_LEN;
   let expected = mulG(sij);
   let committed = null;
   let hij = BigInteger.fromBuffer(pk2sha256(selfPk)).mod(N);
   for (let i = 0; i < order; i++) {
    let pci = polyCommit.substr(2 + i * PK_STR_LEN, PK_STR_LEN);
    let tp = Point.decodeFrom(secp256k1, Buffer.fromHex(pci));
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
    let scale = hi.modPowInt(o, N).mod(N);
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
  let siGStr = polyCommit.substr(2, PK_STR_LEN);
  let siG = Point.decodeFrom(secp256k1, Buffer.fromHex('04' + sigStr));
  return siG;
};

module.exports = {
  genRandom,
  mulG,
  genSij,
  encryptSij,
  decryptSij,
  verifySij,
  addSij,
  takePolyCommit,
  recoverSiG
}