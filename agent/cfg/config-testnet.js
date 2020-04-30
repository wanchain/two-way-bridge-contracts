const path = require('path');

exports.wanNodeURL = 'http://192.168.1.58:18545';

exports.contractAddress = {
  createGpk: '',
  mortgage: '',
}

exports.keystore = {
  path: path.join(__dirname, '../keystore/0xb9DD855dc6A9340Ea6B566A5B454202115BcF485'),
  pwd: 'wl',
}

exports.gasPrice = 1000000000;
exports.gasLimit = 4700000;