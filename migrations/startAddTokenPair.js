
const {
  parseTokenPairArgs,
  hideObject
} = require("./utils/tool");
const deploy = require("./addTokenPair.js");

const argv = parseTokenPairArgs();
console.log("argv", hideObject(argv, ["ownerPk", "mnemonic"]));
deploy(argv);

/*

node startAddTokenPair.js --network testnet --id 114 --ownerPk <private-key> --gasPrice 1000000000 --gasLimit 8000000

*/