const utils = require("./utils");

function main() {




    for(let i=9999; i<10000; i++){
        let n = utils.getAddressFromInt(i)
        console.log(n.addr, n.priv.toString('hex'), n.pk)
    }
}


main();