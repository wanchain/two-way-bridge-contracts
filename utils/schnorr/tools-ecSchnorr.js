const Web3EthAbi = require("web3-eth-abi");
const Web3Utils = require("web3-utils");
var secp256k1 = require("secp256k1");
var { ec } = require("elliptic");
var curve = new ec("secp256k1");

// buffer
const r = new Buffer(
  "b3221d9b161da3b944980146a57d2459bf5d95fbab85d1a9a6ad1eb559d4e263",
  "hex"
);

// sk*G
// return: buff
function baseScarMulti(sk) {
  var secp256k1PK = secp256k1.publicKeyCreate(sk);
  return secp256k1PK;
}

//typesArray:['uint256','string']
//parameters: ['2345675643', 'Hello!%']
//return : buff
function computeM(typesArray, parameters) {
  // console.log("computeM ===> typesArray:", typesArray, "parameters:", parameters, "encodeData:", Web3Utils.hexToBytes(Web3EthAbi.encodeParameters(typesArray, parameters)));
  return Buffer.from(
    Web3Utils.hexToBytes(Web3EthAbi.encodeParameters(typesArray, parameters))
  );
}

// return: buffer
function computeM1(M) {
  return Buffer.from(Web3Utils.hexToBytes(Web3Utils.keccak256(M)));
}

function solidityKeccak256(types, params) {
  if (types.length != params.length) {
    throw new Error("solidityKeccak256 invalid length");
  }
  const message = Buffer.from(
    Web3Utils.hexToBytes(
      Web3Utils.encodePacked(
        ...types.map((type, index) => ({
          type: type,
          value: Web3EthAbi.formatParam(
            type,
            Array.isArray(params[index]) || params[index] instanceof Uint8Array
              ? Buffer.from(params[index])
              : params[index]
          ),
        }))
      )
    )
  );
  const hash = Web3Utils.keccak256(message);
  return hash.startsWith("0x") ? hash : `0x${hash}`;
}

// return : object
function getR() {
  var R = baseScarMulti(r);
  var R_uncomp = secp256k1.publicKeyConvert(R, false);
  return {
    R,
    address: Web3Utils.bytesToHex(
      Web3Utils.hexToBytes(
        Web3Utils.keccak256(Web3Utils.bytesToHex(R_uncomp.slice(1, 65)))
      ).slice(12, 32)
    ),
  };
}

// sk: buff
// return: hexString
function getPKBySk(sk) {
  var gpkBytes = curve.keyFromPrivate(sk).getPublic().encode();
  var publicKey = Buffer.from(gpkBytes.slice(1));
  return Web3Utils.bytesToHex(publicKey);
}

// e = h(address(R) || parity || compressed pubkey || m)
function computeE(m, xPublicKey, parity) {
  // convert R to address
  // see https://github.com/ethereum/go-ethereum/blob/eb948962704397bb861fd4c0591b5056456edd4d/crypto/crypto.go#L275
  var { R, address: R_addr } = getR();

  // console.log("computeE R:", R, "hex:", Web3Utils.bytesToHex(R), "R_addr:", R_addr);
  // console.log("computeE parity:", parity);
  // console.log("computeE xPublicKey.slice(1, 33):", xPublicKey.slice(1, 33), "hex:", Web3Utils.bytesToHex(xPublicKey.slice(1, 33)));
  // console.log("computeE m:", m, "m hex:", Web3Utils.bytesToHex(m));

  // e = keccak256(address(R) || compressed xPublicKey || m)
  var e = Uint8Array.from(
    Web3Utils.hexToBytes(
      solidityKeccak256(
        ["address", "uint8", "bytes32", "bytes32"],
        [R_addr, parity, xPublicKey.slice(1, 33), m]
      )
    )
  );
  // console.log("computeE E:", e, "hex:", Web3Utils.bytesToHex(e), "e hex:", solidityKeccak256(
  //   ["address", "uint8", "bytes32", "bytes32"],
  //   [R_addr, parity, xPublicKey.slice(1, 33), m]
  //   // [R_addr, xPublicKey[0] - 2 + 27, xPublicKey.slice(1, 33), m]
  // ));

  return e;
}

function sign(m, sk) {
    // console.log("sign m:", m, "sk:", sk)
  if (Web3Utils.isHex(sk)) {
    if (!sk.startsWith("0x")) {
      sk = `0x${sk}`;
    }
    sk = Web3Utils.hexToBytes(sk);
  }
  sk = Uint8Array.from(sk);
  var xPublicKey = baseScarMulti(sk);
  var parity = getParity(xPublicKey);

  // console.log("xPublicKey:", xPublicKey, "length:", xPublicKey.length);
  // console.log("xPublicKey hex:", Web3Utils.bytesToHex(xPublicKey));
  // e = h(address(R) || parity || compressed pubkey || m)
  var e = computeE(m, xPublicKey, parity);

  // xe = sk * e
  var xe = secp256k1.privateKeyTweakMul(sk, e);

  // s = r + xe
  var s = secp256k1.privateKeyTweakAdd(r, xe);

  // console.log("s:", s, "length:", s.length);
  // console.log("s hex:", Web3Utils.bytesToHex(s));
  // console.log("e:", e, "length:", e.length);
  // console.log("e hex:", Web3Utils.bytesToHex(e));

  return {
    s: Web3Utils.bytesToHex(s),
    e: Web3Utils.bytesToHex(e),
    parity: Web3Utils.padLeft(Web3Utils.toHex(parity), 64),
    m: Web3Utils.bytesToHex(m),
  };
}

function getParity(xPublicKey) {
  return xPublicKey[0] - 2 + 27;
}

//typesArray:['uint256','string']
//parameters: ['2345675643', 'Hello!%']
//return :hexString
function getS(sk, typesArray, parameters) {
  let MBuff = computeM(typesArray, parameters);
  let M1Buff = computeM1(MBuff);
  // console.log("M1Buff:", M1Buff)
  return sign(M1Buff, sk);
}

module.exports = {
  getS: getS,
  getPKBySk: getPKBySk,
  getR: getR,
};
