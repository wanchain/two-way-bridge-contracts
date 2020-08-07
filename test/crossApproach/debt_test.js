const CrossProxy                = artifacts.require('CrossProxy.sol');
const {
    BN,
    ERROR_INFO,
    storemanGroupStatus,
    xInfo,
    skInfo,
    uniqueInfo,
    htlcLockedTime,
    userLockParams,
    smgLockParams,
    userFastParams,
    smgFastParams,
    debtLockParams,
    typesArrayList,
    assert,
    testInit
}                               = require('./lib');

const {
    sleep,
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

it("Debt -> srcDebtLock  ==> Contract is not initialized", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.htlcException.hash;

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

        let srcDebtLockReceipt = await global.crossDelegateNotInit.srcDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Contract is not initialized");
    }
});

it('Debt -> srcDebtLock  ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});

        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.htlcException.hash;

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

        let srcDebtLockReceipt = await global.chains[1].approach.instance.srcDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it("Debt -> srcDebtLock  ==> Destination storeman group ID is invalid, source storeman group ID is ready", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups.htlcException.ID;
        debtLockParamsTemp.xHash = xInfo.htlcException.hash;

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

        let srcDebtLockReceipt = await global.chains[1].approach.instance.srcDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    }
});

it("Debt -> srcDebtLock  ==> Destination storeman group ID is not ready, source storeman group ID is ready", async () => {
    let debtLockParamsTemp = Object.assign({}, debtLockParams);
    try {
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.htlcException.hash;

        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.dismissed);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.dismissed);

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

        let srcDebtLockReceipt = await global.chains[1].approach.instance.srcDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    } finally {
        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.ready);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.ready);
    }
});

it("Debt -> srcDebtLock  ==> Destination storeman group ID is ready, source storeman group ID is ready", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.htlcException.hash;

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

        let srcDebtLockReceipt = await global.chains[1].approach.instance.srcDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        assert.fail(ERROR_INFO);
        } catch (err) {
        assert.include(err.toString(), "PK is not unregistered");
    }
});

it("Debt -> srcDebtLock [revoke]  ==> Destination storeman group ID is ready, source storeman group ID is unregistered ==> success", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.chain1DebtRevoke.hash;

        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

        let srcDebtLockReceipt = await global.chains[1].approach.instance.srcDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log(srcDebtLockReceipt.logs);
        assert.checkWeb3Event(srcDebtLockReceipt, {
            event: 'SrcDebtLockLogger',
            args: {
                xHash: debtLockParamsTemp.xHash,
                srcSmgID: web3.utils.padRight(debtLockParamsTemp.srcSmgID, 64),
                destSmgID: web3.utils.padRight(debtLockParamsTemp.destSmgID, 64),
            }
        });
    } catch (err) {
        assert.fail(err);
    }
});

it("Debt -> destDebtLock [revoke]  ==> success", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.chain1DebtRevoke.hash;

        let pkId = 2;
        let sk = skInfo.smg2[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.destDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.srcSmgID);

        let srcDebtLockReceipt = await global.chains[2].approach.instance.destDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[2].account}
        );

        // console.log(srcDebtLockReceipt.logs);
        assert.checkWeb3Event(srcDebtLockReceipt, {
            event: 'DestDebtLockLogger',
            args: {
                xHash: debtLockParamsTemp.xHash,
                srcSmgID: web3.utils.padRight(debtLockParamsTemp.srcSmgID, 64),
                destSmgID: web3.utils.padRight(debtLockParamsTemp.destSmgID, 64),
            }
        });
    } catch (err) {
        assert.fail(err);
    }
});

