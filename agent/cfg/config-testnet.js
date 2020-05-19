const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.keystore = {
  path: path.join(__dirname, '../../test/keystore/0x2e54a80b977fd1859782e2ee96a76285a7fc75ba'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x545B5Ad1860d9e05F72d73bFAe27B2DafA5cB2F7',
  createGpk: '0x2b91Be2C7126B115F1139b994D74822ACd1268a0',
}

exports.startBlock = 670000;

exports.gasPrice = 200000000000;
exports.gasLimit = 4700000;