const config = require('../../cfg/config');
const Round = require('./Round');
const EventTracker = require('../utils/EventTracker');
const {GroupStatus} = require('./Types');
const wanchain = require('../utils/wanchain');

console.log("OpenStoreman gpk agent");

// record latest round of each group
const groupMap = new Map();

// TODO: restore group agent after reboot

const smgSc = wanchain.getContract('smg', config.contractAddress.smg);
const createGpkSc = wanchain.getContract('CreateGpk', config.contractAddress.createGpk);

const evtTracker = new EventTracker('gpk', config.startBlock, eventHandler);
evtTracker.subscribe('smg', config.contractAddress.smg, ["0x62487e9f333516e24026d78ce371e54c664a46271dcf5ffdafd8cd10ea75a5bf"]);
evtTracker.start();

async function eventHandler(evt) {
  console.log("receive evt: %O", evt);
  let groupId = evt.topics[1];
  let group = groupMap.get(groupId);
  try {
    let info = await createGpkSc.methods.getGroupInfo(groupId, -1).call();
    console.log("agent get group: %O", info);
    let round = info[0], status = info[1];
    if ((status != GroupStatus.Close) && checkSelfSelected(groupId)) {
      if ((!group) || (group.round < round)) {
        let newRound = new Round(groupId, round);
        groupMap.set(groupId, newRound);
        newRound.start();
        console.log("%s gpk agent start group %s new round %d", new Date(), groupId, round);
      } else {
        console.error("%s gpk agent invalid local group %s, round %d > %d", new Date(), groupId, group.round, round);
      }
    }
    return true;
  } catch (err) {
    console.error("%s gpk agent process event err: %O", new Date(), err);
    return false;
  }
}

async function checkSelfSelected(groupId) {
    let info = await smgSc.methods.getSmInfo(groupId, wanchain.selfAddress);
    return (info[3] == true); // isWorking
}