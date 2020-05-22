const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../../test/keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x04F15547ea2705D0a810f5C9Afc361338b2ec5c0',
  createGpk: '0xCa3E87A214CA65fe7C8B8611C488A4b0224c229C',
}

exports.startBlock = 928750;

exports.gasPrice = 200000000000;
exports.gasLimit = 4700000;