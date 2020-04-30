let config = {};

(function() {
  if (global.testnet == undefined) {
    global.testnet = true;
  }
  if (global.testnet) {
    console.log("use testnet config");
    config = require('./config-testnet');
  } else {
    console.log("use main config");
    config = require('./config-main');
  }
})();

module.exports = config;