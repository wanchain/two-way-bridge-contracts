const path = require('path');

exports.wanNodeURL = 'http://192.168.1.179:7654';

exports.contractAddress = {
  smg: '0x8d6DD94C90C303b332E1E3Bcb8cCF496D82eC96D',
  createGpk: '0xC464153Fb0aE47D751856D92acea63A522682859',
}

exports.keystore = {
  path: path.join(__dirname, '../../test/keystore/0x2e54a80b977fd1859782e2ee96a76285a7fc75ba'),
  pwd: 'wanglu',
}

exports.gasPrice = 200000000000;
exports.gasLimit = 4700000;