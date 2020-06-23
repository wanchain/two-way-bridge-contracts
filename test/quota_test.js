const assert = require('assert');
const { getContracts, getWeb3, stringToBytes } = require('./utils');
const BigNumber = require('bignumber.js');

contract('Quota', accounts => {
  before(async () => {
  });

  it('should success when getMintQuota', async () => {
    const SC = (await getContracts(accounts));
    const quota = SC.quota;
    let ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, 1418837);
    
    ret = await quota.methods.getMintQuota(2, stringToBytes("0xa")).call();
    assert.equal(ret, '577959183673469387');

    ret = await quota.methods.getMintQuota(10, stringToBytes("0xa")).call();
    assert.equal(ret, '0');

    ret = await quota.methods.getMintQuota(1, stringToBytes("0xb")).call();
    assert.equal(ret, '0');

    ret = await quota.methods.mintLock(1, stringToBytes("0xa"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, 1408837);

    const helper = SC.helper;
    await helper.methods.setValue(stringToBytes("WAN"), 100).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, 0);
    ret = await helper.methods.getValue(stringToBytes("WAN")).call();
    console.log('price:', ret);
  });

  it('should success when getBurnQuota', async () => {
    const quota = (await getContracts(accounts)).quota;
    let ret = await quota.methods.getBurnQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, '0');
  });

  it("should succes when run workflow", async () => {
    const SC = (await getContracts(accounts));
    const quota = SC.quota;

    ret = await quota.methods.mintLock(1, stringToBytes("0xa"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, 1408837);

    // ----- mint -------
    ret = await quota.methods.mintRedeem(1, stringToBytes("0xa"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, 1408837);

    ret = await quota.methods.mintLock(1, stringToBytes("0xa"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, 1398837);

    ret = await quota.methods.mintRevoke(1, stringToBytes("0xa"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, 1408837);

    // ------ burn --------
    ret = await quota.methods.burnLock(1, stringToBytes("0xa"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, 1408837);

    ret = await quota.methods.burnRedeem(1, stringToBytes("0xa"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, 1413837);

    ret = await quota.methods.burnLock(1, stringToBytes("0xa"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, 1413837);

    ret = await quota.methods.burnRevoke(1, stringToBytes("0xa"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(ret, 1413837);

    ret = await quota.methods.burnLock(1, stringToBytes("0xa"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.burnRedeem(1, stringToBytes("0xa"), 5000).send({from: accounts[1], gas: 1e7});


    // -------- debt -----------
    console.log('debt0');

    ret = await quota.methods.mintLock(1, stringToBytes("0xc"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.mintRedeem(1, stringToBytes("0xc"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.burnLock(1, stringToBytes("0xc"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.burnRedeem(1, stringToBytes("0xc"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xc")).call();
    assert.equal(Number(ret), 1418837);

    ret = await quota.methods.mintLock(1, stringToBytes("0xa"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.mintRedeem(1, stringToBytes("0xa"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(Number(ret), 1408837);

    console.log('debt1');

    ret = await quota.methods.debtLock(1, 10000, stringToBytes("0xa"), stringToBytes("0xc")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.debtRedeem(1, 10000, stringToBytes("0xa"), stringToBytes("0xc")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(Number(ret), 1418837, "1");
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xc")).call();
    assert.equal(Number(ret), 1408837, "2");

    console.log('debt2');


    ret = await quota.methods.mintLock(1, stringToBytes("0xa"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.mintRedeem(1, stringToBytes("0xa"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(Number(ret), 1408837, "3");

    ret = await quota.methods.debtLock(1, 10000, stringToBytes("0xa"), stringToBytes("0xc")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.debtRevoke(1, 10000, stringToBytes("0xa"), stringToBytes("0xc")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xa")).call();
    assert.equal(Number(ret), 1408837, "4");
    ret = await quota.methods.getMintQuota(1, stringToBytes("0xc")).call();
    assert.equal(Number(ret), 1408837, "5");

  });
});
