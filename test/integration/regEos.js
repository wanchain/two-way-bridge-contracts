const encoder = require("../../utils/encoder");
const crossChainAccount = require('../../utils/account/crossChainAccount');
const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');

// token
const eosAccount = new crossChainAccount("eos", "ascii");

const eosToken = {
  // for register
  origAddr: eosAccount.encodeAccount('eosio.token:EOS'),
  name: encoder.str2hex('Wanchain EOS Crosschain Token'),
  symbol: encoder.str2hex('EOS'),
  decimals: 4
}

contract('open_storeman_it', async () => {
  before("register_eos_token", async() => {
    await registerToken();
  })

  it('it_stub', async () => {
  })

  async function registerToken() {
    let tmProxy = await TokenManagerProxy.deployed();
    let tm = await TokenManagerDelegate.at(tmProxy.address);
    let ratio = 10000;
    let minDeposit = '0x99999999';
    let withdrawDelayTime = 60 * 60 * 72;
    await tm.addToken(eosToken.origAddr, ratio, minDeposit, withdrawDelayTime, eosToken.name, eosToken.symbol, eosToken.decimals)
    let token = await tm.getTokenInfo(eosToken.origAddr);
    console.log("register eos token:", token);
  }
})