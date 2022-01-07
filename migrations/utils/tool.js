const fs = require("fs");
const path = require("path");
const {
  operationDict,
  chainDict,
  networkDict,
  networks,
  defaultGas,
  ADDRESS_0,
  contractLoad,
  actionDict,
  deployScript,
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
  if (!Object.keys(networkDict).includes(network)) {
    throw new Error(`invalid network: ${network}`);
  }

  return networkDict[network];
}

function getProxyDelegate(string) {
  return string.replace(/(.*)Proxy/, "$1Delegate")
}

function getAllRegExp() {
  return [
    {regExp:/^contractV[0-9]*$/, replaceExp:/^contractV/},
    {regExp:/^wanchain_sc_deployV[0-9]*$/, replaceExp:/^wanchain_sc_deployV/},
    {regExp:/^wanchain_sc_updateV[0-9]*$/, replaceExp:/^wanchain_sc_updateV/},
  ];
}

function isQualifiedRegExp(fileName) {
  let fileParsed = path.parse(fileName);

  let totalRegExp = getAllRegExp();
  for (let item of totalRegExp) {
    if (item.regExp.test(fileParsed.name)) {
      return true;
    }
  }

  return false;
}

function getVersionNumber(contractName) {
  let totalRegExp = getAllRegExp();
  for (let item of totalRegExp) {
    if (item.regExp.test(contractName)) {
      return Number(contractName.replace(item.replaceExp, ""));
    }
  }
  throw new Error(`invalid contract config name ${contractName}`);
}

function skipContract(string) {
  return string.includes("Delegate");
}

function getWorkspace(action, type, root, version) {
  const dirPath = path.join(root, type.toLowerCase());

  let result = {}
  let selectedContract = contractLoad;
  let selectedAction = getScScript(action);
  let contractLoadParsed = path.parse(contractLoad); // { root: '/', dir: '/a/b', base: 'c.js', ext: '.js', name: 'c' }
  let actionLoadParsed = path.parse(getScScript(action)); // { root: '/', dir: '/a/b', base: 'c.js', ext: '.js', name: 'c' }

  if (typeof(version) !== "undefined") {
    // specify contract version
    contractLoadParsed.name = `${contractLoadParsed.name}${version}`;
    contractLoadParsed.base = `${contractLoadParsed.name}${contractLoadParsed.ext}`;
    selectedContract = path.format(contractLoadParsed);
    // specify action version
    actionLoadParsed.name = `${actionLoadParsed.name}${version}`;
    actionLoadParsed.base = `${actionLoadParsed.name}${actionLoadParsed.ext}`;
    selectedAction = path.format(actionLoadParsed);
  } else if (type === operationDict.MODEL) {
    const files = fs.readdirSync(dirPath);
    let versionNumberDict = {};
    for (let file of files) {
      if (!versionNumberDict[file]) {
        versionNumberDict[file] = 1;
      }
      if (isQualifiedRegExp(file)) {
        let currVersionNumber = getVersionNumber(path.parse(file).name);
        if (currVersionNumber > versionNumberDict[file]) {
          versionNumberDict[file] = currVersionNumber;
          if (file.includes(contractLoadParsed.name)) {
            selectedContract = file;
          } else if (file.includes(actionLoadParsed.name)) {
            selectedAction = file;
          }
        }
      }
    }
  }

  result["contract"] = path.join(root, type.toLowerCase(), selectedContract);
  result[action] = path.join(root, type.toLowerCase(), selectedAction);
  return result;
}

function getScScript(action) {
  let script;
  switch (actionDict[action]) {
    case actionDict.deploy: {
      script = deployScript.wanchainSc;
      break;
    }
    case actionDict.update: {
      script = deployScript.wanchainScUpdate;
      break;
    }
    default: {
      throw new Error(`not support action ${action}`);
    }
  }
  return script
}

