const CrossProxy                = artifacts.require('CrossProxy.sol');
const {
    BN,
    ERROR_INFO,
    storemanGroupStatus,
    xInfo,
    skInfo,
    InvalidTokenPairID,
    htlcLockedTime,
    userLockParams,
    smgLockParams,
    typesArrayList,
    assert,
    testInit
}                               = require('./lib');

const {
    sleep,
    getBalance,
    getRC20TokenInstance,
    buildMpcSign,
}                               = require('../utils');

before("init...   -> success", () => {
    try {
        testInit();
    } catch(err) {
        assert.fail(err);
    }
});

// chain1 MintBridge
it("Original[1] -> userMintLock  ==> Contract is not initialized", async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.htlcException.hash;
        await global.crossDelegateNotInit.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            web3.utils.toWei(userLockParamsTemp.value.toString()),
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Contract is not initialized");
    }
});

it('Original[1] -> userMintLock  ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.htlcException.hash;
        await global.chains[1].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            web3.utils.toWei(userLockParamsTemp.value.toString()),
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount}
        );
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Original[1] -> userMintLock  ==> PK is not ready', async () => {
    try {
        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(global.storemanGroups[1].ID, storemanGroupStatus.unregistered);
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.smgID = global.storemanGroups[1].ID;
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.htlcException.hash;
        await global.chains[1].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            web3.utils.toWei(userLockParamsTemp.value.toString()),
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount}
        );
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    } finally {
        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(global.storemanGroups[1].ID, storemanGroupStatus.ready);
    }
});

it("Original[1] -> Token1 -> userMintLock  ==> Token does not exist", async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.htlcException.hash;

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // user mint lock
        await global.chains[1].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            InvalidTokenPairID,
            value,
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount, value: global.chains[1].approach.origLockFee}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Token does not exist");
    }
});

it("Original[1] -> Token1 -> userMintLock  ==> Value is null", async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.htlcException.hash;

        let value = web3.utils.toWei("0");
        // user mint lock
        await global.chains[1].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount, value: global.chains[1].approach.origLockFee}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Value is null");
    }
});

it('Shadow[2] -> Token1 -> smgMintLock  ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[2].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.htlcException.hash;

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

        // storeman mint lock
        let smgMintLockReceipt = await global.chains[2].approach.instance.smgMintLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Shadow[2] -> Token1 -> smgMintLock  ==> Contract is not initialized', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.htlcException.hash;

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

        // storeman mint lock
        let smgMintLockReceipt = await global.crossDelegateNotInit.smgMintLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Contract is not initialized");
    }
});

