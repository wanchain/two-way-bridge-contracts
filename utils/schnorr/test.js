const schnorr = require('./tools');
const skSmg = new Buffer("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex');

function test() {
    let typesArray;
    let parameters;
    typesArray = ['bytes','bytes32','address','uint256'];
    parameters = [EOS, utils.stringTobytes32("xhash"), utils.getAddressFromInt(3).addr, 100];
    let pk = schnorr.getPKBySk(skSmg);

    console.log("=====pk===hex");
    console.log(pk);

    let s = schnorr.getS(skSmg, typesArray, parameters);
    console.log("=====s===hex");
    console.log(s);

    console.log("=====R===hex");
    console.log(schnorr.getR());
}
test();