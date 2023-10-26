const { assert } = require("chai");
const utils = require("./utils");

/* global describe it artifacts */
const TestBasicStorage = artifacts.require('TestBasicStorage.sol')

async function deploy(sol, address) {
  let contract;
  if (!await sol.isDeployed()) {
    contract = await utils.deployContract(sol, { from: address });
  } else {
    contract = await utils.contractAt(sol, sol.address);
  }
  assert.exists(contract);
  return contract;
}

async function initContracts(accounts) {
  let sender = accounts[0];
  assert.exists(TestBasicStorage);

  let testBasicStorage = await deploy(TestBasicStorage, sender);
  assert.exists(testBasicStorage);

  return testBasicStorage;
}

contract('BasicStorage', async (accounts) => {
  let testBasicStorage;
  before("init contracts", async() => {
    testBasicStorage = await initContracts(accounts);
  });

  it ('set/get/delete uint data, it should success', async() => {
    let uintData = "99999999";
    let key = web3.utils.toHex("testData");
    let innerkey = web3.utils.toHex("uintData");

    await testBasicStorage.setUintData(key, innerkey, uintData);
    let data = await testBasicStorage.getUintData.call(key, innerkey);
    assert.strictEqual(uintData, data.toString(10));

    await testBasicStorage.delUintData(key, innerkey);
    data = await testBasicStorage.getUintData.call(key, innerkey);
    assert.notDeepEqual(uintData, data.toString(10));
  });

  it ('set out of range uint data, it should throw error', async() => {
    let uintData = "999999999999999999999999999999999999";
    let key = web3.utils.toHex("testData");
    let innerkey = web3.utils.toHex("uintData");

    await testBasicStorage.setUintData(key, innerkey, uintData);
  });

  it ('set/get/delete bool data, it should success', async() => {
    let boolData = true;
    let key = web3.utils.toHex("testData");
    let innerkey = web3.utils.toHex("boolData");

    await testBasicStorage.setBoolData(key, innerkey, boolData);
    let data = await testBasicStorage.getBoolData.call(key, innerkey);
    assert.strictEqual(boolData, data);
    await testBasicStorage.delBoolData(key, innerkey);
    data = await testBasicStorage.getBoolData.call(key, innerkey);
    assert.notDeepEqual(boolData, data);
  });

  it ('set/get/delete address data, it should success', async() => {
    let addressData = accounts[0];
    let key = web3.utils.toHex("testData");
    let innerkey = web3.utils.toHex("bytesData");

    await testBasicStorage.setAddressData(key, innerkey, addressData);
    let data = await testBasicStorage.getAddressData.call(key, innerkey);
    assert.strictEqual(addressData, data);
    await testBasicStorage.delAddressData(key, innerkey);
    data = await testBasicStorage.getAddressData.call(key, innerkey);
    assert.notDeepEqual(addressData, data);
  });

  it ('set/get/delete bytes data, it should success', async() => {
    let bytesData = accounts[0];
    let key = web3.utils.toHex("testData");
    let innerkey = web3.utils.toHex("bytesData");

    await testBasicStorage.setBytesData(key, innerkey, bytesData);
    let data = await testBasicStorage.getBytesData.call(key, innerkey);
    assert.strictEqual(bytesData.toLowerCase(), data.toLowerCase());
    await testBasicStorage.delBytesData(key, innerkey);
    data = await testBasicStorage.getBytesData.call(key, innerkey);
    assert.notExists(data);
  });

  it ('set/get/delete string data, it should success', async() => {
    let stringData = accounts[0];
    let key = web3.utils.toHex("testData");
    let innerkey = web3.utils.toHex("stringData");

    await testBasicStorage.setStringData(key, innerkey, stringData);
    let data = await testBasicStorage.getStringData.call(key, innerkey);
    assert.strictEqual(stringData, data);
    await testBasicStorage.delStringData(key, innerkey);
    data = await testBasicStorage.getStringData.call(key, innerkey);
    assert.notDeepEqual(stringData, data);
  });

});