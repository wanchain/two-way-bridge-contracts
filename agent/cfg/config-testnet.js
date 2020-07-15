const path = require('path');

exports.wanNodeURL = 'http://192.168.1.58:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0xb44D0eAFe7D35806c3A6762896abCC4A70934caC',
  createGpk: '0x2404430EfdDff81AF9aF326E9EA3E6972A812910'
}

exports.startBlock = 710930;

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