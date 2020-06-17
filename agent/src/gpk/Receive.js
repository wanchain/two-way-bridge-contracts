const {CheckStatus} = require('./Types');

class Receive {
  constructor() {
    // poly commit
    this.polyCommit = ''; // hex string with 0x
    // sij
    this.encSij = ''; // hex string with 0x
    this.checkStatus = CheckStatus.Init;
    this.sij = ''; // hex string with 0x
    this.revealed = false;
  }
}

module.exports = Receive;
