
const { parseScArgs, hideObject } = require("./utils/tool");
const { hideKeys } = require("./utils/config");
const deploy = require("./deploy");

const argv = parseScArgs();
// console.log("argv", hideObject(argv, ["action", "version", "foundation", "ownerPk", "adminPkCross", "adminPkOracle", "adminPkSmg", "adminCross", "adminOracle", "adminSmg", "mnemonic", "ownerIdx", "adminIdxCross", "adminIdxOracle", "adminIdxSmg"]));
console.log("argv", hideObject(argv, hideKeys));
deploy(argv);

// XDC
// node startDeploy --action deploy --network xdcTestnet --ownerPk <private-key> --gasPrice 250000000 --gasLimit 10000000