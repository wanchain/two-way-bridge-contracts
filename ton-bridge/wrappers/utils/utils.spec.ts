import {logger} from './logger'
import {bigIntToBytes32Hex, getQueryID, toBase64, toNumberByDecimal} from "./utils";

const formatUtil = require('util');

describe('queryID', () => {

    beforeAll(async () => {
    }, 50000);

    it('getQueryID', async () => {
        logger.info("Entering ");
        while (true) {
            let queryID = await getQueryID();
            if (queryID < 0) {
                console.log("queryId", queryID);
                break;
            }
        }
    }, 500000);

    it('toBase64', async () => {
        logger.info("Entering ");
        let base64Str = 'fEULm54qtjiWNCWgqPuik7rnVg8TxFjgrEwkaGIeqAw='
        let ret = toBase64(base64Str);
        console.log(ret);
    }, 500000);

    it('toNumberBydecimal', async () => {
        logger.info("Entering ");
        let values = [0.1, 0.0001, '-0.1', 1.2, 1n]
        let decimal = 9;
        for (let value of values) {
            let ret = toNumberByDecimal(value, decimal)
            console.log(ret);
        }
    }, 500000);

    it('bigTo32Hex', async () => {
        logger.info("Entering ");
        let bigs = [66704320426636175881951933555877905071355893485103249698453095646536494926851n, 27n, 9717265698076866880183736264597918203280371381350161603154785105157288547719n]


        for (let b of bigs) {
            let ret = bigIntToBytes32Hex(b);
            console.log(ret);
        }
    }, 500000);

});