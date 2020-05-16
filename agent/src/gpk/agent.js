const config = require('../../cfg/config');
const Round = require('./Round');
const EventTracker = require('../utils/EventTracker');
const {GroupStatus} = require('./Types');
const wanchain = require('../utils/wanchain');

console.log("OpenStoreman gpk agent");

// record latest round of each group
const groupMap = new Map();

// TODO: restore group agent after reboot

const mortgageSc = wanchain.getContract('Mortgage', config.contractAddress.mortgage);
const createGpkSc = wanchain.getContract('CreateGpk', config.contractAddress.createGpk);

const evtTracker = new EventTracker('gpk', 6320300, eventHandler);
evtTracker.subscribe('mortgage', '0x73a99a82f1b95bfd55a5820a7342758ceca80b33', ["0x10c53ecd69edb1ebf570440ffdc3bb14b8d0ad4297cbde535c88d316164653ae"]);
evtTracker.start();

async function eventHandler(evt) {
  console.log("receive evt: %O", evt);
  let groupId = '0x' + evt.topics[0];
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
    let info = await mortgageSc.methods.getSmInfo(groupId, wanchain.selfAddress);
    return (info[3] == true); // isWorking
}

async function test() {
  let round = new Round('test', 0);
  round.test();
}

test();
