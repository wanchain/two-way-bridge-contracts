const assert = require('assert');
const { getQuotaContracts, getWeb3, stringToBytes } = require('./utils');
const BigNumber = require('bignumber.js');
let web3 = getWeb3();

contract('Quota', accounts => {
  before(async () => {
  });

  it('should success when getMintQuota', async () => {
    const SC = (await getQuotaContracts(accounts));
    const quota = SC.quota;
    let ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    console.log('quota:', ret);
    assert.equal(ret, 1418837, "1");

    ret = await quota.methods.getMintQuota(0, web3.utils.keccak256("storeman1")).call();
    console.log('quota:', ret);
    assert.equal(ret, "1000000000000000000000", "0");
    
    ret = await quota.methods.getMintQuota(2, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, '577959183673469387', "2");

    ret = await quota.methods.getMintQuota(10, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, '0', "3");

    ret = await quota.methods.getMintQuota(1, web3.utils.fromAscii("0xb")).call();
    assert.equal(ret, '0', "4");

    ret = await quota.methods.mintLock(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1408837, "5");

    const helper = SC.helper;
    await helper.methods.setValue("WAN", 100).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 0, "6");
    ret = await helper.methods.getValue(stringToBytes("WAN")).call();
    // console.log('price:', ret, "7");
  });

  it('should success when getBurnQuota', async () => {
    const quota = (await getQuotaContracts(accounts)).quota;
    let ret = await quota.methods.getBurnQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, '0', "8");
  });

  it("should succes when run workflow", async () => {
    const SC = (await getQuotaContracts(accounts));
    const quota = SC.quota;

    ret = await quota.methods.mintLock(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1408837, "9");

    // ----- mint -------
    ret = await quota.methods.mintRedeem(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1408837, "10");

    ret = await quota.methods.mintLock(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1398837, "11");

    ret = await quota.methods.mintRevoke(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1408837, "12");

    // ------ burn --------
    ret = await quota.methods.burnLock(1, web3.utils.keccak256("storeman1"), 5000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1408837, "13");

    ret = await quota.methods.burnRedeem(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1413837, "14");

    ret = await quota.methods.burnLock(1, web3.utils.keccak256("storeman1"), 5000, false).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1413837, "15");

    ret = await quota.methods.burnRevoke(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1413837, "16");

    ret = await quota.methods.burnLock(1, web3.utils.keccak256("storeman1"), 5000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.burnRedeem(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas: 1e7});


    // -------- debt -----------

    ret = await quota.methods.mintLock(1, web3.utils.keccak256("storeman3"), 10000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.mintRedeem(1, web3.utils.keccak256("storeman3"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.burnLock(1, web3.utils.keccak256("storeman3"), 10000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.burnRedeem(1, web3.utils.keccak256("storeman3"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman3")).call();
    assert.equal(Number(ret), 1418837, "17");

    ret = await quota.methods.mintLock(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.mintRedeem(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 1408837, "18");

    ret = await quota.methods.debtLock( web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.debtRedeem( web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 1418837, "19");
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman3")).call();
    assert.equal(Number(ret), 1408837, "20");


    ret = await quota.methods.mintLock(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.mintRedeem(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 1408837, "21");

    ret = await quota.methods.debtLock( web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.debtRevoke( web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 1408837, "22");
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman3")).call();
    assert.equal(Number(ret), 1408837, "23");

  });

  it("should success when fastCrossChain", async () => {
    const SC = (await getQuotaContracts(accounts));
    const quota = SC.quota;
    let ret;
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 1418837, "24");
    ret = await quota.methods.fastMint(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas:1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 1408837, "25");
    ret = await quota.methods.getBurnQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 10000, "26");
    ret = await quota.methods.burnLock(1, web3.utils.keccak256("storeman1"), 5000, true).send({from: accounts[1], gas:1e7});
    try {
      ret = await quota.methods.fastBurn(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas:1e7});
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }
    ret = await quota.methods.burnRevoke(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas:1e7});
    ret = await quota.methods.fastBurn(1, web3.utils.keccak256("storeman1"), 10000, false).send({from: accounts[1], gas:1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 1418837, "27");

    const helper = SC.helper;
    await helper.methods.setValue("WAN", "224000").send({from: accounts[1], gas: 1e7});
    await helper.methods.setValue("ETH", "221900000").send({from: accounts[1], gas: 1e7});
    await helper.methods.setValue("BTC", "9000000000").send({from: accounts[1], gas: 1e7});
    await helper.methods.setValue("ETC", "200000000").send({from: accounts[1], gas: 1e7});


    ret = await quota.methods.fastMint(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas:1e7});
    ret = await quota.methods.fastMint(2, web3.utils.keccak256("storeman1"), 10000, false).send({from: accounts[1], gas:1e7});
    ret = await quota.methods.mintLock(3, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas:1e7});

    try {
      await quota.methods.debtLock(web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman4")).send({from: accounts[1], gas:1e7});
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    await quota.methods.mintRedeem(3, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas:1e7});

    await quota.methods.fastBurn(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas:1e7});
    await quota.methods.fastBurn(2, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas:1e7});

    await quota.methods.debtLock(web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas:1e7});
    await quota.methods.debtRedeem(web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas:1e7});

    await quota.methods.debtLock(web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas:1e7});
    await quota.methods.debtRevoke(web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas:1e7});

    try {
      await quota.methods.fastBurn(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[3], gas:1e7});
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

  });

  it("should fail when value error", async () => {
    const SC = (await getQuotaContracts(accounts));
    const quota = SC.quota;
    let ret;

    ret = await quota.methods.getMintQuota(1000, web3.utils.keccak256("storeman1000")).call();
    assert.equal(Number(ret), 0, "28");

    try {
      await quota.methods.mintLock(1, web3.utils.keccak256("storeman1"), "100000000", true).send({from: accounts[1], gas:1e7});
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    await quota.methods.mintLock(1, web3.utils.keccak256("storeman1"), "100000000", false).send({from: accounts[1], gas:1e7});
    await quota.methods.mintRedeem(1, web3.utils.keccak256("storeman1"), "100000000").send({from: accounts[1], gas: 1e7});
    await quota.methods.fastBurn(1, web3.utils.keccak256("storeman1"), "100000000", true).send({from: accounts[1], gas: 1e7});

    try {
      await quota.methods.fastMint(1, web3.utils.keccak256("storeman1"), "100000000", true).send({from: accounts[1], gas:1e7});
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    await quota.methods.fastMint(1, web3.utils.keccak256("storeman1"), "100000000", false).send({from: accounts[1], gas:1e7});

    await quota.methods.fastBurn(1, web3.utils.keccak256("storeman1"), "100000000", true).send({from: accounts[1], gas:1e7});

    try {
      await quota.methods.fastBurn(1, web3.utils.keccak256("storeman1"), "100000000", true).send({from: accounts[1], gas:1e7});
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    try {
      await quota.methods.burnLock(1, web3.utils.keccak256("storeman1"), "100000000", true).send({from: accounts[1], gas:1e7});
      assert(false, 'Should never get here');
    } catch (e) {
      assert.ok(e.message.match(/revert/));
    }

    await quota.methods.burnLock(1, web3.utils.keccak256("storeman1"), "100000000", false).send({from: accounts[1], gas:1e7});
    await quota.methods.burnRevoke(1, web3.utils.keccak256("storeman1"), "100000000").send({from: accounts[1], gas:1e7});


    await quota.methods.fastMint(1, web3.utils.keccak256("storeman1"), 1000000, true).send({from: accounts[1], gas:1e7});
    ret = await quota.methods.isDebtClean(web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, false);
    await quota.methods.debtLock(web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman4")).send({from: accounts[1], gas:1e7});
    await quota.methods.debtRedeem(web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman4")).send({from: accounts[1], gas:1e7});
    ret = await quota.methods.isDebtClean(web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, true);

  });
});
