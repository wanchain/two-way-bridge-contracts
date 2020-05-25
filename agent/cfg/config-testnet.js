const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../../test/keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x67C2d1971E990E4BF12590e446b9b162CC47727B',
  createGpk: '0xDCa601C2f1A5C58d2e1648D952D5FEB78E33344a',
  preCompile: '0x206CbA56BDb1D615f6A712403c2a4fe49B3305eE',
}

exports.startBlock = 928750;

exports.gasPrice = 200000000000;
exports.gasLimit = 4700000;