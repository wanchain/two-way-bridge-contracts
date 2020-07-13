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
  const nameETH = 'ETH ETH';
  const symbolETH = 'ETH';
  const nameBTC = 'BTC BTC';
  const symbolBTC = 'BTC';

  const addTokenPairParam = [
    1, [aAccount, aName, aSymbol, aDecimals, aChainID], 
      fromChainID, fromAccount, toChainID, null];

  before("init", async () => {});

  describe('normal', () => {
    it('good token manager example', async function() {
      const { tokenManagerDelegate } = await newTokenManager(accounts);

      let receipt = await tokenManagerDelegate.addToken(nameDAI, symbolDAI, decimals, {from: owner});
      addTokenPairParam[0] = 11;
      addTokenPairParam[2] = 61;
      addTokenPairParam[4] = 5718351;
      addTokenPairParam[5] = receipt.logs[0].args.tokenAddress;
      await tokenManagerDelegate.addTokenPair(...addTokenPairParam, {from: owner});

      receipt = await tokenManagerDelegate.addToken(nameETH, symbolETH, decimals, {from: owner});
      addTokenPairParam[0] = 12;
      addTokenPairParam[5] = receipt.logs[0].args.tokenAddress;
      await tokenManagerDelegate.addTokenPair(...addTokenPairParam, {from: owner});

      receipt = await tokenManagerDelegate.addToken(nameBTC, symbolBTC, decimals, {from: owner});
      addTokenPairParam[0] = 13;
      addTokenPairParam[2] = 63;
      addTokenPairParam[4] = 5718353;
      addTokenPairParam[5] = receipt.logs[0].args.tokenAddress;
      await tokenManagerDelegate.addTokenPair(...addTokenPairParam, {from: owner});

      await tokenManagerDelegate.addAdmin(admin, {from: owner});

      const tokenPairID = parseInt(await tokenManagerDelegate.mapTokenPairIndex(1));
      const tokenPairInfo = await tokenManagerDelegate.mapTokenPairInfo(tokenPairID);
      const token = await MappingToken.at(tokenPairInfo.tokenAddress);
      await tokenManagerDelegate.mintToken(tokenPairID, other, 100, {from: admin});
      await token.transfer(admin, 80, {from: other});
      await tokenManagerDelegate.burnToken(tokenPairID, 20, {from: admin});

      assert.equal(web3.utils.toBN(await token.balanceOf(admin)).toNumber(), 60);
      assert.equal(web3.utils.toBN(await token.balanceOf(other)).toNumber(), 20);

      const tokenPairInfo_get = await tokenManagerDelegate.getTokenPairInfo(tokenPairID);
      assert.equal(tokenPairInfo_get.fromChainID.toNumber(), tokenPairInfo.fromChainID.toNumber());
      
      const tokenInfo = await tokenManagerDelegate.getTokenInfo(tokenPairID);
      assert.equal(tokenInfo.name, nameDAI);
      
      const ancestorInfo = await tokenManagerDelegate.getAncestorInfo(tokenPairID);
      const padAccount = web3.utils.padRight("0x6b175474e89094c44da98b954eedeac495271d0f", 64);
      assert.equal(ancestorInfo.account, padAccount);
      assert.equal(ancestorInfo.name, aName);
      assert.equal(ancestorInfo.symbol, aSymbol);
      assert.equal(ancestorInfo.decimals.toNumber(), aDecimals);
      assert.equal(ancestorInfo.chainId.toNumber(), aChainID);

      await tokenManagerDelegate.updateAncestorInfo(tokenPairID, aAccount, "new name", aSymbol, aChainID);
      const ancestorInfo2 = await tokenManagerDelegate.getAncestorInfo(tokenPairID);
      assert.equal(ancestorInfo2.name, "new name");

      const tokenPairs = await tokenManagerDelegate.getTokenPairs();
      assert.equal(tokenPairs.id[0].toNumber(), 11);
      assert.equal(tokenPairs.id[1].toNumber(), 12);
      assert.equal(tokenPairs.id[2].toNumber(), 13);
      assert.equal(tokenPairs.id.length, 3);

      const tokenPairs2 = await tokenManagerDelegate.getTokenPairsByChainID(fromChainID + 1, toChainID + 1);
      assert.equal(tokenPairs2.id[0].toNumber(), 11);
      assert.equal(tokenPairs2.id[1].toNumber(), 12);
      assert.equal(tokenPairs2.id.length, 2);

      await tokenManagerDelegate.removeTokenPair(11);
      const tokenPairs3 = await tokenManagerDelegate.getTokenPairsByChainID(fromChainID + 1, toChainID + 1);
      assert.equal(tokenPairs3.id[0].toNumber(), 12);
      assert.equal(tokenPairs3.id.length, 1);

      await tokenManagerDelegate.updateTokenPair(13, toChainID + 1, fromAccount, fromChainID + 1, token.address);
      const tokenPairs4 = await tokenManagerDelegate.getTokenPairsByChainID(fromChainID + 1, toChainID + 1);
      assert.equal(tokenPairs4.id[0].toNumber(), 12);
      assert.equal(tokenPairs4.id[1].toNumber(), 13);
      assert.equal(tokenPairs4.id.length, 2);

      const obj = await tokenManagerDelegate.removeAdmin(admin, {from: owner});
      assert.equal(obj.receipt.status, true);
    });
  })

  describe('fallback', () => {
    it('revert', async function() {
      try {
        const { tokenManagerDelegate } = await newTokenManager(accounts);
        const r = await web3.eth.sendTransaction({from: owner, to: tokenManagerDelegate.address});
      } catch (e) {
        const isHave = e.message.includes("revert Not support");
        if (isHave) {
          assert.ok("fallback is right");
          return;
        }
      }
      assert.fail("fallback error");
    });
  });

  describe('updateAncestorInfo', () => {
    const updateAncestorInfoParam = [1, aAccount, aName, aSymbol, aChainID];
    it('onlyOwner', async function() {
      const { tokenManagerDelegate } = await newTokenManager(accounts);
      const param = JSON.parse(JSON.stringify(updateAncestorInfoParam));
      const obj = await sendAndGetReason(tokenManagerDelegate.updateAncestorInfo, param, {from: admin});
      assert.equal(obj.reason, "Not owner");
    });
    it('onlyValidID', async function() {
      const { tokenManagerDelegate } = await newTokenManager(accounts);
      const param = JSON.parse(JSON.stringify(updateAncestorInfoParam));
      param[0] = parseInt(await tokenManagerDelegate.totalTokenPairs()) + 1;
      const obj = await sendAndGetReason(tokenManagerDelegate.updateAncestorInfo, param, {from: owner});
      assert.equal(obj.reason, "id not exists");
    });
  });
})