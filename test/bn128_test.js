const assert = require('assert');
const { getSchnorrVerifierContracts, getWeb3, stringToBytes } = require('./utils');
const BigNumber = require('bignumber.js');
let web3 = getWeb3();
const hash = require('js-sha256');

contract('Verifier', accounts => {
  before(async () => {
  });

  it("verifier check bn128 signature", async () => {
    let verifier = (await getSchnorrVerifierContracts(accounts)).verifier;

    let message = [0x43, 0x21];
    let gpkX = '0x2ab2e3655ebd58b188f9ed3ba466e3ae39f4f6e9bcbe80e355be8f1ccd222f97';
    let gpkY = '0x175ebb6b000cb43a3aa6e69dd05d1710719559b17983a0067420de99f3c3cd9f';
    let rX = '0x2d76fc3c6a5496b50b2e44d0ee3fdcf91943d2246823e89b06e6f99c7b4fce9b';
    let rY = '0x02bb3893aa8304b671235ffb02fee052d45a62f9527248e95da441f22fed0a0e';
    let signature = '0x1fe44cc08265229ab0e28ff75f14b1ef306f518e612803c7fc461676cdab8fa6';

    let hashM = '0x' + hash.sha256(message);

    let ret = await verifier.methods.verify(
      1,
      web3.utils.hexToBytes(signature),
      web3.utils.hexToBytes(gpkX),
      web3.utils.hexToBytes(gpkY),
      web3.utils.hexToBytes(rX),
      web3.utils.hexToBytes(rY),
      web3.utils.hexToBytes(hashM),
    ).call();

    assert.equal(ret, true);

    signature = '0x1fe44cc08265229ab0e28ff75f14b1ef306f518e612803c7fc461676cdab8fa5';
    ret = await verifier.methods.verify(
      1,
      web3.utils.hexToBytes(signature),
      web3.utils.hexToBytes(gpkX),
      web3.utils.hexToBytes(gpkY),
      web3.utils.hexToBytes(rX),
      web3.utils.hexToBytes(rY),
      web3.utils.hexToBytes(hashM),
    ).call();

    assert.equal(ret, false);
  });

  it.skip("verifier check secp256k1 signature", async () => {
    let verifier = (await getSchnorrVerifierContracts(accounts)).secp256;

    let message = [0xc1, 0xa9, 0xdc, 0x85, 0xa8, 0xa7];
    let gpkX = '0x2cc4600ca9396e4b2ef7bf1d0b5a98a7f27e994462855ef2d1b8b5fc1b2b8f59';
    let gpkY = '0xf61348e378f232f7c9e97b5204466ce32b3f31869aed1bea5bb94d3c0e5552a6';
    let rX = '0xefd0a83f1a57d88ae5db475f01c5d63e1e4555f55b2cd00f6336e3e5e203657b';
    let rY = '0x8553ef08cd5bcda324652142f136c9f92ad59387615ab1f9581d150e9e71e4e9';
    let signature = '0x39731aadfd82e34ffd00065da67acb3dd4281b214025695da6934738863b33bf';

    let hashM = '0x' + hash.sha256(message);
    console.log('hashM', hashM);

    let ret = await verifier.methods.verify(
      // 0,
      web3.utils.hexToBytes(signature),
      web3.utils.hexToBytes(gpkX),
      web3.utils.hexToBytes(gpkY),
      web3.utils.hexToBytes(rX),
      web3.utils.hexToBytes(rY),
      web3.utils.hexToBytes(hashM),
    ).call();

    assert.equal(ret, true);

    signature = '0x39731aadfd82e34ffd00065da67acb3dd4281b214025695da6934738863b33be';
    ret = await verifier.methods.verify(
      0,
      web3.utils.hexToBytes(signature),
      web3.utils.hexToBytes(gpkX),
      web3.utils.hexToBytes(gpkY),
      web3.utils.hexToBytes(rX),
      web3.utils.hexToBytes(rY),
      web3.utils.hexToBytes(hashM),
    ).call();

    assert.equal(ret, false);
  });
});