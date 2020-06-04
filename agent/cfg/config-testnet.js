const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x6A6b6939D301cE1D7D2CC931395732C1357a94c7',
  createGpk: '0x7C93b63be4d0cF2A9e52009B595993a3900A9744',
  preCompile: '0x351a84Df9dFd7d22f77b8685a7e253EF5E3EE8A6',
}

exports.startBlock = 788000;

exports.gasPrice = 180000000000;
exports.gasLimit = 8000000;