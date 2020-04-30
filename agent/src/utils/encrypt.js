const BigInteger = require('bigi');
const crypto = require('crypto');
const eccrypto = require("eccrypto");
const ecurve = require('ecurve');
const ecparams = ecurve.getCurveByName('secp256k1');
const Point = ecurve.Point;

const p = BigInteger.fromHex('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');

function genRandom() {
  let random = BigInteger.fromHex(crypto.randomBytes(32).toString('hex'));
  return random.mod(p).add(BigInteger.valueOf(1));
};

function mulG(scalar) {
   return ecparams.G.multiply(scalar);
}

function genSij(polyCoef, pk) {
  let hij = BigInteger.fromHex(crypto.createHash('sha256').update(Buffer.from(pk, 'hex')));
  let sij = new BigInteger();
  let order = polyCoef.length;
  for (let i = 0; i < order; i++) {
    let temp = hij.modPowInt(i, p).multiply(polyCoef[i]);
    sij = sij.add(temp).mod(p);
  }
  return sij;
};

async function encryptSij(sij, pk) {
  let key = Buffer.from(pk, 'hex');
  let M = sij.toRadix(16);
  try {
    let result = await eccrypto.encrypt(key, M);
    return result;
  } catch (err) {
    console.error("encryptSij pk %s err: %O", pk, err);
    return null;
  }
};

function decryptSij(encSij, sk) {
  // TODO: confirm algorithms
};

function verifySij(sij, polyCommit, selfPk) {
   let order = polyCommit.length / 128;
   let expected = mulG(sij);
   for (let i = 0; i < order; i++) {

   }
};

module.exports = {
  genRandom,
  mulG,
  genSij,
  encryptSij,
  decryptSij,
  verifySij
}