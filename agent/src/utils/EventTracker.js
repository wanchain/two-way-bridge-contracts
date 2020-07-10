const config = require('../../cfg/config');
const wanchain = require('./wanchain');
const tool = require('./tools');
const mongoose = require('mongoose');
const Event = require('../../db/models/event');

class EventTracker {
  constructor(id, cb, isSave, startBlock, interval = 1, chain = 'WAN', confirmBlocks = 30) {
    // context
    this.id = id;
    this.contextName = id + '_eventTracker';
    this.cb = cb || null;
    this.isSave = isSave || false;
    this.startBlock = startBlock || 0;
    interval = (interval > 10) ? 10 : interval; // 1-10 minute
    this.schInterval = interval * 60 * 1000;
    this.schThreshold = interval * 6;
    this.schBatchSize = interval * 360; // 30 times
    this.chain = chain;
    this.confirmBlocks = confirmBlocks;
    this.toStop = false;
    this.subscribeMap = new Map(); // name => {address, topics}
    this.subscribeArray = [];
    this.eventList = [];
  }

  subscribe(name, scAddress, topics) {
    this.subscribeMap.set(name, {address: scAddress, topics: topics});
    this.subscribeArray = Array.from(this.subscribeMap);
  }

  async start() {
    try {
      // connect db
      await mongoose.connect(config.dbUrl(), config.dbOptions);
      console.log('database connected');

      // get block number, ctxBlock > inputBlock > curBlock
      let cxt = await tool.readContextDb(this.contextName);
      if (cxt) {
        let cxtBlock = parseInt(cxt.nextBlock);
        if (cxtBlock > this.startBlock) {
          this.startBlock = cxtBlock;
        }
      }
      if (!this.startBlock) {
        this.startBlock = await wanchain.getBlockNumber() - this.confirmBlocks;
      }
      console.log("%s EventTracker start from block %d", this.id, this.startBlock);
      
      // schedual
      this.next(this.schThreshold + 1); // delay to schedual
    } catch (err) {
      console.error(err);
    }
  }

  stop() {
    this.toStop = true;
  }

  async mainLoop() {
    let eventArray = [];
    try {
      let latestBlock = await wanchain.getBlockNumber() - this.confirmBlocks;
      if (this.startBlock > latestBlock) {
        return this.next();
      }
      let endBlock = this.startBlock + this.schBatchSize - 1;
      if (endBlock > latestBlock) {
        endBlock = latestBlock;
      }
      console.log("%s eventTracker scan block %d-%d", this.id, this.startBlock, endBlock);
      await Promise.all(this.subscribeArray.map(sub => {
        return new Promise((resolve, reject) => {
          wanchain.getEvents({
            address: sub[1].address,
            topics: sub[1].topics,
            fromBlock: this.startBlock,
            toBlock: endBlock
          }).then((events) => {
            events.forEach((evt) => {
              evt.name = sub[0];
              evt.cb = this.cb;
              eventArray.push(evt);              
            })
            resolve();
          }).catch((err) => {
            console.error("%s eventTracker fetch event %s from block %d-%d error: %O", this.id, sub[0], this.startBlock, endBlock, err);
            reject(err);
          })
        });
      }));
      // console.log("%s eventTracker fetched %d event from block %d-%d", this.id, eventArray.length, this.startBlock, endBlock);
      this.startBlock = endBlock + 1;
      if (eventArray.length) {
        eventArray.sort(this.sortLog);
        this.eventList = this.eventList.concat(eventArray);
      }

      await this.dispatch();

      let nextBlock = this.eventList.length? this.eventList[0].blockNumber : this.startBlock;
      await tool.writeContextDb(this.contextName, {nextBlock});
      this.next(latestBlock - endBlock);
    } catch (err) {
      console.error("%s evevtTracker loop error: %O", this.id, err);
      this.next();
    }
  }

  async dispatch() {
    if (this.eventList.length == 0) {
      // console.log("dispatchEvent finished");
      return;
    }
    let event = this.eventList[0];
    // invoke callback
    let result;
    if (event.cb) {
      result = await event.cb(event);
      if (typeof(result) == 'object') {
        event.parsed = result || null;
        result = true;
      }
    } else {
      event.parsed = null;
      result = true;
    }
    if (result) {
      event.cb = null;
      // save event
      if (this.isSave) {
        let filter = {tracker: this.id, name: event.name, chain: this.chain, blockNumber: event.blockNumber, txIndex: event.transactionIndex, logIndex: event.logIndex};
        let update = Object.assign({}, filter, {txHash: event.transactionHash, topics: event.topics, data: event.data, parsed: event.parsed});
        result = await Event.updateOne(filter, update, {upsert: true}); // { n: 1, nModified: 0, ok: 1 }
      } else {
        result = {ok: 1};
      }
      if (result.ok) {
        this.eventList.splice(0, 1);
        return await this.dispatch();
      }
    }
    console.log("dispatch event error: %O", event);
  }

  next(blockLeft = 0) {
    if (this.toStop) {
      mongoose.disconnect();
      return;
    }
    let interval = this.schInterval;
    if (blockLeft > this.schThreshold) {
      interval /= 60;
    }
    setTimeout(() => {
      this.mainLoop();
    }, interval);
  }

  sortLog(a, b) {
    if (a.blockNumber != a.blockNumber) {
      return (a.blockNumber - b.blockNumber);
    }
    if (a.transactionIndex != a.transactionIndex) {
      return (a.transactionIndex - b.transactionIndex);
    }
    return (a.logIndex - b.logIndex);
  }
}

module.exports = EventTracker;