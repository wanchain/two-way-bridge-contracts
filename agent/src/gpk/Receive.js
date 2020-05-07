const {CheckStatus} = require('./Types');

class Receive {
  constructor() {
    // poly commit
    this.polyCommit = ''; // hex string with 0x
    // sij
    this.encSij = ''; // hex string with 0x
    this.checkStatus = CheckStatus.Init;
    this.sij = null; // bigi
  }  
}

module.exports = Receive;
