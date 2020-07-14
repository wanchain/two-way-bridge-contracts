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
  evtTracker.subscribe('gpk_allLogger', config.contractAddress.createGpk, []);
  evtTracker.start();
}

async function eventHandler(evt) {
  // console.log("receive evt: %O", evt);
  let result = true;
  try {
    switch (evt.name) {
      case 'smg_selectedEvent':
        await procSmgSelectedEvent(evt);
        break;
      case 'gpk_allLogger':
        result = await proGpkEvent(evt);
      default:
        break;
    }
    return result;
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

/* gpk events
0xc6f45cd047a68b8716e2c5e49de0314eab364e95ebef0b45a840e580fc8b230c : SetPolyCommitLogger(bytes32,uint8,uint8,address)
0x5fb9a70773d6d58e9bcb9b3c369db4c2bce4cf675fde3211c941b4d681545213 : SetEncSijLogger(bytes32,uint8,uint8,address,address)
0xe2d8602a29669869ebf00288b0c32207211d4dab0cc432ebd369d024bb5bc680 : SetCheckStatusLogger(bytes32,uint8,uint8,address,address,bool)
0x69e7603471915a044e5f668c81fcc79f58eaf2dfc977978fb0a1b8bfdc1760a8 : RevealSijLogger(bytes32,uint8,uint8,address,address)
0x2e793a95012b45cc0d04ab8579c7ea491b2153f808fa8e4fc8dadf0fb88c5f2c : GpkCreatedLogger(bytes32,bytes,bytes)
0x55a838f0e5dda7c3de54baf9c24a1d73c2c17849295e268ce5b0b7dde1d28266 : SlashLogger(bytes32,uint8,uint8,uint8,address,address,bool)
0x05965810523ac64b8d0831d42cc849f23ea3438450561887aad3c4b7687e78db : ResetLogger(bytes32,uint8)
*/

async function proGpkEvent(evt) {
  let result = true;
  let type = evt.topics[0];
  switch (type) {
    case '0x2e793a95012b45cc0d04ab8579c7ea491b2153f808fa8e4fc8dadf0fb88c5f2c': // GpkCreatedLogger
      procGpkCreatedLogger(evt);
      break;
    case '0x55a838f0e5dda7c3de54baf9c24a1d73c2c17849295e268ce5b0b7dde1d28266': // SlashLogger
      procGpkSlashLogger(evt);
      break;
    case '0x05965810523ac64b8d0831d42cc849f23ea3438450561887aad3c4b7687e78db': // ResetLogger
      await procSmgSelectedEvent(evt);
      break;
    default:
      result = procGpkNegotiateEvent(evt);
      break;
  }
  return result;
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

const gpkNegotiateEvents = new Map([
  ['0xc6f45cd047a68b8716e2c5e49de0314eab364e95ebef0b45a840e580fc8b230c', 'SetPolyCommitLogger'],
  ['0x5fb9a70773d6d58e9bcb9b3c369db4c2bce4cf675fde3211c941b4d681545213', 'SetEncSijLogger'],
  ['0xe2d8602a29669869ebf00288b0c32207211d4dab0cc432ebd369d024bb5bc680', 'SetCheckStatusLogger'],
  ['0x69e7603471915a044e5f668c81fcc79f58eaf2dfc977978fb0a1b8bfdc1760a8', 'RevealSijLogger']
])

function procGpkNegotiateEvent(evt) {
  // only parse event
  return wanchain.parseEvent('CreateGpk', gpkNegotiateEvents.get(evt.topics[0]), evt);
}

module.exports = {
  run
};