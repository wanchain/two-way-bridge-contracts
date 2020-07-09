const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const MappingToken = artifacts.require('MappingToken');
const assert = require('assert');
const { sendAndGetReason } = require("./helper/helper");
const from = require('../truffle').networks.development.from;

contract('TokenManagerDelegate', (accounts) => {
  const [owner_bk, admin_bk, other] = accounts;
  const owner = from ? from : owner_bk;
  const admin = admin_bk.toLowerCase() === owner.toLowerCase() ? owner_bk : admin_bk;
  let tokenManagerDelegate = null;
  let token = null;

  const asciiAncestorAccount = "0x6b175474e89094c44da98b954eedeac495271d0f";
  const asciiAncestorName = "eth dai";
  const asciiAncestorSymbol = "DAI";
  const asciiAncestorDecimals = 18;
  const asciiAncestorChainID = 60;

  const asciiFromChainID = 60;
  const asciiToChainID = 5718350;
  const asciiDecimals = 18;
  const asciiFromAccount = "0x6b175474e89094c44da98b954eedeac495271d0f"

  const fromAccount = web3.utils.hexToBytes(asciiFromAccount);
  const ancestorAccount = web3.utils.hexToBytes(asciiAncestorAccount);

  const addTokenPairParam = [
    1, [ancestorAccount, asciiAncestorName, 
      asciiAncestorSymbol, asciiAncestorDecimals, asciiAncestorChainID], 
    asciiFromChainID, fromAccount, asciiToChainID, null];

  before("init", async () => {
    tokenManagerDelegate = await TokenManagerDelegate.deployed();
    console.log(`tokenManagerDelegate = ${tokenManagerDelegate.address}`);
    const receipt = await tokenManagerDelegate.addToken(tokenName, tokenSymbol, asciiDecimals, {from: owner});
    token = receipt.logs[1].args.tokenAddress;
    addTokenPairParam[5] = token;
    console.log(`tokenAddress = ${addTokenPairParam[5]}`);
  })

  describe('normal', () => {
    it.only('good token manager example', async function() {
      let totalTokenPairs = parseInt(await tokenManagerDelegate.totalTokenPairs());
      addTokenPairParam[0] = totalTokenPairs + 1;
      await tokenManagerDelegate.addTokenPair(...addTokenPairParam, {from: owner});
      addTokenPairParam[0] = totalTokenPairs + 2;
      await tokenManagerDelegate.addTokenPair(...addTokenPairParam, {from: owner});
      addTokenPairParam[0] = totalTokenPairs + 3;
      await tokenManagerDelegate.addTokenPair(...addTokenPairParam, {from: owner});
      await tokenManagerDelegate.addAdmin(admin, {from: owner});
      await tokenManagerDelegate.mintToken(addTokenPairParam[0], other, 100, {from: admin});

      totalTokenPairs = parseInt(await tokenManagerDelegate.totalTokenPairs());
      const tokenPairInfo = await tokenManagerDelegate.mapTokenPairInfo(totalTokenPairs);
      const token = await MappingToken.at(tokenPairInfo.tokenAddress);
      await token.transfer(admin, 80, {from: other});
      await tokenManagerDelegate.burnToken(addTokenPairParam[0], 20, {from: admin});

      assert.equal(web3.utils.toBN(await token.balanceOf(admin)).toNumber(), 60);
      assert.equal(web3.utils.toBN(await token.balanceOf(other)).toNumber(), 20);

      const tokenPairInfo2 = await tokenManagerDelegate.getTokenPairInfo(1);
      console.log(JSON.stringify(tokenPairInfo2));
      const tokenInfo = await tokenManagerDelegate.getTokenInfo(1);
      console.log(JSON.stringify(tokenInfo));
      const ancestorInfo = await tokenManagerDelegate.getAncestorInfo(1);
      console.log(JSON.stringify(ancestorInfo));
      const tokenPairs = await tokenManagerDelegate.getTokenPairs();
      console.log(JSON.stringify(tokenPairs));
    });
  })
})