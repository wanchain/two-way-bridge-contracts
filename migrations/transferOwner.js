const path = require("path");
const fs = require("fs");

const Contract = require("./utils/contract");
const {
  chainDict,
  chainIndexDict,
  networks,
  defaultArgv,
  defaultContractCfg,
  defaultNodeUrlDict
} = require('./utils/config');
const {
  mkdir,
  exit,
  parseNetwork,
  skipContract,
  getWorkspace,
  hideObject,
  showTxInfo
} = require("./utils/tool");

const ownerFunc = "owner";
const transferOwnerFunc = "transferOwner";
const renounceOwnershipFunc = "renounceOwnership";

async function transferOwner(argv) {
  let inputFile;
  let outputDir;

  argv = Object.assign({}, defaultArgv[argv.network], argv);
  if (!networks.includes(argv.network)) {
    throw new Error(`Invalid network ${argv.network}`);
  }
  if (!path.isAbsolute(argv.inputDir)) {
    inputFile = path.join(__dirname, argv.inputDir, `${argv.network}.json`);
    outputDir = path.join(__dirname, argv.inputDir);
  } else {
    outputDir = argv.inputDir;
  }
  if ( (!fs.existsSync(inputFile))) {
    throw new Error(`input file ${inputFile} doesn't exist`);
  }

  const outputFile = path.join(outputDir, `owner.${argv.network}.json`);

  const newOwner = argv.address;

  const cfg = Object.assign({}, defaultContractCfg[argv.network], {
    network: argv.network,
    nodeURL: argv.nodeURL,
    privateKey: argv.ownerPk,
    mnemonic: argv.mnemonic,
    index: argv.ownerIdx,
    gasPrice: argv.gasPrice,
    gasLimit: argv.gasLimit
  });

  const dirName = path.dirname(inputFile);
  const deployed = require(inputFile);

  let changeOwner = {}; // {contract:xxx, old:xxx, new:xxx, txHash:xxx}
  for (let contractName in deployed) {
    if (argv.skipDelegate && skipContract(contractName)) {
      continue;
    }
    if (deployed[contractName].abi) {
      const abiName = path.join(dirName, deployed[contractName].abi);
      const abi = JSON.parse(fs.readFileSync(abiName, 'utf-8'));
      const needTransfer = abi.some(v => v.name === transferOwnerFunc && v.type === "function");

      if (needTransfer) {
        const contract = new Contract(cfg, abi, deployed[contractName].address);
        const read = await contract.readContract(contract.contract, ownerFunc)
        const owner = await contract.call(ownerFunc);

        if (owner.toLowerCase() !== newOwner.toLowerCase()) {
          const receipt = await contract.send(transferOwnerFunc, newOwner.toLowerCase());

          changeOwner[contractName] = deployed[contractName];
          changeOwner[contractName].oldOwner = owner;
          changeOwner[contractName].newOwner = newOwner;
          changeOwner[contractName].txHash = receipt.transactionHash;

          showTxInfo(receipt, contractName);
        } else {
          console.warn(`The owner of ${contractName}@${deployed[contractName].address} is already ${newOwner}`);
          changeOwner[contractName] = deployed[contractName];
          changeOwner[contractName].oldOwner = newOwner;
          changeOwner[contractName].newOwner = newOwner;
        }
      }
    }
  }

  if (Object.keys(changeOwner).length > 0) {
    fs.writeFileSync(outputFile, JSON.stringify(changeOwner, null, 5), {flag: 'w', encoding: 'utf8', mode: '0666'});
    console.log("output:", outputFile);
  }
  return changeOwner;
}

module.exports = transferOwner;