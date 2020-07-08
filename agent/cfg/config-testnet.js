const path = require('path');

exports.wanNodeURL = 'http://192.168.1.58:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x21Da8E6278B0ad2d58e1fcB51E22AFc57d42aBd6',
  createGpk: '0x40B2BbC5916a4CcF5D8D10f9df486c1907789e1D'
}

exports.startBlock = 108643;

exports.gasPrice = 180000000000;
exports.gasLimit = 10000000;

let dbServer = {
  "hosts" : "192.168.1.58:27017",
  "replica": "",
  "database": "osm-testnet",
  "username": "dev",
  "password": "wanglu"
};

exports.dbOptions = {
  // useNewUrlParser: true,
  keepAlive: true,
  reconnectTries: Number.MAX_VALUE
};

exports.dbUrl = function (readSecondary = false) {
  let dbString = 'mongodb://';
  if (dbServer.name) {
    dbString += (dbServer.username + ':' + dbServer.password + '@');
  }
  dbString += dbServer.hosts;
  dbString += ('/' + dbServer.database);
  dbString += '?authSource=admin';
  if (dbServer.replica) {
    dbString += ('&replicaSet=' + dbServer.replica);
  }
  if (readSecondary) {
    dbString += '&readPreference=secondaryPreferred';
  }
  return dbString;
};