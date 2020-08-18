const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');

// group
let groupId = '0x0000000000000000000000000000000000000000000031353936313738343635';

// contract
let smgSc;

contract('open_storeman_it', async () => {
  before("debug smg", async() => {
    let smgProxy = await StoremanGroupProxy.deployed();
    smgSc = await StoremanGroupDelegate.at(smgProxy.address);
    console.log("smg contract address: %s", smgProxy.address);

    await getSmList();
  })

  it('it_stub', async () => {
  })

  async function getSmList() {
    let smNumber = await smgSc.getSelectedSmNumber(groupId);
    console.log("group node smNumber: %d", smNumber);
    for (let i = 0; i < smNumber; i++) {
      let sm = await smgSc.getSelectedSmInfo(groupId, i);
      let address = sm.wkAddr.toLowerCase();
      console.log("group node %d: %s", i, address);
    }
  }
})