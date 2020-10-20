const fs = require("fs");
const path = require("path");

const Contract = require("./utils/contract");
const {
  contractLoad,
  wanchainScScript,
  chainDict,
  networks
} = require("./utils/config");
const {
  mkdir,
  exit,
  parseNetwork,
  getProxyDelegate,
  getWorkspace,
  hideObject
} = require("./utils/tool");

const defaultScCfg = {
  network: 'mainnet',
  nodeURL: 'http://geth-testnet.wandevs.org:36892',
  mnemonic: '',
  ownerIdx: undefined,
  adminIdx: undefined,
  ownerPk: '',
  adminPk: '',
  gasPrice: 180000000000,
  gasLimit: 8000000,
  outputDir:''
}

async function deploy(argv) {
  let error;
  let ownerPrivateKey;
  let adminPrivateKey;
  let deployedPath;

  argv = Object.assign({}, defaultScCfg, argv);
  if (!networks.includes(argv.network)) {
    error = `Invalid network ${argv.network}`;
  }
  if (!argv.nodeURL) {
    error = `Invalid nodeURL ${argv.nodeURL}`;
  }
  if (!argv.ownerPk && (!argv.mnemonic || typeof(argv.ownerIdx) === "undefined")) {
    error = `Need identify ownerPk or (mnemonic and ownerIdx)`;
  }

  const {chainType, isMainnet} = parseNetwork(argv.network);
  if (chainType === chainDict.WAN) {
    if (!argv.adminPk && (!argv.mnemonic || typeof(argv.adminIdx) === "undefined")) {
      error = `Need identify adminPk or (mnemonic and adminIdx)`;
    }
  }
  if (error) {
    exit(error);
  }

  if (argv.ownerPk) {
    ownerPrivateKey = argv.ownerPk;
  } else {
    ownerPrivateKey = Contract.exportPrivateKey(argv.mnemonic, Contract.getChainIndex(chainType), argv.ownerIdx).toString("hex");
  }
  // console.log("owner privateKey", ownerPrivateKey);
  if (argv.adminPk) {
    adminPrivateKey = argv.adminPk;
  } else if (argv.mnemonic && typeof(argv.adminIdx) !== "undefined") {
    adminPrivateKey = Contract.exportPrivateKey(argv.mnemonic, Contract.getChainIndex(chainType), argv.adminIdx).toString("hex");
  }
  // console.log("admin privateKey", adminPrivateKey);

  let cfg = {
    network: argv.network, // 'mainnet' or 'testnet' or 'ethereum' or 'rinkeby'
    nodeURL: argv.nodeURL,
    privateKey: ownerPrivateKey,
    adminPrivateKey: adminPrivateKey,

    contractDir: path.join(__dirname, "..", 'contracts'),
    outputDir: path.join(__dirname, "..", 'build', 'sc-contracts'),
    gasPrice: Number(argv.gasPrice),
    gasLimit: Number(argv.gasLimit)
  }
  console.log("cfg", hideObject(cfg, ["privateKey", "adminPrivateKey"]));

  const workspace = getWorkspace(__dirname, contractLoad, wanchainScScript);
  console.log("run", workspace[chainType].deploy);

  const {deploy} = require(workspace[chainType].deploy);
  let contractDict = await deploy(cfg, isMainnet);

  if (!path.isAbsolute(argv.outputDir)) {
    deployedPath = path.join(__dirname, argv.outputDir);
  } else {
    deployedPath = argv.outputDir;
  }
  mkdir(deployedPath);
  console.log("deployed path", deployedPath);


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

  fs.writeFileSync(path.join(deployedPath,`${argv.network}.json`), JSON.stringify(deployed, null, 5), {flag: 'w', encoding: 'utf8', mode: '0666'});
}

module.exports = deploy;
