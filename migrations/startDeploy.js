
const {
  parseScArgs,
  hideObject
} = require("./utils/tool");
const deploy = require("./deploy");

const argv = parseScArgs();
console.log("argv", hideObject(argv, ["ownerPk", "adminPk", "mnemonic", "ownerIdx", "adminIdx"]));
deploy(argv);

// XDC
// node startDeploy --action deploy --network xdcMainnet --ownerPk <private-key> --gasPrice 250000000 --gasLimit 10000000