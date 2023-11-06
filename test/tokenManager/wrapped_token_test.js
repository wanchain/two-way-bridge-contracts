const WrappedToken = artifacts.require('WrappedToken');
const { assert } = require('chai');
const { sendAndGetReason } = require('../helper.js');
const { ERROR_INFO } = require('../crossApproach/common.js');

contract('TokenManager_wrappedToken', (accounts) => {
  let tokenSc;
  before("init ......", async() => {
    tokenSc = await WrappedToken.new("Test", "Test", "18");
  });

  describe("mint", () => {
    it("Ownable: caller is not the owner", async() => {
      let obj = await sendAndGetReason(tokenSc.mint, [accounts[0], "10000000000"], {from: accounts[2]});
      assert.include(obj.reason, "Ownable: caller is not the owner");
    });
  });

  describe("burn", () => {
    it("Ownable: caller is not the owner", async() => {
      try {
        const data = web3.eth.abi.encodeFunctionCall({
          name: 'burn',
          type: 'function',
          inputs: [{
              type: 'address',
              name: 'account_'
          },{
              type: 'uint256',
              name: 'value_'
          }]
        }, [accounts[2], "10000000000"]);
        await web3.eth.sendTransaction({from: accounts[2], to: tokenSc.address, data: data});
        assert.fail(ERROR_INFO)
      } catch (err) {
        console.log(err)
        assert.include(err.toString(), "Ownable: caller is not the owner");
      }
      // let obj = await sendAndGetReason(tokenSc.burn, [accounts[0], "10000000000"], {from: accounts[2]});
      // console.log(obj)
      // assert.include(obj.reason, "Ownable: caller is not the owner");
    });

    it("Value is null", async() => {
      try {
        const data = web3.eth.abi.encodeFunctionCall({
          name: 'burn',
          type: 'function',
          inputs: [{
              type: 'address',
              name: 'account_'
          },{
              type: 'uint256',
              name: 'value_'
          }]
        }, [accounts[2], "0"]);
        await web3.eth.sendTransaction({from: accounts[0], to: tokenSc.address, data: data});
        assert.fail(ERROR_INFO)
      } catch (err) {
        console.log(err)
        assert.include(err.toString(), "Value is null");
      }
      // let obj = await sendAndGetReason(tokenSc.burn, [accounts[0], "0"], {from: accounts[0]});
      // console.log(obj)
      // assert.include(obj.reason, "Value is null");
    });
  });

  describe("update", () => {
    it("Ownable: caller is not the owner", async() => {
      let obj = await sendAndGetReason(tokenSc.update, ["T1", "TT"], {from: accounts[2]});
      assert.include(obj.reason, "Ownable: caller is not the owner");
    });
  });

  describe("transferOwner", () => {
    it("Ownable: caller is not the owner", async() => {
      let obj = await sendAndGetReason(tokenSc.transferOwner, [accounts[2]], {from: accounts[2]});
      assert.include(obj.reason, "Ownable: caller is not the owner");
    });
  });

  describe("transfer", () => {
    it("to address incorrect", async() => {
      await tokenSc.mint(accounts[0], "10000000000");
      let obj = await sendAndGetReason(tokenSc.transfer, [tokenSc.address, "10000000000"], {from: accounts[0]});
      assert.include(obj.reason, "to address incorrect");
    });
  });

});
