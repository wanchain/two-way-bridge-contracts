const ContractWrapper = require("./contractWrapper");

class Contract extends ContractWrapper {
  constructor(userCfg, abi, address) {
    super(userCfg);
    this.contract = this.contractAt(abi, address);
    this.address = this.contract._address;
    this.abi = this.contract._jsonInterface;
  }

  async call(func, ...args) {
    return await super.readContract(this.contract, func, ...args);
  }

  async send(func, ...args) {
    // console.log(func, args);
    let options = {value:0, privateKey:''};
    let theLastOne = args.length - 1;
    if (args.length > 0 && !Array.isArray(args[theLastOne]) && typeof(args[theLastOne]) === "object") {
      let opt = args.pop();
      options = Object.assign({}, options, opt);
    }
    const txData = await super.encodeTx(this.contract, func, ...args);
    return await super.sendTx(this.contract.address, txData, options);
  }
}

module.exports = Contract;
