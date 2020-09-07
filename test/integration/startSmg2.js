const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const { setupNetwork, registerStart, stakeInPre, toSelect} = require('../base.js')

contract('open_storeman_it', async () => {
  before("start smg2", async() => {
    let smgProxy = await StoremanGroupProxy.deployed();
    let smgSc = await StoremanGroupDelegate.at(smgProxy.address);
    console.log("smg contract address: %s", smgProxy.address);

    await setupNetwork();
    let groupId = await registerStart(smgSc, 7);
    await stakeInPre(smgSc, groupId, 7);
    // await toSelect(smgSc, groupId);
  })

  it('it_stub', async () => {
  })
})