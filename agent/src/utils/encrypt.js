const BigInteger = require('bigi');
const crypto = require('crypto');
const ecurve = require('ecurve-bn256');
const secp256k1 = ecurve.getCurveByName('secp256k1');
const bn256 = ecurve.getCurveByName('bn256g1');
const Point = ecurve.Point;
const ecies = require("./ecies");

const CurveId = {
  secp256k1: 0, bn256: 1
}

const curveMap = new Map([
  [CurveId.secp256k1, secp256k1],
  [CurveId.bn256, bn256]
]);

const PK_STR_LEN = 128;

function genRandomCoef(curve, bytes) {
  let random = BigInteger.fromBuffer(crypto.randomBytes(bytes));
  return random.mod(curveMap.get(curve).n).add(BigInteger.valueOf(1));
};

function mulG(curve, n) {
   return curveMap.get(curve).G.multiply(n);
}

function unifyPk(pk) {
  if (pk.indexOf('0x') == 0) {
    pk = pk.substr(2);
  }
  if (pk.length == 128) {
    pk = '04' + pk;
  }
  return pk;
}

function pk2sha256(pk) {
  if (pk.indexOf('0x') == 0) {
    pk = pk.substr(2);
  }
  return crypto.createHash('sha256').update(Buffer.from(pk, 'hex')).digest();
}

function genSij(curve, polyCoef, pk) {
  let N = curveMap.get(curve).n;
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
  let toPk = Buffer.from(unifyPk(pk), 'hex');
  let M = sij.substr(2);
  try {
    let enc = await ecies.eccEncrypt(toPk, M);
    // console.log("%s encryptSij: %s", pk, '0x' + enc.ciphertext);
    return enc;
  } catch (err) {
    console.error("%s encryptSij err: %O", pk, err);
    return null;
  }
};

async function decryptSij(sk, encSij) {
  try {
    // console.log("decryptSij: %s", encSij);
    let skBuf = Buffer.from(sk.substr(2), 'hex');
    let M = await ecies.eccDecrypt(skBuf, encSij.substr(2));
    return '0x' + M;
  } catch (err) {
    console.error("decryptSij err: %O", err);
    return null;
  }
};

function verifySij(curve, sij, polyCommit, selfPk) {
  let N = curveMap.get(curve).n;
  let order = (polyCommit.length -2) / PK_STR_LEN;
  let expected = mulG(curve, BigInteger.fromHex(sij.substr(2)));
  let committed = null;
  let hij = BigInteger.fromBuffer(pk2sha256(selfPk)).mod(N);
  for (let i = 0; i < order; i++) {
    let pci = polyCommit.substr(2 + i * PK_STR_LEN, PK_STR_LEN);
    let tp = Point.decodeFrom(curveMap.get(curve), Buffer.from(unifyPk(pci), 'hex'));
    let temp = tp.multiply(hij.modPowInt(i, N));
    if (!committed) {
      committed = temp;
    } else {
      committed = committed.add(temp);
    }
  }
  return expected.equals(committed);
};

function addSij(curve, s1, s2) {
  return s1.add(s2).mod(curveMap.get(curve).n);
};

function takePolyCommit(curve, polyCommit, pk) {
  let N = curveMap.get(curve).n;
  let hi = BigInteger.fromBuffer(pk2sha256(pk)).mod(N);
  let share = null;
  let order = (polyCommit.length - 2) / PK_STR_LEN;
  for (let o = 0; o < order; o++) {
    let pci = polyCommit.substr(2 + o * PK_STR_LEN, PK_STR_LEN);
    let tp = Point.decodeFrom(curveMap.get(curve), Buffer.from(unifyPk(pci), 'hex'));
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

function recoverSiG(curve, polyCommit) {
  let siG = Point.decodeFrom(curveMap.get(curve), Buffer.from(unifyPk(polyCommit.substr(2, PK_STR_LEN)), 'hex'));
  return siG;
};

module.exports = {
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