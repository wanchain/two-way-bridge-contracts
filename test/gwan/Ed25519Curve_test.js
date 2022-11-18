const {getWeb3, stringToBytes, newContract} = require('../utils');
const {assert} = require('chai');
const Ed25519Curve = artifacts.require('./lib/Ed25519Curve.sol');
const crypto = require('crypto');

contract('Ed25519Curve', () => {
    let ed25519Curve;
    let web3;
    before(async () => {
        ed25519Curve = await newContract(Ed25519Curve);
        web3 = getWeb3();
        console.log("ed25519Curve=>", ed25519Curve)
    });

    // //it.skip("add", async () => {
    // it("add not on curve [ko]", async () => {
    //     const x1 = "0x69088a1c79a78b5e66859a5e6594d70c8f12a1ff882d84a05ffdbbcff5a4abcb";
    //     const y1 = "0x5d4c67c05b0a693fb72b47abf7e0d6381fc722ca45c8bb076e6cb4f9f0912906";
    //     const x2 = "0xfb4a50e7008341df6390ad3dcd758b1498959bf18369edc335435367088910c6";
    //     const y2 = "0xe55f58908701c932768c2fd16932f694acd30e21a5f2a4f6242b5f0567696240";
    //     const x3 = "0x3e758e5b2af18254a885210d63c573facc2bd85edb27fdb98e3d0b0ab2dfcd1b";
    //     const y3 = "0x7e14602a338ed7011b8f22b4752234619011482fe8b6dcee0e2eeb96c721318c";
    //     let ret = await ed25519Curve.methods.add(x1, y1, x2, y2).call();
    //     console.log('add', ret);
    //     assert.notEqual(web3.utils.toHex(ret.retx), x3, "1");
    //     assert.notEqual(web3.utils.toHex(ret.rety), y3, "2");
    // });

    it("add  on curve [ok]", async () => {
        const x1 = "0x17b7e56c50a9108dda9b6fe14bc17bc1fe2ff6276f701f089508f7c42196e8e1";
        const y1 = "0x0f6a5d32fa64e5173c40241e6f7fa26e4ca811991618f80e313d7ce8de2ace00";

        const x2 = "0x32c1fb365311885cf5a9e28e9b67d29cb9f00b65ff29d29cc2dba615ad8e8bc7";
        const y2 = "0x5e9966fd931c1ffa9721aa9803c94158a1e7907f2834b1e7777a8b338af7b4be";

        const x3 = "0x2074ef1ddd1376429e27da7e78c07e9680eb7fd42d212a5c5d4713dee71b7ac2";
        const y3 = "0x38ed7a5b5e4ecfe6a4421f3418fa8c29e545277a7116304c9ec6e618a771d687";
        let ret = await ed25519Curve.methods.add(x1, y1, x2, y2).call();
        console.log('add', ret);
        assert.equal(web3.utils.toHex(ret.retx), x3, "1");
        assert.equal(web3.utils.toHex(ret.rety), y3, "2");
    });
    //
    // it("add  on curve [ok][same point]", async () => {
    //     const x1 = "0x0538b326a6381dc692a6ccf4f8c4271184a9e450b9d74bcced39bd49c5cd7649";
    //     const y1 = "0xeabe7aab4bdc522e2f1700c79256afc184ee942e524bbb993ce188b368f5544f";
    //
    //     const x2 = "0xd0b90396a8606442019cca3524472f191ed7380ca45cd841ff1c222e34e9f674";
    //     const y2 = "0xdca64adba3f633c239f692363ec2e5b87d69a600a81ca616c6ebe4167719bb3a";
    //
    //
    //     const x3 = "0x433a9d7f72b6873eb03fbbd5b2c1d5881fb4fc1bf162f8955b833774730a6a17";
    //     const y3 = "0x25ddcaae89828cd20212dd4867aa31b8d5f39a57a251696f4739496af2681211";
    //     let ret = await ed25519Curve.methods.add(x1, y1, x2, y2).call();
    //     console.log('add', ret);
    //     assert.equal(web3.utils.toHex(ret.retx), x3, "1");
    //     assert.equal(web3.utils.toHex(ret.rety), y3, "2");
    // });
    //
    // //it.skip("mulG", async () => {
    // it("mulG", async () => {
    //     let x = crypto.randomBytes(32);
    //     let ret = await ed25519Curve.methods.mulG('0x' + x.toString('hex')).call();
    //     console.log('mulG', ret);
    // });
});

