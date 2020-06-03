const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x7867DcdE96a998996F56d086f67E858BC8D64E45',
  createGpk: '0x98e91e9FdDAE6Ce0Ee8870436359b75E026cEb61',
  preCompile: '0xd309d5238FDf486232685a5124a0931442C93bdA',
}

exports.startBlock = 711000;

exports.gasPrice = 180000000000;
exports.gasLimit = 8000000;