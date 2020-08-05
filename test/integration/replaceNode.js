const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const { registerStart, stakeInOne } = require('../base.js')

let leader = '0x5793e629c061e7fd642ab6a1b4d552cec0e2d606';

contract('open_storeman_it', async () => {
  before("start smg", async() => {
    let smgProxy = await StoremanGroupProxy.deployed();
    let smgSc = await StoremanGroupDelegate.at(smgProxy.address);
    console.log("smg contract address: %s", smgProxy.address);

    let sk = await smgSc.getStoremanInfo(leader);
    console.log("leader sk: %O", sk);
    console.log("pre group id: %s", sk.groupId);

    let groupId = await registerStart(smgSc, sk.groupId);
    console.log("new group id: %s", groupId);

    sk = await smgSc.getStoremanInfo(leader);
    console.log("leader new sk: %O", sk);
    console.log("next group id: %s", sk.nextGroupId);

    let newWa = await stakeInOne(smgSc, groupId, 7, 3000);
    sk = await smgSc.getStoremanInfo(newWa);
    console.log("new node sk: %O", sk);
  })

  it('it_stub', async () => {
  })
})