const OracleProxy = artifacts.require('OracleProxy');
const OracleDelegate = artifacts.require('OracleDelegate');

const assert = require('assert');
const { sendAndGetReason } = require('./helper.js');
const from = require('../truffle').networks.development.from;

const newOracle = async (accounts) => {
  const oracleProxy = await OracleProxy.new();
  const oracleDelegate = await OracleDelegate.new();
  await oracleProxy.upgradeTo(oracleDelegate.address);

  return {oracleProxy: oracleProxy, oracleDelegate: oracleDelegate}
}

const getDeployedOracle = async (accounts) => {
  await deployer.deploy(OracleProxy);
  const oracleProxy = await OracleProxy.deployed();

  await deployer.deploy(OracleDelegate);
  const oracleDelegate = await OracleDelegate.deployed();

  await oracleProxy.upgradeTo(oracleDelegate.address);

  return {oracleProxy: oracleProxy, oracleDelegate: oracleDelegate}
}

contract('Oracle', function(accounts) {
  const [owner_bk, white_bk, other] = accounts;
  const owner = from ? from : owner_bk;
  const white = white_bk.toLowerCase() === owner.toLowerCase() ? owner_bk : white_bk;

  const tokenDAI = web3.utils.hexToBytes(web3.utils.toHex("DAI"));
  const tokenETH = web3.utils.hexToBytes(web3.utils.toHex("ETH"));
  const tokenBTC = web3.utils.hexToBytes(web3.utils.toHex("BTC"));

  const smgID = web3.utils.hexToBytes("0x6b175474e89094c44da98b954eedeac495271d0f");
  const v = 100000;

  before('init', async function() {})
  after('end', async function() {});

  describe('normal', function() {
    it('good quick oracle example', async function() {
      const { oracleDelegate } = await newOracle(accounts);
      await oracleDelegate.addWhitelist(white);

      await oracleDelegate.updatePrice([tokenDAI], [v], { from: white });
      const value = web3.utils.toBN(await oracleDelegate.getValue(tokenDAI)).toNumber();
      const values = (await oracleDelegate.getValues([tokenDAI])).map(i => {return web3.utils.toBN(i).toNumber();});

      assert.equal(value, v);
      assert.equal(values[0], v);

      await oracleDelegate.updateDeposit(smgID, v, { from: white });
      const amount = web3.utils.toBN(await oracleDelegate.getDeposit(smgID)).toNumber();
      assert.equal(v, amount);

      await oracleDelegate.removeWhitelist(owner, { from: owner});
      await oracleDelegate.removeWhitelist(white, { from: owner});

      const gpk1 = web3.utils.hexToBytes("0x1234");
      const gpk2 = web3.utils.hexToBytes("0x5678");
      await oracleDelegate.setStoremanGroupConfig(smgID, 1, 2, [3,4], [5,6], gpk1, gpk2, 9, 10, { from: owner});
      let obj = await oracleDelegate.getStoremanGroupConfig(smgID);
      assert.equal(obj.groupId, "0x6b175474e89094c44da98b954eedeac495271d0f000000000000000000000000");
      assert.equal(obj.status.toNumber(), 1);
      assert.equal(obj.deposit.toNumber(), 2);
      assert.equal(obj.chain1.toNumber(), 3);
      assert.equal(obj.chain2.toNumber(), 4);
      assert.equal(obj.curve1.toNumber(), 5);
      assert.equal(obj.curve2.toNumber(), 6);
      assert.equal(obj.gpk1, "0x1234");
      assert.equal(obj.gpk2, "0x5678");
      assert.equal(obj.startTime.toNumber(), 9);
      assert.equal(obj.endTime.toNumber(), 10);

      await oracleDelegate.setStoremanGroupStatus(smgID, 8, {from: owner});
      obj = await oracleDelegate.getStoremanGroupConfig(smgID);
      assert.equal(obj.status.toNumber(), 8);
    })
  });

  describe('updatePrice', function() {
    it('onlyWhitelist', async function() {
      const { oracleDelegate } = await newOracle(accounts);
      await oracleDelegate.addWhitelist(white);

      const obj = await sendAndGetReason(oracleDelegate.updatePrice, [[tokenDAI], [v]], {from: other});
      assert.equal(obj.reason, "Not in whitelist");
    });
    it('keys.length == prices.length', async function() {
      const { oracleDelegate } = await newOracle(accounts);
      await oracleDelegate.addWhitelist(white);

      let obj = await sendAndGetReason(oracleDelegate.updatePrice, [[tokenDAI], [v, v]], {from: white});
      assert.equal(obj.reason, "length not same");
      obj = await sendAndGetReason(oracleDelegate.updatePrice, [[tokenDAI, tokenETH], [v]], {from: white});
      assert.equal(obj.reason, "length not same");
    });

    it('success', async function() {
      const { oracleDelegate } = await newOracle(accounts);
      await oracleDelegate.addWhitelist(white);

      const obj = await oracleDelegate.updatePrice([tokenDAI, tokenETH, tokenBTC], [100, 200, 300], {from: white});
      assert.equal(obj.receipt.status, true);
    });
  });

  describe('getValue', () => {
    it('success', async function() {
      const { oracleDelegate } = await newOracle(accounts);
      await oracleDelegate.addWhitelist(white);

      const v1 = 1600;
      const v2 = 1700; 
      await oracleDelegate.updatePrice([tokenDAI, tokenETH], [v1, v2], {from: white});

      let value = web3.utils.toBN(await oracleDelegate.getValue(tokenDAI)).toNumber();
      assert.equal(value, v1);
      value = web3.utils.toBN(await oracleDelegate.getValue(tokenETH)).toNumber();
      assert.equal(value, v2);
    })
  })

  describe('getValues', () => {
    it('success', async function() {
      const { oracleDelegate } = await newOracle(accounts);
      await oracleDelegate.addWhitelist(white);

      const v1 = 1600;
      const v2 = 1700; 
      const v3 = 1800; 
      await oracleDelegate.updatePrice([tokenDAI, tokenETH, tokenBTC], [v1, v2, v3], {from: white});
      const values = (await oracleDelegate.getValues([tokenDAI, tokenETH, tokenBTC])).map(i => {return web3.utils.toBN(i).toNumber();});
      assert.equal(values[0], v1);
      assert.equal(values[1], v2);
      assert.equal(values[2], v3);
    })
  })

  describe('upgradeTo', () => {
    it('onlyOwner, require', async function() {
      const { oracleDelegate, oracleProxy } = await newOracle(accounts);
      const param = ["0x6b175474e89094c44da98b954eedeac495271d0f"];
      let obj = await sendAndGetReason(oracleProxy.upgradeTo, param, {from: white});
      assert.equal(obj.reason, "Not owner");

      param[0] = "0x0000000000000000000000000000000000000000";
      obj = await sendAndGetReason(oracleProxy.upgradeTo, param, {from: owner});
      assert.equal(obj.reason, "Cannot upgrade to invalid address");

      param[0] = oracleDelegate.address;
      obj = await sendAndGetReason(oracleProxy.upgradeTo, param, {from: owner});
      assert.equal(obj.reason, "Cannot upgrade to the same implementation");
    })
  })
})