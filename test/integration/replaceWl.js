const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const { registerStart, stakeInPre } = require('../base.js')

let oldLeader = '0x5793e629c061e7fd642ab6a1b4d552cec0e2d606';
let newLeader = '0x63ee75865b30f13b614a144023c133bd683e8134';

contract('open_storeman_it', async () => {
  before("replace whitelist", async() => {
    let smgProxy = await StoremanGroupProxy.deployed();
    let smgSc = await StoremanGroupDelegate.at(smgProxy.address);
    console.log("smg contract address: %s", smgProxy.address);

    let sk = await smgSc.getStoremanInfo(oldLeader);
    console.log("leader sk: %O", sk);
    console.log("pre group id: %s", sk.groupId);

    let groupId = await registerStart(smgSc, sk.groupId, 8);
    console.log("new group id: %s", groupId);

    sk = await smgSc.getStoremanInfo(oldLeader);
    console.log("leader new sk: %O", sk);

    await stakeInPre(smgSc, groupId, 8, 4);

    sk = await smgSc.getStoremanInfo(newLeader);
    console.log("new leader sk: %O", sk);
  })

  it('it_stub', async () => {
  })
})