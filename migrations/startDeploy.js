
const {
  parseScArgs,
  hideObject
} = require("./utils/tool");
const deploy = require("./deploy");

const argv = parseScArgs();
console.log("argv", hideObject(argv, ["ownerPk", "adminPk", "mnemonic", "ownerIdx", "adminIdx"]));
deploy(argv);