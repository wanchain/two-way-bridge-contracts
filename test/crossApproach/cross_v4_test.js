const CrossDelegate = artifacts.require("CrossDelegateV6");
const CrossProxy = artifacts.require("CrossProxy");
const EcSchnorrVerifier = artifacts.require("EcSchnorrVerifier");
const FakeToken = artifacts.require('FakeToken');

const TokenManagerDelegate = artifacts.require("TokenManagerDelegateV2");

const OracleDelegate = artifacts.require("OracleDelegate");

const TestStoremanAdmin = artifacts.require("TestStoremanAdmin.sol");
const TestOrigTokenCreator = artifacts.require("TestOrigTokenCreator.sol");
const crypto = require("crypto");

const {
  ADDRESS_0,
  ADDRESS_1,
  ERROR_INFO,
  uniqueInfo,
  chainTypes,
  defaultCurve2Schnorr,
  defaultChainIDs,
} = require("./common");

const { skInfo, storemanGroupStatus } = require("./smg-config");

const { filterTokenPair, getTokenAccount } = require("./token-config");

const {
  assert,
  testInit,
  getTxParsedLogs,
  getCrossChainFee,
  resetCrossChainFee
} = require("./lib");

const { getRC20TokenInstance, buildMpcSign } = require("../utils");

const { typesArrayList } = require("./sc-config");
const { web3 } = require("hardhat");

const crossValue = 10;
const DENOMINATOR = 10000;

