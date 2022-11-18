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
    });


    // //it.skip("add", async () => {
    it("add not on curve [ko]", async () => {
        const x1 = "0x69088a1c79a78b5e66859a5e6594d70c8f12a1ff882d84a05ffdbbcff5a4abcb";
        const y1 = "0x5d4c67c05b0a693fb72b47abf7e0d6381fc722ca45c8bb076e6cb4f9f0912906";
        const x2 = "0xfb4a50e7008341df6390ad3dcd758b1498959bf18369edc335435367088910c6";
        const y2 = "0xe55f58908701c932768c2fd16932f694acd30e21a5f2a4f6242b5f0567696240";
        const x3 = "0x3e758e5b2af18254a885210d63c573facc2bd85edb27fdb98e3d0b0ab2dfcd1b";
        const y3 = "0x7e14602a338ed7011b8f22b4752234619011482fe8b6dcee0e2eeb96c721318c";
        let ret = await ed25519Curve.methods.add(x1, y1, x2, y2).call();
        console.log('add', ret);

        assert.equal(ret.success,false);
        assert.notEqual(web3.utils.toHex(ret.retx), x3, "1");
        assert.notEqual(web3.utils.toHex(ret.rety), y3, "2");
    });

    it("add  on curve [ok]", async () => {
        const x1 = "0x17b7e56c50a9108dda9b6fe14bc17bc1fe2ff6276f701f089508f7c42196e8e1";
        const y1 = "0x0f6a5d32fa64e5173c40241e6f7fa26e4ca811991618f80e313d7ce8de2ace00";

        const x2 = "0x32c1fb365311885cf5a9e28e9b67d29cb9f00b65ff29d29cc2dba615ad8e8bc7";
        const y2 = "0x5e9966fd931c1ffa9721aa9803c94158a1e7907f2834b1e7777a8b338af7b4be";

        const x3 = "0x2074ef1ddd1376429e27da7e78c07e9680eb7fd42d212a5c5d4713dee71b7ac2";
        const y3 = "0x38ed7a5b5e4ecfe6a4421f3418fa8c29e545277a7116304c9ec6e618a771d687";
        let ret = await ed25519Curve.methods.add(x1, y1, x2, y2).call();
        console.log('add', ret);

        assert.equal(ret.success,true);
        assert.equal(web3.utils.toHex(ret.retx), x3, "1");
        assert.equal(web3.utils.toHex(ret.rety), y3, "2");

        console.log("x3",web3.utils.toHex(ret.retx))
        console.log("y3",web3.utils.toHex(ret.rety))
    });

    it("add  on curve [ok][same point]", async () => {
        const x1 = "0x17b7e56c50a9108dda9b6fe14bc17bc1fe2ff6276f701f089508f7c42196e8e1";
        const y1 = "0x0f6a5d32fa64e5173c40241e6f7fa26e4ca811991618f80e313d7ce8de2ace00";

        const x2 = "0x17b7e56c50a9108dda9b6fe14bc17bc1fe2ff6276f701f089508f7c42196e8e1";
        const y2 = "0x0f6a5d32fa64e5173c40241e6f7fa26e4ca811991618f80e313d7ce8de2ace00";

        const x3 = "0x156a91eca6708c5ca8eb952c3e18e9504276a9fc0f5eb46f14963ee90b5ef171";
        const y3 = "0x7f697aa82517e2774a88d04b9e3a74c33265235434e3f83bc01cbd143f78b2d2";
        let ret = await ed25519Curve.methods.add(x1, y1, x2, y2).call();
        console.log('add', ret);

        assert.equal(ret.success,true);
        assert.equal(web3.utils.toHex(ret.retx), x3, "1");
        assert.equal(web3.utils.toHex(ret.rety), y3, "2");

        console.log("x3",web3.utils.toHex(ret.retx))
        console.log("y3",web3.utils.toHex(ret.rety))

    });

    //
    // //it.skip("mulG", async () => {
    it("mulPK [ok]", async () => {
        let x = "0x04307e2f4ba4dd7312d5c379be8bb909a33774298c5ca198bfadb2b54cf3f82d";

        let x1 = "0x4c9303665d9aa516d1943c6ec0302282cf139a8099142314c9b165b63acf1439";
        let y1 = "0x22c54cfd7c89ddb3053b008059f6ceaf2a33a1afecf5365fcc96643ce2fc7aea";

        let x2 = "0x55a8eee57438b5a4b65d3a64154242e794a77437dd1ab1f771b62e09c1adc2df";
        let y2 = "0x0f4d90fbd1c1f976f03b0fad4e36358bacd1a62bc8c228f64d1d883ac1568152";
        let ret = await ed25519Curve.methods.mulPk(x, x1, y1).call();
        console.log('mulPK=>', ret);

        console.log("x2",web3.utils.toHex(ret.x))
        console.log("y2",web3.utils.toHex(ret.y))

        assert.equal(ret.success,true);
        assert.equal(web3.utils.toHex(ret.x), x2, "1");
        assert.equal(web3.utils.toHex(ret.y), y2, "2");


    });


    it("mulG [ok]", async () => {

        let x = "0x006de777a0755c7032f3a6a6d0107c23de27d89289769209211d99bf025b20bf";

        let x1 = "0x7b9e0bbbe2c95e505a9eaf8de693e6306415724606122e49370230872f92a3ee";
        let y1 = "0x04d351b07ee453434018da5544f93ad524db9495bb6ddf8f154f7df2b2db9c05";
        let ret = await  ed25519Curve.methods.mulG(x).call();
        console.log('mulG=>', ret);
        console.log("x2",web3.utils.toHex(ret.x))
        console.log("y2",web3.utils.toHex(ret.y))

        assert.equal(ret.success,true);
        assert.equal(web3.utils.toHex(ret.x), x1, "1");
        assert.equal(web3.utils.toHex(ret.y), y1, "2");


    });

})
;

