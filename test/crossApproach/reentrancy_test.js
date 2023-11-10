const FakeReentrancy = artifacts.require("FakeReentrancy.sol");
const { assert } = require("chai");

const {
  ERROR_INFO,
} = require("./common");
const { web3 } = require("hardhat");


exports.testCases = () => {
  describe("Cross_ReentrancyGuard", function () {
    let sc
    before("deploy contract", async () => {
      sc = await FakeReentrancy.new();
    });
    it("ReentrancyGuard: reentrant call", async () => {
      try {
        await sc.countLocalRecursive(2);
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "ReentrancyGuard: reentrant call");
      }
    });

    it("FakeReentrancy: failed call", async () => {
      try {
        await sc.countThisRecursive(2);
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "FakeReentrancy: failed call");
      }
    });
  });
}