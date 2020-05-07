const Web3 = require('web3');
const config = require('../../cfg/config');
const GpkGroup = require('./Group');

const web3 = new Web3(new Web3.providers.HttpProvider(config.wanNodeURL));

console.log("open storeman gpk agent");

function exit(blockLeft = 0) {
  let schInterval = 300000; // default 5min
  if (blockLeft > 30) {
    schInterval = 3000;
  }

  dbcc.setContext(processName, {blockNumber: lastBlockNumber}, () => {
    lock.remove(() => {
      setTimeout(() => {
        sync_main();
      }, schInterval);
    });
  });
}

function sync_main() {
  lock.isLocked(isLocked => {
    if (isLocked) {
      console.log('script already running');
      iwan.close();
      mongoose.disconnect();
      return process.exit(0);
    }

    lock.create(() => {
      iwan.getBlockNumber('WAN', (err, latestBlock) => {
        if (err) {
          console.error(err);
          return exit();
        }
        dbcc.getContext(processName, true, (err, value) => {
          if (value && (lastBlockNumber == -1)) {
            lastBlockNumber = value.blockNumber;
          }
          processBlocks(latestBlock);
        });
      });
    });
  })
}

async function processBlocks(latestBlock) {
  // get new cc txs
  let startBlock = lastBlockNumber + 1;
  let endBlock = startBlock + count - 1;
  if (endBlock > latestBlock) {
    endBlock = latestBlock;
  }

  try {
    let addrSet = await getEventsAddr(startBlock, endBlock);
    let balances = await syncLib.get_balances(Array.from(addrSet));
    // console.log("balances: %O", balances);
    dbpos.saveBalance(balances, (err) => {
      if (err) {
        console.error(err);
        return exit();
      } else {
        lastBlockNumber = endBlock;
        return exit(latestBlock - endBlock);
      }
    })
  } catch (err) {
    return exit();
  }
}

// gpk();

async function gpk() {
  let group = new GpkGroup('test');
  group.init();
}
