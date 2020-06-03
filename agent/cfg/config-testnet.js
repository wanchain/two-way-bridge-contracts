const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x3728EC504E5BbA40459f07F570bB0A00A30D874f',
  createGpk: '0x60c0A2B5910004288F231C186D9DdCA1431A67f4',
  preCompile: '0x988EEAF496a7D05851b0D1FCcf6EdE94c062D56C',
}

exports.startBlock = 695000;

exports.gasPrice = 180000000000;
exports.gasLimit = 8000000;