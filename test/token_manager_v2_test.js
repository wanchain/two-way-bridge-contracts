const TokenManagerProxy = artifacts.require('TokenManagerProxy');
const TokenManagerDelegate = artifacts.require('TokenManagerDelegate');
const TokenManagerDelegateV2 = artifacts.require('TokenManagerDelegateV2');
const MappingToken = artifacts.require('MappingToken');
const MappingNftToken = artifacts.require('MappingNftToken');

const assert = require('assert');
const { sendAndGetReason } = require('./helper.js');
const netConfig = require('../truffle-config').networks[global.network];
const from = netConfig? netConfig.from : null;

const newTokenManager = async (accounts) => {
  const tokenManagerProxy = await TokenManagerProxy.new();
  const tokenManagerDelegate = await TokenManagerDelegate.new();
  const tokenManagerDelegateV2 = await TokenManagerDelegateV2.new();
  await tokenManagerProxy.upgradeTo(tokenManagerDelegateV2.address);

  console.log(`tokenManagerProxy = ${tokenManagerProxy.address}`);
  console.log(`tokenManagerDelegate = ${tokenManagerDelegate.address}`);
  console.log(`tokenManagerDelegateV2 = ${tokenManagerDelegateV2.address}`);
  return {tokenManagerProxy: tokenManagerProxy, tokenManagerDelegateV2: tokenManagerDelegateV2, tokenManagerDelegate: tokenManagerDelegate}
}

const getDeployedTokenManager = async (accounts) => {
  await deployer.deploy(TokenManagerProxy);
  const tokenManagerProxy = await TokenManagerProxy.deployed();

  await deployer.deploy(TokenManagerDelegateV2);
  const tokenManagerDelegateV2 = await TokenManagerDelegateV2.deployed();

  await tokenManagerProxy.upgradeTo(tokenManagerDelegateV2.address);

  return {tokenManagerProxy: tokenManagerProxy, tokenManagerDelegateV2: tokenManagerDelegateV2}
}

