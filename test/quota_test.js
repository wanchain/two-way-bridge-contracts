const assert = require('assert');
const { getQuotaContracts, getWeb3, stringToBytes } = require('./utils');
const BigNumber = require('bignumber.js');
let web3 = getWeb3();

async function checkAsset(sc, tokenId, storemanGroupId, asset=0, receivable=0, payable=0) {
  let ret = await sc.methods.getAsset(tokenId, storemanGroupId).call();
  assert.strictEqual(ret.asset.toString(), asset.toString());
  assert.strictEqual(ret.asset_receivable.toString(), receivable.toString());
  assert.strictEqual(ret.asset_payable.toString(), payable.toString());
}

async function checkDebt(sc, tokenId, storemanGroupId, asset=0, receivable=0, payable=0) {
  let ret = await sc.methods.getDebt(tokenId, storemanGroupId).call();
  assert.strictEqual(ret.debt.toString(), asset.toString());
  assert.strictEqual(ret.debt_receivable.toString(), receivable.toString());
  assert.strictEqual(ret.debt_payable.toString(), payable.toString());
}

contract('Quota', accounts => {
  before(async () => {
  });

  it("should success when fastCrossChain", async () => {
    const SC = (await getQuotaContracts(accounts));
    const quota = SC.quota;
    let ret;
    let key = await quota.methods.getTokenKey(3).call();

    await checkAsset(quota, 1, web3.utils.keccak256("storeman1"));

    ret = await quota.methods.userLock(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas:1e7});
    await checkAsset(quota, 1, web3.utils.keccak256("storeman1"), 10000);

    console.log('1 ret');
    ret = await quota.methods.smgBurn(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas:1e7});
    await checkDebt(quota, 1, web3.utils.keccak256("storeman1"), 10000);
    
    console.log('2 ret');
    ret = await quota.methods.userBurn(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas:1e7});
    await checkDebt(quota, 1, web3.utils.keccak256("storeman1"), 5000);

    console.log('3 ret');
    ret = await quota.methods.smgBurn(1, web3.utils.keccak256("storeman1"), 5000).send({from: accounts[1], gas:1e7});
    await checkDebt(quota, 1, web3.utils.keccak256("storeman1"), 10000);

    console.log('4 ret');



    ret = await quota.methods.userLock(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas:1e7});
    await checkAsset(quota, 1, web3.utils.keccak256("storeman1"), 20000);


    console.log('9 ret');
    ret = await quota.methods.smgBurn(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas:1e7});
    await checkDebt(quota, 1, web3.utils.keccak256("storeman1"), 20000);

    console.log('10 ret');
    ret = await quota.methods.userLock(2, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas:1e7});
    await checkAsset(quota, 2, web3.utils.keccak256("storeman1"), 10000);

    console.log('11 ret');
    ret = await quota.methods.smgRelease(2, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas:1e7});
    await checkAsset(quota, 2, web3.utils.keccak256("storeman1"), 0);

    console.log('12 ret');
    ret = await quota.methods.userLock(3, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas:1e7});
    await checkAsset(quota, 3, web3.utils.keccak256("storeman1"), 10000);
    key = await quota.methods.getTokenKey(3).call();
    console.log('key', key);
    ret = await quota.methods.getQuotaMap(key, web3.utils.keccak256("storeman1")).call();
    console.log('quota', ret);

    console.log('13 ret');
    ret = await quota.methods.smgBurn(3, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas:1e7});
    await checkDebt(quota, 3, web3.utils.keccak256("storeman1"), 10000);
    console.log('14 ret');
    
    await quota.methods.setFastCrossMinValue(web3.utils.toWei('10')).send({from: accounts[0], gas:1e7});
    console.log('15 ret');

    ret = await quota.methods.getFastMinCount(1).call();
    console.log('16 ret', ret);

    try {
      ret = await quota.methods.userLock(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas:1e7});
      assert(false, 'Should never get here');
    } catch (error) {}
    let owner = await quota.methods.owner().call();
    console.log('owner', owner, accounts[0]);
    

    await quota.methods.upgrade(web3.utils.keccak256("storeman1")).send({from: accounts[0], gas:1e7});
    console.log('17 ret');
    await checkDebt(quota, 3, web3.utils.keccak256("storeman1"), 10000);
    await checkAsset(quota, 3, web3.utils.keccak256("storeman1"), 10000);
    ret = await quota.methods.getQuotaMap(key, web3.utils.keccak256("storeman1")).call();
    console.log(ret);
  });

  it("should success when upgrade", async ()=> {
    const SC = (await getQuotaContracts(accounts));
    const quota = SC.quota;
    ret = await quota.methods.userLock(1, web3.utils.keccak256("storeman1"), 10000).send({from: accounts[1], gas:1e7});
    await checkAsset(quota, 1, web3.utils.keccak256("storeman1"), 10000);
    await quota.methods.upgrade(web3.utils.keccak256("storeman1")).send({from: accounts[0], gas:1e7});
    console.log('17 ret');
  })

  it("should fail when value error", async () => {
    const SC = (await getQuotaContracts(accounts));
    const quota = SC.quota;
    let ret;

    ret = await quota.methods.isDebtClean(web3.utils.keccak256("storeman1")).call();
    assert.strictEqual(ret, true);

    const helper = SC.helper;
    await quota.methods.setDebtOracle(helper._address).send({from: accounts[0], gas: 1e7});

    ret = await quota.methods.isDebtClean(web3.utils.keccak256("storeman1")).call();
    assert.strictEqual(ret, false);



    await quota.methods.userLock(1, web3.utils.keccak256("storeman1"), 1000000).send({from: accounts[1], gas:1e7});
    await quota.methods.smgBurn(1, web3.utils.keccak256("storeman1"), 1000000).send({from: accounts[1], gas:1e7});
    ret = await quota.methods.isDebtClean(web3.utils.keccak256("storeman1")).call();
    assert.strictEqual(ret, false);
    await quota.methods.debtLock(web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman4")).send({from: accounts[1], gas:1e7});
    await quota.methods.debtRedeem(web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman4")).send({from: accounts[1], gas:1e7});
    ret = await quota.methods.isDebtClean(web3.utils.keccak256("storeman1")).call();
    assert.strictEqual(ret, false);
    await quota.methods.assetLock(web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman4")).send({from: accounts[1], gas:1e7});
    await quota.methods.assetRedeem(web3.utils.keccak256("storeman1"), web3.utils.keccak256("storeman4")).send({from: accounts[1], gas:1e7});
    ret = await quota.methods.isDebtClean(web3.utils.keccak256("storeman1")).call();
    assert.strictEqual(ret, true);

  });
});
