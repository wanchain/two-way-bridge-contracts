const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0xdfdBEE10B7a439547Ae369AB95C37aD91C2aDEd8',
  createGpk: '0xA84510c53050d1d61f45823882B2505f3B0E3FA5',
  preCompile: '0x89B0d1e52dF9176c4440B5951096b6Ce55578569',
}

exports.startBlock = 2340;

exports.gasPrice = 180000000000;
exports.gasLimit = 8000000;