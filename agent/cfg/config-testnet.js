const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../../test/keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x49fde469b39389Cd93999A3Ec092143C01c5f411',
  createGpk: '0xdb1B1ADA7ca4874544A482F78E0c47e2300916e6',
}

exports.startBlock = 761000;

exports.gasPrice = 200000000000;
exports.gasLimit = 4700000;