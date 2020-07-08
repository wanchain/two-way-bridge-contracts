const path = require('path');

exports.wanNodeURL = 'http://192.168.1.58:7654';

exports.keystore = {
  path: path.join(__dirname, '../keystore/0x5793e629c061e7fd642ab6a1b4d552cec0e2d606'),
  pwd: 'wanglu',
}

exports.contractAddress = {
  smg: '0x1F05d84bB51EdBCD62B566F98a5947440A9a1Fff',
  createGpk: '0x9892E737147eeA0CA6E44ca225b6Dc89655371a5'
}

exports.startBlock = 95725;

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