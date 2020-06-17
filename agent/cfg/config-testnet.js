const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x46e3Cc4aF8162840cFfd84C1Fd734963Eb51c255',
  createGpk: '0x6cf6F1434a57c78D25B5D786Fcbca34D562cF86A',
  preCompile: '0x77bD431230D162eCc0b7B6712831DE43756aa7C1',
}

exports.startBlock = 1380498;

exports.gasPrice = 180000000000;
exports.gasLimit = 8000000;