
const utils = require("../utils");

const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const { registerStart, stakeInPre, } = require('../basee.js')
const argv = require('optimist').argv

console.log("argv: ", argv)
const config=[
  {
    preGroupId: utils.stringTobytes32(""),
    wlOffset: 0,
    option: {
      registerDuration: 100,
      gpkDuration: 2,
      htlcDuration:10,
    }
  },{
    preGroupId: utils.stringTobytes32(""),
    wlOffset: 8,
    option: {
      registerDuration: 3,
      gpkDuration: 2,
      htlcDuration:9000,
    }
  }
]

contract('open_storeman_it', async () => {
  let smgSc
  before("start smg", async() => {
    let smgProxy = await StoremanGroupProxy.deployed();
    smgSc = await StoremanGroupDelegate.at(smgProxy.address);
    console.log("smg contract address: %s", smgProxy.address);

    if(argv.case == undefined) argv.case = 0;
    console.log("config case: ", config[argv.case])
    let groupId = await registerStart(smgSc, config[argv.case].wlOffset, config[argv.case].option);
    await stakeInPre(smgSc, groupId);
  })

})
