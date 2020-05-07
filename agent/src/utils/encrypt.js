const BigInteger = require('bigi');
const crypto = require('crypto');
const eccrypto = require("eccrypto");
const ecurve = require('ecurve');
const secp256k1 = ecurve.getCurveByName('secp256k1');
const Point = ecurve.Point;

const p = BigInteger.fromHex('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');

function genRandom() {
  let random = BigInteger.fromHex(crypto.randomBytes(32).toString('hex'));
  return random.mod(p).add(BigInteger.valueOf(1));
};

function mulG(n) {
   return secp256k1.G.multiply(n);
}

function genSij(polyCoef, pk) {
  let hij = BigInteger.fromHex(crypto.createHash('sha256').update(Buffer.from(pk, 'hex')));
  let sij = null;
  let order = polyCoef.length;
  for (let i = 0; i < order; i++) {
    let temp = hij.modPowInt(i, p).multiply(polyCoef[i]);
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
   let order = (polyCommit.length -2) / 128;
   let expected = mulG(sij);
   let committed = null;
   let hij = BigInteger.fromHex(crypto.createHash('sha256').update(Buffer.from(selfPk, 'hex')));
   for (let i = 0; i < order; i++) {
    let pci = polyCommit.substr(2 + i * 128, 128);
    let p = Point.decodeFrom(secp256k1, Buffer.fromHex('04' + pci));
    let temp = p.multiply(hij.modPowInt(i, p));
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

function recoverSiG(polyCommit) {
  let siGStr = polyCommit.substr(2, 128);
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
  recoverSiG,
}