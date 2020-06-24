const assert = require('assert');
const { getContracts, getWeb3, stringToBytes } = require('./utils');
const BigNumber = require('bignumber.js');
let web3 = getWeb3();

contract('Quota', accounts => {
  before(async () => {
  });

  it.only('should success when getMintQuota', async () => {
    const SC = (await getContracts(accounts));
    const quota = SC.quota;
    let ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1418837, "1");
    
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
    await helper.methods.setValue(stringToBytes("WAN"), 100).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 0, "6");
    ret = await helper.methods.getValue(stringToBytes("WAN")).call();
    console.log('price:', ret, "7");
  });

  it('should success when getBurnQuota', async () => {
    const quota = (await getContracts(accounts)).quota;
    let ret = await quota.methods.getBurnQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, '0', "8");
  });

  it("should succes when run workflow", async () => {
    const SC = (await getContracts(accounts));
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
    ret = await quota.methods.burnLock(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1408837, "13");

    ret = await quota.methods.burnRedeem(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1413837, "14");

    ret = await quota.methods.burnLock(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1413837, "15");

    ret = await quota.methods.burnRevoke(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(ret, 1413837, "16");

    ret = await quota.methods.burnLock(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.burnRedeem(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas: 1e7});


    // -------- debt -----------
    console.log('debt0');

    ret = await quota.methods.mintLock(1, web3.utils.keccak256("storeman3"), 10000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.mintRedeem(1, web3.utils.keccak256("storeman3"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.burnLock(1, web3.utils.keccak256("storeman3"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.burnRedeem(1, web3.utils.keccak256("storeman3"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman3")).call();
    assert.equal(Number(ret), 1418837, "17");

    ret = await quota.methods.mintLock(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.mintRedeem(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 1408837, "18");

    console.log('debt1');

    ret = await quota.methods.debtLock(1, 10000, web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.debtRedeem(1, 10000, web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 1418837, "19");
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman3")).call();
    assert.equal(Number(ret), 1408837, "20");

    console.log('debt2');


    ret = await quota.methods.mintLock(1, web3.utils.keccak256("storeman1"), 10000, true).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.mintRedeem(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 1408837, "21");

    ret = await quota.methods.debtLock(1, 10000, web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.debtRevoke(1, 10000, web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman3")).send({from: accounts[1], gas: 1e7});
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman1")).call();
    assert.equal(Number(ret), 1408837, "22");
    ret = await quota.methods.getMintQuota(1, web3.utils.keccak256("storeman3")).call();
    assert.equal(Number(ret), 1408837, "23");

  });
});
