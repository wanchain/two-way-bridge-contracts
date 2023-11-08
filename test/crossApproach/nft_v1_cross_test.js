const CrossProxy = artifacts.require("CrossProxy");
const CrossDelegateV4 = artifacts.require("CrossDelegateV4");
const TokenManagerDelegate = artifacts.require("TokenManagerDelegateV2");

const {
  ADDRESS_0,
  ERROR_INFO,
  uniqueInfo,
  chainTypes,
  defaultCurve2Schnorr,
} = require("./common");

const { skInfo, storemanGroupStatus } = require("./smg-config");

const { filterTokenPair, getTokenAccount } = require("./token-config");

const {
  assert,
  testInit,
  getTxParsedLogs,
  getEventSignature,
  getCrossChainFee,
  resetCrossChainFee
} = require("./lib");

const {
  getRC20TokenInstance,
  getNftTokenInstance,
  buildMpcSign,
} = require("../utils");

const { typesArrayList } = require("./sc-config");
const { web3 } = require("hardhat");

const minerFee = 5;
const tokenCrossType = 1;
const tokenIDs = [1, 2, 3, 4, 5];
const tokenValues = [1, 1, 1, 1, 1];
//const tokenIDs = [1];
//const tokenValues = [1];

exports.testCases = () => {
  describe("Cross_NFT", function () {
    // NFT ...
    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @ethereum] <( ethereum => wanchain )> -> userLockNFT  ==> Smart contract is halted", async () => {
      let crossProxy;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

        const currentToken = global.chains[currentChainType].nftTokens.filter(
          (token) => token.symbol === "NFT"
        )[0];
        // halt
        crossProxy = await CrossProxy.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        await crossProxy.setHalt(true, { from: global.contractOwner });

      // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          currentToken.symbol
        );

        const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        const tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        await cross.setTokenPairFees([[tokenPairID, contractFee]], {
          from: currentChainAdmin,
        });
        assert.equal(
          contractFee.eq(
            web3.utils.toBN(await cross.getTokenPairFee(tokenPairID))
          ),
          true,
          "fee of token pair error"
        );

        const currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        if (
          !web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(tokenCrossType)],
            { from: global.operatorAccount[currentChainType] }
          );
        }

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        // get token instance
        let tokenInstance = await getNftTokenInstance(tokenAccount);
        let balances = await tokenInstance.balanceOf(senderAccount);
        assert.equal(
          parseInt(balances.toString()),
          tokenIDs.length,
          true,
          "before userLockNFT check cross balance error"
        );

        // approve
        for (idx = 0; idx < tokenIDs.length; ++idx) {
          await tokenInstance.approve(cross.address, tokenIDs[idx], {
            from: senderAccount,
          });
          let approved = await tokenInstance.getApproved(tokenIDs[idx]);
          assert.equal(approved, cross.address, "check approved fail");
        }

        // exec
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          userAccount: userAccount,
        };
        await cross.userLockNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: moreServiceFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
      } finally {
        await crossProxy.setHalt(false, { from: global.contractOwner });
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @ethereum] <( ethereum => wanchain )> -> userLockNFT  ==> Not ready", async () => {
      let smg;
      let funcParams;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

        const currentToken = global.chains[currentChainType].nftTokens.filter(
          (token) => token.symbol === "NFT"
        )[0];

      // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          currentToken.symbol
        );

        const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        const tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        await cross.setTokenPairFees([[tokenPairID, contractFee]], {
          from: currentChainAdmin,
        });
        assert.equal(
          contractFee.eq(
            web3.utils.toBN(await cross.getTokenPairFee(tokenPairID))
          ),
          true,
          "fee of token pair error"
        );

        const currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        if (
          !web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(tokenCrossType)],
            { from: global.operatorAccount[currentChainType] }
          );
        }

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        // get token instance
        let tokenInstance = await getNftTokenInstance(tokenAccount);
        let balances = await tokenInstance.balanceOf(senderAccount);
        assert.equal(
          parseInt(balances.toString()),
          tokenIDs.length,
          true,
          "before userLockNFT check cross balance error"
        );

        // approve
        for (idx = 0; idx < tokenIDs.length; ++idx) {
          await tokenInstance.approve(cross.address, tokenIDs[idx], {
            from: senderAccount,
          });
          let approved = await tokenInstance.getApproved(tokenIDs[idx]);
          assert.equal(approved, cross.address, "check approved fail");
        }
        // exec
        funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          userAccount: userAccount,
        };

        // smg status
        smg = await global.getSmgProxy(
          currentChainType,
          partners.smgAdminProxy
        );
        await smg.setStoremanGroupStatus(
          funcParams.smgID,
          storemanGroupStatus.unregistered
        );

        await cross.userLockNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: moreServiceFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "PK is not ready");
      } finally {
        if (smg) {
          await smg.setStoremanGroupStatus(
            funcParams.smgID,
            storemanGroupStatus.ready
          );
        }
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @ethereum] <( ethereum => wanchain )> -> userLockNFT  ==> Invalid length", async () => {
      let tokenManager;
      let tokenPairID;
      let currTokenCrossType;
      let operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const bitcoinChainType = chainTypes.BTC;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

      // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          bitcoinChainType,
          buddyChainType,
          global.chains[bitcoinChainType].coin.symbol
        );

        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        operator = global.operatorAccount[currentChainType];
        if (
          !web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(tokenCrossType)],
            { from: operator }
          );
        }

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        // exec
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: [],
          tokenValues: tokenValues,
          userAccount: userAccount,
        };

        await cross.userLockNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: moreServiceFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Invalid length");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(currTokenCrossType)],
          { from: operator }
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @ethereum] <( ethereum => wanchain )> -> userLockNFT  ==> Length mismatch", async () => {
      let tokenManager;
      let tokenPairID;
      let currTokenCrossType;
      let operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const bitcoinChainType = chainTypes.BTC;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

      // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          bitcoinChainType,
          buddyChainType,
          global.chains[bitcoinChainType].coin.symbol
        );

        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        operator = global.operatorAccount[currentChainType];
        if (
          !web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(tokenCrossType)],
            { from: operator }
          );
        }

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        // exec
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues.concat(["6"]),
          userAccount: userAccount,
        };

        await cross.userLockNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: moreServiceFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Length mismatch");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(currTokenCrossType)],
          { from: operator }
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @ethereum] <( ethereum => wanchain )> -> userLockNFT  ==> Invalid token pair", async () => {
      let tokenManager;
      let tokenPairID;
      let currTokenCrossType;
      let operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const bitcoinChainType = chainTypes.BTC;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

      // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          bitcoinChainType,
          buddyChainType,
          global.chains[bitcoinChainType].coin.symbol
        );

        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        operator = global.operatorAccount[currentChainType];
        if (
          !web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(tokenCrossType)],
            { from: operator }
          );
        }

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        // exec
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          userAccount: userAccount,
        };

        await cross.userLockNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: moreServiceFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Invalid token pair");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(currTokenCrossType)],
          { from: operator }
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @ethereum] <( ethereum => wanchain )> -> userLockNFT  ==> Invalid NFT type", async () => {
      let tokenManager;
      let tokenPairID;
      let operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

        const currentToken = global.chains[currentChainType].nftTokens.filter(
          (token) => token.symbol === "NFT"
        )[0];

      // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          currentToken.symbol
        );

        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        await cross.setTokenPairFees([[tokenPairID, contractFee]], {
          from: currentChainAdmin,
        });
        assert.equal(
          contractFee.eq(
            web3.utils.toBN(await cross.getTokenPairFee(tokenPairID))
          ),
          true,
          "fee of token pair error"
        );

        operator = global.operatorAccount[currentChainType];
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN("0")],
          { from: operator }
        );

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        // get token instance
        let tokenInstance = await getNftTokenInstance(tokenAccount);
        let balances = await tokenInstance.balanceOf(senderAccount);
        assert.equal(
          parseInt(balances.toString()),
          tokenIDs.length,
          true,
          "before userLockNFT check cross balance error"
        );

        // approve
        for (idx = 0; idx < tokenIDs.length; ++idx) {
          await tokenInstance.approve(cross.address, tokenIDs[idx], {
            from: senderAccount,
          });
          let approved = await tokenInstance.getApproved(tokenIDs[idx]);
          assert.equal(approved, cross.address, "check approved fail");
        }
        // exec
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          userAccount: userAccount,
        };

        await cross.userLockNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: moreServiceFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Invalid NFT type");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(tokenCrossType)],
          { from: operator }
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @ethereum] <( ethereum => wanchain )> -> userLockNFT  ==> Token does not exist", async () => {
      let tokenManager;
      let tokenPairID;
      let operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

      // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        tokenPairID = 1000;

        operator = global.operatorAccount[currentChainType];
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN("1")],
          { from: operator }
        );

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        // exec
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          userAccount: userAccount,
        };

        await cross.userLockNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: 100,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Token does not exist");
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @ethereum] <( ethereum => wanchain )> -> userLockNFT  ==> success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.ETH;
      const buddyChainType = chainTypes.WAN;
      const smgID = global.storemanGroups.src.ID;
      const userAccount = wanUserAccount;
      const senderAccount = ethUserAccount;
      const currentChainAdmin = global.adminAccount[currentChainType];

      const currentToken = global.chains[currentChainType].nftTokens.filter(
        (token) => token.symbol === "NFT"
      )[0];

      // cross
      const cross = await CrossDelegateV4.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );
      const partners = await cross.getPartners();

      // tokenAccount
      const tokenPair = filterTokenPair(
        global.tokenPairs,
        currentChainType,
        buddyChainType,
        currentToken.symbol
      );

      const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
      const tokenPairInfo = await tokenManager.getTokenPairInfo(
        tokenPair.tokenPairID
      );
      const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
      const tokenPairID = tokenPair.tokenPairID;

      const crossChainFee = await getCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      });
      const contractFee = web3.utils.toBN(crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      await resetCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      }, currentChainAdmin);

      await cross.setTokenPairFees([[tokenPairID, contractFee]], {
        from: currentChainAdmin,
      });
      assert.equal(
        contractFee.eq(
          web3.utils.toBN(await cross.getTokenPairFee(tokenPairID))
        ),
        true,
        "fee of token pair error"
      );
      await cross.setTokenPairFees([[tokenPairID, "0"]], {
        from: currentChainAdmin,
      });

      const currTokenCrossType = await tokenManager.mapTokenPairType(
        tokenPairID
      );
      if (
        !web3.utils.toBN(currTokenCrossType).eq(
          web3.utils.toBN(tokenCrossType)
        )
      ) {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(tokenCrossType)],
          { from: global.operatorAccount[currentChainType] }
        );
      }

      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeFeeProxyBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );

      // get token instance
      let tokenInstance = await getNftTokenInstance(tokenAccount);
      let balances = await tokenInstance.balanceOf(senderAccount);
      assert.equal(
        parseInt(balances.toString()),
        tokenIDs.length,
        true,
        "before userLockNFT check cross balance error"
      );

      // approve
      for (idx = 0; idx < tokenIDs.length; ++idx) {
        await tokenInstance.approve(cross.address, tokenIDs[idx], {
          from: senderAccount,
        });
        let approved = await tokenInstance.getApproved(tokenIDs[idx]);
        assert.equal(approved, cross.address, "check approved fail");
      }

      await cross.setFee({
        srcChainID: global.chains[currentChainType].ID,
        destChainID: "0",
        contractFee:contractFee.toString(10),
        agentFee:"0"
      }, {from: currentChainAdmin});
      // await cross.setFee([global.chains[currentChainType].ID, "0", contractFee, "0"], {from: await cross.admin()});
      let batchFee = web3.utils.toBN(await cross.getBatchFee(tokenPairID, tokenIDs.length));
      let moreBatchFee = batchFee.mul(web3.utils.toBN(2));

      // exec
      let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenIDs: tokenIDs,
        tokenValues: tokenValues,
        userAccount: userAccount,
      };
      let receipt = await cross.userLockNFT(...Object.values(funcParams), {
        from: senderAccount,
        value: moreBatchFee,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].NFTLib,
          receipt.tx
        );
      }

      const eventUserLockNFT = assert.getWeb3Log(receipt, {
        event: "UserLockNFT",
      });
      assert.equal(
        !!eventUserLockNFT === true,
        true,
        "get event UserLockNFT error"
      );
      assert.equal(
        eventUserLockNFT.args.smgID,
        funcParams.smgID,
        "event UserLockNFT smgID error"
      );
      assert.equal(
        eventUserLockNFT.args.tokenPairID,
        funcParams.tokenPairID,
        "event UserLockNFT tokenPairID error"
      );
      assert.equal(
        eventUserLockNFT.args.keys.length,
        eventUserLockNFT.args.values.length,
        "invalid UserLockNFT keys and values length"
      );

      const eventUserLockNFTParams = eventUserLockNFT.args.keys.reduce(
        (reduced, next, index) => {
          const [paramName, paramType] = next.split(":");
          reduced[paramName] = {};
          reduced[paramName].type = paramType;
          reduced[paramName].value = eventUserLockNFT.args.values[index];
          return reduced;
        },
        {}
      );

      assert.equal(
        eventUserLockNFTParams.userAccount.type,
        "bytes",
        "invalid UserLockNFT userAccount type"
      );
      assert.equal(
        eventUserLockNFTParams.userAccount.value.toLowerCase(),
        funcParams.userAccount.toLowerCase(),
        "invalid UserLockNFT userAccount value"
      );
      assert.equal(
        eventUserLockNFTParams.contractFee.type,
        "uint256",
        "invalid UserLockNFT contractFee type"
      );
      assert.equal(
        eventUserLockNFTParams.tokenIDs.type,
        "uint256[]",
        "invalid UserLockNFT tokenIDs type"
      );
      assert.equal(
        eventUserLockNFTParams.tokenValues.type,
        "uint256[]",
        "invalid UserLockNFT tokenValues type"
      );

      let decodeTokenIDs = web3.eth.abi.decodeParameters(
        ["uint256[]"],
        eventUserLockNFTParams.tokenIDs.value
      );
      assert.equal(
        !!decodeTokenIDs[0] === true,
        true,
        "UserLockNFT tokenIDs error"
      );
      decodeTokenIDs = decodeTokenIDs[0];
      assert.equal(
        decodeTokenIDs.length,
        tokenIDs.length,
        "invalid UserLockNFT tokenIDs length"
      );
      for (idx = 0; idx < decodeTokenIDs.length; ++idx) {
        assert.equal(
          parseInt(decodeTokenIDs[idx]),
          tokenIDs[idx],
          "invalid UserLockNFT tokenIDs value!"
        );
      }

      let decodeTokenValues = web3.eth.abi.decodeParameters(
        ["uint256[]"],
        eventUserLockNFTParams.tokenValues.value
      );
      assert.equal(
        !!decodeTokenValues[0] === true,
        true,
        "UserLockNFT tokenValues error"
      );
      decodeTokenValues = decodeTokenValues[0];
      assert.equal(
        decodeTokenValues.length,
        tokenValues.length,
        "invalid UserLockNFT tokenValues length"
      );
      for (idx = 0; idx < decodeTokenValues.length; ++idx) {
        assert.equal(
          parseInt(decodeTokenValues[idx]),
          tokenValues[idx],
          "invalid UserLockNFT tokenValues value!"
        );
      }

      balances = await tokenInstance.balanceOf(senderAccount);
      assert.equal(
        parseInt(balances.toString()),
        0,
        true,
        "after UserLockNFT check user balance error"
      );

      balances = await tokenInstance.balanceOf(cross.address);
      assert.equal(
        parseInt(balances.toString()),
        tokenIDs.length,
        true,
        "after UserLockNFT check cross balance error"
      );

      const afterFeeProxyBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );

      assert.equal(
        afterFeeProxyBalance
          .sub(beforeFeeProxyBalance)
          .eq(batchFee),
        true,
        "balance of storeman fee error"
      );
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @wanchain] <( ethereum => wanchain )> -> smgMintNFT  ==>  Smart contract is halted", async () => {
      let crossProxy;
      try{ 
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const uniqueID = uniqueInfo.userLockNFT;
        const smgID = global.storemanGroups.src.ID;
        const userAccount = wanUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];
        const currentToken = global.chains[buddyChainType].nftTokens.filter(
          (token) => token.symbol === "NFT"
        )[0];

        // halt
        crossProxy = await CrossProxy.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        await crossProxy.setHalt(true, { from: global.contractOwner });

        // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          currentToken.symbol
        );
        const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        const tokenPairID = tokenPair.tokenPairID;

        const crossFee = web3.utils.toBN(0);

        const currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        if (
          !web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(tokenCrossType)],
            { from: global.operatorAccount[currentChainType] }
          );
        }

        let tokenInstance = await getNftTokenInstance(tokenAccount);
        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        let balance = await tokenInstance.balanceOf(wanUserAccount);
        assert.equal(
          parseInt(balance.toString()),
          0,
          "before check user balance"
        );

        let funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          extData: "0x00",
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        let smg = await global.getSmgProxy(
          currentChainType,
          partners.smgAdminProxy
        );
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let { R, s } = buildMpcSign(
          global.schnorr[defaultCurve2Schnorr[Number(curveID)]],
          sk,
          typesArrayList.smgMintNFT,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.tokenIDs,
          funcParams.tokenValues,
          funcParams.extData,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgMintNFT(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
      } finally {
        await crossProxy.setHalt(false, { from: global.contractOwner });
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @wanchain] <( ethereum => wanchain )> -> smgMintNFT  ==>  Invalid NFT type", async () => {
      let tokenManager;
      let tokenPairID;
      let operator;
      try{ 
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const uniqueID = uniqueInfo.userLockNFT;
        const smgID = global.storemanGroups.src.ID;
        const userAccount = wanUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];
        const currentToken = global.chains[buddyChainType].nftTokens.filter(
          (token) => token.symbol === "NFT"
        )[0];

        // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          currentToken.symbol
        );
        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        tokenPairID = tokenPair.tokenPairID;
        operator = global.operatorAccount[currentChainType];

        const currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        if (
          web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(50)],
            { from: operator }
          );
        }

        let tokenInstance = await getNftTokenInstance(tokenAccount);
        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        let balance = await tokenInstance.balanceOf(wanUserAccount);
        assert.equal(
          parseInt(balance.toString()),
          0,
          "before check user balance"
        );

        let funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          extData: "0x00",
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        let smg = await global.getSmgProxy(
          currentChainType,
          partners.smgAdminProxy
        );
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let { R, s } = buildMpcSign(
          global.schnorr[defaultCurve2Schnorr[Number(curveID)]],
          sk,
          typesArrayList.smgMintNFT,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.tokenIDs,
          funcParams.tokenValues,
          funcParams.extData,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgMintNFT(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Invalid NFT type");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(tokenCrossType)],
          { from: operator }
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @wanchain] <( ethereum => wanchain )> -> smgMintNFT  ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.WAN;
      const buddyChainType = chainTypes.ETH;
      const uniqueID = uniqueInfo.userLockNFT;
      const smgID = global.storemanGroups.src.ID;
      const userAccount = wanUserAccount;
      const senderAccount = global.smgAccount.src[currentChainType];
      const currentToken = global.chains[buddyChainType].nftTokens.filter(
        (token) => token.symbol === "NFT"
      )[0];

      // cross
      const cross = await CrossDelegateV4.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );
      const partners = await cross.getPartners();

      // tokenAccount
      const tokenPair = filterTokenPair(
        global.tokenPairs,
        currentChainType,
        buddyChainType,
        currentToken.symbol
      );
      const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
      const tokenPairInfo = await tokenManager.getTokenPairInfo(
        tokenPair.tokenPairID
      );
      const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
      const tokenPairID = tokenPair.tokenPairID;

      const crossFee = web3.utils.toBN(0);

      const currTokenCrossType = await tokenManager.mapTokenPairType(
        tokenPairID
      );
      if (
        !web3.utils.toBN(currTokenCrossType).eq(
          web3.utils.toBN(tokenCrossType)
        )
      ) {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(tokenCrossType)],
          { from: global.operatorAccount[currentChainType] }
        );
      }

      let tokenInstance = await getNftTokenInstance(tokenAccount);
      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }

      let balance = await tokenInstance.balanceOf(wanUserAccount);
      assert.equal(
        parseInt(balance.toString()),
        0,
        "before check user balance"
      );

      let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenIDs: tokenIDs,
        tokenValues: tokenValues,
        extData: "0x00",
        tokenAccount: tokenAccount,
        userAccount: userAccount,
      };

      let smg = await global.getSmgProxy(
        currentChainType,
        partners.smgAdminProxy
      );
      let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
      let curveID = smgConfig.curve1;
      let sk = skInfo.src[currentChainType];

      // sign
      let { R, s } = buildMpcSign(
        global.schnorr[defaultCurve2Schnorr[Number(curveID)]],
        sk,
        typesArrayList.smgMintNFT,
        await cross.currentChainID(),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.tokenIDs,
        funcParams.tokenValues,
        funcParams.extData,
        funcParams.tokenAccount,
        funcParams.userAccount
      );
      funcParams = { ...funcParams, R: R, s: s };

      let receipt = await cross.smgMintNFT(...Object.values(funcParams), {
        from: senderAccount,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].NFTLib,
          receipt.tx
        );
      }

      const eventSmgMintNFT = assert.getWeb3Log(receipt, {
        event: "SmgMintNFT",
      });
      assert.equal(
        !!eventSmgMintNFT === true,
        true,
        "get event SmgMintNFT error"
      );
      assert.equal(
        eventSmgMintNFT.args.uniqueID,
        funcParams.uniqueID,
        "event SmgMintNFT uniqueID error"
      );
      assert.equal(
        eventSmgMintNFT.args.smgID,
        funcParams.smgID,
        "event SmgMintNFT smgID error"
      );
      assert.equal(
        eventSmgMintNFT.args.tokenPairID,
        funcParams.tokenPairID,
        "event SmgMintNFT tokenPairID error"
      );
      assert.equal(
        eventSmgMintNFT.args.keys.length,
        eventSmgMintNFT.args.values.length,
        "invalid SmgMintNFT keys and values length"
      );

      const eventSmgMintNFTParams = eventSmgMintNFT.args.keys.reduce(
        (reduced, next, index) => {
          const [paramName, paramType] = next.split(":");
          reduced[paramName] = {};
          reduced[paramName].type = paramType;
          reduced[paramName].value = eventSmgMintNFT.args.values[index];
          return reduced;
        },
        {}
      );

      assert.equal(
        eventSmgMintNFTParams.userAccount.type,
        "address",
        "invalid SmgMintNFT userAccount type"
      );
      assert.equal(
        eventSmgMintNFTParams.userAccount.value.toLowerCase(),
        funcParams.userAccount.toLowerCase(),
        "invalid SmgMintNFT userAccount value"
      );

      assert.equal(
        eventSmgMintNFTParams.tokenAccount.type,
        "address",
        "invalid SmgMintNFT tokenAccount type"
      );
      assert.equal(
        eventSmgMintNFTParams.tokenAccount.value.toLowerCase(),
        funcParams.tokenAccount.toLowerCase(),
        "invalid SmgMintNFT tokenAccount value"
      );

      assert.equal(
        eventSmgMintNFTParams.extData.type,
        "bytes",
        "invalid SmgMintNFT extData type"
      );
      assert.equal(
        eventSmgMintNFTParams.extData.value.toLowerCase(),
        funcParams.extData.toLowerCase(),
        "invalid SmgMintNFT extData value"
      );

      assert.equal(
        eventSmgMintNFTParams.tokenIDs.type,
        "uint256[]",
        "invalid SmgMintNFT tokenIDs type"
      );
      assert.equal(
        eventSmgMintNFTParams.tokenValues.type,
        "uint256[]",
        "invalid SmgMintNFT tokenValues type"
      );

      let idx = 0;
      let decodeTokenIDs = web3.eth.abi.decodeParameters(
        ["uint256[]"],
        eventSmgMintNFTParams.tokenIDs.value
      );
      assert.equal(
        !!decodeTokenIDs[0] === true,
        true,
        "SmgMintNFT tokenIDs error"
      );
      decodeTokenIDs = decodeTokenIDs[0];
      assert.equal(
        decodeTokenIDs.length,
        tokenIDs.length,
        "invalid SmgMintNFT tokenIDs length"
      );
      for (idx = 0; idx < decodeTokenIDs.length; ++idx) {
        assert.equal(
          parseInt(decodeTokenIDs[idx]),
          tokenIDs[idx],
          "invalid SmgMintNFT tokenIDs value!"
        );
      }

      let decodeTokenValues = web3.eth.abi.decodeParameters(
        ["uint256[]"],
        eventSmgMintNFTParams.tokenValues.value
      );
      assert.equal(
        !!decodeTokenValues[0] === true,
        true,
        "SmgMintNFT tokenValues error"
      );
      decodeTokenValues = decodeTokenValues[0];
      assert.equal(
        decodeTokenValues.length,
        tokenValues.length,
        "invalid SmgMintNFT tokenValues length"
      );
      for (idx = 0; idx < decodeTokenValues.length; ++idx) {
        assert.equal(
          parseInt(decodeTokenValues[idx]),
          tokenValues[idx],
          "invalid SmgMintNFT tokenValues value!"
        );
      }

      balance = await tokenInstance.balanceOf(wanUserAccount);
      assert.equal(
        parseInt(balance.toString()),
        tokenIDs.length,
        "after check user balance"
      );
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @wanchain] <( wanchain => ethereum )> -> userBurnNFT ==>  Smart contract is halted", async () => {
      let crossProxy;
      try{ 
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const minerFeeToWei = web3.utils.toWei(minerFee.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;
        const currentToken = global.chains[buddyChainType].nftTokens.filter(
          (token) => token.symbol === "NFT"
        )[0];

        // halt
        crossProxy = await CrossProxy.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        await crossProxy.setHalt(true, { from: global.contractOwner });

        // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          currentToken.symbol
        );
        const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        const tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        const currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        if (
          !web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(tokenCrossType)],
            { from: global.operatorAccount[currentChainType] }
          );
        }

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }
        const beforeFeeProxyBalance = web3.utils.toBN(
          await web3.eth.getBalance(smgFeeProxy)
        );

        // approve
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        let tokenInstance = await getNftTokenInstance(funcParams.tokenAccount);
        let balance = await tokenInstance.balanceOf(senderAccount);
        assert.equal(
          tokenIDs.length,
          parseInt(balance.toString()),
          "before userBurn check balance:",
          balance
        );
        for (let i = 0; i < tokenIDs.length; ++i) {
          let owner = await tokenInstance.ownerOf(tokenIDs[i]);
        }

        // approve
        let idx;
        for (idx = 0; idx < tokenIDs.length; ++idx) {
          await tokenInstance.approve(cross.address, tokenIDs[idx], {
            from: senderAccount,
          });
          let approved = await tokenInstance.getApproved(tokenIDs[idx]);
          assert.equal(approved, cross.address, "check approved fail");
        }
        let batchFee = await cross.getBatchFee(tokenPairID, tokenIDs.length);

        // exec
        await cross.userBurnNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: batchFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
      } finally {
        await crossProxy.setHalt(false, { from: global.contractOwner });
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @wanchain] <( wanchain => ethereum )> -> userBurnNFT ==>  Not ready", async () => {
      let smg;
      let funcParams;
      try{ 
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const minerFeeToWei = web3.utils.toWei(minerFee.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;
        const currentToken = global.chains[buddyChainType].nftTokens.filter(
          (token) => token.symbol === "NFT"
        )[0];

        // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );

        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          currentToken.symbol
        );
        const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        const tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        const currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        if (
          !web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(tokenCrossType)],
            { from: global.operatorAccount[currentChainType] }
          );
        }

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        // approve
        funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        // smg status
        smg = await global.getSmgProxy(
          currentChainType,
          partners.smgAdminProxy
        );
        await smg.setStoremanGroupStatus(
          funcParams.smgID,
          storemanGroupStatus.unregistered
        );

        let tokenInstance = await getNftTokenInstance(funcParams.tokenAccount);
        let balance = await tokenInstance.balanceOf(senderAccount);
        assert.equal(
          tokenIDs.length,
          parseInt(balance.toString()),
          "before userBurn check balance:",
          balance
        );

        // approve
        let idx;
        for (idx = 0; idx < tokenIDs.length; ++idx) {
          await tokenInstance.approve(cross.address, tokenIDs[idx], {
            from: senderAccount,
          });
          let approved = await tokenInstance.getApproved(tokenIDs[idx]);
          assert.equal(approved, cross.address, "check approved fail");
        }
        let batchFee = await cross.getBatchFee(tokenPairID, tokenIDs.length);

        // exec
        await cross.userBurnNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: batchFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "PK is not ready");
      } finally {
        if (smg) {
          await smg.setStoremanGroupStatus(
            funcParams.smgID,
            storemanGroupStatus.ready
          );
        }
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @wanchain] <( wanchain => ethereum )> -> userBurnNFT ==>  Invalid length", async () => {
      let tokenManager;
      let tokenPairID;
      let currTokenCrossType;
      let operator;
      try{ 
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const bitcoinChainType = chainTypes.BTC;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const minerFeeToWei = web3.utils.toWei(minerFee.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;
        const currentToken = global.chains[buddyChainType].nftTokens.filter(
          (token) => token.symbol === "NFT"
        )[0];

        // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[currentChainType].coin.symbol
        );
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, buddyChainType);
        tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        operator = global.operatorAccount[currentChainType];
        if (
          !web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(tokenCrossType)],
            { from: operator }
          );
        }

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: [],
          tokenValues: [],
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        let batchFee = await cross.getBatchFee(tokenPairID, tokenIDs.length);

        // exec
        await cross.userBurnNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: batchFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Invalid length");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(currTokenCrossType)],
          { from: operator }
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @wanchain] <( wanchain => ethereum )> -> userBurnNFT ==>  Length mismatch", async () => {
      let tokenManager;
      let tokenPairID;
      let currTokenCrossType;
      let operator;
      try{ 
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const bitcoinChainType = chainTypes.BTC;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const minerFeeToWei = web3.utils.toWei(minerFee.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;

        // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[currentChainType].coin.symbol
        );
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, buddyChainType);
        tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        operator = global.operatorAccount[currentChainType];
        if (
          !web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(tokenCrossType)],
            { from: operator }
          );
        }

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues.concat(["6"]),
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        let batchFee = await cross.getBatchFee(tokenPairID, tokenIDs.length);

        // exec
        await cross.userBurnNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: batchFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Length mismatch");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(currTokenCrossType)],
          { from: operator }
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @wanchain] <( wanchain => ethereum )> -> userBurnNFT ==>  Invalid token pair", async () => {
      let tokenManager;
      let tokenPairID;
      let currTokenCrossType;
      let operator;
      try{ 
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const bitcoinChainType = chainTypes.BTC;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const minerFeeToWei = web3.utils.toWei(minerFee.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;

        // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          bitcoinChainType,
          buddyChainType,
          global.chains[bitcoinChainType].coin.symbol
        );
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, buddyChainType);
        tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        currTokenCrossType = await tokenManager.mapTokenPairType(
          tokenPairID
        );
        operator = global.operatorAccount[currentChainType];
        if (
          !web3.utils.toBN(currTokenCrossType).eq(
            web3.utils.toBN(tokenCrossType)
          )
        ) {
          await tokenManager.setTokenPairTypes(
            [tokenPairID],
            [web3.utils.toBN(tokenCrossType)],
            { from: operator }
          );
        }

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        let batchFee = await cross.getBatchFee(tokenPairID, tokenIDs.length);

        // exec
        await cross.userBurnNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: batchFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Invalid token pair");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(currTokenCrossType)],
          { from: operator }
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @wanchain] <( wanchain => ethereum )> -> userBurnNFT ==>  Invalid NFT type", async () => {
      let tokenManager;
      let tokenPairID;
      let operator;
      try{ 
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const minerFeeToWei = web3.utils.toWei(minerFee.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;
        const currentToken = global.chains[buddyChainType].nftTokens.filter(
          (token) => token.symbol === "NFT"
        )[0];

        // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          currentToken.symbol
        );
        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        tokenPairID = tokenPair.tokenPairID;
        operator = global.operatorAccount[currentChainType];

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN("0")],
          { from: operator }
        );

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        // approve
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        let tokenInstance = await getNftTokenInstance(funcParams.tokenAccount);
        let balance = await tokenInstance.balanceOf(senderAccount);
        assert.equal(
          tokenIDs.length,
          parseInt(balance.toString()),
          "before userBurn check balance:",
          balance
        );

        let batchFee = await cross.getBatchFee(tokenPairID, tokenIDs.length);

        // exec
        await cross.userBurnNFT(...Object.values(funcParams), {
          from: senderAccount,
          value: batchFee,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Invalid NFT type");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(tokenCrossType)],
          { from: operator }
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @wanchain] <( wanchain => ethereum )> -> userBurnNFT ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.WAN;
      const buddyChainType = chainTypes.ETH;
      const smgID = global.storemanGroups.src.ID;
      const minerFeeToWei = web3.utils.toWei(minerFee.toString());
      const userAccount = ethUserAccount;
      const senderAccount = wanUserAccount;
      const currentToken = global.chains[buddyChainType].nftTokens.filter(
        (token) => token.symbol === "NFT"
      )[0];

      // cross
      const cross = await CrossDelegateV4.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );
      const partners = await cross.getPartners();

      // tokenAccount
      const tokenPair = filterTokenPair(
        global.tokenPairs,
        currentChainType,
        buddyChainType,
        currentToken.symbol
      );
      const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
      const tokenPairInfo = await tokenManager.getTokenPairInfo(
        tokenPair.tokenPairID
      );
      const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
      const tokenPairID = tokenPair.tokenPairID;

      const crossChainFee = await getCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      });
      const contractFee = web3.utils.toBN(crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

      const currTokenCrossType = await tokenManager.mapTokenPairType(
        tokenPairID
      );
      if (
        !web3.utils.toBN(currTokenCrossType).eq(
          web3.utils.toBN(tokenCrossType)
        )
      ) {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(tokenCrossType)],
          { from: global.operatorAccount[currentChainType] }
        );
      }

      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeFeeProxyBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );

      // approve
      let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenIDs: tokenIDs,
        tokenValues: tokenValues,
        tokenAccount: tokenAccount,
        userAccount: userAccount,
      };

      let tokenInstance = await getNftTokenInstance(funcParams.tokenAccount);
      let balance = await tokenInstance.balanceOf(senderAccount);
      assert.equal(
        tokenIDs.length,
        parseInt(balance.toString()),
        "before userBurn check balance:",
        balance
      );
      for (let i = 0; i < tokenIDs.length; ++i) {
        let owner = await tokenInstance.ownerOf(tokenIDs[i]);
      }

      // approve
      let idx;
      for (idx = 0; idx < tokenIDs.length; ++idx) {
        await tokenInstance.approve(cross.address, tokenIDs[idx], {
          from: senderAccount,
        });
        let approved = await tokenInstance.getApproved(tokenIDs[idx]);
        assert.equal(approved, cross.address, "check approved fail");
      }
      let batchFee = web3.utils.toBN(await cross.getBatchFee(tokenPairID, tokenIDs.length));
      let moreBatchFee = batchFee.mul(web3.utils.toBN(2));

      // exec
      let receipt = await cross.userBurnNFT(...Object.values(funcParams), {
        from: senderAccount,
        value: moreBatchFee,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].NFTLib,
          receipt.tx
        );
      }

      const eventUserBurnNFT = assert.getWeb3Log(receipt, {
        event: "UserBurnNFT",
      });
      assert.equal(
        !!eventUserBurnNFT === true,
        true,
        "get event UserBurnNFT error"
      );
      assert.equal(
        eventUserBurnNFT.args.smgID,
        funcParams.smgID,
        "event UserBurnNFT smgID error"
      );
      assert.equal(
        eventUserBurnNFT.args.tokenPairID,
        funcParams.tokenPairID,
        "event UserBurnNFT tokenPairID error"
      );
      assert.equal(
        eventUserBurnNFT.args.keys.length,
        eventUserBurnNFT.args.values.length,
        "invalid UserBurnNFT keys and values length"
      );

      const eventUserBurnNFTParams = eventUserBurnNFT.args.keys.reduce(
        (reduced, next, index) => {
          const [paramName, paramType] = next.split(":");
          reduced[paramName] = {};
          reduced[paramName].type = paramType;
          reduced[paramName].value = eventUserBurnNFT.args.values[index];
          return reduced;
        },
        {}
      );

      assert.equal(
        eventUserBurnNFTParams.userAccount.type,
        "bytes",
        "invalid UserBurnNFT userAccount type"
      );
      assert.equal(
        eventUserBurnNFTParams.userAccount.value.toLowerCase(),
        funcParams.userAccount.toLowerCase(),
        "invalid UserBurnNFT userAccount value"
      );
      assert.equal(
        eventUserBurnNFTParams.contractFee.type,
        "uint256",
        "invalid UserBurnNFT contractFee type"
      );
      assert.equal(
        eventUserBurnNFTParams.tokenIDs.type,
        "uint256[]",
        "invalid UserBurnNFT tokenIDs type"
      );
      assert.equal(
        eventUserBurnNFTParams.tokenValues.type,
        "uint256[]",
        "invalid UserBurnNFT tokenValues type"
      );

      let decodeTokenIDs = web3.eth.abi.decodeParameters(
        ["uint256[]"],
        eventUserBurnNFTParams.tokenIDs.value
      );
      assert.equal(
        !!decodeTokenIDs[0] === true,
        true,
        "UserBurnNFT tokenIDs error"
      );
      decodeTokenIDs = decodeTokenIDs[0];
      assert.equal(
        decodeTokenIDs.length,
        tokenIDs.length,
        "invalid UserBurnNFT tokenIDs length"
      );
      for (idx = 0; idx < decodeTokenIDs.length; ++idx) {
        assert.equal(
          parseInt(decodeTokenIDs[idx]),
          tokenIDs[idx],
          "invalid UserBurnNFT tokenIDs value!"
        );
      }

      let decodeTokenValues = web3.eth.abi.decodeParameters(
        ["uint256[]"],
        eventUserBurnNFTParams.tokenValues.value
      );
      assert.equal(
        !!decodeTokenValues[0] === true,
        true,
        "UserBurnNFT tokenValues error"
      );
      decodeTokenValues = decodeTokenValues[0];
      assert.equal(
        decodeTokenValues.length,
        tokenValues.length,
        "invalid UserBurnNFT tokenValues length"
      );
      for (idx = 0; idx < decodeTokenValues.length; ++idx) {
        assert.equal(
          parseInt(decodeTokenValues[idx]),
          tokenValues[idx],
          "invalid UserBurnNFT tokenValues value!"
        );
      }

      balance = await tokenInstance.balanceOf(senderAccount);
      assert.equal(
        0,
        parseInt(balance),
        "after check userBurnNFT balanceOf error idx:",
        idx,
        ",balance:",
        balance
      );

      const afterFeeProxyBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );
      assert.equal(
        afterFeeProxyBalance
          .sub(beforeFeeProxyBalance)
          .eq(web3.utils.toBN(batchFee)),
        true,
        "balance of storeman fee error"
      );
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  Smart contract is halted", async () => {
      let crossProxy;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const uniqueID = uniqueInfo.userReleaseNFT;
        const smgID = global.storemanGroups.src.ID;
        const userAccount = ethUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];
        const currentToken = global.chains[currentChainType].nftTokens.filter(
          (token) => token.symbol === "NFT"
        )[0];

        // halt
        crossProxy = await CrossProxy.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        await crossProxy.setHalt(true, { from: global.contractOwner });

        // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          currentToken.symbol
        );
        const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        const tokenPairID = tokenPair.tokenPairID;

        //const fee = await cross.getFee({ srcChainID: global.chains[currentChainType].ID, destChainID: global.chains[buddyChainType].ID });
        //const crossFee = web3.utils.toBN(fee.agentFee).mul(web3.utils.toBN(crossValueToWei)).div(web3.utils.toBN(DENOMINATOR));
        const crossFee = web3.utils.toBN(0);
        //const crossValueActually = web3.utils.toBN(crossValueToWei).sub(crossFee);

        // const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
        // if (!web3.utils.toBN(currTokenCrossType).eq(web3.utils.toBN(tokenCrossType))) {
        //     await tokenManager.setTokenPairTypes([tokenPairID], [web3.utils.toBN(tokenCrossType)], {from: global.operatorAccount[currentChainType]});
        // }

        let tokenInstance = await getNftTokenInstance(tokenAccount);
        //let smgFeeProxy = partners.smgFeeProxy;
        //if (smgFeeProxy === ADDRESS_0) {
        //    smgFeeProxy = await cross.owner();
        //}
        //const beforeFeeProxyBalance = web3.utils.toBN(await tokenInstance.balanceOf(smgFeeProxy));

        //console.log("nft smgRelease tokenPair:", tokenPair);
        let funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };
        //console.log("nft smgRelease funcParams:", funcParams);

        let idx;
        // before check
        let balance = await tokenInstance.balanceOf(userAccount);
        // console.log("nft smgRelease balance:", balance);
        assert.equal(
          0,
          parseInt(balance),
          "nft smgRelease before check user balance error"
        );

        balance = await tokenInstance.balanceOf(cross.address);
        assert.equal(
          parseInt(balance),
          tokenIDs.length,
          "before check smgRelease cross.address balance:",
          cross.address,
          ",balance:",
          balance
        );

        for (idx = 0; idx < tokenIDs.length; ++idx) {
          let ownerOf = await tokenInstance.ownerOf(tokenIDs[idx]);
          assert.equal(
            ownerOf,
            cross.address,
            "before check smgRelease ownerOf nft:",
            tokenIDs[idx],
            ",ownerOf:",
            ownerOf,
            ",cross.address:",
            cross.address
          );
        }

        // curveID
        let smg = await global.getSmgProxy(
          currentChainType,
          partners.smgAdminProxy
        );
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let { R, s } = buildMpcSign(
          global.schnorr[defaultCurve2Schnorr[Number(curveID)]],
          sk,
          typesArrayList.smgReleaseNFT,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.tokenIDs,
          funcParams.tokenValues,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgReleaseNFT(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
      } finally {
        await crossProxy.setHalt(false, { from: global.contractOwner });
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  Invalid NFT type", async () => {
      let tokenManager;
      let tokenPairID;
      let operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const uniqueID = uniqueInfo.userReleaseNFT;
        const smgID = global.storemanGroups.src.ID;
        const userAccount = ethUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];
        const currentToken = global.chains[currentChainType].nftTokens.filter(
          (token) => token.symbol === "NFT"
        )[0];

        // cross
        const cross = await CrossDelegateV4.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          currentToken.symbol
        );
        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        tokenPairID = tokenPair.tokenPairID;
        operator = global.operatorAccount[currentChainType];

        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN("0")],
          { from: operator }
        );

        //console.log("nft smgRelease tokenPair:", tokenPair);
        let funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          tokenIDs: tokenIDs,
          tokenValues: tokenValues,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };
        //console.log("nft smgRelease funcParams:", funcParams);

        // curveID
        let smg = await global.getSmgProxy(
          currentChainType,
          partners.smgAdminProxy
        );
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let { R, s } = buildMpcSign(
          global.schnorr[defaultCurve2Schnorr[Number(curveID)]],
          sk,
          typesArrayList.smgReleaseNFT,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.tokenIDs,
          funcParams.tokenValues,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgReleaseNFT(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO)
      } catch (err) {
        assert.include(err.toString(), "Invalid NFT type");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(tokenCrossType)],
          { from: operator }
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [ERC721 @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.ETH;
      const buddyChainType = chainTypes.WAN;
      const uniqueID = uniqueInfo.userReleaseNFT;
      const smgID = global.storemanGroups.src.ID;
      const userAccount = ethUserAccount;
      const senderAccount = global.smgAccount.src[currentChainType];
      const currentToken = global.chains[currentChainType].nftTokens.filter(
        (token) => token.symbol === "NFT"
      )[0];

      // cross
      const cross = await CrossDelegateV4.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );
      const partners = await cross.getPartners();

      // tokenAccount
      const tokenPair = filterTokenPair(
        global.tokenPairs,
        currentChainType,
        buddyChainType,
        currentToken.symbol
      );
      const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
      const tokenPairInfo = await tokenManager.getTokenPairInfo(
        tokenPair.tokenPairID
      );
      const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
      const tokenPairID = tokenPair.tokenPairID;

      //const fee = await cross.getFee({ srcChainID: global.chains[currentChainType].ID, destChainID: global.chains[buddyChainType].ID });
      //const crossFee = web3.utils.toBN(fee.agentFee).mul(web3.utils.toBN(crossValueToWei)).div(web3.utils.toBN(DENOMINATOR));
      const crossFee = web3.utils.toBN(0);
      //const crossValueActually = web3.utils.toBN(crossValueToWei).sub(crossFee);

      // const currTokenCrossType = await tokenManager.mapTokenPairType(tokenPairID);
      // if (!web3.utils.toBN(currTokenCrossType).eq(web3.utils.toBN(tokenCrossType))) {
      //     await tokenManager.setTokenPairTypes([tokenPairID], [web3.utils.toBN(tokenCrossType)], {from: global.operatorAccount[currentChainType]});
      // }

      let tokenInstance = await getNftTokenInstance(tokenAccount);
      //let smgFeeProxy = partners.smgFeeProxy;
      //if (smgFeeProxy === ADDRESS_0) {
      //    smgFeeProxy = await cross.owner();
      //}
      //const beforeFeeProxyBalance = web3.utils.toBN(await tokenInstance.balanceOf(smgFeeProxy));

      //console.log("nft smgRelease tokenPair:", tokenPair);
      let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        tokenIDs: tokenIDs,
        tokenValues: tokenValues,
        tokenAccount: tokenAccount,
        userAccount: userAccount,
      };
      //console.log("nft smgRelease funcParams:", funcParams);

      let idx;
      // before check
      let balance = await tokenInstance.balanceOf(userAccount);
      assert.equal(
        0,
        parseInt(balance),
        "nft smgRelease before check user balance error"
      );

      balance = await tokenInstance.balanceOf(cross.address);
      assert.equal(
        parseInt(balance),
        tokenIDs.length,
        "before check smgRelease cross.address balance:",
        cross.address,
        ",balance:",
        balance
      );

      for (idx = 0; idx < tokenIDs.length; ++idx) {
        let ownerOf = await tokenInstance.ownerOf(tokenIDs[idx]);
        assert.equal(
          ownerOf,
          cross.address,
          "before check smgRelease ownerOf nft:",
          tokenIDs[idx],
          ",ownerOf:",
          ownerOf,
          ",cross.address:",
          cross.address
        );
      }

      // curveID
      let smg = await global.getSmgProxy(
        currentChainType,
        partners.smgAdminProxy
      );
      let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
      let curveID = smgConfig.curve1;
      let sk = skInfo.src[currentChainType];

      // sign
      let { R, s } = buildMpcSign(
        global.schnorr[defaultCurve2Schnorr[Number(curveID)]],
        sk,
        typesArrayList.smgReleaseNFT,
        await cross.currentChainID(),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.tokenIDs,
        funcParams.tokenValues,
        funcParams.tokenAccount,
        funcParams.userAccount
      );
      funcParams = { ...funcParams, R: R, s: s };

      let receipt = await cross.smgReleaseNFT(...Object.values(funcParams), {
        from: senderAccount,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].NFTLib,
          receipt.tx
        );
      }

      const eventSmgReleaseNFT = assert.getWeb3Log(receipt, {
        event: "SmgReleaseNFT",
      });
      assert.equal(
        !!eventSmgReleaseNFT === true,
        true,
        "get event SmgReleaseNFT error"
      );
      assert.equal(
        eventSmgReleaseNFT.args.uniqueID,
        funcParams.uniqueID,
        "event SmgReleaseNFT uniqueID error"
      );
      assert.equal(
        eventSmgReleaseNFT.args.smgID,
        funcParams.smgID,
        "event SmgReleaseNFT smgID error"
      );
      assert.equal(
        eventSmgReleaseNFT.args.tokenPairID,
        funcParams.tokenPairID,
        "event SmgReleaseNFT tokenPairID error"
      );
      assert.equal(
        eventSmgReleaseNFT.args.keys.length,
        eventSmgReleaseNFT.args.values.length,
        "invalid SmgReleaseNFT keys and values length"
      );

      const eventSmgReleaseNFTParams = eventSmgReleaseNFT.args.keys.reduce(
        (reduced, next, index) => {
          const [paramName, paramType] = next.split(":");
          reduced[paramName] = {};
          reduced[paramName].type = paramType;
          reduced[paramName].value = eventSmgReleaseNFT.args.values[index];
          return reduced;
        },
        {}
      );

      assert.equal(
        eventSmgReleaseNFTParams.userAccount.type,
        "address",
        "invalid SmgReleaseNFT userAccount type"
      );
      assert.equal(
        eventSmgReleaseNFTParams.userAccount.value.toLowerCase(),
        funcParams.userAccount.toLowerCase(),
        "invalid SmgReleaseNFT userAccount value"
      );

      assert.equal(
        eventSmgReleaseNFTParams.tokenAccount.type,
        "address",
        "invalid SmgMintNFT tokenAccount type"
      );
      assert.equal(
        eventSmgReleaseNFTParams.tokenAccount.value.toLowerCase(),
        funcParams.tokenAccount.toLowerCase(),
        "invalid SmgReleaseNFT tokenAccount value"
      );

      assert.equal(
        eventSmgReleaseNFTParams.tokenIDs.type,
        "uint256[]",
        "invalid SmgReleaseNFT tokenIDs type"
      );
      assert.equal(
        eventSmgReleaseNFTParams.tokenValues.type,
        "uint256[]",
        "invalid SmgReleaseNFT tokenValues type"
      );

      idx = 0;
      let decodeTokenIDs = web3.eth.abi.decodeParameters(
        ["uint256[]"],
        eventSmgReleaseNFTParams.tokenIDs.value
      );
      assert.equal(
        !!decodeTokenIDs[0] === true,
        true,
        "SmgReleaseNFT tokenIDs error"
      );
      decodeTokenIDs = decodeTokenIDs[0];
      assert.equal(
        decodeTokenIDs.length,
        tokenIDs.length,
        "invalid SmgReleaseNFT tokenIDs length"
      );
      for (idx = 0; idx < decodeTokenIDs.length; ++idx) {
        assert.equal(
          parseInt(decodeTokenIDs[idx]),
          tokenIDs[idx],
          "invalid SmgReleaseNFT tokenIDs value!"
        );
      }

      let decodeTokenValues = web3.eth.abi.decodeParameters(
        ["uint256[]"],
        eventSmgReleaseNFTParams.tokenValues.value
      );
      assert.equal(
        !!decodeTokenValues[0] === true,
        true,
        "SmgReleaseNFT tokenValues error"
      );
      decodeTokenValues = decodeTokenValues[0];
      assert.equal(
        decodeTokenValues.length,
        tokenValues.length,
        "invalid SmgReleaseNFT tokenValues length"
      );
      for (idx = 0; idx < decodeTokenValues.length; ++idx) {
        assert.equal(
          parseInt(decodeTokenValues[idx]),
          tokenValues[idx],
          "invalid SmgReleaseNFT tokenValues value!"
        );
      }

      // after check
      balance = await tokenInstance.balanceOf(userAccount);
      assert.equal(
        parseInt(balance),
        tokenIDs.length,
        "after userReleaseNFT check balance erros"
      );

      balance = await tokenInstance.balanceOf(cross.address);
      assert.equal(
        parseInt(balance),
        0,
        "after userReleaseNFT check cross balance error"
      );
    });
  });
};
