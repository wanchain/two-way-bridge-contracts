const EcSchnorrVerifier = artifacts.require('EcSchnorrVerifier');

const { expect } = require("chai");

const { randomBytes } = require('crypto')
const secp256k1 = require('secp256k1')

const {
  solidityKeccak256
} = require("./utils");


function sign(m, x) {
  var publicKey = secp256k1.publicKeyCreate(x);

  // R = G * k
  var k = randomBytes(32);
  var R = secp256k1.publicKeyCreate(k);

  // e = h(address(R) || compressed pubkey || m)
  var e = challenge(R, m, publicKey);

  // xe = x * e
  var xe = secp256k1.privateKeyTweakMul(x, e);

  // s = k + xe
  var s = secp256k1.privateKeyTweakAdd(k, xe);

  console.log("k:", k, "length:", R.length)
  // console.log("R hex:", web3.utils.bytesToHex(R))
  console.log("R:", R, "length:", R.length)
  console.log("R hex:", web3.utils.bytesToHex(R))
  console.log("s:", s, "length:", s.length)
  console.log("s hex:", web3.utils.bytesToHex(s))
  console.log("e:", e, "length:", e.length)
  console.log("e hex:", web3.utils.bytesToHex(e))

  return {R, s, e};
}

function challenge(R, m, publicKey) {
  // convert R to address
  // see https://github.com/ethereum/go-ethereum/blob/eb948962704397bb861fd4c0591b5056456edd4d/crypto/crypto.go#L275
  var R_uncomp = secp256k1.publicKeyConvert(R, false);
  var R_addr = web3.utils.bytesToHex(web3.utils.hexToBytes(web3.utils.keccak256(web3.utils.bytesToHex(R_uncomp.slice(1, 65)))).slice(12, 32));
  console.log("R:", web3.utils.bytesToHex(R));
  console.log("R_uncomp:", web3.utils.bytesToHex(R_uncomp));

  // e = keccak256(address(R) || compressed publicKey || m)
  var e = Uint8Array.from(web3.utils.hexToBytes(solidityKeccak256(
    ["address", "uint8", "bytes32", "bytes32"],
    [R_addr, publicKey[0] - 2 + 27, publicKey.slice(1, 33), m])))

  return e;
}

describe("EcSchnorrVerifier", function () {
  it("Should verify a signature", async function () {
    const schnorr = await EcSchnorrVerifier.new();

    // generate privKey
    let privKey
    do {
      privKey = randomBytes(32)
    } while (!secp256k1.privateKeyVerify(privKey))


    var publicKey = secp256k1.publicKeyCreate(privKey);

    // message 
    var m = randomBytes(32);

    var sig = sign(m, privKey);

    console.log("privKey:", privKey);
    console.log("privKey hex:", web3.utils.bytesToHex(privKey));
    console.log("publicKey:", web3.utils.bytesToHex(publicKey));
    let gas = await schnorr.verify.estimateGas(
      web3.utils.bytesToHex(sig.s),
      web3.utils.bytesToHex(publicKey.slice(1, 33)),
      web3.utils.padLeft("0x", 64),
      web3.utils.bytesToHex(sig.e),
      web3.utils.padLeft(web3.utils.toHex(publicKey[0] - 2 + 27), 64),
      web3.utils.bytesToHex(m),
    )

    console.log("verify gas cost:", gas);

    expect(await schnorr.verify(
      web3.utils.bytesToHex(sig.s),
      web3.utils.bytesToHex(publicKey.slice(1, 33)),
      web3.utils.padLeft("0x", 64),
      web3.utils.bytesToHex(sig.e),
      web3.utils.padLeft(web3.utils.toHex(publicKey[0] - 2 + 27), 64),
      web3.utils.bytesToHex(m),
    )).to.equal(true);
  });
  it("Should verify failed", async function () {
    const schnorr = await EcSchnorrVerifier.new();

    // generate privKey
    let privKey
    do {
      privKey = randomBytes(32)
    } while (!secp256k1.privateKeyVerify(privKey))


    var publicKey = secp256k1.publicKeyCreate(privKey);

    // message 
    var m = randomBytes(32);

    var sig = sign(m, privKey);

    const errorS = sig.s[0] = sig.s[0] + 1;

    expect(await schnorr.verify(
      web3.utils.bytesToHex(errorS),
      web3.utils.bytesToHex(publicKey.slice(1, 33)),
      web3.utils.padLeft("0x", 64),
      web3.utils.bytesToHex(sig.e),
      web3.utils.padLeft(web3.utils.toHex(publicKey[0] - 2 + 27), 64),
      web3.utils.bytesToHex(m),
    )).to.equal(false);
  });
});