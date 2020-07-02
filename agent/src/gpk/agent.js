const fs = require('fs');
const path = require('path');
const config = require('../../cfg/config');
const Round = require('./Round');
const EventTracker = require('../utils/EventTracker');
const {GroupStatus} = require('./Types');
const wanchain = require('../utils/wanchain');
const tool = require('../utils/tools');

console.log("start gpk agent");

// record latest round of each group
const groupMap = new Map();

// TODO: restore group agent after reboot

const smgSc = wanchain.getContract('smg', config.contractAddress.smg);
const createGpkSc = wanchain.getContract('CreateGpk', config.contractAddress.createGpk);

recoverProcess();

listenEvent();

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
  let evtTracker = new EventTracker(id, 'WAN', eventHandler, false, config.startBlock);
  evtTracker.subscribe('smg_selectedEvent', config.contractAddress.smg, ["0x62487e9f333516e24026d78ce371e54c664a46271dcf5ffdafd8cd10ea75a5bf"]);
  evtTracker.subscribe('gpk_GpkCreatedLogger', config.contractAddress.createGpk, ["0x69d133e4261cdee685003e1e0520673a36ed3a627535ab05398fa1f9b958bf3a"]);
  evtTracker.subscribe('gpk_SlashLogger', config.contractAddress.createGpk, ["0x3e163d68525f48f0d33c6b6634b51d751200c03e44a61daf4c7636e67ff8f525"]);
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
  // console.log("agent get group: %O", info);
  let round = info[0], status = info[1];
  if ((status == GroupStatus.PolyCommit) && checkSelfSelected(groupId)) {
    if ((!group) || (group.round < round)) {
      let newRound = new Round(groupId, round);
      groupMap.set(groupId, newRound);
      await newRound.start();
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
  console.log("%s group %s slash someone", new Date().toISOString(), groupId);
  console.log("slash evt: %O", evt);
}

async function checkSelfSelected(groupId) {
    let info = await smgSc.methods.getSmInfo(groupId, wanchain.selfAddress);
    return (info[3] == true); // isWorking
}