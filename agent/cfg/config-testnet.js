const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../../test/keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0xAE0668a9fd1Acd75A30f6536C648490B05a93CE6',
  createGpk: '0x9D3722F3a9689E323b36dB79ce800330FCd0971B',
}

exports.startBlock = 928750;

exports.gasPrice = 200000000000;
exports.gasLimit = 4700000;