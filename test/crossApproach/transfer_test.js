const TestTransfer = artifacts.require("TestTransfer.sol");
const { assert } = require("chai");

const {
  ADDRESS_0,
  ERROR_INFO,
} = require("./common");
const { web3 } = require("hardhat");


exports.testCases = () => {
  describe("Cross_Transfer", function () {
    let sc
    before("deploy contract", async () => {
      sc = await TestTransfer.new();
    });
    it("Transfer revert with transfer failed", async () => {
      try {
        await sc.transfer(sc.address, global.aliceAccount.WAN, web3.utils.toBN("100"));
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "transfer failed");
      }
    });
    it("Transfer revert with transferFrom failed", async () => {
      try {
        await sc.transferFrom(sc.address, global.aliceAccount.WAN, global.aliceAccount.WAN, web3.utils.toBN("100"));
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "transferFrom failed");
      }
    });
  });
}