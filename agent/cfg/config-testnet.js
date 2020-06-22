const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0xa56902dFd78ea773fB55a30dE8FFad4a6E96Ab57',
  createGpk: '0xe5D05b9951c03F168CF5A5eB96A8FCb29Bcee3cb'
}

exports.startBlock = 1976117;

exports.gasPrice = 180000000000;
exports.gasLimit = 10000000;