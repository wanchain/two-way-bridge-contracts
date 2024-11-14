const schnorr = require('./tools-secp256k1.js');
const skSmg = new Buffer("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex');

function test() {
    let typesArray;
    let parameters;
    typesArray = ['uint256', 'string'];
    parameters = ['2345675643', 'Hello!%'];
    let pk = schnorr.getPKBySk(skSmg);

    console.log("=====pk===hex");
    console.log(pk);

    let s = schnorr.getSecSchnorrS(skSmg, typesArray, parameters);
    console.log("=====s===hex");
    console.log(s);


    let msgHash = "0x12345678123456781234567812345678"

    s = schnorr.getSecSchnorrSByMsgHash(skSmg, Buffer.from(msgHash.substring(2),'hex'));
    console.log("=====getSecSchnorrSByMsgHash===hex");
    console.log(s);
}

test();
