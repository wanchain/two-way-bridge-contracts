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
})