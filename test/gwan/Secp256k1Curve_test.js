const { getWeb3, stringToBytes, newContract } = require('../utils');
const { assert } = require('chai');
const Secp256k1Curve = artifacts.require('./lib/Secp256k1Curve.sol');
const crypto = require('crypto');

contract('Secp256k1Curve', accounts => {
  let secp256k1Curve;
  let web3;
  before(async () => {
    secp256k1Curve = await newContract(Secp256k1Curve);
    web3 = getWeb3();
  });

  it.skip("add", async () => {
    const x1 = "0x69088a1c79a78b5e66859a5e6594d70c8f12a1ff882d84a05ffdbbcff5a4abcb";
    const y1 = "0x5d4c67c05b0a693fb72b47abf7e0d6381fc722ca45c8bb076e6cb4f9f0912906";
    const x2 = "0xfb4a50e7008341df6390ad3dcd758b1498959bf18369edc335435367088910c6";
    const y2 = "0xe55f58908701c932768c2fd16932f694acd30e21a5f2a4f6242b5f0567696240";
    const x3 = "0x3e758e5b2af18254a885210d63c573facc2bd85edb27fdb98e3d0b0ab2dfcd1b";
    const y3 = "0x7e14602a338ed7011b8f22b4752234619011482fe8b6dcee0e2eeb96c721318c";
    let ret = await secp256k1Curve.methods.add(x1, y1, x2, y2).call();
    console.log('add', ret);
    assert.equal(web3.utils.toHex(ret.retx), x3, "1");
    assert.equal(web3.utils.toHex(ret.rety), y3, "2");
  });

  it.skip("mulG", async () => {
    let x = crypto.randomBytes(32);
    let ret = await secp256k1Curve.methods.mulG('0x' + x.toString('hex')).call();
    console.log('mulG', ret);
  });
});

