const ContractWrapper = require("./contractWrapper");

class Contract extends ContractWrapper {
  constructor(userCfg, abi, address) {
    super(userCfg);
    this.contract = this.contractAt(abi, address);
  }
}

module.exports = Contract;