it('Original[1] -> Token1 -> smgMintRedeem ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});

        await global.chains[1].approach.instance.smgMintRedeem(xInfo.htlcException.x);
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Original[1] -> Token1 -> userMintLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.token1MintRevoke.hash;
        userLockParamsTemp.tokenPairID = global.chains[1].token.tokenPairID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("Token1 -> mintOracleValue", mintOracleValue);

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("Token1 -> before MintQuotaValue", beforeMintQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        await global.chains[1].token.tokenCreator.mintToken(global.chains[1].token.name, global.chains[1].token.symbol,
            userLockParamsTemp.origUserAccount, value);
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[1].token.origTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.origUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[1].approach.instance.address, 0, {from: userLockParamsTemp.origUserAccount});
        await tokenInstance.approve(global.chains[1].approach.instance.address, value, {from: userLockParamsTemp.origUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.origUserAccount, global.chains[1].approach.instance.address);
        assert.equal(value, allowance.toString());

        // user mint lock
        let userMintLockReceipt = await global.chains[1].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.shadowUserAccount.toLowerCase(),
            {from: userLockParamsTemp.origUserAccount, value: global.chains[1].approach.origLockFee * 2}
        );

        // console.log("Token1 -> userMintLock receipt", userMintLockReceipt.logs);
        assert.checkWeb3Event(userMintLockReceipt, {
            event: 'UserMintLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[1].approach.origLockFee,
                userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        // console.log("Token1 -> after MintQuotaValue", afterMintQuotaValue);
        // console.log("Token1 -> difference MintQuotaValue", difference);
        // console.log("Token1 -> value", value);
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Token1 -> smgMintLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.token1MintRevoke.hash;

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        // console.log("Token1 -> before MintQuotaValue", beforeMintQuotaValue);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, web3.utils.toHex(value), smgLockParamsTemp.shadowUserAccount);

        // user mint lock
        let smgMintLockReceipt = await global.chains[2].approach.instance.smgMintLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        assert.checkWeb3Event(smgMintLockReceipt, {
            event: 'SmgMintLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.shadowUserAccount
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Token1 -> userMintRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        let shadowUserAccount = global.accounts[4];
        await global.chains[2].approach.instance.userMintRedeem(xInfo.token1MintRevoke.x, {from: shadowUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Original[1] -> Token1 -> smgMintRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = 2 * htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        await global.chains[1].approach.instance.smgMintRedeem(xInfo.token1MintRevoke.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Shadow[2] -> Token1 -> smgMintRevoke ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[2].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});

        await global.chains[2].approach.instance.smgMintRevoke(xInfo.htlcException.hash, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Shadow[2] -> Token1 -> smgMintRevoke  ==> success', async () => {
    try {
        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);

        let smgMintRevokeReceipt = await global.chains[2].approach.instance.smgMintRevoke(xInfo.token1MintRevoke.hash, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgMintRevokeReceipt, {
            event: 'SmgMintRevokeLogger',
            args: {
                xHash: xInfo.token1MintRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].token.tokenPairID
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
        let value = web3.utils.toWei(userLockParams.value.toString());
        assert.equal(value === difference, true);

        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.token1MintRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Token1 -> smgMintRevoke  ==> revoke twice, Status is not locked', async () => {
    try {
        await global.chains[2].approach.instance.smgMintRevoke(xInfo.token1MintRevoke.hash, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Original[1] -> Token1 -> userMintRevoke ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});

        let origUserAccount = global.accounts[3];;
        await global.chains[1].approach.instance.userMintRevoke(xInfo.htlcException.hash, {from: origUserAccount, value: global.chains[1].approach.origRevokeFee});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Original[1] -> Token1 -> userMintRevoke  ==> success', async () => {
    try {
        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);

        let origUserAccount = global.accounts[3];
        let value = web3.utils.toWei(userLockParams.value.toString());
        let userMintRevokeReceipt = await global.chains[1].approach.instance.userMintRevoke(xInfo.token1MintRevoke.hash, {from: origUserAccount, value: global.chains[1].approach.origRevokeFee * 2});
        await global.chains[1].token.tokenCreator.burnToken(global.chains[1].token.name, global.chains[1].token.symbol,
            origUserAccount, value);

        assert.checkWeb3Event(userMintRevokeReceipt, {
            event: 'UserMintRevokeLogger',
            args: {
                xHash: xInfo.token1MintRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID:global.chains[1].token.tokenPairID,
                fee: global.chains[1].approach.origRevokeFee,
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
        assert.equal(value === difference, true);

        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.token1MintRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Token1 -> userMintRevoke  ==> revoke twice, Status is not locked', async () => {
    try {
        let origUserAccount = global.accounts[3];;
        await global.chains[1].approach.instance.userMintRevoke(xInfo.token1MintRevoke.hash, {from: origUserAccount, value: global.chains[1].approach.origRevokeFee * 2});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Original[1] -> Token1 -> userMintLock  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.token1MintRedeem.hash;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before MintQuotaValue", beforeMintQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        await global.chains[1].token.tokenCreator.mintToken(global.chains[1].token.name, global.chains[1].token.symbol,
            userLockParamsTemp.origUserAccount, value);
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[1].token.origTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.origUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[1].approach.instance.address, 0, {from: userLockParamsTemp.origUserAccount});
        await tokenInstance.approve(global.chains[1].approach.instance.address, value, {from: userLockParamsTemp.origUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.origUserAccount, global.chains[1].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
        // user mint lock
        let userMintLockReceipt = await global.chains[1].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount, value: global.chains[1].approach.origLockFee * 2}
        );
        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        assert.checkWeb3Event(userMintLockReceipt, {
            event: 'UserMintLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[1].approach.origLockFee,
                userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
            }
        });
        // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Token1 -> userMintRevoke  ==> should wait lockedTime, not wait', async () => {
    try {
        let origUserAccount = global.accounts[3];;
        await global.chains[1].approach.instance.userMintRevoke(xInfo.token1MintRedeem.hash, {from: origUserAccount, value: global.chains[1].approach.origRevokeFee * 2});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Revoke is not permitted");
    }
});

it('Shadow[2] -> Token1 -> smgMintLock  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.token1MintRedeem.hash;

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

        // user mint lock
        let smgMintLockReceipt = await global.chains[2].approach.instance.smgMintLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        assert.checkWeb3Event(smgMintLockReceipt, {
            event: 'SmgMintLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.shadowUserAccount
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Token1 -> smgMintRevoke  ==> should wait 2*lockedTime, not wait', async () => {
    try {
        await global.chains[2].approach.instance.smgMintRevoke(xInfo.token1MintRedeem.hash, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Revoke is not permitted");
    }
});

it('Shadow[2] -> Token1 -> userMintRedeem  ==> use wrong x', async () => {
    try {
        let shadowUserAccount = global.accounts[4];
        await global.chains[2].approach.instance.userMintRedeem(xInfo.htlcException.x, {from: shadowUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Shadow[2] -> Token1 -> userMintRedeem  ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[2].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});

        let shadowUserAccount = global.accounts[4];
        await global.chains[2].approach.instance.userMintRedeem(xInfo.htlcException.x, {from: shadowUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Shadow[2] -> Token1 -> userMintRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.token1MintRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);

        let shadowUserAccount = global.accounts[4];
        let userMintRedeemReceipt = await global.chains[2].approach.instance.userMintRedeem(xInfo.token1MintRedeem.x, {from: shadowUserAccount});

        assert.checkWeb3Event(userMintRedeemReceipt, {
            event: 'UserMintRedeemLogger',
            args: {
                x: xInfo.token1MintRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].token.tokenPairID
            }
        });

        let value = web3.utils.toWei(userLockParams.value.toString());
        let tokenInstance = await getRC20TokenInstance(global.chains[1].token.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(shadowUserAccount);
        assert.equal(value, balance.toString());

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Token1 -> userMintRedeem ==> redeem twice, Status is not locked', async () => {
    try {
        let shadowUserAccount = global.accounts[4];
        await global.chains[2].approach.instance.userMintRedeem(xInfo.token1MintRedeem.x, {from: shadowUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Original[1] -> Token1 -> smgMintRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.token1MintRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);

        let smgMintRedeemReceipt = await global.chains[1].approach.instance.smgMintRedeem(xInfo.token1MintRedeem.x, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgMintRedeemReceipt, {
            event: 'SmgMintRedeemLogger',
            args: {
                x: xInfo.token1MintRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].token.tokenPairID,
                fee: global.chains[1].approach.origLockFee,
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Token1 -> smgMintRedeem  ==> use wrong x', async () => {
    try {
        await global.chains[1].approach.instance.smgMintRedeem(xInfo.htlcException.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Original[1] -> Token1 -> smgMintRedeem ==> redeem twice, Status is not locked', async () => {
    try {
        await global.chains[1].approach.instance.smgMintRedeem(xInfo.token1MintRedeem.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

// chain2 BurnBridge
it('Shadow[2] -> Token1 -> userBurnLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.token1BurnRevoke.hash;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("mintQuotaValue", mintQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[1].token.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[2].approach.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
        await tokenInstance.approve(global.chains[2].approach.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, global.chains[2].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));
        // user mint lock
        let userBurnLockReceipt = await global.chains[2].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount, value: global.chains[2].approach.shadowLockFee * 2}
        );

        // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
        assert.checkWeb3Event(userBurnLockReceipt, {
            event: 'UserBurnLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[2].approach.shadowLockFee,
                userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
            }
        });
        // console.log("after shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Token1 -> smgBurnLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.token1BurnRevoke.hash;

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

        // user mint lock
        let smgBurnLockReceipt = await global.chains[1].approach.instance.smgBurnLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
        assert.checkWeb3Event(smgBurnLockReceipt, {
            event: 'SmgBurnLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.origUserAccount
            }
        });

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Token1 -> userBurnRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        let origUserAccount = global.accounts[4];
        await global.chains[1].approach.instance.userBurnRedeem(xInfo.token1BurnRevoke.x, {from: origUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Shadow[2] -> Token1 -> smgBurnRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = 2 * htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        await global.chains[2].approach.instance.smgBurnRedeem(xInfo.token1BurnRevoke.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Original[1] -> Token1 -> smgBurnRevoke ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});

        await global.chains[1].approach.instance.smgMintRevoke(xInfo.htlcException.hash, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Original[1] -> Token1 -> smgBurnRevoke  ==> success', async () => {
    try {
        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);

        let smgBurnRevokeReceipt = await global.chains[1].approach.instance.smgBurnRevoke(xInfo.token1BurnRevoke.hash, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgBurnRevokeReceipt, {
            event: 'SmgBurnRevokeLogger',
            args: {
                xHash: xInfo.token1BurnRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].token.tokenPairID
            }
        });

        let value = web3.utils.toWei(userLockParams.value.toString());
        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
        assert.equal(value === difference, true);

        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.token1BurnRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Token1 -> smgBurnRevoke  ==> revoke twice, Status is not locked', async () => {
    try {
        await global.chains[1].approach.instance.smgBurnRevoke(xInfo.token1BurnRevoke.hash, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Shadow[2] -> Token1 -> userBurnRevoke ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[2].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});

        let shadowUserAccount = global.accounts[4];;
        await global.chains[2].approach.instance.userBurnRevoke(xInfo.htlcException.hash, {from: shadowUserAccount, value: global.chains[2].approach.shadowRevokeFee * 2});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Shadow[2] -> Token1 -> userBurnRevoke  ==> success', async () => {
    try {
        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);

        let shadowUserAccount = global.accounts[4];;
        let userBurnRevokeReceipt = await global.chains[2].approach.instance.userBurnRevoke(xInfo.token1BurnRevoke.hash, {from: shadowUserAccount, value: global.chains[2].approach.shadowRevokeFee * 2});

        assert.checkWeb3Event(userBurnRevokeReceipt, {
            event: 'UserBurnRevokeLogger',
            args: {
                xHash: xInfo.token1BurnRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].token.tokenPairID,
                fee: global.chains[2].approach.shadowRevokeFee,
            }
        });

        let value = web3.utils.toWei(userLockParams.value.toString());
        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
        assert.equal(value === difference, true);

        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.token1BurnRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Token1 -> userBurnRevoke  ==> revoke twice, Status is not locked', async () => {
    try {
        let shadowUserAccount = global.accounts[4];;
        await global.chains[2].approach.instance.userBurnRevoke(xInfo.token1BurnRevoke.hash, {from: shadowUserAccount, value: global.chains[2].approach.shadowRevokeFee * 2});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it("Shadow[2] -> Token1 -> userBurnLock  ==> Contract is not initialized", async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.htlcException.hash;
        await global.crossDelegateNotInit.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            web3.utils.toWei(userLockParamsTemp.value.toString()),
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Contract is not initialized");
    }
});

it('Shadow[2] -> Token1 -> userBurnLock  ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[2].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.htlcException.hash;
        await global.chains[2].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            web3.utils.toWei(userLockParamsTemp.value.toString()),
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Shadow[2] -> Token1 -> userBurnLock  ==> PK is not ready', async () => {
    try {
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(global.storemanGroups[1].ID, storemanGroupStatus.unregistered);
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.smgID = global.storemanGroups[1].ID;
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.htlcException.hash;
        await global.chains[2].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            web3.utils.toWei(userLockParamsTemp.value.toString()),
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    } finally {
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(global.storemanGroups[1].ID, storemanGroupStatus.ready);
    }
});

it("Shadow[2] -> Token1 -> userBurnLock  ==> Token does not exist", async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.htlcException.hash;

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // user mint lock
        await global.chains[2].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            InvalidTokenPairID,
            web3.utils.toWei(userLockParamsTemp.value.toString()),
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount, value: global.chains[2].approach.shadowLockFee * 2}
        );
    } catch (err) {
        assert.include(err.toString(), "Token does not exist");
    }
});

it("Shadow[2] -> Token1 -> userBurnLock  ==> Value is null", async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.htlcException.hash;

        let value = web3.utils.toWei("0");
        // user mint lock
        await global.chains[2].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount, value: global.chains[2].approach.shadowLockFee * 2}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Value is null");
    }
});

it('Original[1] -> Token1 -> smgBurnLock  ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[2].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.htlcException.hash;

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

        // storeman mint lock
        let smgMintLockReceipt = await global.chains[2].approach.instance.smgBurnLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Original[1] -> Token1 -> smgBurnLock  ==> Contract is not initialized', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.htlcException.hash;

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

        // storeman mint lock
        let smgMintLockReceipt = await global.crossDelegateNotInit.smgBurnLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Contract is not initialized");
    }
});

it('Shadow[2] -> Token1 -> smgBurnRedeem ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[2].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});

        await global.chains[2].approach.instance.smgBurnRedeem(xInfo.htlcException.x);
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Shadow[2] -> Token1 -> userBurnLock  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.token1BurnRedeem.hash;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[1].token.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[2].approach.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
        await tokenInstance.approve(global.chains[2].approach.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, global.chains[2].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));
        // user mint lock
        let userBurnLockReceipt = await global.chains[2].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount, value: global.chains[2].approach.shadowLockFee * 2}
        );

        // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
        // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
        assert.checkWeb3Event(userBurnLockReceipt, {
            event: 'UserBurnLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[2].approach.shadowLockFee,
                userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Token1 -> userBurnRevoke  ==> should wait lockedTime, not wait', async () => {
    try {
        let shadowUserAccount = global.accounts[3];;
        await global.chains[2].approach.instance.userBurnRevoke(xInfo.token1BurnRedeem.hash, {from: shadowUserAccount, value: global.chains[2].approach.shadowRevokeFee * 2});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Revoke is not permitted");
    }
});

it('Original[1] -> Token1 -> smgBurnLock  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.token1BurnRedeem.hash;

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

        // user mint lock
        let smgBurnLockReceipt = await global.chains[1].approach.instance.smgBurnLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
        assert.checkWeb3Event(smgBurnLockReceipt, {
            event: 'SmgBurnLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.origUserAccount
            }
        });

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Token1 -> smgBurnRevoke  ==> should wait lockedTime, not wait', async () => {
    try {
        await global.chains[1].approach.instance.smgBurnRevoke(xInfo.token1BurnRedeem.hash, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Revoke is not permitted");
    }
});

it('Original[1] -> Token1 -> userBurnRedeem  ==> use wrong x', async () => {
    try {
        let origUserAccount = global.accounts[3];
        await global.chains[1].approach.instance.userBurnRedeem(xInfo.htlcException.x, {from: origUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Original[1] -> Token1 -> userBurnRedeem  ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});

        let origUserAccount = global.accounts[3];
        await global.chains[1].approach.instance.userBurnRedeem(xInfo.htlcException.x, {from: origUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Original[1] -> Token1 -> userBurnRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.token1BurnRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);

        let origUserAccount = global.accounts[3];
        let userBurnRedeemReceipt = await global.chains[1].approach.instance.userBurnRedeem(xInfo.token1BurnRedeem.x, {from: origUserAccount});

        assert.checkWeb3Event(userBurnRedeemReceipt, {
            event: 'UserBurnRedeemLogger',
            args: {
                x: xInfo.token1BurnRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].token.tokenPairID
            }
        });

        let value = web3.utils.toWei(userLockParams.value.toString());
        let tokenInstance = await getRC20TokenInstance(global.chains[1].token.origTokenAccount);
        let balance = await tokenInstance.balanceOf(origUserAccount);
        assert.equal(value, balance.toString());

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Token1 -> userBurnRedeem ==> redeem twice, Status is not locked', async () => {
    try {
        let origUserAccount = global.accounts[3];
        await global.chains[1].approach.instance.userBurnRedeem(xInfo.token1BurnRedeem.x, {from: origUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Shadow[2] -> Token1 -> smgBurnRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.token1BurnRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);

        let smgBurnRedeemReceipt = await global.chains[2].approach.instance.smgBurnRedeem(xInfo.token1BurnRedeem.x, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgBurnRedeemReceipt, {
            event: 'SmgBurnRedeemLogger',
            args: {
                x: xInfo.token1BurnRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].token.tokenPairID,
                fee: global.chains[2].approach.shadowLockFee,
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Token1 -> smgBurnRedeem  ==> use wrong x', async () => {
    try {
        await global.chains[2].approach.instance.smgBurnRedeem(xInfo.htlcException.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Shadow[2] -> Token1 -> smgBurnRedeem ==> redeem twice, Status is not locked', async () => {
    try {
        await global.chains[2].approach.instance.smgBurnRedeem(xInfo.htlcException.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

// chain2 MintBridge
it('Original[2] -> Token2 -> userMintLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.token2MintRevoke.hash;
        userLockParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before MintQuotaValue", beforeMintQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        await global.chains[2].token.tokenCreator.mintToken(global.chains[2].token.name, global.chains[2].token.symbol,
            userLockParamsTemp.origUserAccount, value);
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[2].token.origTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.origUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[2].approach.instance.address, 0, {from: userLockParamsTemp.origUserAccount});
        await tokenInstance.approve(global.chains[2].approach.instance.address, value, {from: userLockParamsTemp.origUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.origUserAccount, global.chains[2].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));
        // user mint lock
        let userMintLockReceipt = await global.chains[2].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount, value: global.chains[2].approach.origLockFee * 2}
        );

        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        assert.checkWeb3Event(userMintLockReceipt, {
            event: 'UserMintLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[2].approach.origLockFee,
                userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
            }
        });
        // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Token2 -> smgMintLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.token2MintRevoke.hash;
        smgLockParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

        // user mint lock
        let smgMintLockReceipt = await global.chains[1].approach.instance.smgMintLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        assert.checkWeb3Event(smgMintLockReceipt, {
            event: 'SmgMintLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.shadowUserAccount
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Token2 -> userMintRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        let shadowUserAccount = global.accounts[4];
        await global.chains[1].approach.instance.userMintRedeem(xInfo.token2MintRevoke.x, {from: shadowUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Original[2] -> Token2 -> smgMintRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = 2 * htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        await global.chains[2].approach.instance.smgMintRedeem(xInfo.token2MintRevoke.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Shadow[1] -> Token2 -> smgMintRevoke  ==> success', async () => {
    try {
        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);

        let smgMintRevokeReceipt = await global.chains[1].approach.instance.smgMintRevoke(xInfo.token2MintRevoke.hash, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgMintRevokeReceipt, {
            event: 'SmgMintRevokeLogger',
            args: {
                xHash: xInfo.token2MintRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].token.tokenPairID
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
        let value = web3.utils.toWei(smgLockParams.value.toString());
        assert.equal(value === difference, true);


        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.token2MintRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Token2 -> userMintRevoke  ==> success', async () => {
    try {
        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);

        let origUserAccount = global.accounts[3];
        let value = web3.utils.toWei(userLockParams.value.toString());
        let userMintRevokeReceipt = await global.chains[2].approach.instance.userMintRevoke(xInfo.token2MintRevoke.hash, {from: origUserAccount, value: global.chains[2].approach.origRevokeFee * 2});
        await global.chains[2].token.tokenCreator.burnToken(global.chains[2].token.name, global.chains[2].token.symbol,
            origUserAccount, value);

        assert.checkWeb3Event(userMintRevokeReceipt, {
            event: 'UserMintRevokeLogger',
            args: {
                xHash: xInfo.token2MintRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].token.tokenPairID,
                fee: global.chains[2].approach.origRevokeFee,
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
        assert.equal(value === difference, true);

        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.token2MintRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Token2 -> userMintLock  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.token2MintRedeem.hash;
        userLockParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before MintQuotaValue", beforeMintQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        await global.chains[2].token.tokenCreator.mintToken(global.chains[2].token.name, global.chains[2].token.symbol,
            userLockParamsTemp.origUserAccount, value);
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[2].token.origTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.origUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[2].approach.instance.address, 0, {from: userLockParamsTemp.origUserAccount});
        await tokenInstance.approve(global.chains[2].approach.instance.address, value, {from: userLockParamsTemp.origUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.origUserAccount, global.chains[2].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));
        // user mint lock
        let userMintLockReceipt = await global.chains[2].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount, value: global.chains[2].approach.origLockFee * 2}
        );
        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        assert.checkWeb3Event(userMintLockReceipt, {
            event: 'UserMintLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[2].approach.origLockFee,
                userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
            }
        });            // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Token2 -> smgMintLock  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.token2MintRedeem.hash;
        smgLockParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

        // user mint lock
        let smgMintLockReceipt = await global.chains[1].approach.instance.smgMintLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        assert.checkWeb3Event(smgMintLockReceipt, {
            event: 'SmgMintLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.shadowUserAccount
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Token2 -> userMintRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.token2MintRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);

        let shadowUserAccount = global.accounts[4];
        let userMintRedeemReceipt = await global.chains[1].approach.instance.userMintRedeem(xInfo.token2MintRedeem.x, {from: shadowUserAccount});

        assert.checkWeb3Event(userMintRedeemReceipt, {
            event: 'UserMintRedeemLogger',
            args: {
                x: xInfo.token2MintRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].token.tokenPairID
            }
        });

        let value = web3.utils.toWei(userLockParams.value.toString());
        let tokenInstance = await getRC20TokenInstance(global.chains[2].token.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(shadowUserAccount);
        assert.equal(value, balance.toString());

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Token2 -> smgMintRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.token2MintRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);

        let smgMintRedeemReceipt = await global.chains[2].approach.instance.smgMintRedeem(xInfo.token2MintRedeem.x, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgMintRedeemReceipt, {
            event: 'SmgMintRedeemLogger',
            args: {
                x: xInfo.token2MintRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].token.tokenPairID,
                fee: global.chains[2].approach.origLockFee,
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

// chain1 BurnBridge
it('Shadow[1] -> Token2 -> userBurnLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.token2BurnRevoke.hash;
        userLockParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[2].token.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[1].approach.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
        await tokenInstance.approve(global.chains[1].approach.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, global.chains[1].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
        // user mint lock
        let userBurnLockReceipt = await global.chains[1].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount, value: global.chains[1].approach.shadowLockFee * 2}
        );

        // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
        assert.checkWeb3Event(userBurnLockReceipt, {
            event: 'UserBurnLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[1].approach.shadowLockFee,
                userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
            }
        });
        // console.log("after shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Token2 -> smgBurnLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.token2BurnRevoke.hash;
        smgLockParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

        // user mint lock
        let smgBurnLockReceipt = await global.chains[2].approach.instance.smgBurnLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
        assert.checkWeb3Event(smgBurnLockReceipt, {
            event: 'SmgBurnLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.origUserAccount
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Token2 -> userBurnRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        let origUserAccount = global.accounts[4];
        await global.chains[2].approach.instance.userBurnRedeem(xInfo.token2BurnRevoke.x, {from: origUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Shadow[1] -> Token2 -> smgBurnRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = 2 * htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        await global.chains[1].approach.instance.smgBurnRedeem(xInfo.token2BurnRevoke.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Original[2] -> Token2 -> smgBurnRevoke  ==> success', async () => {
    try {
        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);

        let smgBurnRevokeReceipt = await global.chains[2].approach.instance.smgBurnRevoke(xInfo.token2BurnRevoke.hash, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgBurnRevokeReceipt, {
            event: 'SmgBurnRevokeLogger',
            args: {
                xHash: xInfo.token2BurnRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].token.tokenPairID
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
        let value = web3.utils.toWei(smgLockParams.value.toString());
        assert.equal(value === difference, true);

        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.token2BurnRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Token2 -> userBurnRevoke  ==> success', async () => {
    try {
        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);

        let shadowUserAccount = global.accounts[4];;
        let userBurnRevokeReceipt = await global.chains[1].approach.instance.userBurnRevoke(xInfo.token2BurnRevoke.hash, {from: shadowUserAccount, value: global.chains[1].approach.shadowRevokeFee * 2});

        assert.checkWeb3Event(userBurnRevokeReceipt, {
            event: 'UserBurnRevokeLogger',
            args: {
                xHash: xInfo.token2BurnRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].token.tokenPairID,
                fee: global.chains[1].approach.shadowRevokeFee,
            }
        });

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
        let value = web3.utils.toWei(userLockParams.value.toString());
        assert.equal(value === difference, true);

        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.token2BurnRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Token2 -> userBurnLock  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[3];
        userLockParamsTemp.shadowUserAccount = global.accounts[4];
        userLockParamsTemp.xHash = xInfo.token2BurnRedeem.hash;
        userLockParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[2].token.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[1].approach.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
        await tokenInstance.approve(global.chains[1].approach.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, global.chains[1].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
        // user mint lock
        let userBurnLockReceipt = await global.chains[1].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount, value: global.chains[1].approach.shadowLockFee * 2}
        );

        // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
        assert.checkWeb3Event(userBurnLockReceipt, {
            event: 'UserBurnLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[1].approach.shadowLockFee,
                userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
            }
        });
        // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Token2 -> smgBurnLock  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[3];
        smgLockParamsTemp.shadowUserAccount = global.accounts[4];
        smgLockParamsTemp.xHash = xInfo.token2BurnRedeem.hash;
        smgLockParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

        // user mint lock
        let smgBurnLockReceipt = await global.chains[2].approach.instance.smgBurnLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
        assert.checkWeb3Event(smgBurnLockReceipt, {
            event: 'SmgBurnLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.origUserAccount
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Token2 -> userBurnRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.token2BurnRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);

        let origUserAccount = global.accounts[3];
        let userBurnRedeemReceipt = await global.chains[2].approach.instance.userBurnRedeem(xInfo.token2BurnRedeem.x, {from: origUserAccount});

        assert.checkWeb3Event(userBurnRedeemReceipt, {
            event: 'UserBurnRedeemLogger',
            args: {
                x: xInfo.token2BurnRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].token.tokenPairID
            }
        });

        let value = web3.utils.toWei(userLockParams.value.toString());
        let tokenInstance = await getRC20TokenInstance(global.chains[2].token.origTokenAccount);
        let balance = await tokenInstance.balanceOf(origUserAccount);
        assert.equal(value, balance.toString());

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Token2 -> smgBurnRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.token2BurnRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);

        let smgBurnRedeemReceipt = await global.chains[1].approach.instance.smgBurnRedeem(xInfo.token2BurnRedeem.x, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgBurnRedeemReceipt, {
            event: 'SmgBurnRedeemLogger',
            args: {
                x: xInfo.token2BurnRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].token.tokenPairID,
                fee: global.chains[1].approach.shadowLockFee,
            }
        });

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(global.chains[2].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

// chain1 MintBridge
it('Original[1] -> Coin1 -> userMintLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[5];
        userLockParamsTemp.shadowUserAccount = global.accounts[6];
        userLockParamsTemp.xHash = xInfo.coin1MintRevoke.hash;
        userLockParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("mintQuotaValue", mintQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // console.log("lock", value);
        let totalValue = new BN(value).add(new BN(global.chains[1].approach.origLockFee * 2)).toString();
        // console.log("lockFee", global.chains[1].approach.origLockFee);
        // console.log("totalLock", totalValue);

        // user mint lock
        let userMintLockReceipt = await global.chains[1].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount, value: totalValue}
        );

        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        assert.checkWeb3Event(userMintLockReceipt, {
            event: 'UserMintLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[1].approach.origLockFee,
                userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Coin1 -> smgMintLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[5];
        smgLockParamsTemp.shadowUserAccount = global.accounts[6];
        smgLockParamsTemp.xHash = xInfo.coin1MintRevoke.hash;
        smgLockParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

        // user mint lock
        let smgMintLockReceipt = await global.chains[2].approach.instance.smgMintLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        assert.checkWeb3Event(smgMintLockReceipt, {
            event: 'SmgMintLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.shadowUserAccount
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Coin1 -> userMintRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        let shadowUserAccount = global.accounts[6];
        await global.chains[2].approach.instance.userMintRedeem(xInfo.coin1MintRevoke.x, {from: shadowUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Original[1] -> Coin1 -> smgMintRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = 2 * htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        await global.chains[1].approach.instance.smgMintRedeem(xInfo.coin1MintRevoke.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Shadow[2] -> Coin1 -> smgMintRevoke  ==> success', async () => {
    try {
        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);

        let smgMintRevokeReceipt = await global.chains[2].approach.instance.smgMintRevoke(xInfo.coin1MintRevoke.hash, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgMintRevokeReceipt, {
            event: 'SmgMintRevokeLogger',
            args: {
                xHash: xInfo.coin1MintRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].coin.tokenPairID
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
        let value = web3.utils.toWei(userLockParams.value.toString());
        assert.equal(value === difference, true);

        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.coin1MintRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Coin1 -> userMintRevoke  ==> success', async () => {
    try {
        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);

        let origUserAccount = global.accounts[5];
        let value = web3.utils.toWei(userLockParams.value.toString());
        let balance1 = await getBalance(origUserAccount);
        let userMintRevokeReceipt = await global.chains[1].approach.instance.userMintRevoke(xInfo.coin1MintRevoke.hash, {from: origUserAccount, value: global.chains[2].approach.origRevokeFee * 2});
        let balance2 = await getBalance(origUserAccount);
        assert.equal(value >= balance2 - balance1, true);

        assert.checkWeb3Event(userMintRevokeReceipt, {
            event: 'UserMintRevokeLogger',
            args: {
                xHash: xInfo.coin1MintRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].coin.tokenPairID,
                fee: global.chains[1].approach.origRevokeFee,
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
        assert.equal(value === difference, true);

        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.coin1MintRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Coin1 -> userMintLock  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[5];
        userLockParamsTemp.shadowUserAccount = global.accounts[6];
        userLockParamsTemp.xHash = xInfo.coin1MintRedeem.hash;
        userLockParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before MintQuotaValue", beforeMintQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        let totalValue = new BN(value).add(new BN(global.chains[1].approach.origLockFee * 2)).toString();

        // user mint lock
        let userMintLockReceipt = await global.chains[1].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount, value: totalValue}
        );
        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        assert.checkWeb3Event(userMintLockReceipt, {
            event: 'UserMintLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[1].approach.origLockFee,
                userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
            }
        });
        // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Coin1 -> smgMintLock  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[5];
        smgLockParamsTemp.shadowUserAccount = global.accounts[6];
        smgLockParamsTemp.xHash = xInfo.coin1MintRedeem.hash;
        smgLockParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

        // user mint lock
        let smgMintLockReceipt = await global.chains[2].approach.instance.smgMintLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        assert.checkWeb3Event(smgMintLockReceipt, {
            event: 'SmgMintLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.shadowUserAccount
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Coin1 -> userMintRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.coin1MintRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);

        let shadowUserAccount = global.accounts[6];
        let userMintRedeemReceipt = await global.chains[2].approach.instance.userMintRedeem(xInfo.coin1MintRedeem.x, {from: shadowUserAccount});

        assert.checkWeb3Event(userMintRedeemReceipt, {
            event: 'UserMintRedeemLogger',
            args: {
                x: xInfo.coin1MintRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].coin.tokenPairID
            }
        });

        let value = web3.utils.toWei(userLockParams.value.toString());
        let tokenInstance = await getRC20TokenInstance(global.chains[1].coin.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(shadowUserAccount);
        assert.equal(value, balance.toString());

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Coin1 -> smgMintRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.coin1MintRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);

        let smgMintRedeemReceipt = await global.chains[1].approach.instance.smgMintRedeem(xInfo.coin1MintRedeem.x, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgMintRedeemReceipt, {
            event: 'SmgMintRedeemLogger',
            args: {
                x: xInfo.coin1MintRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].coin.tokenPairID,
                fee: global.chains[1].approach.origLockFee,
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

// chain2 BurnBridge
it('Shadow[2] -> Coin1 -> userBurnLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[5];
        userLockParamsTemp.shadowUserAccount = global.accounts[6];
        userLockParamsTemp.xHash = xInfo.coin1BurnRevoke.hash;
        userLockParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[1].coin.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[2].approach.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
        await tokenInstance.approve(global.chains[2].approach.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, global.chains[2].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));
        // user mint lock
        let userBurnLockReceipt = await global.chains[2].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount, value: global.chains[2].approach.shadowLockFee * 2}
        );

        // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
        assert.checkWeb3Event(userBurnLockReceipt, {
            event: 'UserBurnLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[2].approach.shadowLockFee,
                userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
            }
        });
        // console.log("after shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Coin1 -> smgBurnLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[5];
        smgLockParamsTemp.shadowUserAccount = global.accounts[6];
        smgLockParamsTemp.xHash = xInfo.coin1BurnRevoke.hash;
        smgLockParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

        // user mint lock
        let smgBurnLockReceipt = await global.chains[1].approach.instance.smgBurnLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
        assert.checkWeb3Event(smgBurnLockReceipt, {
            event: 'SmgBurnLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.origUserAccount
            }
        });

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Coin1 -> userBurnRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        let origUserAccount = global.accounts[6];
        await global.chains[1].approach.instance.userBurnRedeem(xInfo.coin1BurnRevoke.x, {from: origUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Shadow[2] -> Coin1 -> smgBurnRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = 2 * htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        await global.chains[2].approach.instance.smgBurnRedeem(xInfo.coin1BurnRevoke.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Original[1] -> Coin1 -> smgBurnRevoke  ==> success', async () => {
    try {
        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);

        let smgBurnRevokeReceipt = await global.chains[1].approach.instance.smgBurnRevoke(xInfo.coin1BurnRevoke.hash, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgBurnRevokeReceipt, {
            event: 'SmgBurnRevokeLogger',
            args: {
                xHash: xInfo.coin1BurnRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].coin.tokenPairID
            }
        });

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
        let value = web3.utils.toWei(smgLockParams.value.toString());
        assert.equal(value === difference, true);

        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.coin1BurnRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Coin1 -> userBurnRevoke  ==> success', async () => {
    try {
        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);

        let shadowUserAccount = global.accounts[6];;
        let userBurnRevokeReceipt = await global.chains[2].approach.instance.userBurnRevoke(xInfo.coin1BurnRevoke.hash, {from: shadowUserAccount, value: global.chains[2].approach.shadowRevokeFee * 2});

        assert.checkWeb3Event(userBurnRevokeReceipt, {
            event: 'UserBurnRevokeLogger',
            args: {
                xHash: xInfo.coin1BurnRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].coin.tokenPairID,
                fee: global.chains[2].approach.shadowRevokeFee,
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
        let value = web3.utils.toWei(userLockParams.value.toString());
        assert.equal(value === difference, true);

        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.coin1BurnRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Coin1 -> userBurnLock  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[5];
        userLockParamsTemp.shadowUserAccount = global.accounts[6];
        userLockParamsTemp.xHash = xInfo.coin1BurnRedeem.hash;
        userLockParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[1].coin.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[2].approach.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
        await tokenInstance.approve(global.chains[2].approach.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, global.chains[2].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));
        // user mint lock
        let userBurnLockReceipt = await global.chains[2].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount, value: global.chains[2].approach.shadowLockFee * 2}
        );
        // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
        assert.checkWeb3Event(userBurnLockReceipt, {
            event: 'UserBurnLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[2].approach.shadowLockFee,
                userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
            }
        });
        // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Coin1 -> smgBurnLock  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[5];
        smgLockParamsTemp.shadowUserAccount = global.accounts[6];
        smgLockParamsTemp.xHash = xInfo.coin1BurnRedeem.hash;
        smgLockParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

        // user mint lock
        let smgBurnLockReceipt = await global.chains[1].approach.instance.smgBurnLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
        assert.checkWeb3Event(smgBurnLockReceipt, {
            event: 'SmgBurnLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.origUserAccount
            }
        });

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Coin1 -> userBurnRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.coin1BurnRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);

        let origUserAccount = global.accounts[5];
        let userBurnRedeemReceipt = await global.chains[1].approach.instance.userBurnRedeem(xInfo.coin1BurnRedeem.x, {from: origUserAccount});
        // let balance2 = await getBalance(origUserAccount);

        assert.checkWeb3Event(userBurnRedeemReceipt, {
            event: 'UserBurnRedeemLogger',
            args: {
                x: xInfo.coin1BurnRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].coin.tokenPairID
            }
        });

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getSmgBurnQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Coin1 -> smgBurnRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.coin1BurnRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);

        let smgBurnRedeemReceipt = await global.chains[2].approach.instance.smgBurnRedeem(xInfo.coin1BurnRedeem.x, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgBurnRedeemReceipt, {
            event: 'SmgBurnRedeemLogger',
            args: {
                x: xInfo.coin1BurnRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[1].coin.tokenPairID,
                fee: global.chains[2].approach.shadowLockFee,
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(global.chains[1].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

// chain2 MintBridge
it('Original[2] -> Coin2 -> userMintLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[5];
        userLockParamsTemp.shadowUserAccount = global.accounts[6];
        userLockParamsTemp.xHash = xInfo.coin2MintRevoke.hash;
        userLockParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before MintQuotaValue", beforeMintQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // console.log("lock", value);
        let totalValue = new BN(value).add(new BN(global.chains[2].approach.origLockFee * 2)).toString();
        // console.log("lockFee", global.chains[2].approach.origLockFee);
        // console.log("totalLock", totalValue);

        // user mint lock
        let userMintLockReceipt = await global.chains[2].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount, value: totalValue}
        );

        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        assert.checkWeb3Event(userMintLockReceipt, {
            event: 'UserMintLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[2].approach.origLockFee,
                userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Coin2 -> smgMintLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[5];
        smgLockParamsTemp.shadowUserAccount = global.accounts[6];
        smgLockParamsTemp.xHash = xInfo.coin2MintRevoke.hash;
        smgLockParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

        // user mint lock
        let smgMintLockReceipt = await global.chains[1].approach.instance.smgMintLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        assert.checkWeb3Event(smgMintLockReceipt, {
            event: 'SmgMintLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.shadowUserAccount
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Coin2 -> userMintRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        let shadowUserAccount = global.accounts[6];
        await global.chains[1].approach.instance.userMintRedeem(xInfo.coin2MintRevoke.x, {from: shadowUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Original[2] -> Coin2 -> smgMintRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = 2 * htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        let smgMintRedeemReceipt = await global.chains[2].approach.instance.smgMintRedeem(xInfo.coin2MintRevoke.x, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgMintRedeemReceipt, {
            event: 'SmgMintRedeemLogger',
            args: {
                x: xInfo.coin2MintRevoke.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].coin.tokenPairID,
                fee: global.chains[2].approach.origLockFee,
            }
        });
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Shadow[1] -> Coin2 -> smgMintRevoke  ==> success', async () => {
    try {
        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);

        let smgMintRevokeReceipt = await global.chains[1].approach.instance.smgMintRevoke(xInfo.coin2MintRevoke.hash, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgMintRevokeReceipt, {
            event: 'SmgMintRevokeLogger',
            args: {
                xHash: xInfo.coin2MintRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].coin.tokenPairID
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
        let value = web3.utils.toWei(smgLockParams.value.toString());
        assert.equal(value === difference, true);

        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.coin2MintRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Coin2 -> userMintRevoke  ==> success', async () => {
    try {
        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);

        let origUserAccount = global.accounts[5];
        let value = web3.utils.toWei(userLockParams.value.toString());
        let balance1 = await getBalance(origUserAccount);
        let userMintRevokeReceipt = await global.chains[2].approach.instance.userMintRevoke(xInfo.coin2MintRevoke.hash, {from: origUserAccount, value: global.chains[2].approach.origRevokeFee * 2});
        let balance2 = await getBalance(origUserAccount);
        assert.equal(value >= balance2 - balance1, true);

        assert.checkWeb3Event(userMintRevokeReceipt, {
            event: 'UserMintRevokeLogger',
            args: {
                xHash: xInfo.coin2MintRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].coin.tokenPairID,
                fee: global.chains[2].approach.origRevokeFee,
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
        assert.equal(value === difference, true);

        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.coin2MintRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Coin2 -> userMintLock  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[5];
        userLockParamsTemp.shadowUserAccount = global.accounts[6];
        userLockParamsTemp.xHash = xInfo.coin2MintRedeem.hash;
        userLockParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before MintQuotaValue", beforeMintQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        let totalValue = new BN(value).add(new BN(global.chains[2].approach.origLockFee * 2)).toString();

        // user mint lock
        let userMintLockReceipt = await global.chains[2].approach.instance.userMintLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.shadowUserAccount,
            {from: userLockParamsTemp.origUserAccount, value: totalValue}
        );

        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        assert.checkWeb3Event(userMintLockReceipt, {
            event: 'UserMintLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[2].approach.origLockFee,
                userAccount: userLockParamsTemp.shadowUserAccount.toLowerCase(),
            }
        });
        // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Coin2 -> smgMintLock  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[5];
        smgLockParamsTemp.shadowUserAccount = global.accounts[6];
        smgLockParamsTemp.xHash = xInfo.coin2MintRedeem.hash;
        smgLockParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgMintLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.shadowUserAccount);

        // user mint lock
        let smgMintLockReceipt = await global.chains[1].approach.instance.smgMintLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgMintLock receipt", smgMintLockReceipt.logs);
        assert.checkWeb3Event(smgMintLockReceipt, {
            event: 'SmgMintLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.shadowUserAccount
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Coin2 -> userMintRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.coin2MintRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);

        let shadowUserAccount = global.accounts[6];
        let userMintRedeemReceipt = await global.chains[1].approach.instance.userMintRedeem(xInfo.coin2MintRedeem.x, {from: shadowUserAccount});

        assert.checkWeb3Event(userMintRedeemReceipt, {
            event: 'UserMintRedeemLogger',
            args: {
                x: xInfo.coin2MintRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].coin.tokenPairID
            }
        });

        let value = web3.utils.toWei(userLockParams.value.toString());
        let tokenInstance = await getRC20TokenInstance(global.chains[2].coin.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(shadowUserAccount);
        assert.equal(value, balance.toString());

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Coin2 -> smgMintRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.coin2MintRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);

        let smgMintRedeemReceipt = await global.chains[2].approach.instance.smgMintRedeem(xInfo.coin2MintRedeem.x, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgMintRedeemReceipt, {
            event: 'SmgMintRedeemLogger',
            args: {
                x: xInfo.coin2MintRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].coin.tokenPairID,
                fee: global.chains[2].approach.origLockFee,
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

// chain1 BurnBridge
it('Shadow[1] -> Coin2 -> userBurnLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[5];
        userLockParamsTemp.shadowUserAccount = global.accounts[6];
        userLockParamsTemp.xHash = xInfo.coin2BurnRevoke.hash;
        userLockParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[2].coin.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[1].approach.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
        await tokenInstance.approve(global.chains[1].approach.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, global.chains[1].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
        // user mint lock
        let userBurnLockReceipt = await global.chains[1].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount, value: global.chains[1].approach.shadowLockFee * 2}
        );

        // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
        assert.checkWeb3Event(userBurnLockReceipt, {
            event: 'UserBurnLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[1].approach.shadowLockFee,
                userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
            }
        });
        // console.log("after shadowUserAccount", await web3.eth.getBalance(userLockParamsTemp.shadowUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Coin2 -> smgBurnLock  ==> [revoke] success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[5];
        smgLockParamsTemp.shadowUserAccount = global.accounts[6];
        smgLockParamsTemp.xHash = xInfo.coin2BurnRevoke.hash;
        smgLockParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

        // user mint lock
        let smgBurnLockReceipt = await global.chains[2].approach.instance.smgBurnLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgBurnLock receipt", smgBurnLockReceipt.logs);
        assert.checkWeb3Event(smgBurnLockReceipt, {
            event: 'SmgBurnLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.origUserAccount
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Coin2 -> userBurnRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        let origUserAccount = global.accounts[6];
        await global.chains[2].approach.instance.userBurnRedeem(xInfo.coin2BurnRevoke.x, {from: origUserAccount});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Shadow[1] -> Coin2 -> smgBurnRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = 2 * htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        await global.chains[1].approach.instance.smgBurnRedeem(xInfo.coin2BurnRevoke.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Original[2] -> Coin2 -> smgBurnRevoke  ==> success', async () => {
    try {
        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);

        let smgBurnRevokeReceipt = await global.chains[2].approach.instance.smgBurnRevoke(xInfo.coin2BurnRevoke.hash, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgBurnRevokeReceipt, {
            event: 'SmgBurnRevokeLogger',
            args: {
                xHash: xInfo.coin2BurnRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].coin.tokenPairID
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
        let value = web3.utils.toWei(smgLockParams.value.toString());
        assert.equal(value === difference, true);

        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.coin2BurnRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Coin2 -> userBurnRevoke  ==> success', async () => {
    try {
        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);

        let shadowUserAccount = global.accounts[6];;
        let userBurnRevokeReceipt = await global.chains[1].approach.instance.userBurnRevoke(xInfo.coin2BurnRevoke.hash, {from: shadowUserAccount, value: global.chains[1].approach.shadowRevokeFee * 2});

        assert.checkWeb3Event(userBurnRevokeReceipt, {
            event: 'UserBurnRevokeLogger',
            args: {
                xHash: xInfo.coin2BurnRevoke.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].coin.tokenPairID,
                fee: global.chains[1].approach.shadowRevokeFee,
            }
        });

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterBurnQuotaValue).sub(beforeBurnQuotaValue).toString();
        let value = web3.utils.toWei(userLockParams.value.toString());
        assert.equal(value === difference, true);

        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.coin2BurnRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Coin2 -> userBurnLock  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[5];
        userLockParamsTemp.shadowUserAccount = global.accounts[6];
        userLockParamsTemp.xHash = xInfo.coin2BurnRedeem.hash;
        userLockParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("before BurnQuotaValue", beforeBurnQuotaValue);

        let value = web3.utils.toWei(userLockParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[2].coin.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(userLockParamsTemp.shadowUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[1].approach.instance.address, 0, {from: userLockParamsTemp.shadowUserAccount});
        await tokenInstance.approve(global.chains[1].approach.instance.address, value, {from: userLockParamsTemp.shadowUserAccount});
        let allowance = await tokenInstance.allowance(userLockParamsTemp.shadowUserAccount, global.chains[1].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
        // user mint lock
        let userBurnLockReceipt = await global.chains[1].approach.instance.userBurnLock(
            userLockParamsTemp.xHash,
            userLockParamsTemp.smgID,
            userLockParamsTemp.tokenPairID,
            value,
            userLockParamsTemp.origUserAccount,
            {from: userLockParamsTemp.shadowUserAccount, value: global.chains[1].approach.shadowLockFee * 2}
        );

        // console.log("userBurnLock receipt", userBurnLockReceipt.logs);
        assert.checkWeb3Event(userBurnLockReceipt, {
            event: 'UserBurnLockLogger',
            args: {
                xHash: userLockParamsTemp.xHash,
                smgID: web3.utils.padRight(userLockParamsTemp.smgID, 64),
                tokenPairID: userLockParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[1].approach.shadowLockFee,
                userAccount: userLockParamsTemp.origUserAccount.toLowerCase(),
            }
        });
        // console.log("after origUserAccount", await web3.eth.getBalance(userLockParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Coin2 -> smgBurnLock  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[5];
        smgLockParamsTemp.shadowUserAccount = global.accounts[6];
        smgLockParamsTemp.xHash = xInfo.coin2BurnRedeem.hash;
        smgLockParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgBurnLock, smgLockParamsTemp.xHash,
            smgLockParamsTemp.tokenPairID, value, smgLockParamsTemp.origUserAccount);

        // console.log("pk1:", global.storemanGroups[1].gpk1);
        // console.log("pk2:", global.storemanGroups[1].gpk2);
        // user mint lock
        let smgBurnLockReceipt = await global.chains[2].approach.instance.smgBurnLock(
            smgLockParamsTemp.xHash,
            smgLockParamsTemp.smgID,
            smgLockParamsTemp.tokenPairID,
            value,
            smgLockParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log("smgBurnLock receipt", smgBurnLockReceipt);
        // console.log("smgBurnLock receipt logs", smgBurnLockReceipt.logs);
        assert.checkWeb3Event(smgBurnLockReceipt, {
            event: 'SmgBurnLockLogger',
            args: {
                xHash: smgLockParamsTemp.xHash,
                smgID: web3.utils.padRight(smgLockParamsTemp.smgID, 64),
                tokenPairID: smgLockParamsTemp.tokenPairID,
                value: value,
                userAccount: smgLockParamsTemp.origUserAccount
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Coin2 -> userBurnRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.coin2BurnRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);

        let origUserAccount = global.accounts[5];
        let userBurnRedeemReceipt = await global.chains[2].approach.instance.userBurnRedeem(xInfo.coin2BurnRedeem.x, {from: origUserAccount});
        // let balance2 = await getBalance(origUserAccount);

        assert.checkWeb3Event(userBurnRedeemReceipt, {
            event: 'UserBurnRedeemLogger',
            args: {
                x: xInfo.coin2BurnRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].coin.tokenPairID
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Coin2 -> smgBurnRedeem  ==> success', async () => {
    try {
        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.coin2BurnRedeem.hash);
        assert.equal(leftTime.toNumber() > 0, true);

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);

        let smgBurnRedeemReceipt = await global.chains[1].approach.instance.smgBurnRedeem(xInfo.coin2BurnRedeem.x, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgBurnRedeemReceipt, {
            event: 'SmgBurnRedeemLogger',
            args: {
                x: xInfo.coin2BurnRedeem.x,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID: global.chains[2].coin.tokenPairID,
                fee: global.chains[1].approach.shadowLockFee,
            }
        });

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Chain[1] -> smgWithdrawFee  ==> The receiver address expired', async () => {
    try {
        let timestamp = parseInt(Date.now() / 1000); //s
        let timeout = await global.chains[1].approach.instance._smgFeeReceiverTimeout();
        timestamp -= timeout;

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgWithdrawFee, timestamp, global.storemanGroups[1].account);
        let smgWithdrawFeeReceipt = await global.chains[1].approach.instance.smgWithdrawFee(global.storemanGroups[1].ID, timestamp, global.storemanGroups[1].account, R, s, {from: global.storemanGroups[1].account});

        let smgFee = await global.chains[1].approach.instance.getStoremanFee(global.storemanGroups[1].ID);

        assert.checkWeb3Event(smgWithdrawFeeReceipt, {
            event: 'SmgWithdrawFeeLogger',
            args: {
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                // timeStamp: global.chains[2].coin.tokenPairID,
                receiver: global.storemanGroups[1].account,
                fee: smgFee
            }
        });

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "The receiver address expired");
    }
});

it('Chain[1] -> smgWithdrawFee  ==> Invalid storeman group ID', async () => {
    try {
        let timestamp = parseInt(Date.now() / 1000); //s
        // let smgFee = await global.chains[1].approach.instance.getStoremanFee(global.storemanGroups.htlcException.ID);
        // console.log("chain1 storeman wrong fee", smgFee);

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgWithdrawFee, timestamp, global.storemanGroups[1].account);
        let smgWithdrawFeeReceipt = await global.chains[1].approach.instance.smgWithdrawFee(global.storemanGroups.htlcException.ID, timestamp, global.storemanGroups[1].account, R, s, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgWithdrawFeeReceipt, {
            event: 'SmgWithdrawFeeLogger',
            args: {
                smgID: web3.utils.padRight(global.storemanGroups.htlcException.ID, 64),
                receiver: global.storemanGroups[1].account,
                fee: smgFee
            }
        });
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "revert");
    }
});

it('Chain[1] -> smgWithdrawFee  ==> Fee is null', async () => {
    try {
        let timestamp = parseInt(Date.now() / 1000); //s
        let smgFee = await global.chains[1].approach.instance.getStoremanFee(global.storemanGroups[1].ID);
        // console.log("chain1 storeman 1 fee", smgFee);

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgWithdrawFee, timestamp, global.storemanGroups[1].account);
        let smgWithdrawFeeReceipt = await global.chains[1].approach.instance.smgWithdrawFee(global.storemanGroups[1].ID, timestamp, global.storemanGroups[1].account, R, s, {from: global.storemanGroups[1].account});

        assert.checkWeb3Event(smgWithdrawFeeReceipt, {
            event: 'SmgWithdrawFeeLogger',
            args: {
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                receiver: global.storemanGroups[1].account,
                fee: smgFee
            }
        });
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Fee is null");
    }
});

it('Chain[2] -> smgWithdrawFee  ==> The receiver address expired', async () => {
    try {
        let timestamp = parseInt(Date.now() / 1000); //s
        let timeout = await global.chains[1].approach.instance._smgFeeReceiverTimeout();
        timestamp -= timeout;

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgWithdrawFee, timestamp, global.storemanGroups[1].account);
        let smgWithdrawFeeReceipt = await global.chains[2].approach.instance.smgWithdrawFee(global.storemanGroups[1].ID, timestamp, global.storemanGroups[1].account, R, s, {from: global.storemanGroups[1].account});

        let smgFee = await global.chains[2].approach.instance.getStoremanFee(global.storemanGroups[1].ID);

        assert.checkWeb3Event(smgWithdrawFeeReceipt, {
            event: 'SmgWithdrawFeeLogger',
            args: {
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                // timeStamp: global.chains[2].coin.tokenPairID,
                receiver: global.storemanGroups[1].account,
                fee: smgFee
            }
        });

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "The receiver address expired");
    }
});

it('Chain[2] -> smgWithdrawFee  ==> success', async () => {
    try {
        let timestamp = parseInt(Date.now() / 1000); //s

        let smgFee = await global.chains[2].approach.instance.getStoremanFee(global.storemanGroups[1].ID);
        // console.log("chain2 storeman 1 fee", smgFee);

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgWithdrawFee, timestamp, global.storemanGroups[1].account);
        let smgWithdrawFeeReceipt = await global.chains[2].approach.instance.smgWithdrawFee(global.storemanGroups[1].ID, timestamp, global.storemanGroups[1].account, R, s, {from: global.storemanGroups[1].account});

        // let smgFee = await global.chains[2].approach.instance.getStoremanFee(global.storemanGroups[1].ID);

        assert.checkWeb3Event(smgWithdrawFeeReceipt, {
            event: 'SmgWithdrawFeeLogger',
            args: {
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                receiver: global.storemanGroups[1].account,
                fee: smgFee
            }
        });
    } catch (err) {
        assert.fail(err);
    }
});

after("finish...   -> success", async function () {
    let origUserAccount = global.accounts[3];
    let value = web3.utils.toWei(userLockParams.value.toString());
    await global.chains[1].token.tokenCreator.burnToken(global.chains[1].token.name, global.chains[1].token.symbol,
        origUserAccount, value);
    await global.chains[2].token.tokenCreator.burnToken(global.chains[2].token.name, global.chains[2].token.symbol,
        origUserAccount, value);
});