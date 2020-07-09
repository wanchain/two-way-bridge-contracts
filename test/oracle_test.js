const OracleDelegate = artifacts.require('OracleDelegate');
const assert = require('assert');
const { sendAndGetReason } = require("./helper");
const from = require('../truffle').networks.development.from;

contract('Oracle', (accounts) => {
  const [owner_bk, white_bk, other] = accounts;
  const owner = from ? from : owner_bk;
  const white = white_bk.toLowerCase() === owner.toLowerCase() ? owner_bk : white_bk;
  let oracleDelegate = null;

  before("init", async () => {
    oracleDelegate = await OracleDelegate.deployed();
    await oracleDelegate.addWhitelist(white);
  })

  describe('normal', () => {
    it('good oracle example', async function() {
      await oracleDelegate.updatePrice([tokenSymbol], [v], { from: white });
      const value = web3.utils.toBN(await oracleDelegate.getValue(tokenSymbol)).toNumber();
      const values = (await oracleDelegate.getValues([tokenSymbol])).map(i => {return web3.utils.toBN(i).toNumber();});

      assert.equal(value, v);
      assert.equal(values[0], v);
    })
  });
})