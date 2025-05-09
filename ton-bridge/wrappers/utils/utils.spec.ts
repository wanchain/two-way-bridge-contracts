import {logger} from './logger'
const formatUtil = require('util');
import {getQueryID, toBase64} from "./utils";

describe('queryID', () => {

    beforeAll(async () => {
    },50000);

    it('getQueryID', async () => {
        logger.info("Entering ");
        while(true){
            let queryID = await getQueryID();
            if(queryID<0){
                console.log("queryId",queryID);
                break;
            }
        }
    },500000);

    it('toBase64', async () => {
        logger.info("Entering ");
        let base64Str = 'fEULm54qtjiWNCWgqPuik7rnVg8TxFjgrEwkaGIeqAw='
        let ret = toBase64(base64Str);
        console.log(ret);
    },500000);



});