// types array list
const typesArrayList       = {
  // currentChainID   uniqueID   destSmgID
  transferAsset: ['uint', 'bytes32', 'bytes32'],
  // currentChainID   uniqueID   srcSmgID
  receiveDebt: ['uint', 'bytes32', 'bytes32'],
  //uniqueID   tokenPairID   value   userAccount
  smgFastMint: ['bytes32', 'uint', 'uint', 'address'],
  //uniqueID   tokenPairID   value   userAccount
  smgFastBurn: ['bytes32', 'uint', 'uint', 'address'],
   // timeout receiver
  smgWithdrawFee: ['uint', 'uint','address'],
  // currentChainID   uniqueID   tokenPairID   value   fee   tokenAccount   userAccount
  smgRelease: ['uint', 'bytes32', 'uint', 'uint', 'uint', 'address', 'address'],
  // currentChainID   uniqueID   tokenPairID   value   fee   tokenAccount   userAccount
  smgMint: ['uint', 'bytes32', 'uint', 'uint', 'uint', 'address', 'address'],

  // currentChainID   uniqueID   tokenPairID   tokenIDs  tokenValues  extData  tokenAccount   userAccount
  smgMintNFT: ['uint', 'bytes32', 'uint', 'uint[]', 'uint[]', 'bytes', 'address', 'address'],
  // currentChainID,  uniqueID,  tokenPairID,  tokenIDs, tokenValues, tokenAccount,  userAccount
  smgReleaseNFT: ['uint', 'bytes32', 'uint', 'uint[]', 'uint[]', 'address', 'address']
};

function buildMpcSign (schnorr, sk, typesArray, ...args) {
  let result = {
      R: schnorr.getR(),
      s: schnorr.getS(sk, typesArray, args)
  };
  return result;
}

function getScAddrFileName(isMainnet) {
  return `${isMainnet ? 'mainnet' : 'testnet'}-sc.json`;
}

function updateScAddr(chainType, fileName, scAddrDict) {
  const fs = require("fs");
  const path = require("path");

  let oldInfo;
  let absoluteFileName = path.join(__dirname, fileName);

  if (fs.existsSync(absoluteFileName)) {
    oldInfo = JSON.parse(fs.readFileSync(absoluteFileName, {encoding: 'utf8'}));
  }

  if (!oldInfo) {
    oldInfo = {};
  }

  let needUpdate = false;
  if (oldInfo[chainType]) {
    for (let sc in scAddrDict) {
      if (scAddrDict[sc] !== oldInfo[chainType][sc]) {
        oldInfo[chainType][sc] = scAddrDict[sc];
        needUpdate = true;
      }
    }
  } else {
    oldInfo[chainType] = scAddrDict;
    needUpdate = true;
  }

  if (needUpdate) {
    fs.writeFileSync(absoluteFileName, JSON.stringify(oldInfo, null, 2), {flag: 'w', encoding: 'utf8', mode: '0666'});
  }
  return absoluteFileName;
}

module.exports = {
  typesArrayList,
  buildMpcSign,
  getScAddrFileName,
  updateScAddr
}