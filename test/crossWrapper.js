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

  describe("Constructor", function () {
    it("Should correctly initialize contract state", async function () {
      expect(await crossWrapper.cross()).to.equal(mockCross.address);
      expect(await crossWrapper.tokenManager()).to.equal(mockTokenManager.address);
      expect(await crossWrapper.currentChainID()).to.equal(await mockCross.currentChainID());
    });
  });

  describe("userLock", function () {
    it("Should handle native token lock", async function () {
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const mockCrossBalanceBefore = await ethers.provider.getBalance(mockCross.address);
      
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
        .withArgs(partner, partner);
      
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      const mockCrossBalanceAfter = await ethers.provider.getBalance(mockCross.address);
      
      // 验证发送者余额减少了 value + gas费用
      expect(balanceAfter).to.equal(balanceBefore.sub(value).sub(gasCost));
      // 验证接收合约余额增加了 value
      expect(mockCrossBalanceAfter).to.equal(mockCrossBalanceBefore.add(value));
    });

    it("Should handle ERC20 token lock", async function () {
      const amount = ethers.utils.parseEther("100");
      
      const balanceBefore = await mockERC20.balanceOf(owner.address);
      await crossWrapper.userLock(
        smgID,
        tokenPairID.ERC20,
        amount,
        userAccount,
        partner
      );
      const balanceAfter = await mockERC20.balanceOf(owner.address);
      expect(balanceAfter).to.equal(balanceBefore.sub(amount));
    });

    it("Should revert with invalid token pair ID", async function () {
      const invalidTokenPairID = 999;
      await expect(crossWrapper.userLock(
        smgID,
        invalidTokenPairID,
        value,
        userAccount,
        partner
      )).to.be.revertedWith("Invalid token pair ID");
    });
  });

  describe("userBurn", function () {
    it("Should handle native token burn", async function () {
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await crossWrapper.userBurn(
        smgID,
        tokenPairID.ERC20,
        value,
        fee,
        addr1.address,
        userAccount,
        partner,
        { value: value }
      );

      await expect(tx)
        .to.emit(crossWrapper, "PartnerCross")
        .withArgs(partner, partner);
      
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      expect(balanceAfter).to.be.lt(balanceBefore.sub(value));
    });

    it("Should handle ERC20 token burn", async function () {
      const amount = ethers.utils.parseEther("100");
      
      const balanceBefore = await mockERC20.balanceOf(owner.address);
      await crossWrapper.userBurn(
        smgID,
        tokenPairID.ERC20,
        amount,
        fee,
        addr1.address,
        userAccount,
        partner
      );
      const balanceAfter = await mockERC20.balanceOf(owner.address);
      expect(balanceAfter).to.equal(balanceBefore.sub(amount));
    });

    it("Should revert with invalid token pair ID", async function () {
      const invalidTokenPairID = 999;
      await expect(crossWrapper.userBurn(
        smgID,
        invalidTokenPairID,
        value,
        fee,
        addr1.address,
        userAccount,
        partner
      )).to.be.revertedWith("Invalid token pair ID");
    });
  });

  describe("userLockNFT", function () {
    it("Should handle ERC721 token lock", async function () {
      const tokenId = tokenIDs[0];

      const tx = await crossWrapper.userLockNFT(
        smgID,
        tokenPairID.ERC721,
        [tokenId],
        [1],
        userAccount,
        partner
      );

      expect(await mockERC721.ownerOf(tokenId)).to.equal(crossWrapper.address);
      expect(await mockERC721.isApprovedForAll(crossWrapper.address, mockCross.address))
        .to.be.true;
      await expect(tx)
        .to.emit(crossWrapper, "PartnerCross")
        .withArgs(partner, partner);
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

      for (let i = 0; i < tokenIDs.length; i++) {
        expect(await mockERC1155.balanceOf(crossWrapper.address, tokenIDs[i]))
          .to.equal(tokenValues[i]);
      }
      expect(await mockERC1155.isApprovedForAll(crossWrapper.address, mockCross.address))
        .to.be.true;
    });

    it("Should revert with invalid NFT type", async function () {
      await expect(crossWrapper.userLockNFT(
        smgID,
        tokenPairID.ERC20,
        tokenIDs,
        tokenValues,
        userAccount,
        partner
      )).to.be.revertedWith("Invalid NFT type");
    });
  });

  describe("userBurnNFT", function () {
    it("Should handle ERC721 token burn", async function () {
      const tokenId = tokenIDs[0];

      const tx = await crossWrapper.userBurnNFT(
        smgID,
        tokenPairID.ERC721,
        [tokenId],
        [1],
        addr1.address,
        userAccount,
        partner
      );

      expect(await mockERC721.ownerOf(tokenId)).to.equal(crossWrapper.address);
      await expect(tx)
        .to.emit(crossWrapper, "PartnerCross")
        .withArgs(partner, partner);
    });

    it("Should handle ERC1155 token burn", async function () {
      const tx = await crossWrapper.userBurnNFT(
        smgID,
        tokenPairID.ERC1155,
        tokenIDs,
        tokenValues,
        addr1.address,
        userAccount,
        partner
      );

      for (let i = 0; i < tokenIDs.length; i++) {
        expect(await mockERC1155.balanceOf(crossWrapper.address, tokenIDs[i]))
          .to.equal(tokenValues[i]);
      }
    });

    it("Should revert with invalid NFT type", async function () {
      await expect(crossWrapper.userBurnNFT(
        smgID,
        tokenPairID.ERC20,
        tokenIDs,
        tokenValues,
        addr1.address,
        userAccount,
        partner
      )).to.be.revertedWith("Invalid NFT type");
    });
  });

  describe("NFT Receiver Functions", function () {
    it("Should support ERC721 receiver interface", async function () {
      // ERC721Holder implements IERC721Receiver
      const ERC721_RECEIVER_INTERFACE_ID = "0x150b7a02";
      const isSupported = await crossWrapper.supportsInterface(ERC721_RECEIVER_INTERFACE_ID);
      expect(isSupported).to.be.true;
    });

    it("Should support ERC1155 receiver interface", async function () {
      // ERC1155Holder implements IERC1155Receiver
      const ERC1155_RECEIVER_INTERFACE_ID = "0x4e2312e0";
      const isSupported = await crossWrapper.supportsInterface(ERC1155_RECEIVER_INTERFACE_ID);
      expect(isSupported).to.be.true;
    });

    // 添加对 ERC165 接口支持的测试
    it("Should support ERC165 interface", async function () {
      const ERC165_INTERFACE_ID = "0x01ffc9a7";
      const isSupported = await crossWrapper.supportsInterface(ERC165_INTERFACE_ID);
      expect(isSupported).to.be.true;
    });
  });

  describe("Internal Functions through External Interactions", function () {
    it("Should correctly handle token address retrieval for fromChainID", async function () {
      // This is tested through the userLock and userBurn functions
      // Add specific test if the internal function is exposed for testing
    });

    it("Should correctly handle token address retrieval for toChainID", async function () {
      // This is tested through the userLock and userBurn functions
      // Add specific test if the internal function is exposed for testing
    });
  });
});
