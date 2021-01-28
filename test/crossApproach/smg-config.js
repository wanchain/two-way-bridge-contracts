const {
  ADDRESS_0,
  defaultChainIDs
} = require("./common");

// const web3 = require("web3");

let storemanGroupStatus  = {
  none                      : 0,
  initial                   : 1,
  curveSeted                : 2,
  failed                    : 3,
  selected                  : 4,
  ready                     : 5,
  unregistered              : 6,
  dismissed                 : 7
};

const skInfo             = {
  src: {
    WAN     : new Buffer("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex'),
    ETH     : new Buffer("e6a00fb13723260102a6937fc86b0552eac9abbe67240d7147f31fdef151e18a", 'hex'),
  },
  dest: {
    WAN     : new Buffer("0de99c2552e85e51fd7491a14ad340f92a02db92983178929b100776197bc4f6", 'hex'),
    ETH     : new Buffer("55aa70e9a9d984c91bd75d4793db2cd2d998dc8fcaebcb864202fb17a9a6d5b9", 'hex'),
  },
  // srcSmg  : new Buffer("0de99c2552e85e51fd7491a14ad340f92a02db92983178929b100776197bc4f6", 'hex'),
  // srcSmg1 : new Buffer("55aa70e9a9d984c91bd75d4793db2cd2d998dc8fcaebcb864202fb17a9a6d5b9", 'hex'),
  // dstSmg  : new Buffer("b3ba835eae481e6af0219a9cda3769622eea512aacfb7ea4eb0e9426ff800dc5", 'hex')
};

let storemanGroups       = {
  src: {
      ID                    : web3.utils.padLeft("0x01", 64),
      deposit               : "900000000000000000",
      status                : storemanGroupStatus.none,
      chain1                : defaultChainIDs.WAN,
      chain2                : defaultChainIDs.ETH,
      gpk1                  : "",
      gpk2                  : "",
      startTime             : 0,
      endTime               : parseInt(Number.MAX_SAFE_INTEGER/10),
      R                     : "",
      s                     : "",
      accounts              : { WAN: ADDRESS_0, ETH: ADDRESS_0 }
  },
  dest: {
      ID                    : web3.utils.padLeft("0x02", 64),
      deposit               : "990000000000000000",
      status                : storemanGroupStatus.none,
      chain1                : defaultChainIDs.WAN,
      chain2                : defaultChainIDs.ETH,
      gpk1                  : "",
      gpk2                  : "",
      startTime             : 0,
      endTime               : parseInt(Number.MAX_SAFE_INTEGER/10),
      R                     : "",
      s                     : "",
      accounts              : { WAN: ADDRESS_0, ETH: ADDRESS_0 }
  },
  exception: {
      ID                    : web3.utils.padLeft("0x03", 64),
  }
};

function initStoremanGroup(storemanGroups, schnorrs) {
  for (let index in storemanGroups) {
    if (!storemanGroups[index].deposit) {
      continue;
    }
    storemanGroups[index].gpk1 = schnorrs[0].getPKBySk(skInfo[index].WAN);
    storemanGroups[index].gpk2 = schnorrs[1].getPKBySk(skInfo[index].ETH);
  }
}

async function addWanStoremanGroup(smgAdminProxy, storemanGroups, curveIDs, owner) {
  let count = 0;
  for (let index in storemanGroups) {
    if (count >= curveIDs.length) {
      break;
    }
    count++
    await smgAdminProxy.setStoremanGroupConfig(storemanGroups[index].ID, storemanGroupStatus.ready,
      web3.utils.toWei(storemanGroups[index].deposit), [storemanGroups[index].chain1, storemanGroups[index].chain2],
      curveIDs,
      storemanGroups[index].gpk1, storemanGroups[index].gpk2,
      storemanGroups[index].startTime, storemanGroups[index].endTime
    )
    storemanGroups[index].status = storemanGroupStatus.ready;
  }
}

async function syncWanStoremanGroup(oracle, storemanGroups, curveIDs, owner) {
  let count = 0;
  for (let index in storemanGroups) {
    if (count >= curveIDs.length) {
      break;
    }
    count++
    await oracle.setStoremanGroupConfig(storemanGroups[index].ID, storemanGroupStatus.ready,
        web3.utils.toWei(storemanGroups[index].deposit), [storemanGroups[index].chain2, storemanGroups[index].chain1],
        curveIDs,
        storemanGroups[index].gpk2, storemanGroups[index].gpk1,
        storemanGroups[index].startTime, storemanGroups[index].endTime
    );
  }
}

module.exports = {
  skInfo,
  storemanGroupStatus,
  storemanGroups,
  initStoremanGroup,
  addWanStoremanGroup,
  syncWanStoremanGroup,
}