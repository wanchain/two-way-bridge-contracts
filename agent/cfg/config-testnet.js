const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../../test/keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x548e8648Ae4A6bad37C2097eB04dB3a277cB0156',
  createGpk: '0x779a0C0b624eCbBa67bb61F58988153dc3067c43',
}

exports.startBlock = 928750;

exports.gasPrice = 200000000000;
exports.gasLimit = 4700000;