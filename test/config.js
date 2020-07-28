// x and xhash
const xInfo = {
  1:{
    x   : '0x000000000000000000000000000000000000000000000000000000000000007f',
    hash: '0xa48bd64dc8de3fe1438f55d19ed877ff00e2bd1333b48a7c3abde636494ec80a'
  },
  2:{
    x   : '0x000000000000000000000000000000000000000000000000000000000000008f',
    hash: '0xb8123b183168413d5896cea429a5681effffc7b0a67e4261ea53e5fc753d07ba'
  },
  3:{
    x   : '0x000000000000000000000000000000000000000000000000000000000000009f',
    hash: '0x5f65e0259a12709df6aee75516d91c67bab98bfb3f07abfb50f39473f4e3bc1b'
  },
  4:{
    x   : '0x00000000000000000000000000000000000000000000000000000000000000af',
    hash: '0x1b3d39fdcdaba4ae9290f4b5351078f9de8e55e535896949762a62f75d20c654'
  },
  5:{
    x   : '0x00000000000000000000000000000000000000000000000000000000000000bf',
    hash: '0x235bc80727550a4460d537e06c5d11e63e3e0e7ca0ea56624563e90d98c024ee'
  },
  6:{
    x   : '0x00000000000000000000000000000000000000000000000000000000000000cf',
    hash: '0xff0a521879b3e0caa761981ac28f67caa5b8a58f81b5119c187eab92397834a7'
  },
  7:{
    x   : '0x00000000000000000000000000000000000000000000000000000000000000df',
    hash: '0x495377bead56d08c786343adac960dff8f75b8b25d53452266039bfc86d2e389'
  },
  8:{
    x   : '0x00000000000000000000000000000000000000000000000000000000000000ef',
    hash: '0x57837e2a48e704a092e68275ce65fc3ad8c48199fbe8e13f77d3a4cbd7f42ac0'
  },
  9:{
    x   : '0x00000000000000000000000000000000000000000000000000000000000000ff',
    hash: '0x60f9ca40b771fc97dd45423e98463ab5d5e515ce9b4fdfac5d90be969a8ab030'
  },
  chain1MintTokenRedeem: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000001',
    hash: '0xec4916dd28fc4c10d78e287ca5d9cc51ee1ae73cbfde08c6b37324cbfaac8bc5'
  },
  chain1MintTokenRevoke: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000002',
    hash: '0x9267d3dbed802941483f1afa2a6bc68de5f653128aca9bf1461c5d0a3ad36ed2'
  },
  chain1BurnTokenRedeem: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000003',
    hash: '0xd9147961436944f43cd99d28b2bbddbf452ef872b30c8279e255e7daafc7f946'
  },
  chain1BurnTokenRevoke: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000004',
    hash: '0xe38990d0c7fc009880a9c07c23842e886c6bbdc964ce6bdd5817ad357335ee6f'
  },
  chain2MintTokenRedeem: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000005',
    hash: '0x96de8fc8c256fa1e1556d41af431cace7dca68707c78dd88c3acab8b17164c47'
  },
  chain2MintTokenRevoke: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000006',
    hash: '0xd1ec675902ef1633427ca360b290b0b3045a0d9058ddb5e648b4c3c3224c5c68'
  },
  chain2BurnTokenRedeem: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000007',
    hash: '0x48428bdb7ddd829410d6bbb924fdeb3a3d7e88c2577bffae073b990c6f061d08'
  },
  chain2BurnTokenRevoke: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000008',
    hash: '0x38df1c1f64a24a77b23393bca50dff872e31edc4f3b5aa3b90ad0b82f4f089b6'
  },
  chain1MintCoinRedeem: {
    x   : '0x0000000000000000000000000000000000000000000000000000000000000009',
    hash: '0x887bf140ce0b6a497ed8db5c7498a45454f0b2bd644b0313f7a82acc084d0027'
  },
  chain1MintCoinRevoke: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000a',
    hash: '0x81b04ae4944e1704a65bc3a57b6fc3b06a6b923e3c558d611f6a854b5539ec13'
  },
  chain1BurnCoinRedeem: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000b',
    hash: '0xc09322c415a5ac9ffb1a6cde7e927f480cc1d8afaf22b39a47797966c08e9c4b'
  },
  chain1BurnCoinRevoke: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000c',
    hash: '0xa82872b96246dac512ddf0515f5da862a92ecebebcb92537b6e3e73199694c45'
  },
  chain2MintCoinRedeem: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000d',
    hash: '0x2a3f128306951f1ded174b8803ee1f0df0c6404bbe92682be21fd84accf5d540'
  },
  chain2MintCoinRevoke: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000e',
    hash: '0xe14f5be83831f7fefa669d5a84daaa56ec01477dafc6701a83f243bc2228bb11'
  },
  chain2BurnCoinRedeem: {
    x   : '0x000000000000000000000000000000000000000000000000000000000000000f',
    hash: '0x3ba2581d53fbf070be34b6d6a2382faf1b8e76a3ade45b31c0c7c90ea289874e'
  },
  chain2BurnCoinRevoke: {
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
  chain1NoDebtRedeem:{
    x   : '0x000000000000000000000000000000000000000000000000000000000000004f',
    hash: '0x5e46fe597123003c55aa04da816a7cea976f22ae7449ca07ebdbb61536480ff0'
  },
  chain2DebtRedeem:{
    x   : '0x000000000000000000000000000000000000000000000000000000000000005f',
    hash: '0x5f763534c9565813a15c51c4157001173cea5a22b0e5ce21fdb375471291d7b3'
  },
  chain2DebtRevoke:{
    x   : '0x000000000000000000000000000000000000000000000000000000000000006f',
    hash: '0x7b1a8537216b5e3136f4e344190f9c7002f25067afbe4bfcdce69915a9c5ab59'
  },
  chain2NoDebtRedeem:{
    x   : '0x000000000000000000000000000000000000000000000000000000000000007f',
    hash: '0xa48bd64dc8de3fe1438f55d19ed877ff00e2bd1333b48a7c3abde636494ec80a'
  },
  chain1DebtMintLock:{
    x   : '0x000000000000000000000000000000000000000000000000000000000000008f',
    hash: '0xb8123b183168413d5896cea429a5681effffc7b0a67e4261ea53e5fc753d07ba'
  },
  wrong: {
    x   : '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    hash: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  }
};

const uniqueInfo = {
  chain1DebtFastMint: '0x0000000000000000000000000000000000000000000000000000000000000001',
  chain1DebtFastBurn: '0x0000000000000000000000000000000000000000000000000000000000000002',
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
  tokenRC20Abi,
  uniqueInfo
};
