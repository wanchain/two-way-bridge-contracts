class Send {
  constructor(pk) {
    // pk
    this.pk = pk; // hex string with 0x
    // encSij
    this.sij = null; // BigInteger
    this.r = null; // Buffer, bytes16
    this.encSij = null; // Buffer
    this.encSijTxHash = '';
    this.chainEncSijTime  = 0; // timestamp in sencond
    this.encSijTimeoutTxHash = '';
    // check
    this.checkStatus = 0;
    this.checkTxHash = '';
    this.chainCheckTime = 0;
    this.checkTimeoutTxHash = '';
    this.sijTimeoutTxHash = '';
    // reveal sij
    this.sijTxHash = 0;
    this.chainSijTime = 0;
  }  
}

module.exports = Send;