it("Debt -> userFastMint  ==> Disable rapidity cross chain while debt", async () => {
    try {
        // global.accounts[7] is the chain1 original address of the user.
        // global.accounts[8] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[7];
        userFastParamsTemp.shadowUserAccount = global.accounts[8];
        userFastParamsTemp.uniqueID = uniqueInfo.fastException;
        userFastParamsTemp.smgID = global.storemanGroups[1].ID;
        userFastParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        let value = web3.utils.toWei(userFastParamsTemp.value.toString());

        let userFastMintReceipt = await global.chains[1].approach.instance.userFastMint(
            userFastParamsTemp.uniqueID,
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            value,
            userFastParamsTemp.shadowUserAccount,
            {from: global.storemanGroups[1].account}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    }
});

it("Debt -> userMintLock  ==> Disable htlc cross chain while debt", async () => {
    let value;
    let origUserAccount;
    try {
        // global.accounts[7] is the chain1 original address of the user.
        // global.accounts[8] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[7];
        userLockParamsTemp.shadowUserAccount = global.accounts[8];
        userLockParamsTemp.xHash = xInfo.htlcException.hash;
        userLockParamsTemp.tokenPairID = global.chains[1].token.tokenPairID;

        value = web3.utils.toWei(userLockParamsTemp.value.toString());
        origUserAccount = userLockParamsTemp.origUserAccount;

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
            {from: userLockParamsTemp.origUserAccount, value: global.chains[1].approach.origLockFee}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    } finally {
        await global.chains[1].token.tokenCreator.burnToken(global.chains[1].token.name, global.chains[1].token.symbol,
            origUserAccount, value);
    }
});

it('Debt -> srcDebtRedeem [revoke]  ==> Redeem timeout', async () => {
    try {
        let lockedTime = htlcLockedTime * 1000 + 1;
        // let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.chain1DebtRevoke.hash);
        // let lockedTime = leftTime * 1000 + 1;

        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms

        // let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.chain1DebtRevoke.hash);
        // console.log("Debt Number(leftTime)", Number(leftTime));
        // console.log("Debt leftTime BN   ", leftTime);
        // console.log("Debt leftTime number", leftTime.toNumber());
        // console.log("Debt leftTime string", leftTime.toString(10));
        // assert.equal(leftTime.toNumber() === 0, true);
        // // assert.equal(Number(leftTime) === 0, true);

        await global.chains[2].approach.instance.srcDebtRedeem(xInfo.chain1DebtRevoke.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Debt -> destDebtRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = 2 * htlcLockedTime * 1000 + 1;
        // let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.chain1DebtRevoke.hash);
        // let lockedTime = leftTime * 1000 + 1;

        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms

        await global.chains[1].approach.instance.destDebtRedeem(xInfo.chain1DebtRevoke.x, {from: global.storemanGroups[2].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Debt -> srcDebtRevoke [revoke]  ==> success', async () => {
    try {
        // console.log("revoke hash", xInfo.chain1DebtRevoke.hash);
        let srcDebtRevokeReceipt = await global.chains[1].approach.instance.srcDebtRevoke(xInfo.chain1DebtRevoke.hash, {from: global.storemanGroups[1].account});

        // console.log("srcDebtRevokeReceipt", srcDebtRevokeReceipt.logs);
        assert.checkWeb3Event(srcDebtRevokeReceipt, {
            event: 'SrcDebtRevokeLogger',
            args: {
                xHash: xInfo.chain1DebtRevoke.hash,
                srcSmgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                destSmgID: web3.utils.padRight(global.storemanGroups[2].ID, 64),
            }
        });
        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.chain1DebtRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Debt -> destDebtRevoke  [revoke]  ==> success', async () => {
    try {
        // console.log("revoke hash", xInfo.chain1DebtRevoke.hash);
        let destDebtRevokeReceipt = await global.chains[2].approach.instance.destDebtRevoke(xInfo.chain1DebtRevoke.hash, {from: global.storemanGroups[2].account});

        // console.log("destDebtRevokeReceipt", destDebtRevokeReceipt.logs);
        assert.checkWeb3Event(destDebtRevokeReceipt, {
            event: 'DestDebtRevokeLogger',
            args: {
                xHash: xInfo.chain1DebtRevoke.hash,
                srcSmgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                destSmgID: web3.utils.padRight(global.storemanGroups[2].ID, 64),
            }
        });
        let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.chain1DebtRevoke.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Asset -> Original[1] -> Token1 -> userMintLock  ==> success', async () => {
    try {
        // global.accounts[7] is the chain1 original address of the user.
        // global.accounts[8] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[7];
        userLockParamsTemp.shadowUserAccount = global.accounts[8];
        userLockParamsTemp.xHash = xInfo.chain1DebtMintLock.hash;

        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(userLockParamsTemp.smgID, storemanGroupStatus.ready);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(userLockParamsTemp.smgID, storemanGroupStatus.ready);

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
            {from: userLockParamsTemp.origUserAccount, value: global.chains[1].approach.origLockFee}
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

it("Chain[1] -> Asset -> srcDebtLock  ==> There are asset_receivable or asset_payable in src storeman", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.chain1DebtRedeem.hash;

        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

        let srcDebtLockReceipt = await global.chains[1].approach.instance.srcDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "There are asset_receivable or asset_payable in src storeman");
    }
});

it('Asset -> Original[1] -> Token1 -> smgMintRedeem  ==> Redeem timeout', async () => {
    try {
        let lockedTime = 2 * htlcLockedTime * 1000 + 1;
        console.log("await", lockedTime, "ms");
        await sleep(lockedTime); // ms
        await global.chains[1].approach.instance.smgMintRedeem(xInfo.chain1DebtMintLock.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Redeem timeout");
    }
});

it('Asset -> Original[1] -> Token1 -> userMintRevoke  ==> success', async () => {
    try {
        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);

        let origUserAccount = global.accounts[7];
        let value = web3.utils.toWei(userLockParams.value.toString());
        let userMintRevokeReceipt = await global.chains[1].approach.instance.userMintRevoke(xInfo.chain1DebtMintLock.hash, {from: origUserAccount, value: global.chains[1].approach.origRevokeFee});
        await global.chains[1].token.tokenCreator.burnToken(global.chains[1].token.name, global.chains[1].token.symbol,
            origUserAccount, value);

        assert.checkWeb3Event(userMintRevokeReceipt, {
            event: 'UserMintRevokeLogger',
            args: {
                xHash: xInfo.chain1DebtMintLock.hash,
                smgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                tokenPairID:global.chains[1].token.tokenPairID,
                fee: global.chains[1].approach.origRevokeFee,
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getUserMintQuota(global.chains[1].token.tokenPairID, global.storemanGroups[1].ID);
        let difference = new BN(afterMintQuotaValue).sub(beforeMintQuotaValue).toString();
        assert.equal(value === difference, true);

        let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.chain1DebtMintLock.hash);
        assert.equal(leftTime.toNumber() === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

// ready for debt
it('Asset -> Original[2] -> Coin2 -> userFastMint  ==> success', async () => {
    try {
        // global.accounts[7] is the chain1 original address of the user.
        // global.accounts[8] is the chain2 shadow address of the user.
        let fastMintParamsTemp = Object.assign({}, userFastParams);
        fastMintParamsTemp.origUserAccount = global.accounts[7];
        fastMintParamsTemp.shadowUserAccount = global.accounts[8];
        fastMintParamsTemp.uniqueID = uniqueInfo.coin2DebtFastMint;
        fastMintParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        // console.log(fastMintParamsTemp);

        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(fastMintParamsTemp.smgID, storemanGroupStatus.ready);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(fastMintParamsTemp.smgID, storemanGroupStatus.ready);

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(fastMintParamsTemp.tokenPairID, fastMintParamsTemp.smgID);

        let value = web3.utils.toWei(fastMintParamsTemp.value.toString());
        let totalValue = new BN(value).add(new BN(global.chains[2].approach.origLockFee)).toString();

        // console.log("1 balance global.accounts[7]", await getBalance(fastMintParamsTemp.origUserAccount));
        // console.log("value global.accounts[7]", value);
        // user mint lock
        let userFastMintReceipt = await global.chains[2].approach.instance.userFastMint(
            fastMintParamsTemp.uniqueID,
            fastMintParamsTemp.smgID,
            fastMintParamsTemp.tokenPairID,
            value,
            fastMintParamsTemp.shadowUserAccount,
            {from: fastMintParamsTemp.origUserAccount, value: totalValue}
        );

        // console.log("2 balance global.accounts[7]", await getBalance(fastMintParamsTemp.origUserAccount));

        // console.log("userFastMint receipt", userFastMintReceipt.logs);
        assert.checkWeb3Event(userFastMintReceipt, {
            event: 'UserFastMintLogger',
            args: {
                uniqueID: fastMintParamsTemp.uniqueID,
                smgID: web3.utils.padRight(fastMintParamsTemp.smgID, 64),
                tokenPairID: fastMintParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[2].approach.origLockFee,
                userAccount: fastMintParamsTemp.shadowUserAccount.toLowerCase(),
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getUserMintQuota(fastMintParamsTemp.tokenPairID, fastMintParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Debt -> Shadow[1] -> Coin2 -> smgFastMint  ==> success', async () => {
    try {
        // global.accounts[7] is the chain1 original address of the user.
        // global.accounts[8] is the chain2 shadow address of the user.
        let fastMintParamsTemp = Object.assign({}, smgFastParams);
        fastMintParamsTemp.origUserAccount = global.accounts[7];
        fastMintParamsTemp.shadowUserAccount = global.accounts[8];
        fastMintParamsTemp.uniqueID = uniqueInfo.coin2DebtFastMint;
        fastMintParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        let beforeMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(fastMintParamsTemp.tokenPairID, fastMintParamsTemp.smgID);
        // console.log("beforeMintQuotaValue", beforeMintQuotaValue)

        let value = web3.utils.toWei(fastMintParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgFastMint, fastMintParamsTemp.uniqueID,
            fastMintParamsTemp.tokenPairID, value, fastMintParamsTemp.shadowUserAccount);

        // user fast mint
        let userFastMintReceipt = await global.chains[1].approach.instance.smgFastMint(
            fastMintParamsTemp.uniqueID,
            fastMintParamsTemp.smgID,
            fastMintParamsTemp.tokenPairID,
            value,
            fastMintParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        // console.log("smgFastMint receipt", userFastMintReceipt.logs);

        assert.checkWeb3Event(userFastMintReceipt, {
            event: 'SmgFastMintLogger',
            args: {
                uniqueID: fastMintParamsTemp.uniqueID,
                smgID: web3.utils.padRight(fastMintParamsTemp.smgID, 64),
                tokenPairID: fastMintParamsTemp.tokenPairID,
                value: value,
                userAccount: fastMintParamsTemp.shadowUserAccount,
            }
        });

        let afterMintQuotaValue = await global.chains[1].approach.parnters.quota.getSmgMintQuota(fastMintParamsTemp.tokenPairID, fastMintParamsTemp.smgID);
        // console.log("afterMintQuotaValue", afterMintQuotaValue)
        // console.log("value", value);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        // console.log("difference", difference);
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

// chain 1 debt clean
it("Chain[1] -> Asset -> srcDebtLock  ==> success", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.chain1DebtRedeem.hash;

        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

        let srcDebtLockReceipt = await global.chains[1].approach.instance.srcDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log(srcDebtLockReceipt.logs);
        assert.checkWeb3Event(srcDebtLockReceipt, {
            event: 'SrcDebtLockLogger',
            args: {
                xHash: debtLockParamsTemp.xHash,
                srcSmgID: web3.utils.padRight(debtLockParamsTemp.srcSmgID, 64),
                destSmgID: web3.utils.padRight(debtLockParamsTemp.destSmgID, 64),
            }
        });
    } catch (err) {
        assert.fail(err);
    }
});

it("Chain[1] -> Asset -> srcDebtLock  ==> Lock twice, Debt tx exists", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.chain1DebtRedeem.hash;

        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.srcSmgID, storemanGroupStatus.unregistered);

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

        let srcDebtLockReceipt = await global.chains[1].approach.instance.srcDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Debt tx exists");
    }
});

it("Chain[2] -> Debt -> destDebtLock  ==> success", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.chain1DebtRedeem.hash;

        // await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.ready);
        // await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(debtLockParamsTemp.destSmgID, storemanGroupStatus.ready);

        let pkId = 2;
        let sk = skInfo.smg2[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.destDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.srcSmgID);

        let srcDebtLockReceipt = await global.chains[2].approach.instance.destDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[2].account}
        );

        // console.log(srcDebtLockReceipt.logs);
        assert.checkWeb3Event(srcDebtLockReceipt, {
            event: 'DestDebtLockLogger',
            args: {
                xHash: debtLockParamsTemp.xHash,
                srcSmgID: web3.utils.padRight(debtLockParamsTemp.srcSmgID, 64),
                destSmgID: web3.utils.padRight(debtLockParamsTemp.destSmgID, 64),
            }
        });
    } catch (err) {
        assert.fail(err);
    }
});

it("Chain[2] -> Debt -> destDebtLock  ==> Lock twice, Debt tx exists", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.chain1DebtRedeem.hash;

        let pkId = 2;
        let sk = skInfo.smg2[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.destDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.srcSmgID);

        let srcDebtLockReceipt = await global.chains[2].approach.instance.destDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[2].account}
        );

        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Debt tx exists");
    }
});

it('Chain[2] -> Debt -> srcDebtRedeem  ==> success', async () => {
    try {

        let srcDebtRedeemReceipt = await global.chains[2].approach.instance.srcDebtRedeem(xInfo.chain1DebtRedeem.x, {from: global.storemanGroups[1].account});

        // console.log(srcDebtRedeemReceipt.logs);
        assert.checkWeb3Event(srcDebtRedeemReceipt, {
            event: 'SrcDebtRedeemLogger',
            args: {
                x: xInfo.chain1DebtRedeem.x,
                srcSmgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                destSmgID: web3.utils.padRight(global.storemanGroups[2].ID, 64),
            }
        });

        // let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.chain1DebtRedeem.hash);
        // assert.equal(Number(leftTime) === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Chain[2] -> Debt -> srcDebtRedeem  ==> Redeem twice, Status is not locked', async () => {
    try {
        let srcDebtRedeemReceipt = await global.chains[2].approach.instance.srcDebtRedeem(xInfo.chain1DebtRedeem.x, {from: global.storemanGroups[1].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Chain[2] -> Debt -> destDebtRevoke  ==> Revoke the redeemed Debt, Status is not locked', async () => {
    try {
        let destDebtRevokeReceipt = await global.chains[2].approach.instance.destDebtRevoke(xInfo.chain1DebtRedeem.hash, {from: global.storemanGroups[2].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Chain[1] -> Asset -> destDebtRedeem  ==> success', async () => {
    try {

        let destDebtRedeemReceipt = await global.chains[1].approach.instance.destDebtRedeem(xInfo.chain1DebtRedeem.x, {from: global.storemanGroups[2].account});

        // console.log(destDebtRedeemReceipt.logs);
        assert.checkWeb3Event(destDebtRedeemReceipt, {
            event: 'DestDebtRedeemLogger',
            args: {
                x: xInfo.chain1DebtRedeem.x,
                srcSmgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                destSmgID: web3.utils.padRight(global.storemanGroups[2].ID, 64),
            }
        });

        // let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.chain1DebtRedeem.hash);
        // assert.equal(Number(leftTime) === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Chain[1] -> Asset -> destDebtRedeem  ==> Redeem twice, Status is not locked', async () => {
    try {

        let destDebtRedeemReceipt = await global.chains[1].approach.instance.destDebtRedeem(xInfo.chain1DebtRedeem.x, {from: global.storemanGroups[2].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

it('Chain[1] -> Asset -> srcDebtRevoke  ==> Revoke the redeemed Debt, Status is not locked', async () => {
    try {
        let destDebtRedeemReceipt = await global.chains[1].approach.instance.destDebtRedeem(xInfo.chain1DebtRedeem.hash, {from: global.storemanGroups[2].account});
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Status is not locked");
    }
});

// chain 2 debt clean
it("Chain[2] -> Asset -> srcDebtLock  ==> success", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.chain2DebtRedeem.hash;

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.srcDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.destSmgID);

        let srcDebtLockReceipt = await global.chains[2].approach.instance.srcDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );

        // console.log(srcDebtLockReceipt.logs);
        assert.checkWeb3Event(srcDebtLockReceipt, {
            event: 'SrcDebtLockLogger',
            args: {
                xHash: debtLockParamsTemp.xHash,
                srcSmgID: web3.utils.padRight(debtLockParamsTemp.srcSmgID, 64),
                destSmgID: web3.utils.padRight(debtLockParamsTemp.destSmgID, 64),
            }
        });
    } catch (err) {
        assert.fail(err);
    }
});

it("Chain[1] -> Debt -> destDebtLock  ==> success", async () => {
    try {
        let debtLockParamsTemp = Object.assign({}, debtLockParams);
        debtLockParamsTemp.srcSmgID = global.storemanGroups[1].ID;
        debtLockParamsTemp.destSmgID = global.storemanGroups[2].ID;
        debtLockParamsTemp.xHash = xInfo.chain2DebtRedeem.hash;

        let pkId = 1;
        let sk = skInfo.smg2[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.destDebtLock, debtLockParamsTemp.xHash, debtLockParamsTemp.srcSmgID);

        let srcDebtLockReceipt = await global.chains[1].approach.instance.destDebtLock(
            debtLockParamsTemp.xHash,
            debtLockParamsTemp.srcSmgID,
            debtLockParamsTemp.destSmgID,
            R,
            s,
            {from: global.storemanGroups[2].account}
        );

        // console.log(srcDebtLockReceipt.logs);
        assert.checkWeb3Event(srcDebtLockReceipt, {
            event: 'DestDebtLockLogger',
            args: {
                xHash: debtLockParamsTemp.xHash,
                srcSmgID: web3.utils.padRight(debtLockParamsTemp.srcSmgID, 64),
                destSmgID: web3.utils.padRight(debtLockParamsTemp.destSmgID, 64),
            }
        });
    } catch (err) {
        assert.fail(err);
    }
});

it('Chain[1] -> Debt -> srcDebtRedeem  ==> success', async () => {
    try {

        let srcDebtRedeemReceipt = await global.chains[1].approach.instance.srcDebtRedeem(xInfo.chain2DebtRedeem.x, {from: global.storemanGroups[1].account});

        // console.log(destDebtRedeemReceipt.logs);
        assert.checkWeb3Event(srcDebtRedeemReceipt, {
            event: 'SrcDebtRedeemLogger',
            args: {
                x: xInfo.chain2DebtRedeem.x,
                srcSmgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                destSmgID: web3.utils.padRight(global.storemanGroups[2].ID, 64),
            }
        });

        // let leftTime = await global.chains[2].approach.instance.getLeftLockedTime(xInfo.chain2DebtRedeem.hash);
        // assert.equal(Number(leftTime) === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Chain[2] -> Asset -> destDebtRedeem  ==> success', async () => {
    try {

        let destDebtRedeemReceipt = await global.chains[2].approach.instance.destDebtRedeem(xInfo.chain2DebtRedeem.x, {from: global.storemanGroups[2].account});

        // console.log(destDebtRedeemReceipt.logs);
        assert.checkWeb3Event(destDebtRedeemReceipt, {
            event: 'DestDebtRedeemLogger',
            args: {
                x: xInfo.chain2DebtRedeem.x,
                srcSmgID: web3.utils.padRight(global.storemanGroups[1].ID, 64),
                destSmgID: web3.utils.padRight(global.storemanGroups[2].ID, 64),
            }
        });

        // let leftTime = await global.chains[1].approach.instance.getLeftLockedTime(xInfo.chain2DebtRedeem.hash);
        // assert.equal(Number(leftTime) === 0, true);
    } catch (err) {
        assert.fail(err);
    }
});

// chain1 BurnBridge
it('Debt -> Shadow[1] -> Coin2 -> userBurnLock  ==> success', async () => {
    try {
        // global.accounts[7] is the chain1 original address of the user.
        // global.accounts[8] is the chain2 shadow address of the user.
        let userLockParamsTemp = Object.assign({}, userLockParams);
        userLockParamsTemp.origUserAccount = global.accounts[7];
        userLockParamsTemp.shadowUserAccount = global.accounts[8];
        userLockParamsTemp.xHash = xInfo.chain2DebtBurnLock.hash;
        userLockParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;
        userLockParamsTemp.smgID = global.storemanGroups[2].ID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userLockParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(userLockParamsTemp.tokenPairID, userLockParamsTemp.smgID);
        // console.log("chain1 beforeBurnQuotaValue", beforeBurnQuotaValue);

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
            {from: userLockParamsTemp.shadowUserAccount, value: global.chains[1].approach.shadowLockFee}
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
        // console.log("chain1 getUserBurnQuota OK");
        // console.log("chain1 afterBurnQuotaValue", afterBurnQuotaValue);
        // console.log("chain1 value", value);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        // console.log("chain1 difference", difference);
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Debt -> Original[2] -> Coin2 -> smgBurnLock  ==> success', async () => {
    try {
        // global.accounts[7] is the chain1 original address of the user.
        // global.accounts[8] is the chain2 shadow address of the user.
        let smgLockParamsTemp = Object.assign({}, smgLockParams);
        smgLockParamsTemp.origUserAccount = global.accounts[7];
        smgLockParamsTemp.shadowUserAccount = global.accounts[8];
        smgLockParamsTemp.xHash = xInfo.chain2DebtBurnLock.hash;
        smgLockParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;
        smgLockParamsTemp.smgID = global.storemanGroups[2].ID;

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        // console.log("chain2 beforeBurnQuotaValue", beforeBurnQuotaValue);

        let value = web3.utils.toWei(smgLockParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg2[pkId];
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
            {from: global.storemanGroups[2].account}
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

        // console.log("chain2 check SmgBurnLockLogger OK");
        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(smgLockParamsTemp.tokenPairID, smgLockParamsTemp.smgID);
        // console.log("chain2 getSmgBurnQuota OK");
        // console.log("chain2 afterBurnQuotaValue", afterBurnQuotaValue);
        // console.log("chain2 value", value);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        // console.log("chain2 difference", difference);
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Debt -> Original[2] -> Coin2 -> userBurnRedeem  ==> success', async () => {
    try {
        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[2].ID);
        // console.log("chain2 beforeBurnQuotaValue", beforeBurnQuotaValue);

        let origUserAccount = global.accounts[7];
        let userBurnRedeemReceipt = await global.chains[2].approach.instance.userBurnRedeem(xInfo.chain2DebtBurnLock.x, {from: origUserAccount});
        // let balance2 = await getBalance(origUserAccount);

        assert.checkWeb3Event(userBurnRedeemReceipt, {
            event: 'UserBurnRedeemLogger',
            args: {
                x: xInfo.chain2DebtBurnLock.x,
                smgID: web3.utils.padRight(global.storemanGroups[2].ID, 64),
                tokenPairID: global.chains[2].coin.tokenPairID
            }
        });

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getSmgBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[2].ID);
        // console.log("chain2 afterBurnQuotaValue", afterBurnQuotaValue);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        // console.log("chain2 difference", difference);
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Debt -> Shadow[1] -> Coin2 -> smgBurnRedeem  ==> success', async () => {
    try {
        let beforeBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[2].ID);

        let smgBurnRedeemReceipt = await global.chains[1].approach.instance.smgBurnRedeem(xInfo.chain2DebtBurnLock.x, {from: global.storemanGroups[2].account});

        assert.checkWeb3Event(smgBurnRedeemReceipt, {
            event: 'SmgBurnRedeemLogger',
            args: {
                x: xInfo.chain2DebtBurnLock.x,
                smgID: web3.utils.padRight(global.storemanGroups[2].ID, 64),
                tokenPairID: global.chains[2].coin.tokenPairID,
                fee: global.chains[1].approach.shadowLockFee,
            }
        });

        let afterBurnQuotaValue = await global.chains[1].approach.parnters.quota.getUserBurnQuota(global.chains[2].coin.tokenPairID, global.storemanGroups[2].ID);
        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        assert.equal(new BN(0).toString() === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Debt Cleaned -> Cross Cleaned  ==> success', async () => {
    try {
        let chain1Smg1AssetQuotaValue = await global.chains[1].approach.parnters.quota.getAsset(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        let chain1Smg1DebtQuotaValue = await global.chains[1].approach.parnters.quota.getDebt(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        // console.log("chain1Smg1AssetQuotaValue", chain1Smg1AssetQuotaValue);
        // console.log("chain1Smg1DebtQuotaValue", chain1Smg1DebtQuotaValue);

        let chain2Smg1AssetQuotaValue = await global.chains[2].approach.parnters.quota.getAsset(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        let chain2Smg1DebtQuotaValue = await global.chains[2].approach.parnters.quota.getDebt(global.chains[2].coin.tokenPairID, global.storemanGroups[1].ID);
        // console.log("chain2Smg1AssetQuotaValue", chain2Smg1AssetQuotaValue);
        // console.log("chain2Smg1DebtQuotaValue", chain2Smg1DebtQuotaValue);

        let chain1Smg2AssetQuotaValue = await global.chains[1].approach.parnters.quota.getAsset(global.chains[2].coin.tokenPairID, global.storemanGroups[2].ID);
        let chain1Smg2DebtQuotaValue = await global.chains[1].approach.parnters.quota.getDebt(global.chains[2].coin.tokenPairID, global.storemanGroups[2].ID);
        // console.log("chain1Smg2AssetQuotaValue", chain1Smg2AssetQuotaValue);
        // console.log("chain1Smg2DebtQuotaValue", chain1Smg2DebtQuotaValue);

        let chain2Smg2AssetQuotaValue = await global.chains[2].approach.parnters.quota.getAsset(global.chains[2].coin.tokenPairID, global.storemanGroups[2].ID);
        let chain2Smg2DebtQuotaValue = await global.chains[2].approach.parnters.quota.getDebt(global.chains[2].coin.tokenPairID, global.storemanGroups[2].ID);
        // console.log("chain2Smg2AssetQuotaValue", chain2Smg2AssetQuotaValue);
        // console.log("chain2Smg2DebtQuotaValue", chain2Smg2DebtQuotaValue);

        assert.equal(chain1Smg1AssetQuotaValue.asset.eq(chain1Smg2AssetQuotaValue.asset), true);
        assert.equal(chain1Smg1AssetQuotaValue.asset_receivable.eq(chain1Smg2AssetQuotaValue.asset_receivable), true);
        assert.equal(chain1Smg1AssetQuotaValue.asset_payable.eq(chain1Smg2AssetQuotaValue.asset_payable), true);

        assert.equal(chain1Smg1DebtQuotaValue.debt.eq(chain1Smg2DebtQuotaValue.debt), true);
        assert.equal(chain1Smg1DebtQuotaValue.debt_receivable.eq(chain1Smg2DebtQuotaValue.debt_receivable), true);
        assert.equal(chain1Smg1DebtQuotaValue.debt_payable.eq(chain1Smg2DebtQuotaValue.debt_payable), true);

        assert.equal(chain2Smg1AssetQuotaValue.asset.eq(chain2Smg2AssetQuotaValue.asset), true);
        assert.equal(chain2Smg1AssetQuotaValue.asset_receivable.eq(chain2Smg2AssetQuotaValue.asset_receivable), true);
        assert.equal(chain2Smg1AssetQuotaValue.asset_payable.eq(chain2Smg2AssetQuotaValue.asset_payable), true);

        assert.equal(chain2Smg1DebtQuotaValue.debt.eq(chain2Smg2DebtQuotaValue.debt), true);
        assert.equal(chain2Smg1DebtQuotaValue.debt_receivable.eq(chain2Smg2DebtQuotaValue.debt_receivable), true);
        assert.equal(chain2Smg1DebtQuotaValue.debt_payable.eq(chain2Smg2DebtQuotaValue.debt_payable), true);
    } catch (err) {
        assert.fail(err);
    }
});