contract('TokenManagerDelegateV2', (accounts) => {
  const [owner_bk, admin_bk, operator, other] = accounts;
  const owner = from ? from : owner_bk;
  const admin = admin_bk.toLowerCase() === owner.toLowerCase() ? owner_bk : admin_bk;

  const aAccount = web3.utils.hexToBytes("0x6b175474e89094c44da98b954eedeac495271d0f");
  const aNewAccount = web3.utils.hexToBytes("0x0b175474e89094c44da98b954eedeac495271d0f");
  const aName = "eth dai";
  const aSymbol = "DAI";
  const aDecimals = 18;
  const aChainID = 60;

  const fromChainID = 60;
  const toChainID = 5718350;
  const decimals = 18;
  const fromAccount = web3.utils.hexToBytes('0x7b175474e89094c44da98b954eedeac495271d0f');

  const nameDAI = 'ETH DAI';
  const symbolDAI = 'DAI';
  const nameDAI_NEW = 'NEW ETH DAI';
  const symbolDAI_NEW = 'NEW DAI';
  const nameETH = 'ETH ETH';
  const symbolETH = 'ETH';
  const nameBTC = 'BTC BTC';
  const symbolBTC = 'BTC';

  const addTokenPairParam = [
    1, [aAccount, aName, aSymbol, aDecimals, aChainID], 
      fromChainID, fromAccount, toChainID, null];

  before("init", async () => {});

  describe('normal', () => {
    it('good token manager example', async function() {
      const { tokenManagerDelegateV2 } = await newTokenManager(accounts);

      let receipt = await tokenManagerDelegateV2.addToken(nameDAI, symbolDAI, decimals, {from: owner});
      let gas1 = 0;
      // check AddToken event log
      const addTokenEvent = receipt.logs[0].args;
      assert.ok(addTokenEvent.tokenAddress != "0x0000000000000000000000000000000000000000");
      assert.equal(nameDAI, addTokenEvent.name);
      assert.equal(symbolDAI, addTokenEvent.symbol);
      assert.equal(decimals, addTokenEvent.decimals.toNumber());

      let param = JSON.parse(JSON.stringify(addTokenPairParam));
      param[0] = 11;
      param[2] = 61;
      param[4] = 5718351;
      param[5] = web3.utils.hexToBytes(receipt.logs[0].args.tokenAddress);
      receipt = await tokenManagerDelegateV2.addTokenPair(...param, {from: owner})
      // check AddTokenPair event log
      const addTokenPairEvent = receipt.logs[0].args;
      assert.equal(param[0], addTokenPairEvent.id.toNumber());
      assert.equal(param[2], addTokenPairEvent.fromChainID.toNumber());
      // assert.equal(web3.utils.padRight(web3.utils.bytesToHex(param[3]), 64), addTokenPairEvent.fromAccount);
      assert.equal(web3.utils.bytesToHex(param[3]), addTokenPairEvent.fromAccount);
      assert.equal(param[4], addTokenPairEvent.toChainID.toNumber());
      assert.equal(web3.utils.bytesToHex(param[5]), addTokenPairEvent.toAccount);

      gas1 = await tokenManagerDelegateV2.addToken.estimateGas(nameETH, symbolETH, decimals, {from: owner});
      console.log(`addToken estimate = ${gas1}`);
      receipt = await tokenManagerDelegateV2.addToken(nameETH, symbolETH, decimals, {from: owner});
      console.log(`addToken used = ${receipt.receipt.gasUsed}`);
      param = JSON.parse(JSON.stringify(addTokenPairParam));
      param[0] = 12;
      param[2] = 61;
      param[4] = 5718351;
      param[5] = web3.utils.hexToBytes(receipt.logs[0].args.tokenAddress);
      gas1 = await tokenManagerDelegateV2.addTokenPair.estimateGas(...param, {from: owner});
      console.log(`addTokenPair estimate = ${gas1}`);
      receipt = await tokenManagerDelegateV2.addTokenPair(...param, {from: owner});
      console.log(`addTokenPair used = ${receipt.receipt.gasUsed}`);
      let obj2 = await sendAndGetReason(tokenManagerDelegateV2.addTokenPair, param, {from: owner});
      assert.equal(obj2.reason, "token exist");

      // param[0] = 14;
      // await tokenManagerDelegateV2.addTokenPair(...param, {from: owner});
      // await tokenManagerDelegateV2.removeTokenPair(14);

      receipt = await tokenManagerDelegateV2.addToken(nameBTC, symbolBTC, decimals, {from: owner});
      param = JSON.parse(JSON.stringify(addTokenPairParam));
      param[0] = 13;
      param[2] = 63;
      param[4] = 5718353;
      param[5] = web3.utils.hexToBytes(receipt.logs[0].args.tokenAddress);
      await tokenManagerDelegateV2.addTokenPair(...param, {from: owner});

      receipt = await tokenManagerDelegateV2.addAdmin(admin, {from: owner});
      // check AddAdmin event log
      assert.equal(admin.toLowerCase(), receipt.logs[0].args.admin.toLowerCase());

      const tokenPairID = parseInt(await tokenManagerDelegateV2.mapTokenPairIndex(0));
      const tokenPairInfo = await tokenManagerDelegateV2.mapTokenPairInfo(tokenPairID);
      const token = await MappingToken.at(tokenPairInfo.toAccount);
      gas1 = await tokenManagerDelegateV2.mintToken.estimateGas(token.address, other, 100, {from: admin});
      console.log(`mintToken estimate = ${gas1}`);
      receipt = await tokenManagerDelegateV2.mintToken(token.address, other, 100, {from: admin});
      console.log(`mintToken used = ${receipt.receipt.gasUsed}`);
      // // check MintToken event log
      // const mintTokenEvent = receipt.logs[0].args;
      // assert.equal(tokenPairID, mintTokenEvent.id.toNumber());
      // assert.equal(other.toLowerCase(), mintTokenEvent.to.toLowerCase());
      // assert.equal(100, mintTokenEvent.value.toNumber());

      await token.transfer(admin, 80, {from: other});

      gas1 = await tokenManagerDelegateV2.burnToken.estimateGas(token.address, admin, 20, {from: admin});
      console.log(`burnToken estimate = ${gas1}`);
      receipt = await tokenManagerDelegateV2.burnToken(token.address, admin, 20, {from: admin});
      console.log(`burnToken used = ${receipt.receipt.gasUsed}`);

      // // check BurnToken event log
      // const burnTokenEvent = receipt.logs[0].args;
      // assert.equal(tokenPairID, burnTokenEvent.id.toNumber());
      // assert.equal(20, burnTokenEvent.value.toNumber());

      assert.equal(web3.utils.toBN(await token.balanceOf(admin)).toNumber(), 60);
      assert.equal(web3.utils.toBN(await token.balanceOf(other)).toNumber(), 20);

      const tokenPairInfo_get = await tokenManagerDelegateV2.getTokenPairInfo(tokenPairID);
      assert.equal(tokenPairInfo_get.fromChainID.toNumber(), tokenPairInfo.fromChainID.toNumber());

      let tokenInfo = await tokenManagerDelegateV2.getTokenInfo(tokenPairID);
      assert.equal(tokenInfo.name, nameDAI);
      assert.equal(tokenInfo.symbol, symbolDAI);

      receipt = await tokenManagerDelegateV2.updateToken(tokenInfo.addr, nameDAI_NEW, symbolDAI_NEW);
      // check UpdateToken event log
      const updateTokenEvent = receipt.logs[0].args;
      assert.equal(tokenInfo.addr.toLowerCase(), updateTokenEvent.tokenAddress.toLowerCase());
      assert.equal(nameDAI_NEW, updateTokenEvent.name);
      assert.equal(symbolDAI_NEW, updateTokenEvent.symbol);

      tokenInfo = await tokenManagerDelegateV2.getTokenInfo(tokenPairID);
      assert.equal(tokenInfo.name, nameDAI_NEW);
      assert.equal(tokenInfo.symbol, symbolDAI_NEW);
      
      const ancestorInfo = await tokenManagerDelegateV2.getAncestorInfo(tokenPairID);
      // const padAccount = web3.utils.padRight("0x6b175474e89094c44da98b954eedeac495271d0f", 64);
      const padAccount = "0x6b175474e89094c44da98b954eedeac495271d0f";
      assert.equal(ancestorInfo.account, padAccount);
      assert.equal(ancestorInfo.name, aName);
      assert.equal(ancestorInfo.symbol, aSymbol);
      assert.equal(ancestorInfo.decimals.toNumber(), aDecimals);
      assert.equal(ancestorInfo.chainId.toNumber(), aChainID);

      const tokenPairs = await tokenManagerDelegateV2.getTokenPairs();
      // const tokenPairsFull = await tokenManagerDelegateV2.getTokenPairsFullFields();
      // assert.equal(tokenPairsFull[0].aInfo.name, aName)
      // assert.equal(tokenPairsFull[1].aInfo.name, aName)
      // assert.equal(tokenPairsFull[2].aInfo.name, aName)
      // assert.equal(tokenPairsFull[0].id, 11)
      // assert.equal(tokenPairsFull[1].id, 12)
      // assert.equal(tokenPairsFull[2].id, 13)
      assert.equal(tokenPairs.id[0].toNumber(), 11);
      assert.equal(tokenPairs.id[1].toNumber(), 12);
      assert.equal(tokenPairs.id[2].toNumber(), 13);
      assert.equal(tokenPairs.id.length, 3);

      const tokenPairs2 = await tokenManagerDelegateV2.getTokenPairsByChainID(fromChainID + 1, toChainID + 1);
      assert.equal(tokenPairs2.id[0].toNumber(), 11);
      assert.equal(tokenPairs2.id[1].toNumber(), 12);
      assert.equal(tokenPairs2.id.length, 2);

      // const tokenPairs2_2 = await tokenManagerDelegateV2.getTokenPairsByChainID2(fromChainID + 1, toChainID + 1);
      // assert.equal(tokenPairs2_2[0].id, 11);
      // assert.equal(tokenPairs2_2[1].id, 12);
      // assert.equal(tokenPairs2_2.length, 2);

      gas1 = await tokenManagerDelegateV2.removeTokenPair.estimateGas(11);
      console.log(`removeTokenPair estimate = ${gas1}`);
      receipt = await tokenManagerDelegateV2.removeTokenPair(11);
      console.log(`removeTokenPair used = ${receipt.receipt.gasUsed}`);
      // check RemoveTokenPair event log
      assert.equal(receipt.logs[0].args.id.toNumber(), 11);

      const tokenPairs3 = await tokenManagerDelegateV2.getTokenPairsByChainID(fromChainID + 1, toChainID + 1);
      assert.equal(tokenPairs3.id[0].toNumber(), 12);
      assert.equal(tokenPairs3.id.length, 1);

      // const tokenPairs3_2 = await tokenManagerDelegateV2.getTokenPairsByChainID2(fromChainID + 1, toChainID + 1);
      // assert.equal(tokenPairs3_2[0].id, 12);
      // assert.equal(tokenPairs3_2.length, 1);

      gas1 = await tokenManagerDelegateV2.updateTokenPair.estimateGas(13, [aNewAccount, "new name", "new symbol", 8, aChainID + 100],
        toChainID + 1, fromAccount, fromChainID + 1, web3.utils.hexToBytes(token.address));
      console.log(`updateTokenPair estimate = ${gas1}`);
      receipt = await tokenManagerDelegateV2.updateTokenPair(13, [aNewAccount, "new name", "new symbol", 8, aChainID + 100],
        toChainID + 1, fromAccount, fromChainID + 1, web3.utils.hexToBytes(token.address));
      console.log(`updateTokenPair used = ${gas1}`);
      // check UpdateTokenPair event log
      const updateTokenPairEvent = receipt.logs[0].args;
      assert.equal(updateTokenPairEvent.id.toNumber(), 13);
      assert.equal(updateTokenPairEvent.aInfo.account, web3.utils.bytesToHex(aNewAccount));
      assert.equal(updateTokenPairEvent.aInfo.name, "new name");
      assert.equal(updateTokenPairEvent.aInfo.symbol, "new symbol");
      assert.equal(parseInt(updateTokenPairEvent.aInfo.decimals), 8);
      assert.equal(parseInt(updateTokenPairEvent.aInfo.chainID), aChainID + 100);
      assert.equal(updateTokenPairEvent.fromChainID.toNumber(), toChainID + 1);
      assert.equal(updateTokenPairEvent.fromAccount, web3.utils.bytesToHex(fromAccount));
      assert.equal(updateTokenPairEvent.toChainID.toNumber(), fromChainID + 1);
      assert.equal(updateTokenPairEvent.toAccount, token.address.toLowerCase());

      const tokenPairs4 = await tokenManagerDelegateV2.getTokenPairsByChainID(fromChainID + 1, toChainID + 1);
      assert.equal(tokenPairs4.id[1].toNumber(), 12);
      assert.equal(tokenPairs4.id[0].toNumber(), 13);
      assert.equal(tokenPairs4.id.length, 2);

      const obj = await tokenManagerDelegateV2.removeAdmin(admin, {from: owner});
      assert.equal(obj.receipt.status, true);
      // check RemoveAdmin event log
      const removeAdminEvent = obj.logs[0].args;
      assert.equal(admin.toLowerCase(), removeAdminEvent.admin.toLowerCase());

      receipt = await tokenManagerDelegateV2.removeTokenPair(12);
      const pairs = await tokenManagerDelegateV2.getTokenPairs();
      assert.equal(pairs.id[0].toNumber(), 13);
      assert.equal(pairs.id.length, 1);

      const oldOwner = await token.owner();
      await tokenManagerDelegateV2.changeTokenOwner(token.address, other, {from: owner});
      await token.acceptOwnership({from: other});
      const newOwner = await token.owner();
      assert.equal(newOwner, other);
      await token.changeOwner(oldOwner, {from: other});
      await tokenManagerDelegateV2.acceptTokenOwnership(token.address, {from: owner});
      const newOwner2 = await token.owner();
      assert.equal(newOwner2, tokenManagerDelegateV2.address);

      await tokenManagerDelegateV2.transferTokenOwner(token.address, other, {from: owner});
      const newOwner3 = await token.owner();
      assert.equal(newOwner3, other);
    });
  });

  describe('addToken', () => {
    it('onlyOwner, name.length != 0, symbol.length != 0', async function() {
      const { tokenManagerDelegateV2 } = await newTokenManager(accounts);

      const addr = await tokenManagerDelegateV2.owner();
      const addTokenParam = [nameBTC, symbolBTC, decimals];
      let obj = await sendAndGetReason(tokenManagerDelegateV2.addToken, addTokenParam, {from: admin});
      assert.equal(obj.reason, "Not owner");

      // let param = JSON.parse(JSON.stringify(addTokenParam));
      // param[0] = "";
      // obj = await sendAndGetReason(tokenManagerDelegateV2.addToken, param, {from: owner});
      // assert.equal(obj.reason, "name is null");

      // param = JSON.parse(JSON.stringify(addTokenParam));
      // param[1] = "";
      // obj = await sendAndGetReason(tokenManagerDelegateV2.addToken, param, {from: owner});
      // assert.equal(obj.reason, "symbol is null");
    });
  });

  describe('addTokenPair', () => {
    it('ancestorName, ancestorSymbol length', async function() {
      const { tokenManagerDelegateV2 } = await newTokenManager(accounts);
      // let param = JSON.parse(JSON.stringify(addTokenPairParam));
      // param[1][1] = "";
      // param[5] = "0x6b175474e89094c44da98b954eedeac495271d0f";
      // let obj = await sendAndGetReason(tokenManagerDelegateV2.addTokenPair, param, {from: owner});
      // assert.equal(obj.reason, "ancestorName is null");

      // param = JSON.parse(JSON.stringify(addTokenPairParam));
      // param[1][2] = "";
      // param[5] = "0x6b175474e89094c44da98b954eedeac495271d0f";
      // obj = await sendAndGetReason(tokenManagerDelegateV2.addTokenPair, param, {from: owner});
      // assert.equal(obj.reason, "ancestorSymbol is null");

      let param = JSON.parse(JSON.stringify(addTokenPairParam));
      param[0] = addTokenPairParam[0] + 1;
      param[5] = web3.utils.bytesToHex("0x6b175474e89094c44da98b954eedeac495271d0f");
      await sendAndGetReason(tokenManagerDelegateV2.addTokenPair, param, {from: owner});
      let obj = await sendAndGetReason(tokenManagerDelegateV2.addTokenPair, param, {from: owner});
      assert.equal(obj.reason, "token exist");
    });
  })

  // describe('fallback', () => {
  //   it('revert', async function() {
  //     try {
  //       const { tokenManagerDelegateV2 } = await newTokenManager(accounts);
  //       const r = await web3.eth.sendTransaction({from: owner, to: tokenManagerDelegateV2.address});
  //     } catch (e) {
  //       const isHave = e.message.includes("revert Not support");
  //       if (isHave) {
  //         assert.ok("fallback is right");
  //         return;
  //       }
  //     }
  //     assert.fail("fallback error");
  //   });
  // });

  describe('updateTokenPair', () => {
    it('onlyOwner, onlyExistID, requires', async function() {
      const { tokenManagerDelegateV2 } = await newTokenManager(accounts);

      const paramUpdate = [addTokenPairParam[0], [aNewAccount, "new name", "new symbol", 8, aChainID + 100], toChainID + 1, fromAccount, fromChainID + 1, web3.utils.bytesToHex("0x6b175474e89094c44da98b954eedeac495271d0f")]

      let obj = await sendAndGetReason(tokenManagerDelegateV2.updateTokenPair, paramUpdate, {from: admin});
      assert.equal(obj.reason, "Not owner");

      let param = JSON.parse(JSON.stringify(paramUpdate));
      param[0] = 111;
      obj = await sendAndGetReason(tokenManagerDelegateV2.updateTokenPair, param, {from: owner});
      assert.equal(obj.reason, "token not exist");

      let receipt = await tokenManagerDelegateV2.addToken(nameDAI, symbolDAI, decimals, {from: owner});
      param = JSON.parse(JSON.stringify(addTokenPairParam));
      param[5] = web3.utils.bytesToHex(receipt.logs[0].args.tokenAddress);
      await tokenManagerDelegateV2.addTokenPair(...param, {from: owner});

      // param = JSON.parse(JSON.stringify(paramUpdate));
      // param[1][1] = "";
      // obj = await sendAndGetReason(tokenManagerDelegateV2.updateTokenPair, param, {from: owner});
      // assert.equal(obj.reason, "ancestorName is null");

      // param = JSON.parse(JSON.stringify(paramUpdate));
      // param[1][2] = "";
      // obj = await sendAndGetReason(tokenManagerDelegateV2.updateTokenPair, param, {from: owner});
      // assert.equal(obj.reason, "ancestorSymbol is null");

      await tokenManagerDelegateV2.removeTokenPair(addTokenPairParam[0]);

      param = JSON.parse(JSON.stringify(paramUpdate));
      obj = await sendAndGetReason(tokenManagerDelegateV2.updateTokenPair, param, {from: owner});
      assert.equal(obj.reason, 'token not exist');
    });
  });

  describe('mintToken', () => {
    it('onlyAdmin', async function() {
      const { tokenManagerDelegateV2 } = await newTokenManager(accounts);

      let receipt = await tokenManagerDelegateV2.addToken(nameDAI, symbolDAI, decimals, {from: owner});
      param = JSON.parse(JSON.stringify(addTokenPairParam));
      param[5] = receipt.logs[0].args.tokenAddress;
      await tokenManagerDelegateV2.addTokenPair(...param, {from: owner});

      await tokenManagerDelegateV2.addAdmin(admin, {from: owner});

      obj = await sendAndGetReason(tokenManagerDelegateV2.mintToken, [param[5], other, 100], {from: owner});
      assert.equal(obj.reason, "not admin");

      obj = await sendAndGetReason(tokenManagerDelegateV2.mintToken, [param[5], other, 0], {from: admin});
      assert.equal(obj.reason, "Value is null");
    });
  });

  // describe('updateToken', () => {
  //   it('onlyExistID', async function() {
  //     const { tokenManagerDelegateV2 } = await newTokenManager(accounts);

  //     obj = await sendAndGetReason(tokenManagerDelegateV2.updateToken, [222, nameDAI_NEW, symbolDAI_NEW], {from: owner});
  //     assert.equal(obj.reason, "token not exist");
  //   })
  // })

  describe('upgradeTo', () => {
    it('onlyOwner, require', async function() {
      const { tokenManagerDelegateV2, tokenManagerProxy } = await newTokenManager(accounts);
      const param = ["0x6b175474e89094c44da98b954eedeac495271d0f"];
      let obj = await sendAndGetReason(tokenManagerProxy.upgradeTo, param, {from: admin});
      assert.equal(obj.reason, "Not owner");

      param[0] = "0x0000000000000000000000000000000000000000";
      obj = await sendAndGetReason(tokenManagerProxy.upgradeTo, param, {from: owner});
      assert.equal(obj.reason, "Cannot upgrade to invalid address");

      param[0] = tokenManagerDelegateV2.address;
      obj = await sendAndGetReason(tokenManagerProxy.upgradeTo, param, {from: owner});
      assert.equal(obj.reason, "Cannot upgrade to the same implementation");
    })
  })

  describe('setTokenPairType', () => {
    it('onlyOperator, require', async function() {
      const { tokenManagerDelegateV2 } = await newTokenManager(accounts);
      await tokenManagerDelegateV2.addAdmin(admin, {from: owner});

      const nftName = "NFT";
      const nftSymbol = "NFT";
      const nftDecimals = web3.utils.toBN(0);
      const nftChainID = web3.utils.toBN(60);
      const shadowName = "wanNFT";
      const shadowSymbol = "wanNFT";
      const shadowChainID = web3.utils.toBN(10);

      const nftToken = await MappingNftToken.new(nftName, nftSymbol);
      const mappingNftToken = await MappingNftToken.new(shadowName, shadowSymbol);

      const nftAccount = nftToken.address;
      const shadowAccount = mappingNftToken.address;

      const param = [
        1, [nftAccount, nftName, nftSymbol, nftDecimals, nftChainID], 
        nftChainID, nftAccount, shadowChainID, shadowAccount]
      ;

      var retObj = await sendAndGetReason(tokenManagerDelegateV2.addTokenPair, param, {from: owner});
      assert.equal(retObj.reason, null, "add token pair error");
      const addTokenPairObj = await sendAndGetReason(tokenManagerDelegateV2.addTokenPair, param, {from: owner});
      assert.equal(addTokenPairObj.reason, "token exist");

      let nftInfo = await tokenManagerDelegateV2.getNftInfo(param[0]);
      assert.equal(nftInfo.addr, shadowAccount, "check to token account error");
      assert.equal(nftInfo.name, shadowName, "check to token name error");
      assert.equal(nftInfo.symbol, shadowSymbol, "check to token symbol error");

      const erc721CrossType = web3.utils.toBN("0x1")
      const setTokenPairTypeObj = await sendAndGetReason(tokenManagerDelegateV2.setTokenPairType, [param[0], erc721CrossType], {from: owner});
      assert.equal(setTokenPairTypeObj.reason, "not operator", "check setTokenPairType permission failed");

      await sendAndGetReason(tokenManagerDelegateV2.setOperator, [operator], {from: owner});

      const {reason, receipt} = await sendAndGetReason(tokenManagerDelegateV2.setTokenPairType, [param[0], erc721CrossType], {from: operator});
      assert.equal(reason, null, "setTokenPairType failed");
      const tokenCrossType = await tokenManagerDelegateV2.mapTokenPairType(param[0]);
      assert.equal(web3.utils.toBN(tokenCrossType).eq(erc721CrossType), true, "check token cross type failed");
    })
  })

  describe('V1 upgradeTo V2', () => {
    it('onlyOwner, require', async function() {
      const { tokenManagerProxy, tokenManagerDelegateV2, tokenManagerDelegate } = await newTokenManager(accounts);

      var obj = await sendAndGetReason(tokenManagerProxy.upgradeTo, [tokenManagerDelegate.address], {from: owner});
      assert.equal(obj.reason, null, "Upgrade to v1 failed");

      const nftName = "NFT";
      const nftSymbol = "NFT";
      const nftDecimals = web3.utils.toBN(0);
      const nftChainID = web3.utils.toBN(60);
      const shadowName = "wanNFT";
      const shadowSymbol = "wanNFT";
      const shadowChainID = web3.utils.toBN(10);

      const nftToken = await MappingNftToken.new(nftName, nftSymbol);
      const mappingNftToken = await MappingNftToken.new(shadowName, shadowSymbol);

      const nftAccount = nftToken.address;
      const shadowAccount = mappingNftToken.address;

      const param = [
        1, [nftAccount, nftName, nftSymbol, nftDecimals, nftChainID], 
        nftChainID, nftAccount, shadowChainID, shadowAccount]
      ;

      var tokenManager = await TokenManagerDelegate.at(tokenManagerProxy.address);
      // console.log("param:", param, "tokenManager:", tokenManager);
      var retObj = await sendAndGetReason(tokenManager.addTokenPair, param, {from: owner});
      assert.equal(retObj.reason, null, "add token pair failed");

      var ancestorChainID = web3.utils.toBN((await tokenManager.getAncestorChainID(param[0])));
      var ancestorSymbol = await tokenManager.getAncestorSymbol(param[0]);
      assert.equal(ancestorChainID.eq(nftChainID), true, "check ancestor chainID failed");
      assert.equal(ancestorSymbol.symbol, nftSymbol, "check ancestor symbol failed");
      assert.equal(web3.utils.toBN(ancestorSymbol.decimals).eq(nftDecimals), true, "check ancestor decimals failed");

      await tokenManager.addAdmin(admin, {from: owner});
      var isAdmin = await tokenManager.mapAdmin(admin);
      assert.equal(isAdmin, true, "check admin failed");

      var obj = await sendAndGetReason(tokenManagerProxy.upgradeTo, [tokenManagerDelegateV2.address], {from: owner});
      assert.equal(obj.reason, null, "Upgrade to v2 failed");

      var tokenManager = await TokenManagerDelegateV2.at(tokenManagerProxy.address);

      var ancestorChainID = web3.utils.toBN((await tokenManager.getAncestorChainID(param[0])));
      var ancestorSymbol = await tokenManager.getAncestorSymbol(param[0]);
      assert.equal(ancestorChainID.eq(nftChainID), true, "check v2 ancestor chainID failed");
      assert.equal(ancestorSymbol.symbol, nftSymbol, "check v2 ancestor symbol failed");
      assert.equal(web3.utils.toBN(ancestorSymbol.decimals).eq(nftDecimals), true, "check v2 ancestor decimals failed");

      await tokenManager.addAdmin(admin, {from: owner});
      var isAdmin = await tokenManager.mapAdmin(admin);
      assert.equal(isAdmin, true, "check v2 admin failed");

    })
  })

})