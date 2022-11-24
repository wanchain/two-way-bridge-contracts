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

/*
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
*/

    it("calPolyCommit [ok]", async () => {

        let polyPks = "0x5b39b85426ea41f0c59dd7d2ab88892ee1c5e3bc2c3d31eaacbf967d3e68217c72fc8262b264154798e9310fcbce6d0bb18775e7956050cbcc0bcc97470415a114a95e3e6be2fb58349b75191f2ea1e5ebd0cbbb32383853d553832e9c77cdf84e0248518c54a334bcc94861737f6749fedcf08deeecfaeeab40f0dda9b47d20351d10d6e21f73d886a0b9d69155b3b8c448dcd0ea0968f322da469f80a6dbe673d2ca2fa93d8cae4e11747af264098540c24419f4a1b3b9d32bfcf404bf7e3e711c500fc2d768da233f279a1bb37a04925ced8929b2cea3a899bc156b59dc9e3533fdf63bfe080d5b4e0e695a22321cd9723d5545883545b55039702ce333fd5aed34ded8aefd7f34bc44daa6e4023d38f3868047c923b12953eada52bf6bb255e7fff47b95300c5d37004a6a67493888914002b6153e44a11418a59ffaf0351ed3b754a6d4a41da061c9a1e5e222e96df9b4fc9039a4e596b9d399e2261bd30b1a9f63a981ee515330dcab661da8ad7dee61a3179a93284de3046d874c5f47503585283f6389df910d69ee0eb13f8de4f811ba47ae35c500a7002de284c9ab41c10617ba58e1165fc23c4c1b8edbfc50d8a296bb054ba9972140ccfdc1d4214feb08218da8736e7b92b2db7e9372f167c0fb9365738504f8752bdf855322e5018625bd93795b3ec5629914e2a212d7fad3c00489cf5d02b321ba136dcb45967310ad3a71a75a7d5d971ba4d51b26f8fd2ce26bbd296da6de39f6cd58657a021fd6dc1e21db3b0ea233335aadc7933e7068597682c554a23087711e28ed336f380fbcd43b1a66e7a37e25bc19f64f0137afca3cba3d441c551defeb7ee529c73e2eaca216f5436cbfb19d5cd9412ba8aca6f15ab4303e6b2b11d9f7740bff690b089ffa4fbd24aeb88da1c549f5789bff763d67f9dc9b99322a046bb39e910719f9a5ab9f9577d52b25fe6273b91db13790808f0c0c334e63befd26d3aa3db16334853bc6c2412e457da2e4525db845e20d4bb4a7f5c85e10dbae272506f6500c3e35f47f34350ebd214c1426241a4ad183e56f4c6c30364ceae0cd2455edac74ff56e3d979c3eec9ff2f01e4d92be579b5915430b3b60bb5cdc07c6b7b85ef087e8b215abb6debc82e7f3d8321a676766a00cf63fdf7b7cb51edf3f1b124a50cc51cc8d2ade0b5d904367262728013f345876d4c3d07c43aedbb0721865f122424815b41394997400c806c8c7b5f8ccb4521f702ad15f8559de72037476bff775f1ae032e48f262cbba368e0d8103aa57c23ad04a9f828c72449117584ef23128f6e2a7d9a30e3efc9b1c9166308c7bf99fd420c4c61f3957860eda3454ff1";

        let pk = "0x2874be184bba64221cf18492bd364b5729e6e548fd135833f09cc3f385f217dd10096b29a2606da74f26990a112c05ce278bdc4505b09000b40161670c1d4be6";

        let xExpect = "0x6fb7435ff405e4f34e9b128262861a75c922e19fddb6f65eb18f535243babff5"
        let yExpect = "0x63e6099690ee8bb2529ec088313a1b59dc34bd4c8c0fe6022a8a9283c36421df"

        let ret = await  ed25519Curve.methods.calPolyCommit(polyPks,pk).call();
        console.log('calPolyCommit=>', ret);
        console.log("x2",web3.utils.toHex(ret.sx))
        console.log("y2",web3.utils.toHex(ret.sy))

        assert.equal(ret.success,true);
        assert.equal(web3.utils.toHex(ret.sx), xExpect, "1");
        assert.equal(web3.utils.toHex(ret.sy), yExpect, "2");


    });

})
;

