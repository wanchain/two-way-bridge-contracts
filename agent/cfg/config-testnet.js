const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x514Afbc4e85f4c1E4A7dD45ca36b5018fB38C785',
  createGpk: '0x5AD5847e7C5b33e9FA08C1e747cad34Df504579c',
  preCompile: '0x7A8dC0A82DA991Bd0DDFe577929C168B0b8C6D6d',
}

exports.startBlock = 797000;

exports.gasPrice = 180000000000;
exports.gasLimit = 8000000;