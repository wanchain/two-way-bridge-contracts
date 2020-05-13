const BigInteger = require('bigi');
const crypto = require('crypto');
const eccrypto = require("eccrypto");
const ecurve = require('ecurve');
const secp256k1 = ecurve.getCurveByName('secp256k1');
const Point = ecurve.Point;

const p = BigInteger.fromHex('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');

const PK_STR_LEN = 130;

function genRandom() {
  let random = BigInteger.fromHex(crypto.randomBytes(32).toString('hex'));
  return random.mod(p).add(BigInteger.valueOf(1));
};

function mulG(n) {
   return secp256k1.G.multiply(n);
}

function genSij(polyCoef, pk) {
  let hj = BigInteger.fromHex(crypto.createHash('sha256').update(Buffer.from(pk, 'hex')));
  let sij = null;
  let order = polyCoef.length;
  for (let o = 0; o < order; o++) {
    let temp = hj.modPowInt(o, p).multiply(polyCoef[o]);
    if (!sij) {
      sij = temp;
    } else {
      sij = sij.add(temp).mod(p);
    }
  }
  return sij;
};

async function encryptSij(sij, pk) {
  let key = Buffer.from(pk, 'hex');
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
   let hij = BigInteger.fromHex(crypto.createHash('sha256').update(Buffer.from(selfPk, 'hex')));
   for (let i = 0; i < order; i++) {
    let pci = polyCommit.substr(2 + i * PK_STR_LEN, PK_STR_LEN);
    let tp = Point.decodeFrom(secp256k1, Buffer.fromHex(pci));
    let temp = tp.multiply(hij.modPowInt(i, p));
    if (!committed) {
      committed = temp;
    } else {
      committed = committed.add(temp);
    }
   }
   return expected.equals(committed);
};

function addSij(s1, s2) {
  return s1.add(s2).mod(p);
};

function takePolyCommit(polyCommit, pk) {
  let hi = BigInteger.fromHex(crypto.createHash('sha256').update(Buffer.from(pk, 'hex')));
  let share = null;
  let order = (polyCommit.length -2) / PK_STR_LEN;
  for (let o = 0; o < order; o++) {
    let pci = polyCommit.substr(2 + i * PK_STR_LEN, PK_STR_LEN);
    let tp = Point.decodeFrom(secp256k1, Buffer.fromHex(pci));
    let temp = tp.multiply(hi.modPowInt(o, p));
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