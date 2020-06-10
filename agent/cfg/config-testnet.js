const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0xf70002aB52b80FD7197042720d386F5d21143507',
  createGpk: '0xD856925F66F94422E909Db25e78CcF52D66883Fc',
  preCompile: '0x77bD431230D162eCc0b7B6712831DE43756aa7C1',
}

exports.startBlock = 1313000;

exports.gasPrice = 180000000000;
exports.gasLimit = 8000000;