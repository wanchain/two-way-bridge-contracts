
const {
  parseOwnerArgs,
  hideObject
} = require("./utils/tool");
const deploy = require("./transferOwner");

const argv = parseOwnerArgs();
console.log("argv", hideObject(argv, ["ownerPk", "adminPk", "mnemonic", "ownerIdx", "adminIdx"]));
deploy(argv);