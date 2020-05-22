const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../../test/keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x7F24E421888DB3473f43c006326B797c15fed0d6',
  createGpk: '0x2547fCD5e5B8ce9C1A9ED3e655A7e869aFE3B7C3',
}

exports.startBlock = 928750;

exports.gasPrice = 200000000000;
exports.gasLimit = 4700000;