const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate');
const { registerStart, stakeInPre, toSelect,g} = require('../base.js')


async function sendIncentive(truffleSmg) {
  const Web3 = require('web3')
  let smgAdminAddr =  truffleSmg.contract._address
  const  smgAdminAbi =  require('../../osmAbi.json')
  let web3 = new Web3(new Web3.providers.HttpProvider(g.web3url))
  let smg = new web3.eth.Contract(smgAdminAbi,smgAdminAddr)

  let sk = await smg.methods.getStoremanInfo(g.leader).call()
  console.log("storeman info:", sk)

  let group = await smg.methods.getStoremanGroupInfo(sk.groupId).call();
  console.log("group info:", group);

  let selectedCount = await smg.methods.getSelectedSmNumber(sk.groupId).call();
  console.log("selectedCount:", selectedCount)

  for(let i=0; i<selectedCount; i++){
    let node1 = await smg.methods.getSelectedSmInfo(sk.groupId, i).call()
    console.log("group node  ", i, node1.wkAddr);
  }

  let tx = await smg.methods.incentiveCandidator(g.leader).send({from:g.leader});
  console.log("tx:", tx);
  return tx;

}


contract('open_storeman_it', async () => {
  let smgSc
  before("start smg", async() => {
    let smgProxy = await StoremanGroupProxy.deployed();
    smgSc = await StoremanGroupDelegate.at(smgProxy.address);
    console.log("smg contract address: %s", smgProxy.address);

    let groupId = await registerStart(smgSc);
    await stakeInPre(smgSc, groupId);
    // await toSelect(smgSc, groupId);
  })

  it('it_stub', async () => {
    //await sendIncentive(smgSc)
  })
})