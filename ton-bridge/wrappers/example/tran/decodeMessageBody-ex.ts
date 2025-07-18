import {remove0x} from "../../utils/utils";
import {getOpCodeFromCell} from "../../event/getEvents";
import {Cell} from "@ton/core";
import {codeTable} from "../../code/encode-decode";

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('body', 'hex string')
    .string('body')
    .argv;

console.log(optimist.argv);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 2) {
    optimist.showHelp();
    process.exit(0);
}

async function main() {
    try {
        let cell = Cell.fromBoc(Buffer.from(remove0x(argv['body']), 'hex'))[0];
        let opCode = await getOpCodeFromCell(cell);
        let ret = await codeTable[opCode]['decode'](cell);
        console.log("opCode = ", opCode, opCode.toString(16));
        console.log("decoded = ", ret);
    } catch (err) {
        console.error(err.code, err.response?.data?.error)
    }

}

main();

// ts-node decodeMessageBody-ex --body b5ee9c720102030100011c0002ca40000001000000000fea6ea1000000000000000000000000000000000000000000746573746e65745f30363800000408000000000000000000000000000000000000000000000000000000000098968014f6eb3cb4b187d3201afbf96a38e62367325b29f9010200c980000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000400093800179fb21cb798089dd1dbee61c0584d08fbd7c1b9ea7564b1c0f34ef1453e6a4c00000000000000000000000000000000000000000000000000000000000007d2eec2dcc6d0c2d2dd0
