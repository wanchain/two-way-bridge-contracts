const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.contractAddress = {
  createGpk: '0x0BC87627fb53cf070C5a8354594f351810d5D4d0',
  mortgage: '',
}

exports.keystore = {
  path: path.join(__dirname, '../../test/keystore/0x2a94459e0a0ac91dbba7e43ce8262eb4cb768a6e'),
  pwd: 'wanglu',
}

exports.gasPrice = 200000000000;
exports.gasLimit = 4700000;