exports.testCases = () => {
  describe("Cross_ERC20", function () {
    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==> Halted", async () => {
      let crossProxy;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;

        crossProxy = await CrossProxy.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        await crossProxy.setHalt(true, { from: global.contractOwner });

        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );

        // token
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[currentChainType].coin.symbol
        );
        const tokenPairID = tokenPair.tokenPairID;

        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueToWei,
          userAccount: userAccount,
        };

        await cross.userLock(...Object.values(funcParams), {
          from: senderAccount,
        });

        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
      } finally {
        await crossProxy.setHalt(false, { from: global.contractOwner });
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userBurn  ==> Halted", async () => {
      let crossProxy;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;

        crossProxy = await CrossProxy.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        await crossProxy.setHalt(true, { from: global.contractOwner });

        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );

        let funcParams = {
          smgID: smgID,
          tokenPairID: "1",
          crossValue: crossValueToWei,
          crossFee: crossValueToWei,
          tokenAccount: userAccount,
          userAccount: userAccount,
        };

        await cross.userBurn(...Object.values(funcParams), {
          from: senderAccount,
        });

        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
      } finally {
        await crossProxy.setHalt(false, { from: global.contractOwner });
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( wanchain => ethereum )> -> smgMint  ==> Halted", async () => {
      let crossProxy;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const uniqueID = uniqueInfo.fastException;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];

        // halt
        crossProxy = await CrossProxy.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        await crossProxy.setHalt(true, { from: global.contractOwner });

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[currentChainType].coin.symbol
        );
        const tokenManager = await TokenManagerDelegate.at(
          partners.tokenManager
        );
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
        const agentFee = web3.utils.toBN(crossChainFee.agentFee);

        const crossFee = agentFee
          .mul(web3.utils.toBN(crossValueToWei))
          .div(web3.utils.toBN(DENOMINATOR));
        const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
          crossFee
        );

        let funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueActually.toString(10),
          crossFee: crossFee.toString(10),
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        // curveID
        let smg;
        if (chainTypes.WAN === currentChainType) {
          smg = await TestStoremanAdmin.at(partners.smgAdminProxy);
        } else {
          smg = await OracleDelegate.at(partners.smgAdminProxy);
        }
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let { R, s } = buildMpcSign(
          global.schnorr[defaultCurve2Schnorr[Number(curveID)]],
          sk,
          typesArrayList.smgMint,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.crossValue,
          funcParams.crossFee,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgMint(...Object.values(funcParams), {
          from: senderAccount,
        });

        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
      } finally {
        await crossProxy.setHalt(false, { from: global.contractOwner });
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( wanchain => ethereum )> -> smgRelease  ==> Halted", async () => {
      let crossProxy;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const uniqueID = uniqueInfo.fastException;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];

        // halt
        crossProxy = await CrossProxy.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        await crossProxy.setHalt(true, { from: global.contractOwner });

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[currentChainType].coin.symbol
        );
        const tokenManager = await TokenManagerDelegate.at(
          partners.tokenManager
        );
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
        const tokenPairID = tokenPair.tokenPairID;
        const crossValueActually = web3.utils.toBN(crossValueToWei);

        funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueActually,
          crossFee: crossValueActually,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        // smg status
        const smg = await global.getSmgProxy(
          currentChainType,
          partners.smgAdminProxy
        );
        // curveID
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let { R, s } = buildMpcSign(
          global.schnorr[defaultCurve2Schnorr[Number(curveID)]],
          sk,
          typesArrayList.smgMint,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.crossValue,
          funcParams.crossFee,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgRelease(...Object.values(funcParams), {
          from: senderAccount,
        });

        assert.fail(ERROR_INFO);

      } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
      } finally {
        await crossProxy.setHalt(false, { from: global.contractOwner });
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==>  Token does not exist", async () => {
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const tokenPairID = 0;
        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
  
        // tokenAccount
        const totalValue = web3.utils.toBN(crossValueToWei)
          .add(web3.utils.toBN(moreServiceFee))
          .toString();

        // exec
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueToWei,
          userAccount: userAccount,
        };
        await cross.userLock(...Object.values(funcParams), {
          from: senderAccount,
          value: totalValue,
        });

        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Token does not exist");
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [BTC @bitcoin] <( bitcoin => ethereum )> -> userLock  ==>  Invalid token pair", async () => {
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const bitcoinChainType = chainTypes.BTC;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          bitcoinChainType,
          buddyChainType,
          global.chains[bitcoinChainType].coin.symbol
        );
        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID: tokenPair.tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        const totalValue = web3.utils.toBN(crossValueToWei)
          .add(web3.utils.toBN(contractFee))
          .toString();

        // exec
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPair.tokenPairID,
          crossValue: crossValueToWei,
          userAccount: userAccount,
        };
        await cross.userLock(...Object.values(funcParams), {
          from: senderAccount,
          value: totalValue,
        });

        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Invalid token pair");
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( ethereum => wanchain )> -> userBurn ==>  Invalid token pair", async () => {
      try {
        const crossFee = 5;
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const bitcoinChainType = chainTypes.BTC;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const crossFeeToWei = web3.utils.toWei(crossFee.toString());
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );

        // tokenAccount
        const tokenAccount = ADDRESS_0;
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          bitcoinChainType,
          buddyChainType,
          global.chains[bitcoinChainType].coin.symbol
        );
        const tokenPairID = tokenPair.tokenPairID;
  
        // approve
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueToWei,
          crossFee: crossFeeToWei,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        // exec
        await cross.userBurn(...Object.values(funcParams), {
          from: senderAccount,
          value:
            global.crossFeesV3[currentChainType][buddyChainType].contractFee,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Invalid token pair");
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( ethereum => wanchain )> -> userBurn ==>  Invalid token account", async () => {
      try {
        const crossFee = 5;
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const bitcoinChainType = chainTypes.BTC;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const crossFeeToWei = web3.utils.toWei(crossFee.toString());
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );

        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[currentChainType].coin.symbol
        );
        const tokenPairID = tokenPair.tokenPairID;
  
        // approve
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueToWei,
          crossFee: crossFeeToWei,
          tokenAccount: senderAccount,
          userAccount: userAccount,
        };

        // exec
        await cross.userBurn(...Object.values(funcParams), {
          from: senderAccount,
          value:
            global.crossFeesV3[currentChainType][buddyChainType].contractFee,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Invalid token account");
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( ethereum => wanchain )> -> userBurn ==>  Token does not exist", async () => {
      try {
        const crossFee = 5;
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const crossFeeToWei = web3.utils.toWei(crossFee.toString());
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );

        // tokenAccount
        const tokenAccount = ADDRESS_0;
        const tokenPairID = 0;

        // approve
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueToWei,
          crossFee: crossFeeToWei,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        // exec
        await cross.userBurn(...Object.values(funcParams), {
          from: senderAccount,
          value:
            global.crossFeesV3[currentChainType][buddyChainType].contractFee,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Token does not exist");
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( ethereum => wanchain )> -> smgRelease  ==> Not ready", async () => {
      let smg;
      let funcParams;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const uniqueID = uniqueInfo.fastException;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = wanUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[currentChainType].coin.symbol
        );
        const tokenManager = await TokenManagerDelegate.at(
          partners.tokenManager
        );
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
        const agentFee = web3.utils.toBN(crossChainFee.agentFee);
  
        const crossFee = agentFee
          .mul(web3.utils.toBN(crossValueToWei))
          .div(web3.utils.toBN(DENOMINATOR));
        const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
          crossFee
        );

        funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueActually,
          crossFee: crossFee,
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
        // curveID
        let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);
        let curveID = smgConfig.curve1;
        let sk = skInfo.src[currentChainType];

        // sign
        let { R, s } = buildMpcSign(
          global.schnorr[defaultCurve2Schnorr[Number(curveID)]],
          sk,
          typesArrayList.smgMint,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.crossValue,
          funcParams.crossFee,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgRelease(...Object.values(funcParams), {
          from: senderAccount,
        });

        assert.fail(ERROR_INFO);
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

    // WAN
    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==>  PK is not ready", async () => {
      let smg;
      let funcParams;
      try {

        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const tokenPairID = "0";

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        // exec
        funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueToWei,
          userAccount: userAccount,
        };

        const partners = await cross.getPartners();
        // smg status
        smg = await global.getSmgProxy(
          currentChainType,
          partners.smgAdminProxy
        );
        await smg.setStoremanGroupStatus(
          funcParams.smgID,
          storemanGroupStatus.unregistered
        );

        const totalValue = web3.utils.toBN(crossValueToWei)
          .add(web3.utils.toBN(contractFee))
          .toString();

        await cross.userLock(...Object.values(funcParams), {
          from: senderAccount,
          value: totalValue,
        });
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

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( ethereum => wanchain )> -> userBurn ==>  PK is not ready", async () => {
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

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();
        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[buddyChainType].coin.symbol
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
        const agentFee = web3.utils.toBN(crossChainFee.agentFee);
  
        const crossFee = agentFee
          .div(web3.utils.toBN(DENOMINATOR));

        funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossFee,
          crossFee: crossFee,
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

        // exec
        await cross.userBurn(...Object.values(funcParams), {
          from: senderAccount,
          value: global.crossFeesV3[currentChainType][buddyChainType].contractFee,
        });
        assert.fail(ERROR_INFO);
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

    // WAN
    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==>  Invalid token account", async () => {
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[buddyChainType].coin.symbol
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

        // token pair contract fee
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

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValue,
          crossFee: contractFee,
          tokenAccount: smgFeeProxy,
          userAccount: userAccount,
        };

        // exec
        await cross.userBurn(...Object.values(funcParams), {
          from: senderAccount,
          value: moreServiceFee,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Invalid token account");
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==>  Not support", async () => {
      let tokenManager, tokenAncestorInfo, tokenPairInfo, operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[currentChainType].coin.symbol
        );
        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        const tokenPairID = tokenPair.tokenPairID;

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        const totalValue = web3.utils.toBN(crossValueToWei)
          .add(web3.utils.toBN(contractFee))
          .toString();

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        // token pair contract fee
        await cross.setTokenPairFees([[tokenPairID, contractFee]], {
          from: currentChainAdmin,
        });
        assert.equal(
          contractFee.eq(
            web3.utils.toBN((await cross.getTokenPairFee(tokenPairID)))
          ),
          true,
          "fee of token pair error"
        );

        operator = global.operatorAccount[currentChainType];
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(10)],
          { from: operator }
        );
        assert.equal(web3.utils.toBN(await tokenManager.mapTokenPairType(tokenPairID)).eq(web3.utils.toBN(10)), true, "check token pair type failed");

        tokenAncestorInfo = await tokenManager.getAncestorInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo.id = tokenPair.tokenPairID;
        const tokenAccount = ADDRESS_1;
        const currentChainID = web3.utils.toBN(await cross.currentChainID());
        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID,
          web3.utils.toBN(tokenPairInfo.fromChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          web3.utils.toBN(tokenPairInfo.toChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.toAccount
        );

        // exec
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueToWei,
          userAccount: userAccount,
        };
        await cross.userLock(...Object.values(funcParams), {
          from: senderAccount,
          value: totalValue,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Not support");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairInfo.id],
          [web3.utils.toBN(0)],
          { from: operator }
        );
        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID,
          tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          tokenPairInfo.toAccount
        );
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==>  Lock token failed", async () => {
      let tokenManager, tokenAncestorInfo, tokenPairInfo;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = wanUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[currentChainType].coin.symbol
        );
        const tokenPairID = tokenPair.tokenPairID;

        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        tokenAncestorInfo = await tokenManager.getAncestorInfo(
          tokenPairID
        );
        tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPairID
        );

        tokenPairInfo.id = tokenPairID;
        const tokenSc = await FakeToken.new("Test", "Test");
        await tokenSc.setTestInvalidMode(true);
        const tokenAccount = tokenSc.address;
        const currentChainID = web3.utils.toBN(await cross.currentChainID());

        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID ,
          web3.utils.toBN(tokenPairInfo.fromChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          web3.utils.toBN(tokenPairInfo.toChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.toAccount
        );

        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        const totalValue = web3.utils.toBN(crossValueToWei).add(moreServiceFee);

        // exec
        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueToWei,
          userAccount: userAccount,
        };
        await cross.userLock(...Object.values(funcParams), {
          from: senderAccount,
          value: totalValue.toString(10),
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Lock token failed");
      } finally {
        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID,
          tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          tokenPairInfo.toAccount
        );
      }
    });

    // WAN
    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( wanchain => ethereum )> -> userLock  ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.WAN;
      const buddyChainType = chainTypes.ETH;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = ethUserAccount;
      const senderAccount = wanUserAccount;
      const currentChainAdmin = global.adminAccount[currentChainType];

      // cross
      const cross = await CrossDelegate.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );
      const partners = await cross.getPartners();

      // tokenAccount
      const tokenPair = filterTokenPair(
        global.tokenPairs,
        currentChainType,
        buddyChainType,
        global.chains[currentChainType].coin.symbol
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
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee);

      // token pair contract fee
      const crossAdmin = await cross.admin();
      await cross.setTokenPairFees([[tokenPairID, contractFee]], {
        from: currentChainAdmin,
      });
      assert.equal(
        contractFee.eq(
          web3.utils.toBN((await cross.getTokenPairFee(tokenPairID)))
          ),
        true,
        "fee of token pair error"
      );

      await resetCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      }, crossAdmin);

      await cross.setFee({
        srcChainID: global.chains[currentChainType].ID,
        destChainID: "0",
        contractFee:contractFee.toString(10),
        agentFee:"0"
      }, {from: crossAdmin});

      const totalValue = web3.utils.toBN(crossValueToWei)
        .add(web3.utils.toBN(contractFee))
        .toString();

      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );

      // exec
      let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        userAccount: userAccount,
      };
      let receipt = await cross.userLock(...Object.values(funcParams), {
        from: senderAccount,
        value: totalValue,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }

      assert.checkWeb3Event(receipt, {
        event: "UserLockLogger",
        args: {
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          tokenAccount: tokenAccount,
          value: funcParams.crossValue,
          contractFee: contractFee.toString(10),
          userAccount: funcParams.userAccount.toLowerCase(),
        },
      });
      const afterBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );
      assert.equal(
        afterBalance.sub(beforeBalance).eq(web3.utils.toBN(contractFee)),
        true,
        "balance of storeman fee error"
      );
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( wanchain => ethereum )> -> smgMint  ==>  Signature verification failed", async () => {
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const uniqueID = uniqueInfo.userLockWAN;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[buddyChainType].coin.symbol
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
        const agentFee = web3.utils.toBN(crossChainFee.agentFee);
  
        const crossFee = agentFee
          .mul(web3.utils.toBN(crossValueToWei))
          .div(web3.utils.toBN(DENOMINATOR));
        const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
          crossFee
        );

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        let funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueActually,
          crossFee: crossFee,
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
          typesArrayList.smgMint,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.crossValue,
          funcParams.crossFee,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: crypto.randomBytes(32) };

        await cross.smgMint(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Signature verification failed");
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( wanchain => ethereum )> -> smgMint  ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.ETH;
      const buddyChainType = chainTypes.WAN;
      const uniqueID = uniqueInfo.userLockWAN;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = ethUserAccount;
      const senderAccount = global.smgAccount.src[currentChainType];

      // cross
      const cross = await CrossDelegate.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );
      const partners = await cross.getPartners();

      // tokenAccount
      const tokenPair = filterTokenPair(
        global.tokenPairs,
        currentChainType,
        buddyChainType,
        global.chains[buddyChainType].coin.symbol
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
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);
  
      const crossFee = agentFee
        .mul(web3.utils.toBN(crossValueToWei))
        .div(web3.utils.toBN(DENOMINATOR));
      const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
        crossFee
      );

      let tokenInstance = await getRC20TokenInstance(tokenAccount);
      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(smgFeeProxy)
      );

      let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
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
        typesArrayList.smgMint,
        await cross.currentChainID(),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.crossValue,
        funcParams.crossFee,
        funcParams.tokenAccount,
        funcParams.userAccount
      );
      funcParams = { ...funcParams, R: R, s: s };

      let receipt = await cross.smgMint(...Object.values(funcParams), {
        from: senderAccount,
      });
      try {
        await cross.smgMint(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Rapidity tx exists");
      }
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }
      const eventSmgMint = assert.getWeb3Log(receipt, { event: "SmgMint" });
      assert.equal(!!eventSmgMint === true, true, "get event SmgMint error");
      assert.equal(
        eventSmgMint.args.uniqueID,
        funcParams.uniqueID,
        "event SmgMint uniqueID error"
      );
      assert.equal(
        eventSmgMint.args.smgID,
        web3.utils.padRight(funcParams.smgID, 64),
        "event SmgMint smgID error"
      );
      assert.equal(
        eventSmgMint.args.keys.length,
        eventSmgMint.args.values.length,
        "invalid SmgMint keys and values length"
      );
      const eventSmgMintParams = eventSmgMint.args.keys.reduce(
        (reduced, next, index) => {
          const [paramName, paramType] = next.split(":");
          reduced[paramName] = {};
          reduced[paramName].type = paramType;
          reduced[paramName].value = eventSmgMint.args.values[index];
          return reduced;
        },
        {}
      );
      assert.equal(
        eventSmgMintParams.value.type,
        "uint256",
        "invalid SmgMint value type"
      );
      assert.equal(
        web3.utils
          .toBN(eventSmgMintParams.value.value)
          .eq(funcParams.crossValue),
        true,
        "invalid SmgMint crossValue value"
      );
      assert.equal(
        eventSmgMintParams.tokenAccount.type,
        "address",
        "invalid SmgMint tokenAccount type"
      );
      assert.equal(
        eventSmgMintParams.tokenAccount.value.toLowerCase(),
        funcParams.tokenAccount.toLowerCase(),
        "invalid SmgMint tokenAccount value"
      );
      assert.equal(
        eventSmgMintParams.userAccount.type,
        "address",
        "invalid SmgMint userAccount type"
      );
      assert.equal(
        eventSmgMintParams.userAccount.value.toLowerCase(),
        funcParams.userAccount.toLowerCase(),
        "invalid SmgMint userAccount value"
      );
      assert.equal(
        eventSmgMintParams.fee.type,
        "uint256",
        "invalid SmgMint fee type"
      );
      assert.equal(
        web3.utils.toBN(eventSmgMintParams.fee.value).eq(funcParams.crossFee),
        true,
        "invalid SmgMint fee value"
      );

      assert.checkWeb3Event(receipt, {
        event: "SmgMintLogger",
        args: {
          uniqueID: funcParams.uniqueID,
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          value: funcParams.crossValue,
          tokenAccount: funcParams.tokenAccount,
          userAccount: funcParams.userAccount,
        },
      });
      // get token instance
      let balance = await tokenInstance.balanceOf(funcParams.userAccount);
      assert.equal(
        funcParams.crossValue.toString(),
        balance.toString(),
        "balance of receiver account error"
      );

      const afterBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(smgFeeProxy)
      );
      assert.equal(
        afterBalance
          .sub(beforeBalance)
          .eq(web3.utils.toBN(funcParams.crossFee)),
        true,
        "balance of storeman fee error"
      );
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @zk] <( wanchain => zk )> EcSchnorr -> smgMint  ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.ETH;
      const buddyChainType = chainTypes.WAN;
      const uniqueID = web3.utils.toHex(crypto.randomBytes(32));
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = ethUserAccount;
      const senderAccount = global.smgAccount.src[currentChainType];
      const sk = skInfo.src[chainTypes.BTC];

      // cross
      const cross = await CrossDelegate.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );
      const partners = await cross.getPartners();

      // tokenAccount
      const tokenPair = filterTokenPair(
        global.tokenPairs,
        currentChainType,
        buddyChainType,
        global.chains[buddyChainType].coin.symbol
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
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      const crossFee = agentFee
        .mul(web3.utils.toBN(crossValueToWei))
        .div(web3.utils.toBN(DENOMINATOR));
      const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
        crossFee
      );

      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }

      let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount,
      };

      let smg = await global.getSmgProxy(
        currentChainType,
        partners.smgAdminProxy
      );
      let smgConfig = await smg.getStoremanGroupConfig.call(funcParams.smgID);

      // convert to EcSchnorrVerifier
      let hashType = await cross.hashType();
      await cross.setHashType(1);
      await smg.setStoremanGroupConfig(
        funcParams.smgID,
        smgConfig.status,
        smgConfig.deposit,
        [smgConfig.chain1, smgConfig.chain2],
        [global.storemanGroups.dest.curve3, smgConfig.curve2],
        global.storemanGroups.dest.gpk3,
        smgConfig.gpk2,
        smgConfig.startTime,
        smgConfig.endTime
      );

      // sign
      let { R, s, parity, e, m } = buildMpcSign(
        global.schnorr[
          defaultCurve2Schnorr[Number(global.storemanGroups.dest.curve3)]
        ],
        sk,
        typesArrayList.smgMint,
        await cross.currentChainID(),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.crossValue,
        funcParams.crossFee,
        funcParams.tokenAccount,
        funcParams.userAccount
      );
      funcParams = { ...funcParams, R: R, s: s };

      // const ecSchnorr = await EcSchnorrVerifier.at(global.chains[currentChainType].scAddr.EcSchnorrVerifier);
      // const xPublicKey = web3.utils.bytesToHex(web3.utils.hexToBytes(global.storemanGroups.dest.gpk3).slice(0,32));
      // console.log("debugVerify:", await ecSchnorr.debugVerify(s, xPublicKey, web3.utils.padLeft("0x",64), e, parity, m));
      await cross.smgMint.call(...Object.values(funcParams), {
        from: senderAccount,
      });

      await cross.setHashType(hashType);
      await smg.setStoremanGroupConfig(
        funcParams.smgID,
        smgConfig.status,
        smgConfig.deposit,
        [smgConfig.chain1, smgConfig.chain2],
        [smgConfig.curve1, smgConfig.curve2],
        smgConfig.gpk1,
        smgConfig.gpk2,
        smgConfig.startTime,
        smgConfig.endTime
      );
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( ethereum => wanchain )> -> userBurn ==>  Not support", async () => {
      let tokenManager, tokenAncestorInfo, tokenPairInfo, operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[buddyChainType].coin.symbol
        );
        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenPairID = tokenPair.tokenPairID;
        const crossChainFee = await getCrossChainFee({
          cross,
          srcChainID: global.chains[currentChainType].ID,
          destChainID: global.chains[buddyChainType].ID,
          tokenPairID,
        });
        const contractFee = web3.utils.toBN(crossChainFee.contractFee);
        const moreServiceFee = contractFee.mul(web3.utils.toBN(2));

        operator = global.operatorAccount[currentChainType];
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(10)],
          { from: operator }
        );

        tokenAncestorInfo = await tokenManager.getAncestorInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo.id = tokenPair.tokenPairID;
        const tokenAccount = ADDRESS_1;
        const currentChainID = web3.utils.toBN(await cross.currentChainID());

        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID ,
          web3.utils.toBN(tokenPairInfo.fromChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          web3.utils.toBN(tokenPairInfo.toChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.toAccount
        );

        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: moreServiceFee.add(web3.utils.toBN(crossValueToWei)),
          crossFee: moreServiceFee,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        // exec
        await cross.userBurn(...Object.values(funcParams), {
          from: senderAccount,
          value: moreServiceFee,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Not support");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairInfo.id],
          [web3.utils.toBN(0)],
          { from: operator }
        );
        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID,
          tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          tokenPairInfo.toAccount
        );
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( ethereum => wanchain )> -> userBurn ==>  Burn failed", async () => {
      let tokenManager, tokenAncestorInfo, tokenPairInfo;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = wanUserAccount;
        const senderAccount = ethUserAccount;
        const currentChainAdmin = global.adminAccount[currentChainType];

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          global.chains[buddyChainType].coin.symbol
        );
        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        tokenAncestorInfo = await tokenManager.getAncestorInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo.id = tokenPair.tokenPairID;
        const tokenSc = await FakeToken.new("Test", "Test");
        await tokenSc.setTestInvalidMode(true);
        await tokenSc.transferOwnership(tokenManager.address);
        const tokenAccount = tokenSc.address;
        const currentChainID = web3.utils.toBN(await cross.currentChainID());

        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID ,
          web3.utils.toBN(tokenPairInfo.fromChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          web3.utils.toBN(tokenPairInfo.toChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.toAccount
        );
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
        const agentFee = web3.utils.toBN(crossChainFee.agentFee);

        // const crossFee = web3.utils.toBN(fee.agentFee).mul(web3.utils.toBN(crossValueToWei)).div(web3.utils.toBN(DENOMINATOR));
        const crossFee = agentFee
          .mul(web3.utils.toBN(crossValueToWei))
          .div(web3.utils.toBN(DENOMINATOR));
        const totalValue = web3.utils.toBN(crossValueToWei).add(moreServiceFee); // web3.utils.toBN(crossValueToWei).sub(crossFee);

        // token pair contract fee
        await cross.setTokenPairFees([[tokenPairID, contractFee]], {
          from: currentChainAdmin,
        });
        assert.equal(
          contractFee.eq(
            web3.utils.toBN((await cross.getTokenPairFee(tokenPairID)))
          ),
          true,
          "fee of token pair error"
        );

        let smgFeeProxy = partners.smgFeeProxy;
        if (smgFeeProxy === ADDRESS_0) {
          smgFeeProxy = await cross.owner();
        }

        let funcParams = {
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueToWei,
          crossFee: crossFee.toString(10),
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

        // exec
        await cross.userBurn(...Object.values(funcParams), {
          from: senderAccount,
          value: totalValue.toString(10),
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Burn failed");
      } finally {
        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID,
          tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          tokenPairInfo.toAccount
        );
      }
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @ethereum] <( ethereum => wanchain )> -> userBurn ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.ETH;
      const buddyChainType = chainTypes.WAN;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = wanUserAccount;
      const senderAccount = ethUserAccount;
      const currentChainAdmin = global.adminAccount[currentChainType];

      // cross
      const cross = await CrossDelegate.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );
      const partners = await cross.getPartners();

      // tokenAccount
      const tokenPair = filterTokenPair(
        global.tokenPairs,
        currentChainType,
        buddyChainType,
        global.chains[buddyChainType].coin.symbol
      );
      const tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
      const tokenPairInfo = await tokenManager.getTokenPairInfo(
        tokenPair.tokenPairID
      );
      const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
      const tokenPairID = tokenPair.tokenPairID;

      // get token instance
      const tokenInstance = await getRC20TokenInstance(tokenAccount);
      const balance = await tokenInstance.balanceOf(senderAccount);

      const crossChainFee = await getCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      });
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      // token pair contract fee
      const crossAdmin = await cross.admin();
      await cross.setTokenPairFees([[tokenPairID, contractFee]], {
        from: currentChainAdmin,
      });
      assert.equal(
        contractFee.eq(
          web3.utils.toBN((await cross.getTokenPairFee(tokenPairID)))
          ),
        true,
        "fee of token pair error"
      );

      await resetCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      }, crossAdmin);

      await cross.setFee({
        srcChainID: global.chains[currentChainType].ID,
        destChainID: "0",
        contractFee:contractFee.toString(10),
        agentFee:"0"
      }, {from: crossAdmin});

      // const crossFee = web3.utils.toBN(fee.agentFee).mul(web3.utils.toBN(crossValueToWei)).div(web3.utils.toBN(DENOMINATOR));
      const crossFee = agentFee
        .mul(web3.utils.toBN(balance))
        .div(web3.utils.toBN(DENOMINATOR));
      const crossValueActually = balance; // web3.utils.toBN(crossValueToWei).sub(crossFee);

      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );

      let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount,
      };

      // // get token instance
      // let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
      // let balance = await tokenInstance.balanceOf(senderAccount);
      // assert.equal(funcParams.crossValue, balance.toString(), "balance of sender account error");

      // await tokenInstance.approve(cross.address, 0, {from: senderAccount});
      // await tokenInstance.approve(cross.address, crossValueToWei, {from: senderAccount});
      // let allowance = await tokenInstance.allowance(senderAccount, cross.address);
      // assert.equal(crossValueToWei, allowance.toString(), "approve token failed");

      // exec
      let receipt = await cross.userBurn(...Object.values(funcParams), {
        from: senderAccount,
        value: global.crossFeesV3[currentChainType][buddyChainType].contractFee,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }

      assert.checkWeb3Event(receipt, {
        event: "UserBurnLogger",
        args: {
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          tokenAccount: funcParams.tokenAccount,
          value: funcParams.crossValue,
          contractFee: contractFee.toString(10),
          fee: funcParams.crossFee,
          userAccount: funcParams.userAccount.toLowerCase(),
        },
      });

      const afterBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );
      assert.equal(
        afterBalance.sub(beforeBalance).eq(web3.utils.toBN(contractFee)),
        true,
        "balance of storeman fee error"
      );
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [WAN @wanchain] <( ethereum => wanchain )> -> smgRelease  ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.WAN;
      const buddyChainType = chainTypes.ETH;
      const uniqueID = uniqueInfo.userReleaseWAN;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = wanUserAccount;
      const senderAccount = global.smgAccount.src[currentChainType];

      // cross
      const cross = await CrossDelegate.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );
      const partners = await cross.getPartners();

      // tokenAccount
      const tokenPair = filterTokenPair(
        global.tokenPairs,
        currentChainType,
        buddyChainType,
        global.chains[currentChainType].coin.symbol
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
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      const crossFee = agentFee
        .mul(web3.utils.toBN(crossValueToWei))
        .div(web3.utils.toBN(DENOMINATOR));
      const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
        crossFee
      );

      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );

      funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount,
      };

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
        typesArrayList.smgRelease,
        await cross.currentChainID(),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.crossValue,
        funcParams.crossFee,
        funcParams.tokenAccount,
        funcParams.userAccount
      );
      funcParams = { ...funcParams, R: R, s: s };

      let receipt = await cross.smgRelease(...Object.values(funcParams), {
        from: senderAccount,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }
      const eventSmgRelease = assert.getWeb3Log(receipt, {
        event: "SmgRelease",
      });
      assert.equal(
        !!eventSmgRelease === true,
        true,
        "get event SmgRelease error"
      );
      assert.equal(
        eventSmgRelease.args.uniqueID,
        funcParams.uniqueID,
        "event SmgRelease uniqueID error"
      );
      assert.equal(
        eventSmgRelease.args.smgID,
        funcParams.smgID,
        "event SmgRelease smgID error"
      );
      assert.equal(
        eventSmgRelease.args.keys.length,
        eventSmgRelease.args.values.length,
        "invalid SmgRelease keys and values length"
      );
      const eventSmgReleaseParams = eventSmgRelease.args.keys.reduce(
        (reduced, next, index) => {
          const [paramName, paramType] = next.split(":");
          reduced[paramName] = {};
          reduced[paramName].type = paramType;
          reduced[paramName].value = eventSmgRelease.args.values[index];
          return reduced;
        },
        {}
      );
      assert.equal(
        eventSmgReleaseParams.value.type,
        "uint256",
        "invalid SmgRelease value type"
      );
      assert.equal(
        web3.utils
          .toBN(eventSmgReleaseParams.value.value)
          .eq(funcParams.crossValue),
        true,
        "invalid SmgRelease crossValue value"
      );
      assert.equal(
        eventSmgReleaseParams.tokenAccount.type,
        "address",
        "invalid SmgRelease tokenAccount type"
      );
      assert.equal(
        eventSmgReleaseParams.tokenAccount.value.toLowerCase(),
        funcParams.tokenAccount.toLowerCase(),
        "invalid SmgRelease tokenAccount value"
      );
      assert.equal(
        eventSmgReleaseParams.userAccount.type,
        "address",
        "invalid SmgRelease userAccount type"
      );
      assert.equal(
        eventSmgReleaseParams.userAccount.value.toLowerCase(),
        funcParams.userAccount.toLowerCase(),
        "invalid SmgRelease userAccount value"
      );
      assert.equal(
        eventSmgReleaseParams.fee.type,
        "uint256",
        "invalid SmgRelease fee type"
      );
      assert.equal(
        web3.utils
          .toBN(eventSmgReleaseParams.fee.value)
          .eq(funcParams.crossFee),
        true,
        "invalid SmgRelease fee value"
      );

      assert.checkWeb3Event(receipt, {
        event: "SmgReleaseLogger",
        args: {
          uniqueID: funcParams.uniqueID,
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          value: funcParams.crossValue,
          tokenAccount: funcParams.tokenAccount,
          userAccount: funcParams.userAccount,
        },
      });

      const afterBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );
      assert.equal(
        afterBalance
          .sub(beforeBalance)
          .eq(web3.utils.toBN(funcParams.crossFee)),
        true,
        "balance of storeman fee error"
      );
    });

    // LINK
    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( ethereum => wanchain )> -> userLock  ==> success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.ETH;
      const buddyChainType = chainTypes.WAN;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = wanUserAccount;
      const senderAccount = ethUserAccount;
      const currentToken = global.chains[currentChainType].tokens.filter(
        (token) => token.symbol === "LINK"
      )[0];

      // cross
      const cross = await CrossDelegate.at(
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
      const tokenAncestorInfo = await tokenManager.getAncestorInfo(
        tokenPair.tokenPairID
      );
      const tokenPairInfo = await tokenManager.getTokenPairInfo(
        tokenPair.tokenPairID
      );

      const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);
      const tokenPairID = tokenPair.tokenPairID;

      await tokenManager.updateTokenPair(
        tokenPairID,
        [
          tokenAncestorInfo.account,
          tokenAncestorInfo.name,
          tokenAncestorInfo.symbol,
          tokenAncestorInfo.decimals,
          tokenAncestorInfo.chainId
        ],
        tokenPairInfo.toChainID,
        tokenPairInfo.toAccount,
        tokenPairInfo.fromChainID,
        tokenPairInfo.fromAccount
      );
      const crossAdmin = await cross.admin();

      const crossChainFee = await getCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      });
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      await resetCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      }, crossAdmin);

      await cross.setFee({
        srcChainID: global.chains[currentChainType].ID,
        destChainID: "0",
        contractFee:contractFee.toString(10),
        agentFee:"0"
      }, {from: crossAdmin});

      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );

      // exec
      let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        userAccount: userAccount,
      };

      // get token instance
      let tokenInstance = await getRC20TokenInstance(tokenAccount);
      let balance = await tokenInstance.balanceOf(senderAccount);
      if (balance.lt(web3.utils.toBN(crossValueToWei))) {
        // mint token: LINK
        let mintValue = web3.utils.toBN(crossValueToWei).sub(balance);
        const tokenCreator = await TestOrigTokenCreator.at(
          global.chains[currentChainType].scAddr.TestOrigTokenCreator
        );
        await tokenCreator.mintToken(
          currentToken.name,
          currentToken.symbol,
          senderAccount,
          mintValue.toString()
        );
      }
      balance = await tokenInstance.balanceOf(senderAccount);
      assert.equal(
        crossValueToWei,
        balance.toString(),
        "balance of sender account error"
      );
      // approve
      await tokenInstance.approve(cross.address, 0, { from: senderAccount });
      await tokenInstance.approve(cross.address, crossValueToWei, {
        from: senderAccount,
      });
      let allowance = await tokenInstance.allowance(
        senderAccount,
        cross.address
      );
      assert.equal(
        crossValueToWei,
        allowance.toString(),
        "approve token failed"
      );

      let receipt = await cross.userLock(...Object.values(funcParams), {
        from: senderAccount,
        value: moreServiceFee,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }

      assert.checkWeb3Event(receipt, {
        event: "UserLockLogger",
        args: {
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          tokenAccount: tokenAccount,
          value: funcParams.crossValue,
          contractFee: contractFee.toString(10),
          userAccount: funcParams.userAccount.toLowerCase(),
        },
      });

      const afterBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );
      assert.equal(
        afterBalance.sub(beforeBalance).eq(web3.utils.toBN(contractFee)),
        true,
        "balance of storeman fee error"
      );

      await tokenManager.updateTokenPair(
        tokenPairID,
        [
          tokenAncestorInfo.account,
          tokenAncestorInfo.name,
          tokenAncestorInfo.symbol,
          tokenAncestorInfo.decimals,
          tokenAncestorInfo.chainId
        ],
        tokenPairInfo.fromChainID,
        tokenPairInfo.fromAccount,
        tokenPairInfo.toChainID,
        tokenPairInfo.toAccount
      );

    });
    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @wanchain] <( ethereum => wanchain )> -> smgMint  ==>  Not support", async () => {
      let tokenManager, tokenPairID, operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const uniqueID = uniqueInfo.userLockLink;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = wanUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];
        const currentToken = global.chains[buddyChainType].tokens.filter(
          (token) => token.symbol === "LINK"
        )[0];

        // cross
        const cross = await CrossDelegate.at(
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

        const tokenSc = await FakeToken.new("Test", "Test");
        await tokenSc.setTestInvalidMode(true);
        const tokenAccount = tokenSc.address;
        tokenPairID = tokenPair.tokenPairID;

        operator = global.operatorAccount[currentChainType];
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(10)],
          { from: operator }
        );
        assert.equal(web3.utils.toBN(await tokenManager.mapTokenPairType(tokenPairID)).eq(web3.utils.toBN(10)), true, "check token pair type failed");

        const agentFee = web3.utils.toBN(100);

        const crossFee = agentFee
          .mul(web3.utils.toBN(crossValueToWei))
          .div(web3.utils.toBN(DENOMINATOR));
        const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
          crossFee
        );

        let funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueActually,
          crossFee: crossFee,
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
          typesArrayList.smgMint,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.crossValue,
          funcParams.crossFee,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgMint(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Not support");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(0)],
          { from: operator }
        );
      }
    });
    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @wanchain] <( ethereum => wanchain )> -> smgMint  ==>  Mint fee failed", async () => {
      let tokenManager, tokenAncestorInfo, tokenPairInfo, operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const uniqueID = uniqueInfo.userLockLink;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = wanUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];
        const currentToken = global.chains[buddyChainType].tokens.filter(
          (token) => token.symbol === "LINK"
        )[0];

        // cross
        const cross = await CrossDelegate.at(
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
        tokenAncestorInfo = await tokenManager.getAncestorInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo.id = tokenPair.tokenPairID;

        const tokenSc = await FakeToken.new("Test", "Test");
        await tokenSc.setTestInvalidMode(true);
        const tokenAccount = tokenSc.address;
        const currentChainID = web3.utils.toBN(await cross.currentChainID());

        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID ,
          web3.utils.toBN(tokenPairInfo.fromChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          web3.utils.toBN(tokenPairInfo.toChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.toAccount
        );
        operator = global.operatorAccount[currentChainType];

        const tokenPairID = tokenPair.tokenPairID;
        const agentFee = web3.utils.toBN(100);

        const crossFee = agentFee
          .mul(web3.utils.toBN(crossValueToWei))
          .div(web3.utils.toBN(DENOMINATOR));
        const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
          crossFee
        );

        let funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueActually,
          crossFee: crossFee,
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
          typesArrayList.smgMint,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.crossValue,
          funcParams.crossFee,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgMint(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Mint fee failed");
      } finally {
        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID,
          tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          tokenPairInfo.toAccount
        );
      }
    });
    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @wanchain] <( ethereum => wanchain )> -> smgMint  ==>  Mint failed", async () => {
      let tokenManager, tokenAncestorInfo, tokenPairInfo, operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.WAN;
        const buddyChainType = chainTypes.ETH;
        const uniqueID = uniqueInfo.userLockLink;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = wanUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];
        const currentToken = global.chains[buddyChainType].tokens.filter(
          (token) => token.symbol === "LINK"
        )[0];

        // cross
        const cross = await CrossDelegate.at(
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
        tokenAncestorInfo = await tokenManager.getAncestorInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo.id = tokenPair.tokenPairID;

        const tokenSc = await FakeToken.new("Test", "Test");
        await tokenSc.setTestInvalidMode(true);
        const tokenAccount = tokenSc.address;
        const currentChainID = web3.utils.toBN(await cross.currentChainID());

        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID ,
          web3.utils.toBN(tokenPairInfo.fromChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          web3.utils.toBN(tokenPairInfo.toChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.toAccount
        );
        operator = global.operatorAccount[currentChainType];

        const tokenPairID = tokenPair.tokenPairID;
        const agentFee = web3.utils.toBN(0);

        const crossFee = agentFee
          .mul(web3.utils.toBN(crossValueToWei))
          .div(web3.utils.toBN(DENOMINATOR));
        const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
          crossFee
        );

        let funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueActually,
          crossFee: crossFee,
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
          typesArrayList.smgMint,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.crossValue,
          funcParams.crossFee,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgMint(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Mint failed");
      } finally {
        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID,
          tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          tokenPairInfo.toAccount
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @wanchain] <( ethereum => wanchain )> -> smgMint  ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.WAN;
      const buddyChainType = chainTypes.ETH;
      const uniqueID = uniqueInfo.userLockLink;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = wanUserAccount;
      const senderAccount = global.smgAccount.src[currentChainType];
      const currentToken = global.chains[buddyChainType].tokens.filter(
        (token) => token.symbol === "LINK"
      )[0];

      // cross
      const cross = await CrossDelegate.at(
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
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      const crossFee = agentFee
        .mul(web3.utils.toBN(crossValueToWei))
        .div(web3.utils.toBN(DENOMINATOR));
      const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
        crossFee
      );

      let tokenInstance = await getRC20TokenInstance(tokenAccount);
      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(smgFeeProxy)
      );

      let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
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
        typesArrayList.smgMint,
        await cross.currentChainID(),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.crossValue,
        funcParams.crossFee,
        funcParams.tokenAccount,
        funcParams.userAccount
      );
      funcParams = { ...funcParams, R: R, s: s };

      let receipt = await cross.smgMint(...Object.values(funcParams), {
        from: senderAccount,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }
      const eventSmgMint = assert.getWeb3Log(receipt, { event: "SmgMint" });
      assert.equal(!!eventSmgMint === true, true, "get event SmgMint error");
      assert.equal(
        eventSmgMint.args.uniqueID,
        funcParams.uniqueID,
        "event SmgMint uniqueID error"
      );
      assert.equal(
        eventSmgMint.args.smgID,
        funcParams.smgID,
        "event SmgMint smgID error"
      );
      assert.equal(
        eventSmgMint.args.keys.length,
        eventSmgMint.args.values.length,
        "invalid SmgMint keys and values length"
      );
      const eventSmgMintParams = eventSmgMint.args.keys.reduce(
        (reduced, next, index) => {
          const [paramName, paramType] = next.split(":");
          reduced[paramName] = {};
          reduced[paramName].type = paramType;
          reduced[paramName].value = eventSmgMint.args.values[index];
          return reduced;
        },
        {}
      );
      assert.equal(
        eventSmgMintParams.value.type,
        "uint256",
        "invalid SmgMint value type"
      );
      assert.equal(
        web3.utils
          .toBN(eventSmgMintParams.value.value)
          .eq(funcParams.crossValue),
        true,
        "invalid SmgMint crossValue value"
      );
      assert.equal(
        eventSmgMintParams.tokenAccount.type,
        "address",
        "invalid SmgMint tokenAccount type"
      );
      assert.equal(
        eventSmgMintParams.tokenAccount.value.toLowerCase(),
        funcParams.tokenAccount.toLowerCase(),
        "invalid SmgMint tokenAccount value"
      );
      assert.equal(
        eventSmgMintParams.userAccount.type,
        "address",
        "invalid SmgMint userAccount type"
      );
      assert.equal(
        eventSmgMintParams.userAccount.value.toLowerCase(),
        funcParams.userAccount.toLowerCase(),
        "invalid SmgMint userAccount value"
      );
      assert.equal(
        eventSmgMintParams.fee.type,
        "uint256",
        "invalid SmgMint fee type"
      );
      assert.equal(
        web3.utils.toBN(eventSmgMintParams.fee.value).eq(funcParams.crossFee),
        true,
        "invalid SmgMint fee value"
      );

      assert.checkWeb3Event(receipt, {
        event: "SmgMintLogger",
        args: {
          uniqueID: funcParams.uniqueID,
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          value: funcParams.crossValue,
          tokenAccount: funcParams.tokenAccount,
          userAccount: funcParams.userAccount,
        },
      });
      // get token instance
      let balance = await tokenInstance.balanceOf(funcParams.userAccount);
      assert.equal(
        funcParams.crossValue.toString(),
        balance.toString(),
        "balance of receiver account error"
      );

      const afterBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(smgFeeProxy)
      );
      assert.equal(
        afterBalance
          .sub(beforeBalance)
          .eq(web3.utils.toBN(funcParams.crossFee)),
        true,
        "balance of storeman fee error"
      );
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @wanchain] <( wanchain => ethereum )> -> userBurn ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.WAN;
      const buddyChainType = chainTypes.ETH;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = ethUserAccount;
      const senderAccount = wanUserAccount;
      const currentToken = global.chains[buddyChainType].tokens.filter(
        (token) => token.symbol === "LINK"
      )[0];

      // cross
      const cross = await CrossDelegate.at(
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

      // get token instance
      const tokenInstance = await getRC20TokenInstance(tokenAccount);
      const balance = await tokenInstance.balanceOf(senderAccount);

      const crossAdmin = await cross.admin();

      const crossChainFee = await getCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      });
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      await resetCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      }, crossAdmin);

      await cross.setFee({
        srcChainID: global.chains[currentChainType].ID,
        destChainID: "0",
        contractFee:contractFee.toString(10),
        agentFee:"0"
      }, {from: crossAdmin});

      const crossFee = agentFee
        .mul(web3.utils.toBN(balance))
        .div(web3.utils.toBN(DENOMINATOR));
      const crossValueActually = balance; // web3.utils.toBN(crossValueToWei).sub(crossFee);

      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );

      // approve
      let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount,
      };

      // // get token instance
      // let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
      // let balance = await tokenInstance.balanceOf(senderAccount);
      // assert.equal(funcParams.crossValue.toString(), balance.toString(), "balance of sender account error");

      // exec
      let receipt = await cross.userBurn(...Object.values(funcParams), {
        from: senderAccount,
        value: moreServiceFee,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }

      assert.checkWeb3Event(receipt, {
        event: "UserBurnLogger",
        args: {
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          tokenAccount: funcParams.tokenAccount,
          value: funcParams.crossValue,
          contractFee: contractFee.toString(10),
          fee: funcParams.crossFee,
          userAccount: funcParams.userAccount.toLowerCase(),
        },
      });

      const afterBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );
      assert.equal(
        afterBalance.sub(beforeBalance).eq(web3.utils.toBN(contractFee)),
        true,
        "balance of storeman fee error"
      );
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  Not support", async () => {
      let tokenManager, tokenPairID, operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const uniqueID = uniqueInfo.userReleaseLink;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];
        const currentToken = global.chains[currentChainType].tokens.filter(
          (token) => token.symbol === "LINK"
        )[0];

        // cross
        const cross = await CrossDelegate.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const partners = await cross.getPartners();

        tokenManager = await TokenManagerDelegate.at(partners.tokenManager);
        // tokenAccount
        const tokenPair = filterTokenPair(
          global.tokenPairs,
          currentChainType,
          buddyChainType,
          currentToken.symbol
        );
        const tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        const tokenAccount = getTokenAccount(tokenPairInfo, currentChainType);

        tokenPairID = tokenPair.tokenPairID;
        operator = global.operatorAccount[currentChainType];
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(10)],
          { from: operator }
        );
        assert.equal(web3.utils.toBN(await tokenManager.mapTokenPairType(tokenPairID)).eq(web3.utils.toBN(10)), true, "check token pair type failed");

        const agentFee = web3.utils.toBN(100);
        const crossFee = web3.utils.toBN(agentFee);
        const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
          crossFee
        );

        funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueActually,
          crossFee: crossFee,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

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
          typesArrayList.smgRelease,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.crossValue,
          funcParams.crossFee,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgRelease(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Not support");
      } finally {
        await tokenManager.setTokenPairTypes(
          [tokenPairID],
          [web3.utils.toBN(0)],
          { from: operator }
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  Transfer token fee failed", async () => {
      let tokenManager, tokenAncestorInfo, tokenPairInfo, operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const uniqueID = uniqueInfo.userReleaseLink;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];
        const currentToken = global.chains[currentChainType].tokens.filter(
          (token) => token.symbol === "LINK"
        )[0];

        // cross
        const cross = await CrossDelegate.at(
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
        tokenAncestorInfo = await tokenManager.getAncestorInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo.id = tokenPair.tokenPairID;

        const tokenSc = await FakeToken.new("Test", "Test");
        await tokenSc.setTestInvalidMode(true);
        const tokenAccount = tokenSc.address;
        const currentChainID = web3.utils.toBN(await cross.currentChainID());

        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID ,
          web3.utils.toBN(tokenPairInfo.fromChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          web3.utils.toBN(tokenPairInfo.toChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.toAccount
        );
        operator = global.operatorAccount[currentChainType];

        const tokenPairID = tokenPair.tokenPairID;
        const agentFee = web3.utils.toBN(100);

        const crossFee = web3.utils.toBN(agentFee);
        const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
          crossFee
        );

        funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueActually,
          crossFee: crossFee,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

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
          typesArrayList.smgRelease,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.crossValue,
          funcParams.crossFee,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgRelease(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Transfer token fee failed");
      } finally {
        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID,
          tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          tokenPairInfo.toAccount
        );
      }
    });

    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  Transfer token failed", async () => {
      let tokenManager, tokenAncestorInfo, tokenPairInfo, operator;
      try {
        const wanUserAccount = global.aliceAccount.WAN;
        const ethUserAccount = global.aliceAccount.ETH;
        const currentChainType = chainTypes.ETH;
        const buddyChainType = chainTypes.WAN;
        const uniqueID = uniqueInfo.userReleaseLink;
        const smgID = global.storemanGroups.src.ID;
        const crossValueToWei = web3.utils.toWei(crossValue.toString());
        const userAccount = ethUserAccount;
        const senderAccount = global.smgAccount.src[currentChainType];
        const currentToken = global.chains[currentChainType].tokens.filter(
          (token) => token.symbol === "LINK"
        )[0];

        // cross
        const cross = await CrossDelegate.at(
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
        tokenAncestorInfo = await tokenManager.getAncestorInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo = await tokenManager.getTokenPairInfo(
          tokenPair.tokenPairID
        );
        tokenPairInfo.id = tokenPair.tokenPairID;

        const tokenSc = await FakeToken.new("Test", "Test");
        await tokenSc.setTestInvalidMode(true);
        const tokenAccount = tokenSc.address;
        const currentChainID = web3.utils.toBN(await cross.currentChainID());

        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID ,
          web3.utils.toBN(tokenPairInfo.fromChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          web3.utils.toBN(tokenPairInfo.toChainID).eq(currentChainID) ? tokenAccount : tokenPairInfo.toAccount
        );
        operator = global.operatorAccount[currentChainType];

        const tokenPairID = tokenPair.tokenPairID;

        const crossFee = web3.utils.toBN(0);
        const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
          crossFee
        );

        funcParams = {
          uniqueID: uniqueID,
          smgID: smgID,
          tokenPairID: tokenPairID,
          crossValue: crossValueActually,
          crossFee: crossFee,
          tokenAccount: tokenAccount,
          userAccount: userAccount,
        };

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
          typesArrayList.smgRelease,
          await cross.currentChainID(),
          funcParams.uniqueID,
          funcParams.tokenPairID,
          funcParams.crossValue,
          funcParams.crossFee,
          funcParams.tokenAccount,
          funcParams.userAccount
        );
        funcParams = { ...funcParams, R: R, s: s };

        await cross.smgRelease(...Object.values(funcParams), {
          from: senderAccount,
        });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Transfer token failed");
      } finally {
        await tokenManager.updateTokenPair(
          tokenPairInfo.id,
          [
            tokenAncestorInfo.account,
            tokenAncestorInfo.name,
            tokenAncestorInfo.symbol,
            tokenAncestorInfo.decimals,
            tokenAncestorInfo.chainId
          ],
          tokenPairInfo.fromChainID,
          tokenPairInfo.fromAccount,
          tokenPairInfo.toChainID,
          tokenPairInfo.toAccount
        );
      }
    });


    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( wanchain => ethereum )> -> smgRelease  ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.ETH;
      const buddyChainType = chainTypes.WAN;
      const uniqueID = uniqueInfo.userReleaseLink;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = ethUserAccount;
      const senderAccount = global.smgAccount.src[currentChainType];
      const currentToken = global.chains[currentChainType].tokens.filter(
        (token) => token.symbol === "LINK"
      )[0];

      // cross
      const cross = await CrossDelegate.at(
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
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      const crossFee = agentFee;
      // const crossFee = agentFee
      //   .mul(web3.utils.toBN(crossValueToWei))
      //   .div(web3.utils.toBN(DENOMINATOR));
      const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
        crossFee
      );

      let tokenInstance = await getRC20TokenInstance(tokenAccount);
      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(smgFeeProxy)
      );

      funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount,
      };

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
        typesArrayList.smgRelease,
        await cross.currentChainID(),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.crossValue,
        funcParams.crossFee,
        funcParams.tokenAccount,
        funcParams.userAccount
      );
      funcParams = { ...funcParams, R: R, s: s };

      let receipt = await cross.smgRelease(...Object.values(funcParams), {
        from: senderAccount,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }
      const eventSmgRelease = assert.getWeb3Log(receipt, {
        event: "SmgRelease",
      });
      assert.equal(
        !!eventSmgRelease === true,
        true,
        "get event SmgRelease error"
      );
      assert.equal(
        eventSmgRelease.args.uniqueID,
        funcParams.uniqueID,
        "event SmgRelease uniqueID error"
      );
      assert.equal(
        eventSmgRelease.args.smgID,
        funcParams.smgID,
        "event SmgRelease smgID error"
      );
      assert.equal(
        eventSmgRelease.args.keys.length,
        eventSmgRelease.args.values.length,
        "invalid SmgRelease keys and values length"
      );
      const eventSmgReleaseParams = eventSmgRelease.args.keys.reduce(
        (reduced, next, index) => {
          const [paramName, paramType] = next.split(":");
          reduced[paramName] = {};
          reduced[paramName].type = paramType;
          reduced[paramName].value = eventSmgRelease.args.values[index];
          return reduced;
        },
        {}
      );
      assert.equal(
        eventSmgReleaseParams.value.type,
        "uint256",
        "invalid SmgRelease value type"
      );
      assert.equal(
        web3.utils
          .toBN(eventSmgReleaseParams.value.value)
          .eq(funcParams.crossValue),
        true,
        "invalid SmgRelease crossValue value"
      );
      assert.equal(
        eventSmgReleaseParams.tokenAccount.type,
        "address",
        "invalid SmgMint tokenAccount type"
      );
      assert.equal(
        eventSmgReleaseParams.tokenAccount.value.toLowerCase(),
        funcParams.tokenAccount.toLowerCase(),
        "invalid SmgMint tokenAccount value"
      );
      assert.equal(
        eventSmgReleaseParams.userAccount.type,
        "address",
        "invalid SmgMint userAccount type"
      );
      assert.equal(
        eventSmgReleaseParams.userAccount.value.toLowerCase(),
        funcParams.userAccount.toLowerCase(),
        "invalid SmgMint userAccount value"
      );
      assert.equal(
        eventSmgReleaseParams.fee.type,
        "uint256",
        "invalid SmgRelease fee type"
      );
      assert.equal(
        web3.utils
          .toBN(eventSmgReleaseParams.fee.value)
          .eq(funcParams.crossFee),
        true,
        "invalid SmgRelease fee value"
      );

      assert.checkWeb3Event(receipt, {
        event: "SmgReleaseLogger",
        args: {
          uniqueID: funcParams.uniqueID,
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          value: funcParams.crossValue,
          tokenAccount: funcParams.tokenAccount,
          userAccount: funcParams.userAccount,
        },
      });

      const afterBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(smgFeeProxy)
      );
      assert.equal(
        afterBalance
          .sub(beforeBalance)
          .eq(web3.utils.toBN(funcParams.crossFee)),
        true,
        "balance of storeman fee error"
      );
    });

    // BTC
    it("Chain [BTC] <=> Chain [WAN] -> COIN [BTC @wanchain] <( bitcoin => wanchain )> -> smgMint  ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const btcUserAccount = global.aliceAccount.BTC;
      const currentChainType = chainTypes.WAN;
      const buddyChainType = chainTypes.BTC;
      const uniqueID = uniqueInfo.userLockWanBTC;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = wanUserAccount;
      const senderAccount = global.smgAccount.src[currentChainType];
      const currentToken = global.chains[buddyChainType].coin;

      // cross
      const cross = await CrossDelegate.at(
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
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      const crossFee = agentFee
        .mul(web3.utils.toBN(crossValueToWei))
        .div(web3.utils.toBN(DENOMINATOR));
      const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
        crossFee
      );

      let tokenInstance = await getRC20TokenInstance(tokenAccount);
      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(smgFeeProxy)
      );

      let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
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
        typesArrayList.smgMint,
        await cross.currentChainID(),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.crossValue,
        funcParams.crossFee,
        funcParams.tokenAccount,
        funcParams.userAccount
      );
      funcParams = { ...funcParams, R: R, s: s };

      let receipt = await cross.smgMint(...Object.values(funcParams), {
        from: senderAccount,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }
      const eventSmgMint = assert.getWeb3Log(receipt, { event: "SmgMint" });
      assert.equal(!!eventSmgMint === true, true, "get event SmgMint error");
      assert.equal(
        eventSmgMint.args.uniqueID,
        funcParams.uniqueID,
        "event SmgMint uniqueID error"
      );
      assert.equal(
        eventSmgMint.args.smgID,
        funcParams.smgID,
        "event SmgMint smgID error"
      );
      assert.equal(
        eventSmgMint.args.keys.length,
        eventSmgMint.args.values.length,
        "invalid SmgMint keys and values length"
      );
      const eventSmgMintParams = eventSmgMint.args.keys.reduce(
        (reduced, next, index) => {
          const [paramName, paramType] = next.split(":");
          reduced[paramName] = {};
          reduced[paramName].type = paramType;
          reduced[paramName].value = eventSmgMint.args.values[index];
          return reduced;
        },
        {}
      );
      assert.equal(
        eventSmgMintParams.value.type,
        "uint256",
        "invalid SmgMint value type"
      );
      assert.equal(
        web3.utils
          .toBN(eventSmgMintParams.value.value)
          .eq(funcParams.crossValue),
        true,
        "invalid SmgMint crossValue value"
      );
      assert.equal(
        eventSmgMintParams.tokenAccount.type,
        "address",
        "invalid SmgMint tokenAccount type"
      );
      assert.equal(
        eventSmgMintParams.tokenAccount.value.toLowerCase(),
        funcParams.tokenAccount.toLowerCase(),
        "invalid SmgMint tokenAccount value"
      );
      assert.equal(
        eventSmgMintParams.userAccount.type,
        "address",
        "invalid SmgMint userAccount type"
      );
      assert.equal(
        eventSmgMintParams.userAccount.value.toLowerCase(),
        funcParams.userAccount.toLowerCase(),
        "invalid SmgMint userAccount value"
      );
      assert.equal(
        eventSmgMintParams.fee.type,
        "uint256",
        "invalid SmgMint fee type"
      );
      assert.equal(
        web3.utils.toBN(eventSmgMintParams.fee.value).eq(funcParams.crossFee),
        true,
        "invalid SmgMint fee value"
      );

      assert.checkWeb3Event(receipt, {
        event: "SmgMintLogger",
        args: {
          uniqueID: funcParams.uniqueID,
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          value: funcParams.crossValue,
          tokenAccount: funcParams.tokenAccount,
          userAccount: funcParams.userAccount,
        },
      });
      // get token instance
      let balance = await tokenInstance.balanceOf(funcParams.userAccount);
      assert.equal(
        funcParams.crossValue.toString(),
        balance.toString(),
        "balance of receiver account error"
      );

      const afterBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(smgFeeProxy)
      );
      assert.equal(
        afterBalance
          .sub(beforeBalance)
          .eq(web3.utils.toBN(funcParams.crossFee)),
        true,
        "balance of storeman fee error"
      );
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [BTC @wanchain] <( wanchain => ethereum )> -> userBurn ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const btcUserAccount = global.aliceAccount.BTC;
      const currentChainType = chainTypes.WAN;
      const buddyChainType = chainTypes.ETH;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = ethUserAccount;
      const senderAccount = wanUserAccount;
      const currentToken = global.chains[buddyChainType].tokens.filter(
        (token) => token.symbol === "wanBTC"
      )[0];

      // cross
      const cross = await CrossDelegate.at(
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

      // get token instance
      const tokenInstance = await getRC20TokenInstance(tokenAccount);
      const balance = await tokenInstance.balanceOf(senderAccount);

      const crossAdmin = await cross.admin();
      const crossChainFee = await getCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      });
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      await resetCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      }, crossAdmin);

      await cross.setFee({
        srcChainID: global.chains[currentChainType].ID,
        destChainID: "0",
        contractFee:contractFee.toString(10),
        agentFee:"0"
      }, {from: crossAdmin});

      // const crossFee = web3.utils.toBN(fee.agentFee).mul(web3.utils.toBN(crossValueToWei)).div(web3.utils.toBN(DENOMINATOR));
      const crossFee = agentFee
        .mul(web3.utils.toBN(balance))
        .div(web3.utils.toBN(DENOMINATOR));
      const crossValueActually = balance; // web3.utils.toBN(crossValueToWei).sub(crossFee);

      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );

      // approve
      let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount,
      };

      // // get token instance
      // let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
      // let balance = await tokenInstance.balanceOf(senderAccount);
      // assert.equal(funcParams.crossValue.toString(), balance.toString(), "balance of sender account error");

      // exec
      let receipt = await cross.userBurn(...Object.values(funcParams), {
        from: senderAccount,
        value: moreServiceFee,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }

      assert.checkWeb3Event(receipt, {
        event: "UserBurnLogger",
        args: {
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          tokenAccount: funcParams.tokenAccount,
          value: funcParams.crossValue,
          contractFee: contractFee.toString(10),
          fee: funcParams.crossFee,
          userAccount: funcParams.userAccount.toLowerCase(),
        },
      });

      const afterBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );
      assert.equal(
        afterBalance.sub(beforeBalance).eq(web3.utils.toBN(contractFee)),
        true,
        "balance of storeman fee error"
      );
    });

    it("Chain [WAN] <=> Chain [ETH] -> COIN [BTC @ethereum] <( wanchain => ethereum )> -> smgMint  ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const btcUserAccount = global.aliceAccount.BTC;
      const currentChainType = chainTypes.ETH;
      const buddyChainType = chainTypes.WAN;
      const uniqueID = uniqueInfo.userLockWan2EthBTC;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = ethUserAccount;
      const senderAccount = global.smgAccount.src[currentChainType];
      const currentToken = global.chains[buddyChainType].tokens.filter(
        (token) => token.symbol === "wanBTC"
      )[0];

      // cross
      const cross = await CrossDelegate.at(
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
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      const crossFee = agentFee
        .mul(web3.utils.toBN(crossValueToWei))
        .div(web3.utils.toBN(DENOMINATOR));
      const crossValueActually = web3.utils.toBN(crossValueToWei).sub(
        crossFee
      );

      let tokenInstance = await getRC20TokenInstance(tokenAccount);
      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(smgFeeProxy)
      );

      let funcParams = {
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
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
        typesArrayList.smgMint,
        await cross.currentChainID(),
        funcParams.uniqueID,
        funcParams.tokenPairID,
        funcParams.crossValue,
        funcParams.crossFee,
        funcParams.tokenAccount,
        funcParams.userAccount
      );
      funcParams = { ...funcParams, R: R, s: s };

      let receipt = await cross.smgMint(...Object.values(funcParams), {
        from: senderAccount,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }
      const eventSmgMint = assert.getWeb3Log(receipt, { event: "SmgMint" });
      assert.equal(!!eventSmgMint === true, true, "get event SmgMint error");
      assert.equal(
        eventSmgMint.args.uniqueID,
        funcParams.uniqueID,
        "event SmgMint uniqueID error"
      );
      assert.equal(
        eventSmgMint.args.smgID,
        funcParams.smgID,
        "event SmgMint smgID error"
      );
      assert.equal(
        eventSmgMint.args.keys.length,
        eventSmgMint.args.values.length,
        "invalid SmgMint keys and values length"
      );
      const eventSmgMintParams = eventSmgMint.args.keys.reduce(
        (reduced, next, index) => {
          const [paramName, paramType] = next.split(":");
          reduced[paramName] = {};
          reduced[paramName].type = paramType;
          reduced[paramName].value = eventSmgMint.args.values[index];
          return reduced;
        },
        {}
      );
      assert.equal(
        eventSmgMintParams.value.type,
        "uint256",
        "invalid SmgMint value type"
      );
      assert.equal(
        web3.utils
          .toBN(eventSmgMintParams.value.value)
          .eq(funcParams.crossValue),
        true,
        "invalid SmgMint crossValue value"
      );
      assert.equal(
        eventSmgMintParams.tokenAccount.type,
        "address",
        "invalid SmgMint tokenAccount type"
      );
      assert.equal(
        eventSmgMintParams.tokenAccount.value.toLowerCase(),
        funcParams.tokenAccount.toLowerCase(),
        "invalid SmgMint tokenAccount value"
      );
      assert.equal(
        eventSmgMintParams.userAccount.type,
        "address",
        "invalid SmgMint userAccount type"
      );
      assert.equal(
        eventSmgMintParams.userAccount.value.toLowerCase(),
        funcParams.userAccount.toLowerCase(),
        "invalid SmgMint userAccount value"
      );
      assert.equal(
        eventSmgMintParams.fee.type,
        "uint256",
        "invalid SmgMint fee type"
      );
      assert.equal(
        web3.utils.toBN(eventSmgMintParams.fee.value).eq(funcParams.crossFee),
        true,
        "invalid SmgMint fee value"
      );

      assert.checkWeb3Event(receipt, {
        event: "SmgMintLogger",
        args: {
          uniqueID: funcParams.uniqueID,
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          value: funcParams.crossValue,
          tokenAccount: funcParams.tokenAccount,
          userAccount: funcParams.userAccount,
        },
      });
      // get token instance
      let balance = await tokenInstance.balanceOf(funcParams.userAccount);
      assert.equal(
        funcParams.crossValue.toString(),
        balance.toString(),
        "balance of receiver account error"
      );

      const afterBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(smgFeeProxy)
      );
      assert.equal(
        afterBalance
          .sub(beforeBalance)
          .eq(web3.utils.toBN(funcParams.crossFee)),
        true,
        "balance of storeman fee error"
      );
    });

    it("Chain [ETH] <=> Chain [BTC] -> COIN [BTC @ethereum] <( ethereum => bitcoin )> -> userBurn ==>  success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const btcUserAccount = global.aliceAccount.BTC;
      const currentChainType = chainTypes.ETH;
      const buddyChainType = chainTypes.BTC;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = web3.utils.fromAscii(btcUserAccount);
      const senderAccount = ethUserAccount;
      const currentToken = global.chains[buddyChainType].coin;

      // cross
      const cross = await CrossDelegate.at(
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

      // get token instance
      const tokenInstance = await getRC20TokenInstance(tokenAccount);
      const balance = await tokenInstance.balanceOf(senderAccount);

      const crossAdmin = await cross.admin();
      const crossChainFee = await getCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      });
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      await resetCrossChainFee({
        cross,
        srcChainID: global.chains[currentChainType].ID,
        destChainID: global.chains[buddyChainType].ID,
        tokenPairID,
      }, crossAdmin);

      await cross.setFee({
        srcChainID: global.chains[currentChainType].ID,
        destChainID: "0",
        contractFee:contractFee.toString(10),
        agentFee:"0"
      }, {from: crossAdmin});


      // const crossFee = web3.utils.toBN(fee.agentFee).mul(web3.utils.toBN(crossValueToWei)).div(web3.utils.toBN(DENOMINATOR));
      const crossFee = agentFee
        .mul(web3.utils.toBN(balance))
        .div(web3.utils.toBN(DENOMINATOR));
      const crossValueActually = balance; // web3.utils.toBN(crossValueToWei).sub(crossFee);

      let smgFeeProxy = partners.smgFeeProxy;
      if (smgFeeProxy === ADDRESS_0) {
        smgFeeProxy = await cross.owner();
      }
      const beforeBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );

      let funcParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueActually,
        crossFee: crossFee,
        tokenAccount: tokenAccount,
        userAccount: userAccount,
      };

      // // get token instance
      // let tokenInstance = await getRC20TokenInstance(funcParams.tokenAccount);
      // let balance = await tokenInstance.balanceOf(senderAccount);
      // assert.equal(funcParams.crossValue.toString(), balance.toString(), "balance of sender account error");

      // exec
      let receipt = await cross.userBurn(...Object.values(funcParams), {
        from: senderAccount,
        value: moreServiceFee,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }

      assert.checkWeb3Event(receipt, {
        event: "UserBurnLogger",
        args: {
          smgID: web3.utils.padRight(funcParams.smgID, 64),
          tokenPairID: funcParams.tokenPairID,
          tokenAccount: funcParams.tokenAccount,
          value: funcParams.crossValue,
          contractFee: contractFee.toString(10),
          fee: funcParams.crossFee,
          userAccount: funcParams.userAccount.toLowerCase(),
        },
      });

      const afterBalance = web3.utils.toBN(
        await web3.eth.getBalance(smgFeeProxy)
      );
      assert.equal(
        afterBalance.sub(beforeBalance).eq(web3.utils.toBN(contractFee)),
        true,
        "balance of storeman fee error"
      );
    });

    // smgWithdrawHistoryFee
    it("Chain [ETH] <=> Chain [WAN] -> TOKEN [LINK @ethereum] <( ethereum <=> wanchain )> -> smgWithdrawHistoryFee foundation account  ==> success", async () => {
      const wanUserAccount = global.aliceAccount.WAN;
      const ethUserAccount = global.aliceAccount.ETH;
      const currentChainType = chainTypes.ETH;
      const buddyChainType = chainTypes.WAN;
      const smgID = global.storemanGroups.src.ID;
      const crossValueToWei = web3.utils.toWei(crossValue.toString());
      const userAccount = wanUserAccount;
      const senderAccount = ethUserAccount;
      const currentToken = global.chains[currentChainType].tokens.filter(
        (token) => token.symbol === "LINK"
      )[0];
      // cross
      const crossProxy = await CrossProxy.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );
      // TODO: delete upgradeTo until upgrade function enabled
      // await crossProxy.upgradeTo(global.chains[currentChainType].scAddr.CrossDelegate);
      var cross = await CrossDelegate.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );
      const partners = await cross.getPartners();
      const origOwner = await crossProxy.owner();
      await cross.setPartners(
        partners.tokenManager,
        partners.smgAdminProxy,
        ADDRESS_0,
        ADDRESS_0,
        partners.sigVerifier,
        { from: origOwner }
      );

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
      const contractFee = web3.utils.toBN(crossChainFee.contractFee == 0 ? 1000 : crossChainFee.contractFee);
      const moreServiceFee = contractFee.mul(web3.utils.toBN(2));
      const agentFee = web3.utils.toBN(crossChainFee.agentFee == 0 ? 100 : crossChainFee.agentFee);

      // exec
      let lockParams = {
        smgID: smgID,
        tokenPairID: tokenPairID,
        crossValue: crossValueToWei,
        userAccount: userAccount,
      };

      // get token instance
      let tokenInstance = await getRC20TokenInstance(tokenAccount);
      let balance = await tokenInstance.balanceOf(senderAccount);
      if (balance.lt(web3.utils.toBN(crossValueToWei))) {
        // mint token: LINK
        let mintValue = web3.utils.toBN(crossValueToWei).sub(balance);
        const tokenCreator = await TestOrigTokenCreator.at(
          global.chains[currentChainType].scAddr.TestOrigTokenCreator
        );
        await tokenCreator.mintToken(
          currentToken.name,
          currentToken.symbol,
          senderAccount,
          mintValue.toString()
        );
      }
      balance = await tokenInstance.balanceOf(senderAccount);
      assert.equal(
        crossValueToWei,
        balance.toString(),
        "balance of sender account error"
      );

      // approve
      await tokenInstance.approve(cross.address, 0, { from: senderAccount });
      await tokenInstance.approve(cross.address, crossValueToWei, {
        from: senderAccount,
      });
      let allowance = await tokenInstance.allowance(
        senderAccount,
        cross.address
      );
      assert.equal(
        crossValueToWei,
        allowance.toString(),
        "approve token failed"
      );

      let receipt = await cross.userLock(...Object.values(lockParams), {
        from: senderAccount,
        value: moreServiceFee,
      });
      if (!receipt.logs.length) {
        receipt.logs = await getTxParsedLogs(
          global.knownEvents[currentChainType].RapidityLib,
          receipt.tx
        );
      }

      assert.checkWeb3Event(receipt, {
        event: "UserLockLogger",
        args: {
          smgID: web3.utils.padRight(lockParams.smgID, 64),
          tokenPairID: lockParams.tokenPairID,
          tokenAccount: tokenAccount,
          value: lockParams.crossValue,
          contractFee: contractFee.toString(10),
          userAccount: lockParams.userAccount.toLowerCase(),
        },
      });

      // TODO: delete upgradeTo until upgrade function enabled
      // await crossProxy.upgradeTo(global.chains[currentChainType].scAddr.CrossDelegate);
      var cross = await CrossDelegate.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );

      // TODO: fee not in contract
      let fee = web3.utils.toBN(
        await cross.getStoremanFee(web3.utils.padRight(smgID, 64))
      );
      let beforeCrossBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(cross.address)
      );
      // assert.equal(
      //   web3.utils.toBN(contractFee).eq(fee),
      //   false,
      //   `check storeman fee failed`
      // );
      // assert.equal(
      //   beforeCrossBalance.lte(
      //     fee.add(web3.utils.toBN(lockParams.crossValue))
      //   ),
      //   true,
      //   `check storeman fee balance failed`
      // );

      let withdrawReceipt = await cross.smgWithdrawHistoryFee([
        web3.utils.padRight(smgID, 64),
      ]);
      let withdrawLogs = withdrawReceipt.logs.filter(
        (log) => log.event === "WithdrawHistoryFeeLogger"
      );
      // if (withdrawLogs[0].args.tokenAccount === ADDRESS_0) {
      //   assert.equal(
      //     web3.utils.toBN(withdrawLogs[0].args.fee).eq(contractFee),
      //     true,
      //     "withdraw history contract fee failed"
      //   );
      // }
      // assert.equal(
      //   withdrawLogs[0].args.receiver,
      //   origOwner,
      //   "withdraw fee receiver failed"
      // );

      let afterFeeBalance = web3.utils.toBN(
        await tokenInstance.balanceOf(cross.address)
      );
      assert.equal(
        beforeCrossBalance.sub(afterFeeBalance).lte(fee),
        true,
        `check withdraw storeman fee balance failed`
      );
    });
  });
};
