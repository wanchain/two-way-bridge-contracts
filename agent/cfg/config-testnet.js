const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../../test/keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0xe307aE7670192457739F8536Ccea41977Ea15b19',
  createGpk: '0xd19dE4C24272ed11DF74bDd0118f3Dfb122E0C24',
}

exports.startBlock = 761000;

exports.gasPrice = 200000000000;
exports.gasLimit = 4700000;