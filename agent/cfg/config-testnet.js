const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../../test/keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x1EB06c3b1Cb7f5bb907D767A5A78B32970C4a70b',
  createGpk: '0x02a84a66423644f716084b80b91D5683F0c8f9Ac',
}

exports.startBlock = 761000;

exports.gasPrice = 200000000000;
exports.gasLimit = 4700000;