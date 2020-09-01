const { getWeb3, stringToBytes, newContract } = require('../utils');
const PosLib = artifacts.require('./lib/PosLib.sol');


contract('PosLib', accounts => {
  let posLib;
  let web3;
  before(async () => {
    posLib = await newContract(PosLib);
    web3 = getWeb3();
  });

  it("getEpochId", async () => {
    let ret = await posLib.methods.getEpochId(parseInt(Date.now()/1000, 10)).call();
    console.log('getEpochId', ret);
  });

  it("getPosAvgReturn", async () => {
    let ret = await posLib.methods.getPosAvgReturn(parseInt(Date.now()/1000, 10)).call();
    console.log('getPosAvgReturn', ret);
  });

  it("getHardCap", async () => {
    let ret = await posLib.methods.getHardCap(parseInt(Date.now()/1000, 10)).call();
    console.log('getHardCap', ret);
  });

  it("getMinIncentive", async () => {
    let ret = await posLib.methods.getMinIncentive(web3.utils.toWei('10'), parseInt(Date.now()/1000)).call();
    console.log('getMinIncentive', ret);
  });
});

