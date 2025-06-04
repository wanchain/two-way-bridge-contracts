import {concatMsg, logger} from './logger'
const formatUtil = require('util');

describe('logger', () => {

    beforeAll(async () => {
    },50000);

    it('logger.info', async () => {
        logger.info("Entering ");
        logger.info(formatUtil.format("hello %s  %s","Jacob", "alice"));
    },500000);


    it('logger.contact', async () => {
        let f = (...params)=>{
            return concatMsg(params);
        }
        let ret = f({a:1,b:2n},{c:3,d:4},"field2","field3",[{a1:1,b1:2n},{a2:3,b2:4n}]);
        // {"a":1,"b":"2"} {"c":3,"d":4} field2 field3 [{"a1":1,"b1":"2"} {"a2":3,"b2":"4"}]
        console.log(ret);
    },500000);

});