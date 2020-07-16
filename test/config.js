// x and xhash
const xInfo = {
  1: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000001',
    hash: '0xec4916dd28fc4c10d78e287ca5d9cc51ee1ae73cbfde08c6b37324cbfaac8bc5'
  },
  2: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000002',
    hash: '0x9267d3dbed802941483f1afa2a6bc68de5f653128aca9bf1461c5d0a3ad36ed2'
  },
  3: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000003',
    hash: '0xd9147961436944f43cd99d28b2bbddbf452ef872b30c8279e255e7daafc7f946'
  },
  4: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000004',
    hash: '0xe38990d0c7fc009880a9c07c23842e886c6bbdc964ce6bdd5817ad357335ee6f'
  },
  5: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000005',
    hash: '0x96de8fc8c256fa1e1556d41af431cace7dca68707c78dd88c3acab8b17164c47'
  },
  6: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000006',
    hash: '0xd1ec675902ef1633427ca360b290b0b3045a0d9058ddb5e648b4c3c3224c5c68'
  },
  7: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000007',
    hash: '0x48428bdb7ddd829410d6bbb924fdeb3a3d7e88c2577bffae073b990c6f061d08'
  },
  8: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000008',
    hash: '0x38df1c1f64a24a77b23393bca50dff872e31edc4f3b5aa3b90ad0b82f4f089b6'
  },
  9: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000009',
    hash: '0x887bf140ce0b6a497ed8db5c7498a45454f0b2bd644b0313f7a82acc084d0027'
  },
  10: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000a',
    hash: '0x81b04ae4944e1704a65bc3a57b6fc3b06a6b923e3c558d611f6a854b5539ec13'
  },
  11: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000b',
    hash: '0xc09322c415a5ac9ffb1a6cde7e927f480cc1d8afaf22b39a47797966c08e9c4b'
  },
  12: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000c',
    hash: '0xa82872b96246dac512ddf0515f5da862a92ecebebcb92537b6e3e73199694c45'
  },
  13: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000d',
    hash: '0x2a3f128306951f1ded174b8803ee1f0df0c6404bbe92682be21fd84accf5d540'
  },
  14: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000e',
    hash: '0xe14f5be83831f7fefa669d5a84daaa56ec01477dafc6701a83f243bc2228bb11'
  },
  15: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000f',
    hash: '0x3ba2581d53fbf070be34b6d6a2382faf1b8e76a3ade45b31c0c7c90ea289874e'
  },
}

const skInfo = {
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

// const skInfo = {
//   smg1    : new Buffer("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex'),
//   smg2    : new Buffer("e6a00fb13723260102a6937fc86b0552eac9abbe67240d7147f31fdef151e18a", 'hex'),
//   srcSmg  : new Buffer("0de99c2552e85e51fd7491a14ad340f92a02db92983178929b100776197bc4f6", 'hex'),
//   srcSmg1 : new Buffer("55aa70e9a9d984c91bd75d4793db2cd2d998dc8fcaebcb864202fb17a9a6d5b9", 'hex'),
//   dstSmg  : new Buffer("b3ba835eae481e6af0219a9cda3769622eea512aacfb7ea4eb0e9426ff800dc5", 'hex')
// };
// const skSmg1            = new Buffer("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex');
// const skSmg2            = new Buffer("e6a00fb13723260102a6937fc86b0552eac9abbe67240d7147f31fdef151e18a", 'hex');
// const skSrcSmg          = new Buffer("0de99c2552e85e51fd7491a14ad340f92a02db92983178929b100776197bc4f6", 'hex');
// const skSrcSmg1         = new Buffer("55aa70e9a9d984c91bd75d4793db2cd2d998dc8fcaebcb864202fb17a9a6d5b9", 'hex');
// const skDstSmg          = new Buffer("b3ba835eae481e6af0219a9cda3769622eea512aacfb7ea4eb0e9426ff800dc5", 'hex');

const tokenRC20Abi = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"changeOwner","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"newOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"tokenName","type":"string"},{"name":"tokenSymbol","type":"string"},{"name":"tokenDecimal","type":"uint8"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"},{"indexed":true,"name":"value","type":"uint256"},{"indexed":true,"name":"totalSupply","type":"uint256"}],"name":"TokenMintedLogger","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"account","type":"address"},{"indexed":true,"name":"value","type":"uint256"},{"indexed":true,"name":"totalSupply","type":"uint256"}],"name":"TokenBurntLogger","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_spender","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Approval","type":"event"},{"constant":false,"inputs":[{"name":"account","type":"address"},{"name":"value","type":"uint256"}],"name":"mint","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"account","type":"address"},{"name":"value","type":"uint256"}],"name":"burn","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_name","type":"string"},{"name":"_symbol","type":"string"}],"name":"update","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}];

module.exports = {
  xInfo,
  skInfo,
  tokenRC20Abi
};
