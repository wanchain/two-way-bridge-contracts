import {logger} from './logger'
const formatUtil = require('util');

describe('logger', () => {

    beforeAll(async () => {
    },50000);

    it('logger.info', async () => {
        logger.info("Entering ");
        logger.info(formatUtil.format("hello %s  %s","Jacob", "alice"));
    },500000);

});