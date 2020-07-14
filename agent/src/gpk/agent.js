const config = require('../../cfg/config');
const Group = require('./Group');
const EventTracker = require('../utils/EventTracker');
const {GpkStatus} = require('./Types');
const wanchain = require('../utils/wanchain');
const mongoose = require('mongoose');
const GroupInfo = require('../../db/models/group_info');
const Round = require('./Round');

// record latest round of each group
const groupMap = new Map();

// TODO: restore group agent after reboot

const smgSc = wanchain.getContract('smg', config.contractAddress.smg);
const createGpkSc = wanchain.getContract('CreateGpk', config.contractAddress.createGpk);

function run() {
  console.log("run gpk agent");
  // connect db
  mongoose.connect(config.dbUrl(), config.dbOptions, async (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('database connected');
      await recoverGroup();
      listenEvent();
    }
  });
}

async function recoverGroup() {
  let groups = await GroupInfo.find({selfAddress: wanchain.selfAddress}).exec();
  // console.log("read db group: %O", groups)
  await Promise.all(groups.map(group => {
    return new Promise(async (resolve) => {
      console.log("recover group: %s", group.id);
      let resumeGroup = new Group(group.id, group.round);
      resumeGroup.curves = group.curves;
      let r0 = new Round(resumeGroup, 0, [], 0);
      Object.assign(r0, group.rounds[0]);
      resumeGroup.rounds[0] = r0;
      if (group.rounds[1]) {
        let r1 = new Round(resumeGroup, 1, [], 0);
        Object.assign(r1, group.rounds[1]);
        resumeGroup.rounds[1] = r1;
      }
      groupMap.set(resumeGroup.id, resumeGroup);
      await resumeGroup.start(true);
      resolve();
    });
  }));
}

function listenEvent() {
  let id = wanchain.selfAddress + '_gpk';
  let evtTracker = new EventTracker(id, eventHandler, true, config.startBlock);
  evtTracker.subscribe('smg_selectedEvent', config.contractAddress.smg, ["0x62487e9f333516e24026d78ce371e54c664a46271dcf5ffdafd8cd10ea75a5bf"]);
  evtTracker.subscribe('gpk_GpkCreatedLogger', config.contractAddress.createGpk, ["0x2e793a95012b45cc0d04ab8579c7ea491b2153f808fa8e4fc8dadf0fb88c5f2c"]);
  evtTracker.subscribe('gpk_SlashLogger', config.contractAddress.createGpk, ["0x55a838f0e5dda7c3de54baf9c24a1d73c2c17849295e268ce5b0b7dde1d28266"]);
  evtTracker.subscribe('gpk_ResetLogger', config.contractAddress.createGpk, ["0x05965810523ac64b8d0831d42cc849f23ea3438450561887aad3c4b7687e78db"]);
  evtTracker.start();
}

async function eventHandler(evt) {
  // console.log("receive evt: %O", evt);
  try {
    switch (evt.name) {
      case 'smg_selectedEvent':
      case 'gpk_ResetLogger':
        await procSmgSelectedEvent(evt);
        break;
      case 'gpk_GpkCreatedLogger':
        await procGpkCreatedLogger(evt);
        break;
      case 'gpk_SlashLogger':
        await procGpkSlashLogger(evt);
        break;
      default:
        break;
    }
    return true;
  } catch (err) {
    console.error("%s gpk agent process %s event err: %O", new Date().toISOString(), evt.name, err);
    return false;
  }
}

async function procSmgSelectedEvent(evt) {
  let groupId = evt.topics[1];
  let group = groupMap.get(groupId);
  let info = await createGpkSc.methods.getGroupInfo(groupId, -1).call();
  console.log("agent get group: %O", info);
  let round = parseInt(info[0]), status = parseInt(info[1]);
  if ((status == GpkStatus.PolyCommit) && checkSelfSelected(groupId)) {
    if (!group) {
      let newGroup = new Group(groupId, round);
      groupMap.set(groupId, newGroup);
      await newGroup.start();
    } else if (group.round < round) {
      await group.nextRound(round);
    } else {
      console.error("%s gpk agent ignore group %s round %d status %d event", new Date().toISOString(), groupId, round, status);
    }
  }
}

async function checkSelfSelected(groupId) {
  let info = await smgSc.methods.getStoremanInfo(wanchain.selfAddress).call();
  let curgroup = info[9];
  let nextGroup = info[10];
  return ((groupId == curgroup) || (groupId == nextGroup));
}

function procGpkCreatedLogger(evt) {
  let groupId = evt.topics[1];
  console.log("%s gpk agent finish group %s", new Date().toISOString(), groupId);
}

function procGpkSlashLogger(evt) {
  let groupId = evt.topics[1];
  let round = evt.topics[2];
  let curve = evt.topics[3];
  console.log("%s group %s round %d curve %d slash someone", new Date().toISOString(), groupId, round, curve);
  console.log("slash evt: %O", evt);
}



module.exports = {
  run
};