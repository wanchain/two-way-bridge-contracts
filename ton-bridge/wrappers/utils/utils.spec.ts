import {logger} from './logger'
const formatUtil = require('util');
import {getQueryID} from "./utils";

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

});