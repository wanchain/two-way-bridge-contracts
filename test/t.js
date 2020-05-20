const utils = require("./utils");

function main() {




    for(let i=3000; i<3008; i++){
        let n = utils.getAddressFromInt(i)
        console.log( n.priv.toString('hex'), n.pk)
    }
}


main();