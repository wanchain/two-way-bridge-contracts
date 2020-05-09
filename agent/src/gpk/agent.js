const Web3 = require('web3');
const config = require('../../cfg/config');
const GpkGroup = require('./Group');
const EventTracker = require('../utils/EventTracker');
const wanchain = require('../utils/wanchain');

console.log("open storeman gpk agent");

const evtTracker = new EventTracker('gpk', 6320300, gpkEvtHandler);
evtTracker.subscribe('wandora', '0x73a99a82f1b95bfd55a5820a7342758ceca80b33', ["0x10c53ecd69edb1ebf570440ffdc3bb14b8d0ad4297cbde535c88d316164653ae"]);
evtTracker.start();

function gpkEvtHandler(evt) {
  console.log("receive evt: %O", evt);
  return true;
}

// gpk();

async function gpk() {
  let group = new GpkGroup('test');
  group.init();
}
