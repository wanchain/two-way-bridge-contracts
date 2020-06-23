const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0xADD28b92eAB97c00edcA3A13eCf7E7e7066528b6',
  createGpk: '0x2FcaE98e5123B22f97D31EFa15F7dF0856bcbd37'
}

exports.startBlock = 2378066;

exports.gasPrice = 180000000000;
exports.gasLimit = 10000000;