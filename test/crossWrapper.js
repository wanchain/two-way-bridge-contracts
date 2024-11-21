const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossWrapper", function () {
  let crossWrapper;
  let mockCross;
  let mockTokenManager;
  let mockERC20;
  let mockERC721;
  let mockERC1155;
  let owner;
  let addr1;

  // Test parameters
  const smgID = "0x1234567890123456789012345678901234567890123456789012345678901234";
  const tokenPairID = {
    ERC20: 1,
    ERC721: 2,
    ERC1155: 3
  };
  const value = ethers.utils.parseEther("1.0");
  const fee = ethers.utils.parseEther("0.1");
  const userAccount = "0x1234";
  const partner = "testPartner";
  const tokenIDs = [1, 2, 3];
  const tokenValues = [100, 200, 300];

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // First deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy();

    const MockERC721 = await ethers.getContractFactory("MockERC721");
    mockERC721 = await MockERC721.deploy();

    const MockERC1155 = await ethers.getContractFactory("MockERC1155");
    mockERC1155 = await MockERC1155.deploy();

    // Then deploy MockTokenManager with token addresses
    const MockTokenManager = await ethers.getContractFactory("MockTokenManager");
    mockTokenManager = await MockTokenManager.deploy(
      mockERC20.address,
      mockERC721.address,
      mockERC1155.address
    );

    // Deploy MockCross
    const MockCross = await ethers.getContractFactory("MockCrossV4");
    mockCross = await MockCross.deploy(mockTokenManager.address);

    // Deploy CrossWrapper
    const CrossWrapper = await ethers.getContractFactory("CrossWrapper");
    crossWrapper = await CrossWrapper.deploy(mockCross.address);

    // Setup mock tokens
    await mockERC20.mint(owner.address, ethers.utils.parseEther("1000"));
    await mockERC721.mint(owner.address, tokenIDs[0]);
    await mockERC721.mint(owner.address, tokenIDs[1]);
    await mockERC721.mint(owner.address, tokenIDs[2]);

    await mockERC1155.mint(owner.address, tokenIDs[0], tokenValues[0]);
    await mockERC1155.mint(owner.address, tokenIDs[1], tokenValues[1]);
    await mockERC1155.mint(owner.address, tokenIDs[2], tokenValues[2]);

    // Approve tokens
    await mockERC20.approve(crossWrapper.address, ethers.constants.MaxUint256);
    await mockERC721.setApprovalForAll(crossWrapper.address, true);
    await mockERC1155.setApprovalForAll(crossWrapper.address, true);
  });

  describe("userLock", function () {
    it("Should handle native token lock", async function () {
      const tx = await crossWrapper.userLock(
        smgID,
        tokenPairID.ERC20,
        value,
        userAccount,
        partner,
        { value: value }
      );

      await expect(tx)
        .to.emit(crossWrapper, "PartnerCross")
        .withArgs(partner);
    });

    it("Should handle ERC20 token lock", async function () {
      const amount = ethers.utils.parseEther("100");
      
      const tx = await crossWrapper.userLock(
        smgID,
        tokenPairID.ERC20,
        amount,
        userAccount,
        partner
      );

      await expect(tx)
        .to.emit(crossWrapper, "PartnerCross")
        .withArgs(partner);
    });
  });

  describe("userLockNFT", function () {
    it("Should handle ERC721 token lock", async function () {
      const tx = await crossWrapper.userLockNFT(
        smgID,
        tokenPairID.ERC721,
        tokenIDs,
        tokenValues,
        userAccount,
        partner
      );

      await expect(tx)
        .to.emit(crossWrapper, "PartnerCross")
        .withArgs(partner);
    });

    it("Should handle ERC1155 token lock", async function () {
      const tx = await crossWrapper.userLockNFT(
        smgID,
        tokenPairID.ERC1155,
        tokenIDs,
        tokenValues,
        userAccount,
        partner
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
        1,
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

  describe("userBurnNFT", function () {
    it("Should forward the call to cross contract and emit event", async function () {
      const tx = await crossWrapper.userBurnNFT(
        smgID,
        2,
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
