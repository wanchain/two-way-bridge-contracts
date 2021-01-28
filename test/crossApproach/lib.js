const { assert }                = require('chai');

function parseEventsBy(receipt, expectedEvents, filterByName) {
  let events = new Array();

  receipt.logs.forEach(function(logEntry) {
      let expectedEntry = expectedEvents.find(function(evt) {
          return (evt.event === logEntry.event)
      });

      // When filtering, ignore events that are not expected
      if ((! filterByName) || expectedEntry) {
          // Event name
          let event = {
              event: logEntry.event
          };

          // Event arguments
          // Ignore the arguments when they are not tested
          // (ie. expectedEntry.args is undefined)
          if ((! expectedEntry) || (expectedEntry && expectedEntry.args)) {
              event.args = Object.keys(logEntry.args).reduce(function(previous, current) {
                  previous[current] =
                      (typeof logEntry.args[current].toNumber === 'function')
                          ? logEntry.args[current].toString()
                          : logEntry.args[current];
                  // console.log("previous:", previous);
                  return previous;
              }, {});
          }
          // console.log("parseEventsBy:", event);
          events.push(event);
      }
  });

  return events;
}

function testInit() {
    if (typeof assert !== 'undefined') {
        assert.getWeb3Log = function(receipt, expectedEvent) {
            let entries = receipt.logs.filter(log => log.event === expectedEvent.event);
            if(!entries.length){
                assert.fail("Not get the expected event: event is null");
            }
            let entry = entries[0];
            assert.equal(entry.event, expectedEvent.event);
            return entry;
        };

        assert.checkWeb3Event = function(receipt, expectedEvent, message) {
            // console.log("======checkWeb3Event receipt", receipt, receipt.logs);
            // console.log("======checkWeb3Event expectedEvent", expectedEvent);
            let events = parseEventsBy(receipt, [expectedEvent], true);
            let entry = events[0];
            if(entry == null){
                assert.fail("Not get the expected event: event is null");
            }

            // console.log("parsed event", entry);
            assert.equal(entry.event, expectedEvent.event);
            let expectArgs = expectedEvent.args;
            let entryArgs = entry.args;
            let needKeys = Object.keys(expectArgs);
            for(let key of needKeys){
              if (typeof(expectArgs[key]) === "string" && typeof(entryArgs[key]) === "string") {
                expectArgs[key] = expectArgs[key].toLowerCase();
                entryArgs[key] = entryArgs[key].toLowerCase();
              }
              if(expectArgs[key] != entryArgs[key]){
                  assert.fail("Not get the expected event args: " + key);
                  break;
              }
            }
        };
    }
}

function getEventSignature(abi) {
  let knownEvents = {};
  abi.forEach(item => {
    if (item.type === "event") {
      let eventString = `${item.name}()`;
      let argvType = item.inputs.map(one => one.type);
      if (argvType.length) {
          eventString = `${item.name}(${argvType.join(",")})`
      }
      let eventSignature = web3.utils.keccak256(eventString);
      knownEvents[eventSignature] = {
        eventString: eventString,
        abiEntry: item
      };
    }
  });
  return knownEvents;
}

async function getTxParsedLogs(knownEvents, txHash) {
  let logs = [];
  let receipt = await web3.eth.getTransactionReceipt(txHash);
  receipt.logs.filter((log) => {
    if (!knownEvents[log.topics[0]]) {
      return;
    }
    let inputs = knownEvents[log.topics[0]].abiEntry.inputs;
    logs.push({
      event: knownEvents[log.topics[0]].abiEntry.name,
      args: web3.eth.abi.decodeLog(inputs, log.data, log.topics.slice(1))
    });
  });
  return logs;
}

module.exports = {
    assert,
    testInit,
    getEventSignature,
    getTxParsedLogs
};
