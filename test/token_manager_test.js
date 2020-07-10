const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const MappingToken = artifacts.require('MappingToken');

const assert = require('assert');
const { sendAndGetReason } = require('./helper.js');
const from = require('../truffle').networks.development.from;

const newTokenManager = async (accounts) => {
  const tokenManagerProxy = await TokenManagerProxy.new();
  const tokenManagerDelegate = await TokenManagerDelegate.new();
  await tokenManagerProxy.upgradeTo(tokenManagerDelegate.address);

  console.log(`tokenManagerDelegate = ${tokenManagerDelegate.address}`);
  return {tokenManagerProxy: tokenManagerProxy, tokenManagerDelegate: tokenManagerDelegate}
}

const getDeployedTokenManager = async (accounts) => {
  await deployer.deploy(TokenManagerProxy);
  const tokenManagerProxy = await TokenManagerProxy.deployed();

  await deployer.deploy(TokenManagerDelegate);
  const tokenManagerDelegate = await TokenManagerDelegate.deployed();

  await tokenManagerProxy.upgradeTo(tokenManagerDelegate.address);

  return {tokenManagerProxy: tokenManagerProxy, tokenManagerDelegate: tokenManagerDelegate}
}

contract('TokenManagerDelegate', (accounts) => {
  const [owner_bk, admin_bk, other] = accounts;
  const owner = from ? from : owner_bk;
  const admin = admin_bk.toLowerCase() === owner.toLowerCase() ? owner_bk : admin_bk;

  const aAccount = web3.utils.hexToBytes("0x6b175474e89094c44da98b954eedeac495271d0f");
  const aName = "eth dai";
  const aSymbol = "DAI";
  const aDecimals = 18;
  const aChainID = 60;

  const fromChainID = 60;
  const toChainID = 5718350;
  const decimals = 18;
  const fromAccount = web3.utils.hexToBytes('0x6b175474e89094c44da98b954eedeac495271d0f');

  const nameDAI = 'ETH DAI';
  const symbolDAI = 'DAI';

  const addTokenPairParam = [
    1, [aAccount, aName, aSymbol, aDecimals, aChainID], 
      fromChainID, fromAccount, toChainID, null];

  before("init", async () => {});

  describe('normal', () => {
    it.only('good token manager example', async function() {
      const { tokenManagerDelegate } = await newTokenManager(accounts);
      const receipt = await tokenManagerDelegate.addToken(nameDAI, symbolDAI, decimals, {from: owner});
      const tokenAddr = receipt.logs[0].args.tokenAddress;
      addTokenPairParam[5] = tokenAddr;
      console.log(`tokenAddress = ${addTokenPairParam[5]}`);
      
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