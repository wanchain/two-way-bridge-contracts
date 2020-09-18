const { assert }                = require('chai');
const optimist                  = require("optimist");

const BN                        = web3.utils.BN;

let currNetwork = optimist.argv.network || "development";
const from = require('../../truffle-config').networks[currNetwork].from;

const InvalidTokenPairID          = 100;
const quotaDepositRate            = 15000;

const ADDRESS_0                   = "0x0000000000000000000000000000000000000000";
const ADDRESS_CROSS_PROXY_IMPL    = '0x0000000000000000000000000000000000000001';

const ERROR_INFO                  = 'it should be throw error';

// x and xhash
const xInfo              = {
    token1MintRedeem: {
      x   : '0x0000000000000000000000000000000000000000000000000000000000000001',
      hash: '0xec4916dd28fc4c10d78e287ca5d9cc51ee1ae73cbfde08c6b37324cbfaac8bc5'
    },
    token1MintRevoke: {
      x   : '0x0000000000000000000000000000000000000000000000000000000000000002',
      hash: '0x9267d3dbed802941483f1afa2a6bc68de5f653128aca9bf1461c5d0a3ad36ed2'
    },
    token1BurnRedeem: {
      x   : '0x0000000000000000000000000000000000000000000000000000000000000003',
      hash: '0xd9147961436944f43cd99d28b2bbddbf452ef872b30c8279e255e7daafc7f946'
    },
    token1BurnRevoke: {
      x   : '0x0000000000000000000000000000000000000000000000000000000000000004',
      hash: '0xe38990d0c7fc009880a9c07c23842e886c6bbdc964ce6bdd5817ad357335ee6f'
    },
    token2MintRedeem: {
      x   : '0x0000000000000000000000000000000000000000000000000000000000000005',
      hash: '0x96de8fc8c256fa1e1556d41af431cace7dca68707c78dd88c3acab8b17164c47'
    },
    token2MintRevoke: {
      x   : '0x0000000000000000000000000000000000000000000000000000000000000006',
      hash: '0xd1ec675902ef1633427ca360b290b0b3045a0d9058ddb5e648b4c3c3224c5c68'
    },
    token2BurnRedeem: {
      x   : '0x0000000000000000000000000000000000000000000000000000000000000007',
      hash: '0x48428bdb7ddd829410d6bbb924fdeb3a3d7e88c2577bffae073b990c6f061d08'
    },
    token2BurnRevoke: {
      x   : '0x0000000000000000000000000000000000000000000000000000000000000008',
      hash: '0x38df1c1f64a24a77b23393bca50dff872e31edc4f3b5aa3b90ad0b82f4f089b6'
    },
    coin1MintRedeem: {
      x   : '0x0000000000000000000000000000000000000000000000000000000000000009',
      hash: '0x887bf140ce0b6a497ed8db5c7498a45454f0b2bd644b0313f7a82acc084d0027'
    },
    coin1MintRevoke: {
      x   : '0x000000000000000000000000000000000000000000000000000000000000000a',
      hash: '0x81b04ae4944e1704a65bc3a57b6fc3b06a6b923e3c558d611f6a854b5539ec13'
    },
    coin1BurnRedeem: {
      x   : '0x000000000000000000000000000000000000000000000000000000000000000b',
      hash: '0xc09322c415a5ac9ffb1a6cde7e927f480cc1d8afaf22b39a47797966c08e9c4b'
    },
    coin1BurnRevoke: {
      x   : '0x000000000000000000000000000000000000000000000000000000000000000c',
      hash: '0xa82872b96246dac512ddf0515f5da862a92ecebebcb92537b6e3e73199694c45'
    },
    coin2MintRedeem: {
      x   : '0x000000000000000000000000000000000000000000000000000000000000000d',
      hash: '0x2a3f128306951f1ded174b8803ee1f0df0c6404bbe92682be21fd84accf5d540'
    },
    coin2MintRevoke: {
      x   : '0x000000000000000000000000000000000000000000000000000000000000000e',
      hash: '0xe14f5be83831f7fefa669d5a84daaa56ec01477dafc6701a83f243bc2228bb11'
    },
    coin2BurnRedeem: {
      x   : '0x000000000000000000000000000000000000000000000000000000000000000f',
      hash: '0x3ba2581d53fbf070be34b6d6a2382faf1b8e76a3ade45b31c0c7c90ea289874e'
    },
    coin2BurnRevoke: {
      x   : '0x000000000000000000000000000000000000000000000000000000000000001f',
      hash: '0x3b9c3a9ec9b9ea8f5b66ffdfc9e157f48f183a5b2b21b17ece0e9ceec4a7c9e0'
    },
    chain1DebtRedeem: {
      x   : '0x000000000000000000000000000000000000000000000000000000000000002f',
      hash: '0xc8bd03c1d9e18e8aaf6c909fa1bcb269062c932cd284fb4db7aed323699e4bdd'
    },
    chain1DebtRevoke:{
      x   : '0x000000000000000000000000000000000000000000000000000000000000003f',
      hash: '0x5aabc2aaf168131a281aedcee3dea27e214d95e3b97372c78906696f9fe8c45a'
    },
    chain2DebtRedeem:{
      x   : '0x000000000000000000000000000000000000000000000000000000000000004f',
      hash: '0x5e46fe597123003c55aa04da816a7cea976f22ae7449ca07ebdbb61536480ff0'
    },
    chain2DebtRevoke:{
      x   : '0x000000000000000000000000000000000000000000000000000000000000005f',
      hash: '0x5f763534c9565813a15c51c4157001173cea5a22b0e5ce21fdb375471291d7b3'
    },
    chain2DebtBurnLock:{
      x   : '0x000000000000000000000000000000000000000000000000000000000000006f',
      hash: '0x7b1a8537216b5e3136f4e344190f9c7002f25067afbe4bfcdce69915a9c5ab59'
    },
    chain1DebtMintLock:{
      x   : '0x000000000000000000000000000000000000000000000000000000000000007f',
      hash: '0xa48bd64dc8de3fe1438f55d19ed877ff00e2bd1333b48a7c3abde636494ec80a'
    },
    1:{
      x   : '0x000000000000000000000000000000000000000000000000000000000000008f',
      hash: '0xb8123b183168413d5896cea429a5681effffc7b0a67e4261ea53e5fc753d07ba'
    },
    2:{
      x   : '0x000000000000000000000000000000000000000000000000000000000000007f',
      hash: '0xa48bd64dc8de3fe1438f55d19ed877ff00e2bd1333b48a7c3abde636494ec80a'
    },
    3:{
      x   : '0x000000000000000000000000000000000000000000000000000000000000008f',
      hash: '0xb8123b183168413d5896cea429a5681effffc7b0a67e4261ea53e5fc753d07ba'
    },
    4:{
      x   : '0x000000000000000000000000000000000000000000000000000000000000009f',
      hash: '0x5f65e0259a12709df6aee75516d91c67bab98bfb3f07abfb50f39473f4e3bc1b'
    },
    5:{
      x   : '0x00000000000000000000000000000000000000000000000000000000000000af',
      hash: '0x1b3d39fdcdaba4ae9290f4b5351078f9de8e55e535896949762a62f75d20c654'
    },
    6:{
      x   : '0x00000000000000000000000000000000000000000000000000000000000000bf',
      hash: '0x235bc80727550a4460d537e06c5d11e63e3e0e7ca0ea56624563e90d98c024ee'
    },
    7:{
      x   : '0x00000000000000000000000000000000000000000000000000000000000000cf',
      hash: '0xff0a521879b3e0caa761981ac28f67caa5b8a58f81b5119c187eab92397834a7'
    },
    8:{
      x   : '0x00000000000000000000000000000000000000000000000000000000000000df',
      hash: '0x495377bead56d08c786343adac960dff8f75b8b25d53452266039bfc86d2e389'
    },
    9:{
      x   : '0x00000000000000000000000000000000000000000000000000000000000000ef',
      hash: '0x57837e2a48e704a092e68275ce65fc3ad8c48199fbe8e13f77d3a4cbd7f42ac0'
    },
    10:{
      x   : '0x00000000000000000000000000000000000000000000000000000000000000ff',
      hash: '0x60f9ca40b771fc97dd45423e98463ab5d5e515ce9b4fdfac5d90be969a8ab030'
    },
    htlcException: {
      x   : '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      hash: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    }
  };

  const uniqueInfo         = {
    coin2DebtFastMint: '0x0000000000000000000000000000000000000000000000000000000000000001',
    coin2DebtFastBurn: '0x0000000000000000000000000000000000000000000000000000000000000002',
    coin1FastMint:     '0x0000000000000000000000000000000000000000000000000000000000000003',
    coin1FastBurn:     '0x0000000000000000000000000000000000000000000000000000000000000004',
    coin2FastMint:     '0x0000000000000000000000000000000000000000000000000000000000000005',
    coin2FastBurn:     '0x0000000000000000000000000000000000000000000000000000000000000006',
    token1FastMint:    '0x0000000000000000000000000000000000000000000000000000000000000007',
    token1FastBurn:    '0x0000000000000000000000000000000000000000000000000000000000000008',
    token2FastMint:    '0x0000000000000000000000000000000000000000000000000000000000000009',
    token2FastBurn:    '0x000000000000000000000000000000000000000000000000000000000000000a',
    fastException:     '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
}

const skInfo             = {
    smg1    : {
      1     : new Buffer("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex'),
      2     : new Buffer("e6a00fb13723260102a6937fc86b0552eac9abbe67240d7147f31fdef151e18a", 'hex'),
    },
    smg2    : {
      1     : new Buffer("0de99c2552e85e51fd7491a14ad340f92a02db92983178929b100776197bc4f6", 'hex'),
      2     : new Buffer("55aa70e9a9d984c91bd75d4793db2cd2d998dc8fcaebcb864202fb17a9a6d5b9", 'hex'),
    },
    // srcSmg  : new Buffer("0de99c2552e85e51fd7491a14ad340f92a02db92983178929b100776197bc4f6", 'hex'),
    // srcSmg1 : new Buffer("55aa70e9a9d984c91bd75d4793db2cd2d998dc8fcaebcb864202fb17a9a6d5b9", 'hex'),
    // dstSmg  : new Buffer("b3ba835eae481e6af0219a9cda3769622eea512aacfb7ea4eb0e9426ff800dc5", 'hex')
};

let defaultCurve         = {
    curve1                    : 1,
    curve2                    : 2
};

let defaultChainID       = {
    chain1                    : 10,
    chain2                    : 11
};

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

let schnorr = {
    curve1:  null,
    curve2:  null,
};

let coins                = {
    coin1: {
        tokenPairID           : 0,
        origChainID           : defaultChainID.chain1,
        shadowChainID         : defaultChainID.chain2,
        origTokenAccount      : ADDRESS_0,
        shadowTokenAccount    : "",
        decimals              : 18,
        name                  : 'WAN',
        symbol                : 'WAN',
        // price                 : 2.3
        price                 : 23e-16
    },
    coin2: {
        tokenPairID           : 1,
        origChainID           : defaultChainID.chain2,
        shadowChainID         : defaultChainID.chain1,
        origTokenAccount      : ADDRESS_0,
        shadowTokenAccount    : "",
        decimals              : 18,
        name                  : 'ETH',
        symbol                : 'ETH',
        // price                 : 243
        price                 : 243e-15
    }
}

let tokens               = {
    token1: {
        tokenCreator          : null,
        tokenPairID           : 2,
        origChainID           : defaultChainID.chain1,
        shadowChainID         : defaultChainID.chain2,
        origTokenAccount      : "",
        shadowTokenAccount    : "",
        decimals              : 18,
        name                  : 'TST1',
        symbol                : 'TST1',
        // price                 : 3
        price                 : 3e-17
    },
    token2: {
        tokenCreator          : null,
        tokenPairID           : 3,
        origChainID           : defaultChainID.chain2,
        shadowChainID         : defaultChainID.chain1,
        origTokenAccount      : "",
        shadowTokenAccount    : "",
        decimals              : 16,
        name                  : 'TST2',
        symbol                : 'TST2',
        // price                 : 7
        price                 : 7e-17
    }
};

let crossApproach        = {
    chain1: {
        instance              : null,
        delegate              : ADDRESS_0,
        origLockFee           : 10,
        origRevokeFee         : 11,
        shadowLockFee         : 12,
        shadowRevokeFee       : 13,
        parnters              : {
            tokenManager      : null,
            smgAdminProxy     : null,
            smgFeeProxy       : null,
            quota             : null,
            oracle            : null,
            sigVerifier       : null,
        },
    },
    chain2: {
        instance              : null,
        delegate              : ADDRESS_0,
        origLockFee           : 20,
        origRevokeFee         : 21,
        shadowLockFee         : 22,
        shadowRevokeFee       : 23,
        parnters              : {
            tokenManager      : null,
            smgAdminProxy     : null,
            smgFeeProxy       : null,
            quota             : null,
            oracle            : null,
            sigVerifier       : null,
        },
    },
};

let chains               = {
    1: {
        ID                     : defaultChainID.chain1,
        coin                   : coins.coin1,
        token                  : tokens.token1,
        approach               : crossApproach.chain1
    },
    2: {
        ID                     : defaultChainID.chain2,
        coin                   : coins.coin2,
        token                  : tokens.token2,
        approach               : crossApproach.chain2
    }
}

let storemanGroups       = {
    1: {
        ID                    : "0x01",
        account               : "", // accounts 1 or 2
        // deposit               : new BN(web3.utils.padRight(0x1, 50)),
        deposit               : "90000000000000000000000000000000000",
        status                : storemanGroupStatus.none,
        chain1                : defaultChainID.chain1,
        chain2                : defaultChainID.chain2,
        // sk1                   : "",
        // sk2                   : "",
        gpk1                  : "",
        gpk2                  : "",
        startTime             : 0,
        endTime               : Number.MAX_SAFE_INTEGER,
        R                     : "",
        s                     : ""
    },
    2: {
        ID                    : "0x02",
        account               : "", // accounts 1 or 2
        // deposit               : new BN(web3.utils.padRight(0x2, 50)),
        deposit               : "99000000000000000000000000000000000",
        status                : storemanGroupStatus.none,
        chain1                : defaultChainID.chain1,
        chain2                : defaultChainID.chain2,
        gpk1                  : "",
        gpk2                  : "",
        startTime             : 0,
        endTime               : Number.MAX_SAFE_INTEGER,
        R                     : "",
        s                     : ""
    },
    htlcException: {
        ID                    : "0x03",
    }
};

// params
let userLockParams       = {
    xHash: '',
    smgID: storemanGroups[1].ID,
    tokenPairID: tokens.token1.tokenPairID,
    value: 10,
    origUserAccount: '', // accounts 3 or 4
    shadowUserAccount: '', // accounts 3 or 4
};

let smgLockParams       = {
    xHash: '',
    smgID: storemanGroups[1].ID,
    tokenPairID: tokens.token1.tokenPairID,
    value: userLockParams.value,
    origUserAccount: '', // accounts 3 or 4
    shadowUserAccount: '', // accounts 3 or 4
};

let userFastParams       = {
    smgID: storemanGroups[1].ID,
    tokenPairID: tokens.token1.tokenPairID,
    value: userLockParams.value,
    origUserAccount: '', // accounts 7
    shadowUserAccount: '', // accounts 8
};

let smgFastParams       = {
    uniqueID: '',
    smgID: storemanGroups[1].ID,
    tokenPairID: tokens.token1.tokenPairID,
    value: userFastParams.value,
    origUserAccount: '', // accounts 7 or 8
    shadowUserAccount: '', // accounts 7 or 8
};

let debtLockParams       = {
    xHash: '',
    srcSmgID: storemanGroups[1].ID,
    destSmgID: storemanGroups[2].ID,
};

// types array list
let typesArrayList       = {
    //xHash   destSmgID
    srcDebtLock: ['bytes32', 'bytes32'],
    //xHash   srcSmgID
    destDebtLock: ['bytes32', 'bytes32'],
    //xHash   tokenPairID   value   userAccount
    smgMintLock: ['bytes32', 'uint', 'uint', 'address'],
    //xHash   tokenPairID   value   userAccount
    smgBurnLock: ['bytes32', 'uint', 'uint', 'address'],
    //uniqueID   tokenPairID   value   userAccount
    smgFastMint: ['bytes32', 'uint', 'uint', 'address'],
    //uniqueID   tokenPairID   value   userAccount
    smgFastBurn: ['bytes32', 'uint', 'uint', 'address'],
     // timeout receiver
    smgWithdrawFee: ['uint','address'],
};

function parseEventsBy(receipt, expectedEvents, filterByName) {
  let events = new Array();

  receipt.logs.forEach(function(logEntry) {
      let expectedEntry = expectedEvents.find(function(evt) {
          return (evt.event === logEntry.event)
      });

      // When filtering, ignore events that are not expected
      if ((! filterByName) || expectedEntry) {
          // Event name
          let event = {
              event: logEntry.event
          };

          // Event arguments
          // Ignore the arguments when they are not tested
          // (ie. expectedEntry.args is undefined)
          if ((! expectedEntry) || (expectedEntry && expectedEntry.args)) {
              event.args = Object.keys(logEntry.args).reduce(function(previous, current) {
                  previous[current] =
                      (typeof logEntry.args[current].toNumber === 'function')
                          ? logEntry.args[current].toString()
                          : logEntry.args[current];
                  // console.log("previous:", previous);
                  return previous;
              }, {});
          }
          // console.log("parseEventsBy:", event);
          events.push(event);
      }
  });

  return events;
}

function testInit() {
    if (typeof assert !== 'undefined') {
        assert.getWeb3Log = function(receipt, expectedEvent) {
            let entries = receipt.logs.filter(log => log.event === expectedEvent.event);
            if(!entries.length){
                assert.fail("Not get the expected event: event is null");
            }
            let entry = entries[0];
            assert.equal(entry.event, expectedEvent.event);
            return entry;
        };

        assert.checkWeb3Event = function(receipt, expectedEvent, message) {
            // console.log("receipt", receipt);
            // console.log("expectedEvent", expectedEvent);
            let events = parseEventsBy(receipt, [expectedEvent], true);
            let entry = events[0];
            if(entry == null){
                assert.fail("Not get the expected event: event is null");
            }

            // console.log("parsed event", entry);
            assert.equal(entry.event, expectedEvent.event);
            let expectArgs = expectedEvent.args;
            let entryArgs = entry.args;
            let needKeys = Object.keys(expectArgs);
            for(let key of needKeys){
                if(expectArgs[key] != entryArgs[key]){
                    // console.log(expectArgs[key])
                    // console.log(entryArgs[key])
                    assert.fail("Not get the expected event args: " + key);
                    break;
                }
            }
        };
    }
}

module.exports = {
    BN,
    from,
    defaultCurve,
    storemanGroupStatus,

    ADDRESS_0,
    ADDRESS_CROSS_PROXY_IMPL,

    ERROR_INFO,

    xInfo,
    skInfo,
    uniqueInfo,

    InvalidTokenPairID,
    quotaDepositRate,

    schnorr: schnorr,
    chains: chains,
    storemanGroups,

    userLockParams,
    smgLockParams,
    userFastParams,
    smgFastParams,
    debtLockParams,
    typesArrayList,

    assert,
    testInit
};
