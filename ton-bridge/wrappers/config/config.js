let config = {};
const path = require('path');
(function () {
    if (global.network === "testnet") {
        console.log("use testnet config");
        config = require('./config-testnet');
    }
    if (global.network === "mainnet") {
        console.log("use mainnet config");
        config = require('./config-mainnet');
    }

    //  config.dryRun = true;       // only for test
    config.dryRun = false;      // for product
    console.log("@@@@@@The flag of dryRun is %s@@@@@\n", config.dryRun);

})();

module.exports = config;
