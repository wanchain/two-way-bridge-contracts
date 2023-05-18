const fs = require("fs");
const path = require("path");

const Contract = require("./utils/contract");
const {
  operationDict,
  actionDict,
  networks,
  defaultArgv,
  bipChainIdDict,
  hideKeys
} = require("./utils/config");
const {
  mkdir,
  exit,
  parseNetwork,
  getProxyDelegate,
  getWorkspace,
  hideObject
} = require("./utils/tool");

async function deploy(argv) {
  let error;
  let ownerPrivateKey;
  let adminCrossPrivateKey;
  let adminOraclePrivateKey;
  let adminSmgPrivateKey;
  let deployedPath;

  if (!networks.includes(argv.network)) {
    error = `Invalid network ${argv.network}`;
    throw new Error(error);
  }
  argv.name = argv.network;
  argv.network = defaultArgv[argv.name].network;
  argv = Object.assign({}, defaultArgv[argv.name], argv);

  if (!actionDict[argv.action]) {
    error = `Invalid action ${argv.action}`;
    throw new Error(error);
  }

  const {chainType, isMainnet} = parseNetwork(argv.name);

  if (actionDict[argv.action] === actionDict.prepare) {
    return prepareEnvironment(chainType, argv.version);
  }

  if (!argv.nodeURL) {
    error = `Invalid nodeURL ${argv.nodeURL}`;
    throw new Error(error);
  }
  if (!argv.ownerPk && (!argv.mnemonic || Number.isNaN(Number(argv.ownerIdx)))) {
    error = `Need identify ownerPk or (mnemonic and ownerIdx)`;
    throw new Error(error);
  }

  if (!path.isAbsolute(argv.outputDir)) {
    deployedPath = path.join(__dirname, argv.outputDir);
  } else {
    deployedPath = argv.outputDir;
  }
  mkdir(deployedPath);

  if (argv.ownerPk) {
    ownerPrivateKey = argv.ownerPk;
  } else {
    ownerPrivateKey = Contract.exportPrivateKey(argv.mnemonic, Contract.getChainIndex(chainType), argv.ownerIdx).toString("hex");
  }
  // console.log("owner privateKey", ownerPrivateKey);
  if (argv.adminPkCross) {
    adminCrossPrivateKey = argv.adminPkCross;
  }
  if (argv.adminPkOracle) {
    adminOraclePrivateKey = argv.adminPkOracle;
  }
  if (argv.adminPkSmg) {
    adminSmgPrivateKey = argv.adminPkSmg;
  }
  if (argv.mnemonic) {
    if (typeof(argv.adminIdxCross) !== "undefined") {
      adminCrossPrivateKey = Contract.exportPrivateKey(argv.mnemonic, Contract.getChainIndex(chainType), argv.adminIdxCross).toString("hex");
    }
    if (typeof(argv.adminIdxOracle) !== "undefined") {
      adminOraclePrivateKey = Contract.exportPrivateKey(argv.mnemonic, Contract.getChainIndex(chainType), argv.adminIdxOracle).toString("hex");
    }
    if (typeof(argv.adminIdxSmg) !== "undefined") {
      adminSmgPrivateKey = Contract.exportPrivateKey(argv.mnemonic, Contract.getChainIndex(chainType), argv.adminIdxSmg).toString("hex");
    }
  }

  let cfg = {
    ...argv,
    privateKey: ownerPrivateKey,
    adminCrossPrivateKey: adminCrossPrivateKey,
    adminOraclePrivateKey: adminOraclePrivateKey,
    adminSmgPrivateKey: adminSmgPrivateKey,

    contractDir: path.join(__dirname, "..", 'contracts'),
    outputDir: path.join(__dirname, "..", 'build', 'sc-contracts'),
    gasPrice: Number(argv.gasPrice),
    gasLimit: Number(argv.gasLimit)
  };
  console.log("cfg", hideObject(cfg, hideKeys));

  const workspace = getWorkspace(actionDict[argv.action], chainType, __dirname);
  console.log("run", workspace[actionDict[argv.action]]);

  const {deploy} = require(workspace[actionDict[argv.action]]);
  let contractDict = await deploy(cfg, isMainnet, {
    chainType: chainType,
    bipChainID:bipChainIdDict[chainType]
  });

  let deployed = {};
  for (let contract in contractDict.address) {
    let abiName;
    let abiContract = getProxyDelegate(contract);
    if (contractDict.abi[abiContract]) {
      abiName = `abi.${abiContract}.json`;
      fs.writeFileSync(path.join(deployedPath, abiName), JSON.stringify(contractDict.abi[abiContract]), {flag: 'w', encoding: 'utf8', mode: '0666'});
    }
    deployed[contract] = { address: contractDict.address[contract] };
    if (abiName) {
      deployed[contract].abi = abiName;
    }
  }

  if (Object.keys(deployed).length > 0) {
    // merge
    const outputFile = path.join(deployedPath,`${argv.name}.json`);
    if (fs.existsSync(outputFile)) {
      const preDeployed = require(outputFile);
      for (let key in preDeployed) {
        if (!deployed[key]) {
          deployed[key] = preDeployed[key];
        }
      }
    }
    fs.writeFileSync(outputFile, JSON.stringify(deployed, null, 5), {flag: 'w', encoding: 'utf8', mode: '0666'});
    console.log("output", outputFile);
  }
}

function prepareEnvironment(chainType, version) {
  const modelWorkspace = [
    getWorkspace(actionDict.update, operationDict.MODEL, __dirname, version),
    getWorkspace(actionDict.deploy, operationDict.MODEL, __dirname, version)
  ].reduce((reduced, next) => {
    for (let key in next) {
      if (!reduced[key]) {
        reduced[key] = next[key];
      }
    }
    return reduced;
  }, {});
  // workspace: {contract: '/a/b/c/d.js', deploy: '/a/b/c/e.js', update: '/a/b/c/f.js'}
  const destWorkspace = [
    getWorkspace(actionDict.update, chainType, __dirname),
    getWorkspace(actionDict.deploy, chainType, __dirname)
  ].reduce((reduced, next) => {
    for (let key in next) {
      if (!reduced[key]) {
        reduced[key] = next[key];
      }
    }
    return reduced;
  }, {});

  console.log("modelWorkspace:", modelWorkspace)
  for (let key in destWorkspace) {
    const dirPath = path.dirname(destWorkspace[key]);
    if (!fs.existsSync(path.dirname(destWorkspace[key]))) {
      mkdir(dirPath);
    }

    if (!fs.existsSync(destWorkspace[key])) {
      fs.copyFileSync(modelWorkspace[key], destWorkspace[key]);
      console.log(`copy ${modelWorkspace[key]} to ${destWorkspace[key]}`);
    }
  }
  console.log(chainType, destWorkspace, "environment is ready");
}

module.exports = deploy;
