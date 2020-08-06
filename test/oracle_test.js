const OracleProxy = artifacts.require('OracleProxy');
const OracleDelegate = artifacts.require('OracleDelegate');

const assert = require('assert');
const { sendAndGetReason } = require('./helper.js');
const { waitForDebugger } = require('inspector');
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

      const gas = await oracleDelegate.updatePrice.estimateGas([tokenDAI], [v], { from: owner });
      console.log(`updatePrice estimate = ${gas}`);
      let receipt = await oracleDelegate.updatePrice([tokenDAI], [v], { from: owner });
      console.log(`updatePrice used = ${receipt.receipt.gasUsed}`);
      // check UpdatePrice event log
      const updatePriceEvent = receipt.logs[0].args;
      for (let i = 0; i<updatePriceEvent.keys.length; i++) {
        assert.equal(web3.utils.padRight(web3.utils.bytesToHex(tokenDAI), 64), updatePriceEvent.keys[i]);
        assert.equal(v, updatePriceEvent.prices[i].toNumber());
      }
      // check storage
      const value = web3.utils.toBN(await oracleDelegate.getValue(tokenDAI)).toNumber();
      const values = (await oracleDelegate.getValues([tokenDAI])).map(i => {return web3.utils.toBN(i).toNumber();});

      assert.equal(value, v);
      assert.equal(values[0], v);

      let gas1 = await oracleDelegate.updateDeposit.estimateGas(smgID, v, { from: owner });
      console.log(`updateDeposit estimate = ${gas1}`);
      receipt = await oracleDelegate.updateDeposit(smgID, v, { from: owner });
      console.log(`updateDeposit used = ${receipt.receipt.gasUsed}`);
      // // check UpdateDeposit event log
      // const updateDepositEvent = receipt.logs[0].args;
      // assert.equal(web3.utils.padRight(web3.utils.bytesToHex(smgID), 64), updateDepositEvent.smgID);
      // assert.equal(v, updateDepositEvent.amount.toNumber());
      // check storage
      const amount = web3.utils.toBN(await oracleDelegate.getDeposit(smgID)).toNumber();
      assert.equal(v, amount);

      const gpk1 = web3.utils.hexToBytes("0x1234");
      const gpk2 = web3.utils.hexToBytes("0x5678");
      gas1 = await oracleDelegate.setStoremanGroupConfig.estimateGas(smgID, 1, 2, [3,4], [5,6], gpk1, gpk2, 9, 10, { from: owner});
      console.log(`setStoremanGroupConfig estimate = ${gas1}`);
      receipt = await oracleDelegate.setStoremanGroupConfig(smgID, 1, 2, [3,4], [5,6], gpk1, gpk2, 9, 10, { from: owner});
      console.log(`setStoremanGroupConfig used = ${receipt.receipt.gasUsed}`);
      // // check setStoremanGroupConfig event log
      // const setStoremanGroupConfigEvent = receipt.logs[0].args;
      // assert.equal(web3.utils.padRight(web3.utils.bytesToHex(smgID), 64), setStoremanGroupConfigEvent.id);
      // assert.equal(1, setStoremanGroupConfigEvent.status.toNumber());
      // assert.equal(2, setStoremanGroupConfigEvent.deposit.toNumber());
      // assert.equal(3, setStoremanGroupConfigEvent.chain[0].toNumber());
      // assert.equal(4, setStoremanGroupConfigEvent.chain[1].toNumber());
      // assert.equal(5, setStoremanGroupConfigEvent.curve[0].toNumber());
      // assert.equal(6, setStoremanGroupConfigEvent.curve[1].toNumber());
      // assert.equal(web3.utils.bytesToHex(gpk1), setStoremanGroupConfigEvent.gpk1);
      // assert.equal(web3.utils.bytesToHex(gpk2), setStoremanGroupConfigEvent.gpk2);
      // assert.equal(9, setStoremanGroupConfigEvent.startTime.toNumber());
      // assert.equal(10, setStoremanGroupConfigEvent.endTime.toNumber());
      // check storage
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

      receipt = await oracleDelegate.setStoremanGroupStatus(smgID, 8, {from: owner});
      // // check SetStoremanGroupStatus event log
      // const setStoremanGroupStatusEvent = receipt.logs[0].args;
      // assert.equal(web3.utils.padRight(web3.utils.bytesToHex(smgID), 64), setStoremanGroupStatusEvent.id);
      // assert.equal(8, setStoremanGroupStatusEvent.status.toNumber());
      // check storage
      obj = await oracleDelegate.getStoremanGroupConfig(smgID);
      assert.equal(obj.status.toNumber(), 8);

      receipt = await oracleDelegate.setAdmin(white);
      // check SetAdmin event log
      const setAdminEvent = receipt.logs[0].args;
      assert.equal(setAdminEvent.addr, white);
      // check storage
      obj = await oracleDelegate.admin();
      assert.equal(obj, white);

      receipt = await oracleDelegate.updateDeposit(smgID, v + 111, { from: white });
      const amount2 = web3.utils.toBN(await oracleDelegate.getDeposit(smgID)).toNumber();
      assert.equal(v + 111, amount2);

      let isClean = await oracleDelegate.isDebtClean(smgID);
      assert.equal(isClean, false);

      receipt = await oracleDelegate.setDebtClean(smgID, true);
      // check SetDebtClean event log
      const setDebtClean = receipt.logs[0].args;
      console.log(JSON.stringify(setDebtClean));
      assert.equal(setDebtClean.id, web3.utils.padRight(web3.utils.bytesToHex(smgID), 64));
      assert.equal(setDebtClean.isDebtClean, true);
      // check storage
      isClean = await oracleDelegate.isDebtClean(smgID);
      assert.equal(isClean, true);

    })
  });

  describe('updatePrice', function() {
    it('onlyAdmin', async function() {
      const { oracleDelegate } = await newOracle(accounts);

      const obj = await sendAndGetReason(oracleDelegate.updatePrice, [[tokenDAI], [v]], {from: other});
      assert.equal(obj.reason, "not admin");
    });
    it('keys.length == prices.length', async function() {
      const { oracleDelegate } = await newOracle(accounts);

      let obj = await sendAndGetReason(oracleDelegate.updatePrice, [[tokenDAI], [v, v]], {from: owner});
      assert.equal(obj.reason, "length not same");
      obj = await sendAndGetReason(oracleDelegate.updatePrice, [[tokenDAI, tokenETH], [v]], {from: owner});
      assert.equal(obj.reason, "length not same");
    });

    it('success', async function() {
      const { oracleDelegate } = await newOracle(accounts);

      const obj = await oracleDelegate.updatePrice([tokenDAI, tokenETH, tokenBTC], [100, 200, 300], {from: owner});
      assert.equal(obj.receipt.status, true);
    });
  });

  describe('getValue', () => {
    it('success', async function() {
      const { oracleDelegate } = await newOracle(accounts);

      const v1 = 1600;
      const v2 = 1700; 
      await oracleDelegate.updatePrice([tokenDAI, tokenETH], [v1, v2], {from: owner});

      let value = web3.utils.toBN(await oracleDelegate.getValue(tokenDAI)).toNumber();
      assert.equal(value, v1);
      value = web3.utils.toBN(await oracleDelegate.getValue(tokenETH)).toNumber();
      assert.equal(value, v2);
    })
  })

  describe('getValues', () => {
    it('success', async function() {
      const { oracleDelegate } = await newOracle(accounts);

      const v1 = 1600;
      const v2 = 1700; 
      const v3 = 1800; 
      await oracleDelegate.updatePrice([tokenDAI, tokenETH, tokenBTC], [v1, v2, v3], {from: owner});
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