function parseScArgs() {
  const optimist = require('optimist');
  let argv = optimist
  .usage("Usage: nodejs $0 --network [network] --nodeURL [nodeURL] --ownerPk [ownerPrivateKey] --adminPk [adminPrivateKey] --mnemonic [mnemonic] --ownerIdx [ownerIdx] --adminIdx [adminIdx] --gasPrice [gasPrice] --gasLimit [gasLimit] --outputDir[outputDir]")
  .alias('h', 'help')
  .describe('h', 'display the usage')
  .describe('network', `identify chain network, support ${networks}, mainnet means Wanchain mainnet, testnet means Wanchain testnet`)
  .describe('action', `identify action, support ${Object.keys(actionDict)}, prepare means prepare the environment for network, deploy means deploy contracts for network, update means update contracts for network`)
  .describe('nodeURL', `identify node url`)
  .describe('gasPrice', `identify gasPrice, using ${defaultGas.gasPrice} as default`)
  .describe('gasLimit', `identify gasLimit, using ${defaultGas.gasLimit} as default`)
  .describe('mnemonic', `identify mnemonic`)
  .describe('ownerIdx', `identify owner index in the hd wallet, start with 0, using mix "--mnemonic" and "--ownerIdx"`)
  .describe('adminIdxCross', `identify admin index of cross contract in the hd wallet, start with 0, using mix "--mnemonic" and "--adminIdxCross"`)
  .describe('adminIdxOracle', `identify admin index of oracle contract in the hd wallet, start with 0, using mix "--mnemonic" and "--adminIdxOracle"`)
  .describe('adminIdxSmg', `identify admin index of storeman contract in the hd wallet, start with 0, using mix "--mnemonic" and "--adminIdxSmg"`)
  .describe('ownerPk', `identify owner private key`)
  .describe('adminPkCross', `identify admin of cross contract private key`)
  .describe('adminPkOracle', `identify admin of oracle contract private key`)
  .describe('adminPkSmg', `identify admin of storeman contract private key`)
  .describe('adminCross', `identify admin of cross contract address`)
  .describe('adminOracle', `identify admin of oracle contract address`)
  .describe('adminSmg', `identify admin of storeman contract address`)
  .describe('foundation', `identify foundation address`)
  .describe('outputDir', `identify the output absolute directory`)
  .default('gasPrice', defaultGas.gasPrice)
  .default('gasLimit', defaultGas.gasLimit)
  .default('foundation', ADDRESS_0)
  .default('outputDir', path.join("deployed"))
  .string(["network", "action", "nodeURL", "mnemonic", "ownerPk", "adminPkCross", "adminPkOracle", "adminPkSmg", "adminCross", "adminOracle", "adminSmg", "foundation", "outputDir"])
  .demand(["network", "action"])
  .argv;

  if (argv.help) {
    optimist.showHelp();
    process.exit(0);
  }
  return argv;
}

function parseOwnerArgs() {
  const optimist = require('optimist');
  let argv = optimist
  // .usage("Usage: nodejs $0 --network [network] --nodeURL [nodeURL] --address [address] --ownerPk [ownerPrivateKey] --mnemonic [mnemonic] --ownerIdx [ownerIdx] --gasPrice [gasPrice] --gasLimit [gasLimit] --inputDir[inputDir] --skipDelegate [skipDelegate] --leave [leave]")
  .usage("Usage: nodejs $0 --network [network] --nodeURL [nodeURL] --address [address] --ownerPk [ownerPrivateKey] --mnemonic [mnemonic] --ownerIdx [ownerIdx] --gasPrice [gasPrice] --gasLimit [gasLimit] --inputDir[inputDir] --skipDelegate [skipDelegate]")
  .alias('h', 'help')
  .describe('h', 'display the usage')
  .describe('network', `identify chain network, support ${networks}, mainnet means Wanchain mainnet, testnet means Wanchain testnet`)
  .describe('nodeURL', `identify node url`)
  .describe('gasPrice', `identify gasPrice, using ${defaultGas.gasPrice} as default`)
  .describe('gasLimit', `identify gasLimit, using ${defaultGas.gasLimit} as default`)
  .describe('address', `identify new owner address`)
  .describe('mnemonic', `identify mnemonic`)
  .describe('ownerIdx', `identify owner index in the hd wallet, start with 0, using mix "--mnemonic" and "--ownerIdx"`)
  .describe('ownerPk', `identify owner private key`)
  .describe('inputDir', `identify the intput absolute directory`)
  .describe('skipDelegate', `identify if skip the delegate contract`)
  // .describe('leave', `identify if set owner to ${ADDRESS_0}`)
  .default('skipDelegate', false)
  // .default('leave', false)
  .default('gasPrice', defaultGas.gasPrice)
  .default('gasLimit', defaultGas.gasLimit)
  .default('inputDir', path.join("deployed"))
  .string(["network", "nodeURL", "address", "mnemonic", "ownerPk", "inputDir"])
  .boolean(['skipDelegate', 'leave'])
  .demand(['network'])
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

const showTxInfo = (receipt, name = "") => {
  console.log("");
  let title = `Sending transaction to contract ${name}`;
  console.log("   %s", title);
  console.log("   %s", new Array(title.length).join('-'));
  console.log("   > transaction hash:    %s", receipt.transactionHash);
  console.log("   > contract address:    %s", receipt.to);
  console.log("   > block number:        %d", receipt.blockNumber);
  console.log("   > sender:              %s", receipt.from);
  console.log("   > gas used:            %d", receipt.gasUsed);
  console.log("   > status:              %s", receipt.status);
}

module.exports = {
  mkdir,
  exit,
  parseNetwork,
  getProxyDelegate,
  skipContract,
  getWorkspace,
  parseScArgs,
  parseOwnerArgs,
  hideObject,
  showTxInfo
};
