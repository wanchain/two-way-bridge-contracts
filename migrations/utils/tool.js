const fs = require("fs");
const path = require("path");
const {
  chainDict,
  networkDict,
  networks
} = require("./config");

function mkdir(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdir(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}

function exit(error) {
  console.log(error);
  console.log(`Abort...`);
  process.exit();
}

function parseNetwork(network) {
  let chainType = chainDict.WAN;
  let isMainnet = false;
  if (network !== networkDict.mainnet && network !== networkDict.testnet) {
    chainType = chainDict.ETH;
  }
  if (network !== networkDict.mainnet || network !== networkDict.ethereum) {
    isMainnet = true;
  }
  return {
    chainType: chainType,
    isMainnet: isMainnet
  };
}

function getProxyDelegate(string) {
  return string.replace(/(.*)Proxy/, "$1Delegate")
}

function getWorkspace(root, contractLoad, deployScriptFileName) {
  const workspace = {
    WAN: {
      contract: path.join(root, chainDict.WAN.toLowerCase(), contractLoad),
      deploy: path.join(root, chainDict.WAN.toLowerCase(), deployScriptFileName)
    },
    ETH: {
      contract: path.join(root, chainDict.ETH.toLowerCase(), contractLoad),
      deploy: path.join(root, chainDict.ETH.toLowerCase(), deployScriptFileName)
    },
    ETC: {
      contract: path.join(root, chainDict.ETC.toLowerCase(), contractLoad),
      deploy: path.join(root, chainDict.ETC.toLowerCase(), deployScriptFileName)
    },
    EOS: {
      contract: path.join(root, chainDict.EOS.toLowerCase(), contractLoad),
      deploy: path.join(root, chainDict.EOS.toLowerCase(), deployScriptFileName)
    },
    TEST: {
      contract: path.join(root, chainDict.TEST.toLowerCase(), contractLoad),
      deploy: path.join(root, chainDict.TEST.toLowerCase(), deployScriptFileName)
    },
  }
  return workspace;
}

function parseScArgs () {
  const optimist = require('optimist');
  let argv = optimist
  .usage("Usage: nodejs $0 --network [network] --nodeURL [nodeURL] --ownerPk [ownerPrivateKey] --adminPk [adminPrivateKey] --mnemonic [mnemonic] --ownerIdx [ownerIdx] --adminIdx [adminIdx] --gasPrice [gasPrice] --gasLimit [gasLimit] --outputDir[outputDir]")
  .alias('h', 'help')
  .describe('h', 'display the usage')
  .describe('network', `identify chain network, support ${networks}, mainnet means Wanchain mainnet, testnet means Wanchain testnet`)
  .describe('nodeURL', `identify node url`)
  .describe('gasPrice', `identify gasPrice, using "10000000000" as default`)
  .describe('gasLimit', `identify gasLimit, using "8000000" as default`)
  .describe('mnemonic', `identify mnemonic`)
  .describe('ownerIdx', `identify owner index in the hd wallet, start with 0, using mix "--mnemonic" and "--ownerIdx"`)
  .describe('adminIdx', `identify admin index in the hd wallet, start with 0, using mix "--mnemonic" and "--adminIdx"`)
  .describe('ownerPk', `identify owner private key`)
  .describe('adminPk', `identify admin private key`)
  .describe('outputDir', `identify the output absolute directory`)
  .default('gasPrice', 10000000000)
  .default('gasLimit', 8000000)
  .default('outputDir', path.join("deployed"))
  .argv;

  if (argv.help) {
    optimist.showHelp();
    process.exit(0);
  }
  return argv;
}

function hideObject(obj, keys = [], hide = "******") {
  let showObj = {...obj};
  keys.forEach(key => {
    if (showObj.hasOwnProperty(key)) {
      showObj[key] = hide;
    }
  });
  return showObj;
}

module.exports = {
  mkdir,
  exit,
  parseNetwork,
  getProxyDelegate,
  getWorkspace,
  parseScArgs,
  hideObject
};