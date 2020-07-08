const fs = require('fs');
const path = require('path');
const config = require('../../cfg/config');
const Group = require('./Group');
const Round = require('./Round');
const EventTracker = require('../utils/EventTracker');
const {GpkStatus} = require('./Types');
const wanchain = require('../utils/wanchain');
const tool = require('../utils/tools');

// record latest round of each group
const groupMap = new Map();

// TODO: restore group agent after reboot

const smgSc = wanchain.getContract('smg', config.contractAddress.smg);
const createGpkSc = wanchain.getContract('CreateGpk', config.contractAddress.createGpk);

function run() {
  console.log("run gpk agent");
  // recoverProcess();
  listenEvent();
}

function recoverProcess() {
  let dir = path.join(__dirname, '../../cxt/');
  let files = fs.readdirSync(dir);
  files.forEach(file => {
    if (file.match(/^0x[0-9a-f]{64}\.cxt$/)) {
      console.log("recoverProcess: %s", file);
      let ctx = tool.readContextFile(file);
      let round = new Round('', 0);
      Object.assign(round, ctx);
      groupMap.set(round.groupId, round);
      round.resume();
    }
  });
}

function listenEvent() {
  let id = wanchain.selfAddress + '_gpk';
  let evtTracker = new EventTracker(id, eventHandler, true, config.startBlock);
  evtTracker.subscribe('smg_selectedEvent', config.contractAddress.smg, ["0x62487e9f333516e24026d78ce371e54c664a46271dcf5ffdafd8cd10ea75a5bf"]);
  evtTracker.subscribe('gpk_GpkCreatedLogger', config.contractAddress.createGpk, ["0x2e793a95012b45cc0d04ab8579c7ea491b2153f808fa8e4fc8dadf0fb88c5f2c"]);
  evtTracker.subscribe('gpk_SlashLogger', config.contractAddress.createGpk, ["0x55a838f0e5dda7c3de54baf9c24a1d73c2c17849295e268ce5b0b7dde1d28266"]);
  evtTracker.start();
}

async function eventHandler(evt) {
  // console.log("receive evt: %O", evt);
  try {
    switch (evt.name) {
      case 'smg_selectedEvent':
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
    console.error("%s gpk agent process event err: %O", new Date().toISOString(), err);
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
      await group.netxRound(round);
    } else {
      console.error("%s gpk agent ignore group %s round %d status %d event", new Date().toISOString(), groupId, round, status);
    }
  }
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

async function checkSelfSelected(groupId) {
    let info = await smgSc.methods.getStoremanInfo(wanchain.selfAddress).call();
    let curgroup = info[9];
    let nextGroup = info[10];
    return ((groupId == curgroup) || (groupId == nextGroup));
}

module.exports = {
  run
};