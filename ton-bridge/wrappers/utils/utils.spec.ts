import {logger} from './logger'
import {getQueryID, toBase64, toNumberByDecimal} from "./utils";

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

});