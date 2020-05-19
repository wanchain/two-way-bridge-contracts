const utils = require("./utils");

function main() {

    for(let i=2000; i<2008; i++){
        let n = utils.getAddressFromInt(i)
        console.log(n.addr, n.priv.toString('hex'))
    }
}


main();