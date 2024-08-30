const crypto = require("crypto");

const {
  ADDRESS_0,
  ADDRESS_1,
  ERROR_INFO,
  chainTypes,
} = require("./common");

const { assert, sha256 } = require("./lib");
const { web3 } = require("hardhat");
const { access } = require("fs");

exports.testCases = () => {
  describe("Cross_common", function () {
    it("Transfer owner @wanchain   -> Success", async () => {
      const { CrossProxy } = getContractArtifacts();
      const currentChainType = chainTypes.WAN;
      let crossProxy;
      let currentOwner;

      crossProxy = await CrossProxy.at(
        global.chains[currentChainType].scAddr.CrossProxy
      );

      const origOwner = await crossProxy.owner();
      const newOwner = global.aliceAccount.WAN;

      await crossProxy.transferOwner(newOwner, { from: origOwner });
      currentOwner = await crossProxy.owner();
      assert.equal(
        newOwner.toLowerCase(),
        currentOwner.toLowerCase(),
        `transfer owner from current owner (${currentOwner}) to new owner (${newOwner}) failed`
      );

      await crossProxy.transferOwner(origOwner, { from: newOwner });
      currentOwner = await crossProxy.owner();
      assert.equal(
        origOwner.toLowerCase(),
        currentOwner.toLowerCase(),
        `restore owner from current owner (${currentOwner}) to original owner (${origOwner}) failed`
      );
    });

    it("Transfer owner @wanchain   -> New owner is the zero address", async () => {
      const { CrossProxy } = getContractArtifacts();
      const currentChainType = chainTypes.WAN;
      let crossProxy;
      try {
        crossProxy = await CrossProxy.at(
          global.chains[currentChainType].scAddr.CrossProxy
        );
        const origOwner = await crossProxy.owner();
        await crossProxy.transferOwner(ADDRESS_0, { from: origOwner });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "New owner is the zero address");
      }
    });

    it("Others getStoremanFee @wanchain and @ethereum  -> The config value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      let wanCross = await CrossDelegate.at(
        global.chains[chainTypes.WAN].scAddr.CrossProxy
      );
      let smgWanFee = await wanCross.getStoremanFee(
        global.storemanGroups.src.ID
      );
      assert.equal(
        new web3.utils.BN(smgWanFee).eq(new web3.utils.BN(0)),
        true,
        `check storeman group fee at ${chainTypes.WAN} failed`
      );

      let ethCross = await CrossDelegate.at(
        global.chains[chainTypes.ETH].scAddr.CrossProxy
      );
      let smgEthFee = await ethCross.getStoremanFee(
        global.storemanGroups.src.ID
      );
      assert.equal(
        new web3.utils.BN(smgEthFee).eq(new web3.utils.BN(0)),
        true,
        `check storeman group fee at ${chainTypes.ETH} failed`
      );
    });

    it("Others getPartners @wanchain and @ethereum   -> The chainID value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      let wanchain = chainTypes.WAN;
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );
      let wanChainID = await wanCross.currentChainID();
      assert.equal(
        global.chains[wanchain].ID,
        Number(wanChainID),
        `check chainID at ${wanchain} failed`
      );

      let ethereum = chainTypes.ETH;
      let ethCross = await CrossDelegate.at(
        global.chains[ethereum].scAddr.CrossProxy
      );
      let ethChainID = await ethCross.currentChainID();
      assert.equal(
        global.chains[ethereum].ID,
        Number(ethChainID),
        `check chainID at ${ethereum} failed`
      );
    });

    it("Others getPartners @wanchain and @ethereum   -> The admin value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      let wanchain = chainTypes.WAN;
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );
      let wanAdmin = await wanCross.admin();
      assert.equal(
        global.adminAccount[wanchain],
        wanAdmin,
        `check admin at ${wanchain} failed`
      );

      let ethereum = chainTypes.ETH;
      let ethCross = await CrossDelegate.at(
        global.chains[ethereum].scAddr.CrossProxy
      );
      let ethAdmin = await ethCross.admin();
      assert.equal(
        global.adminAccount[ethereum],
        ethAdmin,
        `check admin at ${ethereum} failed`
      );
    });

    it("Others getPartners @wanchain and @ethereum   -> The config value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      let wanchain = chainTypes.WAN;
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );
      let wanPartners = await wanCross.getPartners();
      assert.equal(
        global.chains[wanchain].scAddr.TokenManagerProxy,
        wanPartners.tokenManager,
        `check partners tokenManager at ${wanchain} failed`
      );
      assert.equal(
        global.chains[wanchain].scAddr.TestStoremanAdmin,
        wanPartners.smgAdminProxy,
        `check partners smgAdminProxy at ${wanchain} failed`
      );
      assert.equal(
        global.foundationAccount[wanchain],
        wanPartners.smgFeeProxy,
        `check partners smgFeeProxy at ${wanchain} failed`
      );
      assert.equal(
        global.chains[wanchain].scAddr.SignatureVerifier,
        wanPartners.sigVerifier,
        `check partners sigVerifier at ${wanchain} failed`
      );

      let ethereum = chainTypes.ETH;
      let ethCross = await CrossDelegate.at(
        global.chains[ethereum].scAddr.CrossProxy
      );
      let ethPartners = await ethCross.getPartners();
      assert.equal(
        global.chains[ethereum].scAddr.TokenManagerProxy,
        ethPartners.tokenManager,
        `check partners tokenManager at ${ethereum} failed`
      );
      assert.equal(
        global.chains[ethereum].scAddr.OracleProxy,
        ethPartners.smgAdminProxy,
        `check partners smgAdminProxy at ${ethereum} failed`
      );
      assert.equal(
        global.foundationAccount[ethereum],
        ethPartners.smgFeeProxy,
        `check partners smgFeeProxy at ${ethereum} failed`
      );
      assert.equal(
        global.chains[ethereum].scAddr.SignatureVerifier,
        ethPartners.sigVerifier,
        `check partners sigVerifier at ${ethereum} failed`
      );
    });

    it("Others setPartners @wanchain   -> Not owner", async () => {
      try {
        const { CrossDelegate } = getContractArtifacts();
        let wanCross = await CrossDelegate.at(
          global.chains[chainTypes.WAN].scAddr.CrossProxy
        );
        const admin = await wanCross.admin();
        await wanCross.setPartners(
          ADDRESS_0,
          ADDRESS_0,
          global.chains[chainTypes.WAN].scAddr.TestStoremanAdmin,
          ADDRESS_0,
          ADDRESS_0,
          { from: admin }
        );
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Not owner");
      }
    });

    it("Others setPartners @wanchain   -> Parameter is invalid", async () => {
      try {
        const { CrossProxy, CrossDelegate } = getContractArtifacts();
        let crossProxy = await CrossProxy.at(
          global.chains[chainTypes.WAN].scAddr.CrossProxy
        );
        const origOwner = await crossProxy.owner();
        let wanCross = await CrossDelegate.at(
          global.chains[chainTypes.WAN].scAddr.CrossProxy
        );
        await wanCross.setPartners(
          ADDRESS_0,
          ADDRESS_0,
          global.chains[chainTypes.WAN].scAddr.TestStoremanAdmin,
          ADDRESS_0,
          ADDRESS_0,
          { from: origOwner }
        );
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Parameter is invalid");
      }
    });

    it("Others getFees @wanchain and @ethereum   -> The config value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;
      const ethereum = chainTypes.ETH;
      let fees;
      let ret;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      fees = global.crossFeesV3[wanchain][ethereum];
      ret = await wanCross.getFee({
        srcChainID: global.chains[wanchain].ID,
        destChainID: global.chains[ethereum].ID,
      });
      assert.equal(
        fees.contractFee,
        ret.contractFee,
        `check contractFee from ${wanchain} to ${ethereum} at ${wanchain} failed`
      );
      assert.equal(
        fees.agentFee,
        ret.agentFee,
        `check agentFee from ${wanchain} to ${ethereum} at ${wanchain} failed`
      );

      // ethereum
      let ethCross = await CrossDelegate.at(
        global.chains[ethereum].scAddr.CrossProxy
      );

      fees = global.crossFeesV3[ethereum][wanchain];
      ret = await ethCross.getFee({
        srcChainID: global.chains[ethereum].ID,
        destChainID: global.chains[wanchain].ID,
      });
      assert.equal(
        fees.contractFee,
        ret.contractFee,
        `check contractFee from ${ethereum} to ${wanchain} at ${ethereum} failed`
      );
      assert.equal(
        fees.agentFee,
        ret.agentFee,
        `check agentFee from ${ethereum} to ${wanchain} at ${ethereum} failed`
      );
    });

    it("Others getTokenPairFees and getTokenPairFee   -> The default value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;
      let ret;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      const tokenPairIDs = ["0", "1"];
      ret = await wanCross.getTokenPairFees(tokenPairIDs);
      for (let i = 0; i < tokenPairIDs.length; ++i) {
        assert.equal(
          ret[i].eq(new web3.utils.BN(0)),
          true,
          `check token pair ${tokenPairIDs[i]} default contractFee failed`
        );
      }

      ret = await wanCross.getTokenPairFee(tokenPairIDs[0]);
      assert.equal(
        ret.eq(new web3.utils.BN(0)),
        true,
        `check token pair fee about ${tokenPairIDs[0]} default contractFee failed`
      );
    });

    it("configAdmin  -> Success", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      let owner = await wanCross.owner();

      let isAdmin = await wanCross.isAdmin(global.adminAccount[wanchain]);
      assert.equal(isAdmin, false, "check isAdmin failed");
      
      await wanCross.configAdmin(global.adminAccount[wanchain], true, {from: owner});

      isAdmin = await wanCross.isAdmin(global.adminAccount[wanchain]);
      assert.equal(isAdmin, true, "check isAdmin failed");
    });

    it("configOperator  -> Success", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );
      console.log('1');
      let isOperator = await wanCross.isOperator(global.adminAccount[wanchain]);
      console.log('2');
      assert.equal(isOperator, false, "check isOperator failed");
      console.log('3');
      let owner = await wanCross.owner();
      await wanCross.configAdmin(global.adminAccount[wanchain], true, {from: owner});
      console.log('4');

      await wanCross.configOperator(global.adminAccount[wanchain], true, {from: global.adminAccount[wanchain]});
      console.log('5');
      isOperator = await wanCross.isOperator(global.adminAccount[wanchain]);
      console.log('6');
      assert.equal(isOperator, true, "check isOperator failed");
    });

    it("configOperator  -> Not admin", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );
      
      try {
        await wanCross.configOperator(global.operatorAccount[wanchain], true, {from: global.aliceAccount.WAN});
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "not admin");
      }
    }); 

    it("setChainID  -> Success", async () => {
      const { CrossDelegate, RapidityLib, NFTLib } = getContractArtifacts();

      let rapidityLib = await RapidityLib.new();
      let nftLib = await NFTLib.new();
      await CrossDelegate.link(rapidityLib);
      await CrossDelegate.link(nftLib);
      let crossDelegate = await CrossDelegate.new();
      let owner = await crossDelegate.owner();
      await crossDelegate.setAdmin(owner);
      await crossDelegate.setChainID(3000, {from: owner});
      assert(web3.utils.toBN(await crossDelegate.currentChainID()).eq(web3.utils.toBN(3000)), true, "check chainID failed");

      await crossDelegate.setChainID(5000, {from: owner});
      assert(web3.utils.toBN(await crossDelegate.currentChainID()).eq(web3.utils.toBN(3000)), true, "check chainID failed");
    });

    it("setChainID  -> not admin", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      try {
        await wanCross.setChainID(3000, {from: global.aliceAccount.WAN});
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "not admin");
      }
    });

    it("currentChainID  -> success", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      const chainID = await wanCross.currentChainID(); 
    });

    it("setEtherTransferGasLimit  -> not admin", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      try {
        await wanCross.setEtherTransferGasLimit(3000, {from: global.aliceAccount.WAN});
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "not admin");
      }
    });

    it("Others setEtherTransferGasLimit and getEtherTransferGasLimit   -> The default value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;
      let ret;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      ret = await wanCross.getEtherTransferGasLimit();
      assert.equal(
        ret.eq(new web3.utils.BN(2300)),
        true,
        `check default etherTransferGasLimit failed`
      );

      const admin = await wanCross.admin();
      await wanCross.setEtherTransferGasLimit(3000, { from: admin });
      ret = await wanCross.getEtherTransferGasLimit();
      assert.equal(
        ret.eq(new web3.utils.BN(3000)),
        true,
        `check etherTransferGasLimit after setEtherTransferGasLimit failed`
      );

      await wanCross.setEtherTransferGasLimit(0, { from: admin });
      ret = await wanCross.getEtherTransferGasLimit();
      assert.equal(
        ret.eq(new web3.utils.BN(2300)),
        true,
        `check etherTransferGasLimit after setEtherTransferGasLimit failed`
      );
    });

    it("setUintValue  -> not admin", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      try {
        await wanCross.setUintValue("0x1","0x2","3", {from: global.aliceAccount.WAN});
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "not admin");
      }
    });

    it("delUintValue  -> not admin", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      try {
        await wanCross.delUintValue("0x1","0x2", {from: global.aliceAccount.WAN});
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "not admin");
      }
    });

    it("Others setUintValue, getUintValue and delUintValue   -> The default value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;
      let ret;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      ret = await wanCross.getUintValue("0x1", "0x2");
      assert.equal(
        web3.utils.toBN(ret).eq(new web3.utils.BN(0)),
        true,
        `check default getUintValue failed`
      );

      const admin = await wanCross.admin();
      await wanCross.setUintValue("0x1","0x2","3", { from: admin });
      ret = await wanCross.getUintValue("0x1", "0x2");
      assert.equal(
        web3.utils.toBN(ret).eq(new web3.utils.BN("3")),
        true,
        `check getUintValue failed`
      );

      await wanCross.delUintValue("0x1","0x2", { from: admin });
      ret = await wanCross.getUintValue("0x1", "0x2");
      assert.equal(
        web3.utils.toBN(ret).eq(new web3.utils.BN(0)),
        true,
        `check delUintValue failed`
      );
    });

    it('setAdmin ===> Not owner', async function() {
      try {
        const { CrossDelegate } = getContractArtifacts();
        const wanchain = chainTypes.WAN;

        // wanchain
        let wanCross = await CrossDelegate.at(
          global.chains[wanchain].scAddr.CrossProxy
        );
        const admin = await wanCross.admin();
        await wanCross.setAdmin(admin, {from: admin});
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Not owner");
      }
    });

    it("setTokenPairFees  -> not operator", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      try {
        await wanCross.setTokenPairFees([["0","1"]], {from: global.aliceAccount.WAN});
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "not operator");
      }
    });

    it("setTokenPairFee  -> not operator", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      try {
        await wanCross.setTokenPairFee("0","1", {from: global.aliceAccount.WAN});
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "not operator");
      }
    });

    it("Others setTokenPairFee and getTokenPairFee   -> The default value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;
      let ret;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      ret = await wanCross.getTokenPairFee("0");
      assert.equal(
        web3.utils.toBN(ret).eq(new web3.utils.BN(0)),
        true,
        `check default token pair fee failed`
      );
      const admin = await wanCross.admin();
      await wanCross.setTokenPairFee("0","1", { from: admin });
      ret = await wanCross.getTokenPairFee("1");
      assert.equal(
        web3.utils.toBN(ret).eq(new web3.utils.BN("0")),
        true,
        `check default token pair fee failed`
      );

      await wanCross.setTokenPairFee("0","0", { from: admin });
      ret = await wanCross.getTokenPairFee("0");
      assert.equal(
        web3.utils.toBN(ret).eq(new web3.utils.BN(0)),
        true,
        `check default token pair fee failed`
      );
    });

    it("setFee  -> not operator", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      try {
        await wanCross.setFee(["0","1","2","3"], {from: global.aliceAccount.WAN});
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "not operator");
      }
    });

    it("Others setFee and getFee   -> The default value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;
      let ret;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      ret = await wanCross.getFee(["0", "1"]);
      assert.equal(
        web3.utils.toBN(ret.contractFee).eq(new web3.utils.BN(0)),
        true,
        `check default contractFee failed`
      );
      assert.equal(
        web3.utils.toBN(ret.agentFee).eq(new web3.utils.BN(0)),
        true,
        `check default agentFee failed`
      );

      const admin = await wanCross.admin();
      await wanCross.setFee(["0","1","2","3"], { from: admin });
      ret = await wanCross.getFee(["0", "1"]);
      assert.equal(
        web3.utils.toBN(ret.contractFee).eq(new web3.utils.BN("2")),
        true,
        `check default contractFee failed`
      );
      assert.equal(
        web3.utils.toBN(ret.agentFee).eq(new web3.utils.BN("3")),
        true,
        `check default agentFee failed`
      );

      await wanCross.setFee(["0","1","0","0"], { from: admin });
      ret = await wanCross.getFee(["0", "1"]);
      assert.equal(
        web3.utils.toBN(ret.contractFee).eq(new web3.utils.BN(0)),
        true,
        `check default contractFee failed`
      );
      assert.equal(
       web3.utils.toBN( ret.agentFee).eq(new web3.utils.BN(0)),
        true,
        `check default agentFee failed`
      );
    });

    it("setFees  -> not operator", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      try {
        await wanCross.setFees([["0","1","2","3"]], {from: global.aliceAccount.ETH});
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "not operator");
      }
    });

    it("Others setFees and getFees   -> The default value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;
      let ret;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      ret = await wanCross.getFees([["0", "1"]]);
      assert.equal(
        web3.utils.toBN(ret[0].contractFee).eq(new web3.utils.BN(0)),
        true,
        `check default contractFee failed`
      );
      assert.equal(
        web3.utils.toBN(ret[0].agentFee).eq(new web3.utils.BN(0)),
        true,
        `check default agentFee failed`
      );

      const admin = await wanCross.admin();
      await wanCross.setFees([["0","1","2","3"]], { from: admin });
      ret = await wanCross.getFees([["0", "1"]]);
      assert.equal(
        web3.utils.toBN(ret[0].contractFee).eq(new web3.utils.BN("2")),
        true,
        `check default contractFee failed`
      );
      assert.equal(
        web3.utils.toBN(ret[0].agentFee).eq(new web3.utils.BN("3")),
        true,
        `check default agentFee failed`
      );

      await wanCross.setFees([["0","1","0","0"]], { from: admin });
      ret = await wanCross.getFees([["0", "1"]]);
      assert.equal(
        web3.utils.toBN(ret[0].contractFee).eq(new web3.utils.BN(0)),
        true,
        `check default contractFee failed`
      );
      assert.equal(
        web3.utils.toBN(ret[0].agentFee).eq(new web3.utils.BN(0)),
        true,
        `check default agentFee failed`
      );
    });

    it("setMaxBatchSize  -> not admin", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;
      let maxBatchSize = 10;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      try {
        await wanCross.setMaxBatchSize(maxBatchSize, {from: global.aliceAccount.WAN});
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "not admin");
      }
    });

    it("Others setMaxBatchSize and getMaxBatchSize   -> The default value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;
      let ret;
      let maxBatchSize = 10;

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      ret = await wanCross.getMaxBatchSize();
      assert.equal(
        ret.eq(new web3.utils.BN(20)),
        true,
        `check default maxBatchSize failed`
      );

      const admin = await wanCross.admin();
      await wanCross.setMaxBatchSize(maxBatchSize, { from: admin });
      ret = await wanCross.getMaxBatchSize();
      assert.equal(
        ret.eq(new web3.utils.BN(maxBatchSize)),
        true,
        `check maxBatchSize after setMaxBatchSize failed`
      );

      await wanCross.setMaxBatchSize(20, { from: admin });
      ret = await wanCross.getMaxBatchSize();
      assert.equal(
        ret.eq(new web3.utils.BN(20)),
        true,
        `check maxBatchSize after setMaxBatchSize failed`
      );
    });

    it("Others setHashType and hashType   -> The default value", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;
      let ret;
      let data = "0x010203040506070809";

      // wanchain
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      ret = await wanCross.hashType();
      assert.equal(
        ret.eq(new web3.utils.BN(0)),
        true,
        `check default hashType failed`
      );

      const sha256Hash = await wanCross.hashFunc(data);
      const sha256Local = sha256(Buffer.from(web3.utils.hexToBytes(data)));
      assert.equal(sha256Hash, sha256Local, "check sha256 failed");

      await wanCross.setHashType(1);
      ret = await wanCross.hashType();
      assert.equal(
        ret.eq(new web3.utils.BN(1)),
        true,
        `check hashType after setHashType failed`
      );

      const keccak256Hash = await wanCross.hashFunc(data);
      const keccak256Local = web3.utils.keccak256(
        Buffer.from(web3.utils.hexToBytes(data))
      );
      assert.equal(keccak256Hash, keccak256Local, "check keccak256 failed");

      await wanCross.setHashType(0);
      ret = await wanCross.hashType();
      assert.equal(
        ret.eq(new web3.utils.BN(0)),
        true,
        `check hashType after setHashType failed`
      );
    });

    it("Others setHashType and hashType failed by account which is not owner", async () => {
      try {
        const { CrossDelegate } = getContractArtifacts();
        const wanchain = chainTypes.WAN;
        let ret;

        // wanchain
        let wanCross = await CrossDelegate.at(
          global.chains[wanchain].scAddr.CrossProxy
        );
        const admin = await wanCross.admin();
        await wanCross.setHashType(1, { from: admin });
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Not owner");
      }
    });

    it("Others smgWithdrawHistoryFee foundation account  -> invalid smgFeeProxy", async () => {
      try {
        const { FakeCrossDelegate, RapidityLib, NFTLib } = getContractArtifacts();

        let rapidityLib = await RapidityLib.new();
        let nftLib = await NFTLib.new();
        await FakeCrossDelegate.link(rapidityLib);
        await FakeCrossDelegate.link(nftLib);
        let crossDelegate = await FakeCrossDelegate.new();
        let owner = await crossDelegate.owner();
        await crossDelegate.setAdmin(owner);
  
        const groupID = crypto.randomBytes(32);
        await crossDelegate.renounceOwner();
        await crossDelegate.setStoremanFee(groupID, {value: 100})
        await crossDelegate.smgWithdrawHistoryFee([groupID]);
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "invalid smgFeeProxy");
      }
    });

    it("Others smgWithdrawHistoryFee foundation account 0 incentive  -> success", async () => {
      const { CrossDelegate } = getContractArtifacts();
      const wanchain = chainTypes.WAN;
      let wanCross = await CrossDelegate.at(
        global.chains[wanchain].scAddr.CrossProxy
      );

      await wanCross.smgWithdrawHistoryFee([
        crypto.randomBytes(32)
      ]);
    });

    it("Others smgWithdrawHistoryFee foundation account  -> success", async () => {
      const { FakeCrossDelegate, RapidityLib, NFTLib } = getContractArtifacts();

      let rapidityLib = await RapidityLib.new();
      let nftLib = await NFTLib.new();
      await FakeCrossDelegate.link(rapidityLib);
      await FakeCrossDelegate.link(nftLib);
      let crossDelegate = await FakeCrossDelegate.new();

      await crossDelegate.setPartners(global.aliceAccount.WAN, global.aliceAccount.WAN, global.aliceAccount.WAN, global.aliceAccount.WAN, global.aliceAccount.WAN);

      const groupID = crypto.randomBytes(32);
      await crossDelegate.setStoremanFee(groupID, {value: 100})
      await crossDelegate.smgWithdrawHistoryFee([groupID]);
    });

    it("Proxy @wanchain   -> get the implementation address", async () => {
      const { CrossProxy } = getContractArtifacts();
      let crossProxy = await CrossProxy.at(
        global.chains[chainTypes.WAN].scAddr.CrossProxy
      );
      let address = await crossProxy.implementation();
      assert.equal(
        address,
        global.chains[chainTypes.WAN].scAddr.CrossDelegate,
        "check implementation failed"
      );
    });

    it("Proxy @wanchain   -> upgradeTo", async () => {
      const { CrossProxy } = getContractArtifacts();
      let crossProxy = await CrossProxy.at(
        global.chains[chainTypes.WAN].scAddr.CrossProxy
      );
      await crossProxy.upgradeTo(ADDRESS_1);

      let address = await crossProxy.implementation();
      assert.equal(
        address,
        ADDRESS_1,
        "check implementation failed"
      );
    });

    it("Proxy @wanchain   -> upgradeTo with Not owner", async () => {
      try {
        const { CrossProxy } = getContractArtifacts();
        const wanchain = chainTypes.WAN;
        let proxy = await CrossProxy.at(
          global.chains[wanchain].scAddr.CrossProxy
        );
        await proxy.upgradeTo(ADDRESS_1, {from: global.aliceAccount.WAN});

        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(
          err.toString(),
          "Not owner"
        );
      }
    });

    it("Proxy @wanchain   -> upgradeTo with the same implementation address", async () => {
      try {
        const { CrossProxy } = getContractArtifacts();
        let crossProxy = await CrossProxy.at(
          global.chains[chainTypes.WAN].scAddr.CrossProxy
        );
        await crossProxy.upgradeTo(ADDRESS_1);
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(
          err.toString(),
          "Cannot upgrade to the same implementation"
        );
      }
    });

    it("Proxy @wanchain   -> upgradeTo with 0x address", async () => {
      try {
        const { CrossProxy } = getContractArtifacts();
        let crossProxy = await CrossProxy.at(
          global.chains[chainTypes.WAN].scAddr.CrossProxy
        );
        await crossProxy.upgradeTo(ADDRESS_0);
        assert.fail(ERROR_INFO);
      } catch (err) {
        assert.include(err.toString(), "Cannot upgrade to invalid address");
      }
    });

    it("Proxy @wanchain   -> restore", async () => {
      const { CrossProxy } = getContractArtifacts();
      let crossProxy = await CrossProxy.at(
        global.chains[chainTypes.WAN].scAddr.CrossProxy
      );
      let ret = await crossProxy.upgradeTo(
        global.chains[chainTypes.WAN].scAddr.CrossDelegate
      );
      let address = await crossProxy.implementation();
      assert.equal(
        address,
        global.chains[chainTypes.WAN].scAddr.CrossDelegate,
        "check implementation failed"
      );

      assert.checkWeb3Event(ret, {
        event: "Upgraded",
        args: {
          implementation: address,
        },
      });
    });
  });
};

function getContractArtifacts() {
  const CrossProxy = artifacts.require("CrossProxy.sol");
  const FakeCrossDelegate = artifacts.require("FakeCrossDelegate.sol");
  const CrossDelegate = artifacts.require("CrossDelegateV4.sol");
  const RapidityLib = artifacts.require('RapidityLibV4');
  const NFTLib = artifacts.require('NFTLibV1');
  
  return {CrossProxy, FakeCrossDelegate, CrossDelegate, RapidityLib, NFTLib};
}
