const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossWrapper", function () {
  let crossWrapper;
  let mockCross;
  let owner;
  let addr1;

  // Test parameters
  const smgID =
    "0x1234567890123456789012345678901234567890123456789012345678901234";
  const tokenPairID = 1;
  const value = ethers.utils.parseEther("1.0");
  const fee = ethers.utils.parseEther("0.1");
  const userAccount = "0x1234";
  const partner = "testPartner";
  const tokenIDs = [1, 2, 3];
  const tokenValues = [100, 200, 300];

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy MockCrossV4
    const MockCross = await ethers.getContractFactory("MockCrossV4");
    mockCross = await MockCross.deploy();
    await mockCross.deployed();

    // Deploy CrossWrapper
    const CrossWrapper = await ethers.getContractFactory("CrossWrapper");
    crossWrapper = await CrossWrapper.deploy(mockCross.address);
    await crossWrapper.deployed();
  });

  describe("Constructor", function () {
    it("Should set the correct cross contract address", async function () {
      expect(await crossWrapper.cross()).to.equal(mockCross.address);
    });
  });

  describe("userLock", function () {
    it("Should forward the call to cross contract and emit event", async function () {
      const tx = await crossWrapper.userLock(
        smgID,
        tokenPairID,
        value,
        userAccount,
        partner,
        { value: value }
      );

      await expect(tx)
        .to.emit(crossWrapper, "PartnerCross")
        .withArgs(partner);
    });
  });

  describe("userBurn", function () {
    it("Should forward the call to cross contract and emit event", async function () {
      const tx = await crossWrapper.userBurn(
        smgID,
        tokenPairID,
        value,
        fee,
        addr1.address,
        userAccount,
        partner,
        { value: value }
      );

      await expect(tx)
        .to.emit(crossWrapper, "PartnerCross")
        .withArgs(partner);
    });
  });

  describe("userLockNFT", function () {
    it("Should forward the call to cross contract and emit event", async function () {
      const tx = await crossWrapper.userLockNFT(
        smgID,
        tokenPairID,
        tokenIDs,
        tokenValues,
        userAccount,
        partner,
        { value: value }
      );

      await expect(tx)
        .to.emit(crossWrapper, "PartnerCross")
        .withArgs(partner);
    });
  });

  describe("userBurnNFT", function () {
    it("Should forward the call to cross contract and emit event", async function () {
      const tx = await crossWrapper.userBurnNFT(
        smgID,
        tokenPairID,
        tokenIDs,
        tokenValues,
        addr1.address,
        userAccount,
        partner,
        { value: value }
      );

      await expect(tx)
        .to.emit(crossWrapper, "PartnerCross")
        .withArgs(partner);
    });
  });
});
