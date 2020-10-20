const CrossProxy                = artifacts.require('CrossProxy.sol');

const {
    BN,
    ERROR_INFO,
    storemanGroupStatus,
    skInfo,
    uniqueInfo,
    InvalidTokenPairID,
    userFastParams,
    smgFastParams,
    typesArrayList,
    assert,
    testInit
}                               = require('./lib');

const {
    getRC20TokenInstance,
    buildMpcSign,
    getRC20TokenBalance,
}                               = require('../utils');

before("init...   -> success", () => {
    try {
        testInit();
    } catch(err) {
        assert.fail(err);
    }
});

it('Original[1] -> userFastMint  ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[1].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[3];
        userFastParamsTemp.shadowUserAccount = global.accounts[4];
        let userFastMintReceipt = await global.chains[1].approach.instance.userFastMint(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            web3.utils.toWei(userFastParamsTemp.value.toString()),
            userFastParamsTemp.shadowUserAccount,
            {from: userFastParamsTemp.origUserAccount}
        );
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it("Original[1] -> Token1 -> userFastMint  ==> Token does not exist", async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[3];
        userFastParamsTemp.shadowUserAccount = global.accounts[4];

        let value = web3.utils.toWei(userFastParamsTemp.value.toString());
        // user mint lock
        await global.chains[1].approach.instance.userFastMint(
            userFastParamsTemp.smgID,
            InvalidTokenPairID,
            value,
            userFastParamsTemp.shadowUserAccount,
            {from: userFastParamsTemp.origUserAccount, value: global.chains[1].approach.origLockFee}
        );
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Token does not exist");
    }
});

it("Original[1] -> Token1 -> userFastMint  ==> Value is null", async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[3];
        userFastParamsTemp.shadowUserAccount = global.accounts[4];

        let value = web3.utils.toWei("0");
        // user mint lock
        await global.chains[1].approach.instance.userFastMint(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            value,
            userFastParamsTemp.shadowUserAccount,
            {from: userFastParamsTemp.origUserAccount, value: global.chains[1].approach.origLockFee}
        );
        // assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Value is null");
    }
});

it('Shadow[2] -> Token1 -> smgFastMint  ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[2].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[3];
        smgFastParamsTemp.shadowUserAccount = global.accounts[4];
        smgFastParamsTemp.uniqueID = uniqueInfo.fastException;

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgFastMint, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.shadowUserAccount);

        // storeman mint lock
        let smgFastMintReceipt = await global.chains[2].approach.instance.smgFastMint(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        // console.log("smgFastMint receipt", smgFastMintReceipt.logs);
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Shadow[2] -> Token1 -> smgFastMint  ==> Not ready', async () => {
    let smgFastParamsTemp = Object.assign({}, smgFastParams);
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        smgFastParamsTemp.origUserAccount = global.accounts[3];
        smgFastParamsTemp.shadowUserAccount = global.accounts[4];
        smgFastParamsTemp.uniqueID = uniqueInfo.fastException;

        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(smgFastParamsTemp.smgID, storemanGroupStatus.unregistered);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(smgFastParamsTemp.smgID, storemanGroupStatus.unregistered);

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgFastMint, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.shadowUserAccount);

        // storeman mint lock
        let smgFastMintReceipt = await global.chains[2].approach.instance.smgFastMint(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        // console.log("smgFastMint receipt", smgFastMintReceipt.logs);
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    } finally {
        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(smgFastParamsTemp.smgID, storemanGroupStatus.ready);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(smgFastParamsTemp.smgID, storemanGroupStatus.ready);
    }
});

it('Original[1] -> Token1 -> userFastMint  ==>  success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[3];
        userFastParamsTemp.shadowUserAccount = global.accounts[4];
        userFastParamsTemp.tokenPairID = global.chains[1].token.tokenPairID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userFastParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        // let mintQuotaValue = await global.chains[1].approach.parnters.quota.getMintQuota(userFastParamsTemp.tokenPairID, userFastParamsTemp.smgID);
        // console.log("mintQuotaValue", mintQuotaValue);

        let value = web3.utils.toWei(userFastParamsTemp.value.toString());
        await global.chains[1].token.tokenCreator.mintToken(global.chains[1].token.name, global.chains[1].token.symbol,
            userFastParamsTemp.origUserAccount, value);
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[1].token.origTokenAccount);
        let balance = await tokenInstance.balanceOf(userFastParamsTemp.origUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[1].approach.instance.address, 0, {from: userFastParamsTemp.origUserAccount});
        await tokenInstance.approve(global.chains[1].approach.instance.address, value, {from: userFastParamsTemp.origUserAccount});
        let allowance = await tokenInstance.allowance(userFastParamsTemp.origUserAccount, global.chains[1].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
        // user Fast Mint
        let userFastMintReceipt = await global.chains[1].approach.instance.userFastMint(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            value,
            userFastParamsTemp.shadowUserAccount,
            {from: userFastParamsTemp.origUserAccount, value: global.chains[1].approach.origLockFee}
        );
        // console.log('userFastMintReceipt:', userFastMintReceipt);
        console.log('gasUsed', userFastMintReceipt.receipt.gasUsed, userFastMintReceipt.receipt.status);
        assert.checkWeb3Event(userFastMintReceipt, {
            event: 'UserFastMintLogger',
            args: {
                smgID: web3.utils.padRight(userFastParamsTemp.smgID, 64),
                tokenPairID: userFastParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[1].approach.origLockFee,
                userAccount: userFastParamsTemp.shadowUserAccount.toLowerCase(),
            }
        });
        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        // console.log("after origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));

    } catch (err) {
        assert.fail(err);
    }
});

// it('Original[1] -> Token1 -> userFastMint2  ==>  success', async () => {
//     try {
//         // global.accounts[3] is the chain1 original address of the user.
//         // global.accounts[4] is the chain2 shadow address of the user.
//         let userFastParamsTemp = Object.assign({}, userFastParams);
//         userFastParamsTemp.origUserAccount = global.accounts[3];
//         userFastParamsTemp.shadowUserAccount = global.accounts[4];
//         userFastParamsTemp.tokenPairID = global.chains[1].token.tokenPairID;

//         // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userFastParamsTemp.smgID);
//         // console.log("mintOracleValue", mintOracleValue);

//         // let mintQuotaValue = await global.chains[1].approach.parnters.quota.getMintQuota(userFastParamsTemp.tokenPairID, userFastParamsTemp.smgID);
//         // console.log("mintQuotaValue", mintQuotaValue);

//         let value = web3.utils.toWei(userFastParamsTemp.value.toString());
//         await global.chains[1].token.tokenCreator.mintToken(global.chains[1].token.name, global.chains[1].token.symbol,
//             userFastParamsTemp.origUserAccount, value);
//         // get token instance
//         let tokenInstance = await getRC20TokenInstance(global.chains[1].token.origTokenAccount);
//         let balance = await tokenInstance.balanceOf(userFastParamsTemp.origUserAccount);
//         // assert.equal(value, balance.toString());

//         // approve value
//         await tokenInstance.approve(global.chains[1].approach.instance.address, 0, {from: userFastParamsTemp.origUserAccount});
//         await tokenInstance.approve(global.chains[1].approach.instance.address, value, {from: userFastParamsTemp.origUserAccount});
//         let allowance = await tokenInstance.allowance(userFastParamsTemp.origUserAccount, global.chains[1].approach.instance.address);
//         // assert.equal(value, allowance.toString());

//         // console.log("before origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
//         // console.log("before crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
//         // user Fast Mint
//         let userFastMintReceipt = await global.chains[1].approach.instance.userFastMint(
//             userFastParamsTemp.smgID,
//             userFastParamsTemp.tokenPairID,
//             value,
//             userFastParamsTemp.shadowUserAccount,
//             {from: userFastParamsTemp.origUserAccount, value: global.chains[1].approach.origLockFee}
//         );
//         // console.log('userFastMintReceipt:', userFastMintReceipt);
//         console.log('gasUsed', userFastMintReceipt.receipt.gasUsed, userFastMintReceipt.receipt.status);
//         assert.checkWeb3Event(userFastMintReceipt, {
//             event: 'UserFastMintLogger',
//             args: {
//                 smgID: web3.utils.padRight(userFastParamsTemp.smgID, 64),
//                 tokenPairID: userFastParamsTemp.tokenPairID,
//                 value: value,
//                 fee: global.chains[1].approach.origLockFee,
//                 userAccount: userFastParamsTemp.shadowUserAccount.toLowerCase(),
//             }
//         });
//         // console.log("userMintLock receipt", userMintLockReceipt.logs);
//         // console.log("after origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
//         // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));

//     } catch (err) {
//         assert.fail(err);
//     }
// });

// it('Original[1] -> Token1 -> userFastMint3  ==>  success', async () => {
//     try {
//         // global.accounts[3] is the chain1 original address of the user.
//         // global.accounts[4] is the chain2 shadow address of the user.
//         let userFastParamsTemp = Object.assign({}, userFastParams);
//         userFastParamsTemp.origUserAccount = global.accounts[3];
//         userFastParamsTemp.shadowUserAccount = global.accounts[4];
//         userFastParamsTemp.tokenPairID = global.chains[1].token.tokenPairID;

//         // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userFastParamsTemp.smgID);
//         // console.log("mintOracleValue", mintOracleValue);

//         // let mintQuotaValue = await global.chains[1].approach.parnters.quota.getMintQuota(userFastParamsTemp.tokenPairID, userFastParamsTemp.smgID);
//         // console.log("mintQuotaValue", mintQuotaValue);

//         let value = web3.utils.toWei(userFastParamsTemp.value.toString());
//         await global.chains[1].token.tokenCreator.mintToken(global.chains[1].token.name, global.chains[1].token.symbol,
//             userFastParamsTemp.origUserAccount, value);
//         // get token instance
//         let tokenInstance = await getRC20TokenInstance(global.chains[1].token.origTokenAccount);
//         let balance = await tokenInstance.balanceOf(userFastParamsTemp.origUserAccount);
//         // assert.equal(value, balance.toString());

//         // approve value
//         await tokenInstance.approve(global.chains[1].approach.instance.address, 0, {from: userFastParamsTemp.origUserAccount});
//         await tokenInstance.approve(global.chains[1].approach.instance.address, value, {from: userFastParamsTemp.origUserAccount});
//         let allowance = await tokenInstance.allowance(userFastParamsTemp.origUserAccount, global.chains[1].approach.instance.address);
//         // assert.equal(value, allowance.toString());

//         // console.log("before origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
//         // console.log("before crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
//         // user Fast Mint
//         let userFastMintReceipt = await global.chains[1].approach.instance.userFastMint(
//             userFastParamsTemp.smgID,
//             userFastParamsTemp.tokenPairID,
//             value,
//             userFastParamsTemp.shadowUserAccount,
//             {from: userFastParamsTemp.origUserAccount, value: global.chains[1].approach.origLockFee}
//         );
//         // console.log('userFastMintReceipt:', userFastMintReceipt);
//         console.log('gasUsed', userFastMintReceipt.receipt.gasUsed, userFastMintReceipt.receipt.status);
//         assert.checkWeb3Event(userFastMintReceipt, {
//             event: 'UserFastMintLogger',
//             args: {
//                 smgID: web3.utils.padRight(userFastParamsTemp.smgID, 64),
//                 tokenPairID: userFastParamsTemp.tokenPairID,
//                 value: value,
//                 fee: global.chains[1].approach.origLockFee,
//                 userAccount: userFastParamsTemp.shadowUserAccount.toLowerCase(),
//             }
//         });
//         // console.log("userMintLock receipt", userMintLockReceipt.logs);
//         // console.log("after origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
//         // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));

//     } catch (err) {
//         assert.fail(err);
//     }
// });


it('Shadow[2] -> Token1 -> smgFastMint  ==>  success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[3];
        smgFastParamsTemp.shadowUserAccount = global.accounts[4];
        smgFastParamsTemp.tokenPairID = global.chains[1].token.tokenPairID;
        smgFastParamsTemp.uniqueID = uniqueInfo.token1FastMint;

        let beforeMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(smgFastParamsTemp.tokenPairID, smgFastParamsTemp.smgID);
        // console.log("Token1 -> before MintQuotaValue", beforeMintQuotaValue);

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgFastMint, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, web3.utils.toHex(value), smgFastParamsTemp.shadowUserAccount);

        let beforeValue = await getRC20TokenBalance(global.chains[1].token.shadowTokenAccount, smgFastParamsTemp.shadowUserAccount);
        // console.log("beforeValue", beforeValue);
        // smg fast mint
        let smgFastMintReceipt = await global.chains[2].approach.instance.smgFastMint(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        // console.log("smgFastMint receipt", smgFastMintReceipt.logs);
        let afterValue = await getRC20TokenBalance(global.chains[1].token.shadowTokenAccount, smgFastParamsTemp.shadowUserAccount);
        // console.log("afterValue", afterValue);
        assert.checkWeb3Event(smgFastMintReceipt, {
            event: 'SmgFastMintLogger',
            args: {
                uniqueID: smgFastParamsTemp.uniqueID,
                smgID: web3.utils.padRight(smgFastParamsTemp.smgID, 64),
                tokenPairID: smgFastParamsTemp.tokenPairID,
                value: value,
                userAccount: smgFastParamsTemp.shadowUserAccount
            }
        });

        let afterMintQuotaValue = await global.chains[2].approach.parnters.quota.getSmgMintQuota(smgFastParamsTemp.tokenPairID, smgFastParamsTemp.smgID);
        let difference = new BN(beforeMintQuotaValue).sub(afterMintQuotaValue).toString();
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Token1 -> smgFastMint  ==>  twice, Rapidity tx exists', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[3];
        smgFastParamsTemp.shadowUserAccount = global.accounts[4];
        smgFastParamsTemp.tokenPairID = global.chains[1].token.tokenPairID;
        smgFastParamsTemp.uniqueID = uniqueInfo.token1FastMint;

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgFastMint, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, web3.utils.toHex(value), smgFastParamsTemp.shadowUserAccount);

        // smg fast mint
        let smgFastMintReceipt = await global.chains[2].approach.instance.smgFastMint(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), 'Rapidity tx exists');
    }
});

it('Shadow[2] -> Token1 -> userFastBurn  ==>  success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[3];
        userFastParamsTemp.shadowUserAccount = global.accounts[4];
        userFastParamsTemp.tokenPairID = global.chains[1].token.tokenPairID;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userFastParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        let beforeBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(userFastParamsTemp.tokenPairID, userFastParamsTemp.smgID);
        // console.log("beforeBurnQuotaValue", beforeBurnQuotaValue.toString());

        let value = web3.utils.toWei(userFastParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[1].token.shadowTokenAccount);

        let balance = await tokenInstance.balanceOf(userFastParamsTemp.shadowUserAccount);

        // console.log("shadowUserAccount balance", balance.toString());
        // console.log("shadowUserAccount value", value);
        assert.equal(value, balance.toString(), "1");

        // approve value
        await tokenInstance.approve(global.chains[2].approach.instance.address, 0, {from: userFastParamsTemp.shadowUserAccount});

        await tokenInstance.approve(global.chains[2].approach.instance.address, value, {from: userFastParamsTemp.shadowUserAccount});

        let allowance = await tokenInstance.allowance(userFastParamsTemp.shadowUserAccount, global.chains[2].approach.instance.address);
        assert.equal(value, allowance.toString(), "2");

        let fees = await global.chains[2].approach.instance.getFees(global.chains[1].token.origChainID, global.chains[1].token.shadowChainID);

        // console.log("fees lockFee", fees.lockFee.toString());
        // console.log("act  lockFee", global.chains[2].approach.shadowLockFee);
        assert.equal(fees.lockFee.eq(new BN(global.chains[2].approach.shadowLockFee)), true);

        // console.log("userFastParamsTemp.origUserAccount", userFastParamsTemp.origUserAccount);
        // console.log("global.chains[2].approach.instance", global.chains[2].approach.instance.address);

        let beforeValue = await getRC20TokenBalance(global.chains[1].token.shadowTokenAccount, userFastParamsTemp.shadowUserAccount);

        // console.log("beforeValue", beforeValue);
        // user fast burn
        let userFastBurnReceipt = await global.chains[2].approach.instance.userFastBurn(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            web3.utils.toWei(userFastParamsTemp.value.toString()),
            userFastParamsTemp.origUserAccount,
            {from: userFastParamsTemp.shadowUserAccount, value: global.chains[2].approach.shadowLockFee}
        );

        // console.log("userFastBurn receipt", userFastBurnReceipt.logs);

        assert.checkWeb3Event(userFastBurnReceipt, {
            event: 'UserFastBurnLogger',
            args: {
                smgID: web3.utils.padRight(userFastParamsTemp.smgID, 64),
                tokenPairID: userFastParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[2].approach.shadowLockFee,
                userAccount: userFastParamsTemp.origUserAccount.toLowerCase(),
            }
        });

        // console.log("after shadowUserAccount", await web3.eth.getBalance(userFastParamsTemp.shadowUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
        let afterValue = await getRC20TokenBalance(global.chains[1].token.shadowTokenAccount, userFastParamsTemp.shadowUserAccount);
        // console.log("afterValue", afterValue);

        let afterBurnQuotaValue = await global.chains[2].approach.parnters.quota.getUserBurnQuota(userFastParamsTemp.tokenPairID, userFastParamsTemp.smgID);
        // console.log("afterBurnQuotaValue", afterBurnQuotaValue.toString());

        let difference = new BN(beforeBurnQuotaValue).sub(afterBurnQuotaValue).toString();
        // console.log("difference", difference);
        assert.equal(value === difference, true);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Token1 -> smgFastBurn  ==>  success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[3];
        smgFastParamsTemp.shadowUserAccount = global.accounts[4];
        smgFastParamsTemp.tokenPairID = global.chains[1].token.tokenPairID;
        smgFastParamsTemp.uniqueID = uniqueInfo.token1FastBurn;

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgFastBurn, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.origUserAccount);

        // smg fast burn
        let smgFastBurnReceipt = await global.chains[1].approach.instance.smgFastBurn(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        // console.log("smgFastBurn receipt", smgFastBurnReceipt.logs);
        assert.checkWeb3Event(smgFastBurnReceipt, {
            event: 'SmgFastBurnLogger',
            args: {
                uniqueID: smgFastParamsTemp.uniqueID,
                smgID: web3.utils.padRight(smgFastParamsTemp.smgID, 64),
                tokenPairID: smgFastParamsTemp.tokenPairID,
                value: value,
                userAccount: smgFastParamsTemp.origUserAccount
            }
        });
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Token1 -> smgFastBurn  ==>  twice, Rapidity tx exists', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[3];
        smgFastParamsTemp.shadowUserAccount = global.accounts[4];
        smgFastParamsTemp.tokenPairID = global.chains[1].token.tokenPairID;
        smgFastParamsTemp.uniqueID = uniqueInfo.token1FastBurn;

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgFastBurn, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.origUserAccount);

        // smg fast burn
        let smgFastBurnReceipt = await global.chains[1].approach.instance.smgFastBurn(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), 'Rapidity tx exists');
    }
});

it('Shadow[2] -> userFastBurn  ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[2].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[3];
        userFastParamsTemp.shadowUserAccount = global.accounts[4];

        await global.chains[2].approach.instance.userFastBurn(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            web3.utils.toWei(userFastParamsTemp.value.toString()),
            userFastParamsTemp.origUserAccount,
            {from: userFastParamsTemp.shadowUserAccount}
        );
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it("Shadow[2] -> Token1 -> userFastBurn  ==> Value is null", async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[3];
        userFastParamsTemp.shadowUserAccount = global.accounts[4];

        let value = web3.utils.toWei("0");
        // user mint lock
        await global.chains[2].approach.instance.userFastBurn(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            value,
            userFastParamsTemp.origUserAccount,
            {from: userFastParamsTemp.shadowUserAccount, value: global.chains[2].approach.shadowLockFee}
        );
        // assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Value is null");
    }
});

it("Shadow[2] -> Token1 -> userFastBurn  ==> Token does not exist", async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[3];
        userFastParamsTemp.shadowUserAccount = global.accounts[4];

        let value = web3.utils.toWei(userFastParamsTemp.value.toString());
        // user mint lock
        await global.chains[2].approach.instance.userFastBurn(
            userFastParamsTemp.smgID,
            InvalidTokenPairID,
            web3.utils.toWei(userFastParamsTemp.value.toString()),
            userFastParamsTemp.origUserAccount,
            {from: userFastParamsTemp.shadowUserAccount, value: global.chains[2].approach.shadowLockFee}
        );
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Token does not exist");
    }
});

it('Original[1] -> Token1 -> smgFastBurn  ==> Halted', async () => {
    let crossProxy;
    try {
        crossProxy = await CrossProxy.at(global.chains[2].approach.instance.address);
        await crossProxy.setHalt(true, {from: global.owner});
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[3];
        smgFastParamsTemp.shadowUserAccount = global.accounts[4];
        smgFastParamsTemp.uniqueID = uniqueInfo.fastException;

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgFastBurn, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.shadowUserAccount);

        // storeman mint lock
        let smgFastBurnReceipt = await global.chains[2].approach.instance.smgFastBurn(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        // console.log("smgFastBurn receipt", smgFastBurnReceipt.logs);
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "Smart contract is halted");
    } finally {
        await crossProxy.setHalt(false, {from: global.owner});
    }
});

it('Shadow[2] -> smgFastBurn  ==> Not ready', async () => {
    let smgFastParamsTemp = Object.assign({}, smgFastParams);
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        smgFastParamsTemp.origUserAccount = global.accounts[3];
        smgFastParamsTemp.shadowUserAccount = global.accounts[4];
        smgFastParamsTemp.uniqueID = uniqueInfo.fastException;

        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(smgFastParamsTemp.smgID, storemanGroupStatus.unregistered);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(smgFastParamsTemp.smgID, storemanGroupStatus.unregistered);


        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgFastBurn, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.shadowUserAccount);

        // storeman mint lock
        let smgFastBurnReceipt = await global.chains[2].approach.instance.smgFastBurn(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account}
        );
        assert.fail(ERROR_INFO);
    } catch (err) {
        assert.include(err.toString(), "PK is not ready");
    } finally {
        await global.chains[1].approach.parnters.smgAdminProxy.setStoremanGroupStatus(smgFastParamsTemp.smgID, storemanGroupStatus.ready);
        await global.chains[2].approach.parnters.smgAdminProxy.setStoremanGroupStatus(smgFastParamsTemp.smgID, storemanGroupStatus.ready);
    }
});

it('Original[1] -> Coin1 -> userFastMint  ==>  success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[5];
        userFastParamsTemp.shadowUserAccount = global.accounts[6];
        userFastParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userFastParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        // let mintQuotaValue = await global.chains[1].approach.parnters.quota.getMintQuota(userFastParamsTemp.tokenPairID, userFastParamsTemp.smgID);
        // console.log("mintQuotaValue", mintQuotaValue);

        let value = web3.utils.toWei(userFastParamsTemp.value.toString());
        // console.log("lock", value);
        let totalValue = new BN(value).add(new BN(global.chains[1].approach.origLockFee)).toString();
        // console.log("lockFee", global.chains[1].approach.origLockFee);
        // console.log("totalLock", totalValue);

        // user mint lock
        let userMintLockReceipt = await global.chains[1].approach.instance.userFastMint(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            value,
            userFastParamsTemp.shadowUserAccount,
            {from: userFastParamsTemp.origUserAccount, value: totalValue});
        assert.checkWeb3Event(userMintLockReceipt, {
            event: 'UserFastMintLogger',
            args: {
                smgID: web3.utils.padRight(userFastParamsTemp.smgID, 64),
                tokenPairID: userFastParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[1].approach.origLockFee,
                userAccount: userFastParamsTemp.shadowUserAccount.toLowerCase(),
            }
        });
        // console.log("userMintLock receipt", userMintLockReceipt.logs);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Coin1 -> smgFastMint  ==>  success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[5];
        smgFastParamsTemp.shadowUserAccount = global.accounts[6];
        smgFastParamsTemp.uniqueID = uniqueInfo.coin1FastMint;
        smgFastParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgFastMint, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.shadowUserAccount);

        // user mint lock
        let smgFastMintReceipt = await global.chains[2].approach.instance.smgFastMint(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account});
        // console.log("smgFastMint receipt", smgFastMintReceipt.logs);
        assert.checkWeb3Event(smgFastMintReceipt, {
            event: 'SmgFastMintLogger',
            args: {
                uniqueID: smgFastParamsTemp.uniqueID,
                smgID: web3.utils.padRight(smgFastParamsTemp.smgID, 64),
                tokenPairID: smgFastParamsTemp.tokenPairID,
                value: value,
                userAccount: smgFastParamsTemp.shadowUserAccount
            }
        });
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[2] -> Coin1 -> userFastBurn  ==>  success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[5];
        userFastParamsTemp.shadowUserAccount = global.accounts[6];
        userFastParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userFastParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        // let mintQuotaValue = await global.chains[2].approach.parnters.quota.getBurnQuota(userFastParamsTemp.tokenPairID, userFastParamsTemp.smgID);
        // console.log("mintQuotaValue", mintQuotaValue);

        let value = web3.utils.toWei(userFastParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[1].coin.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(userFastParamsTemp.shadowUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[2].approach.instance.address, 0, {from: userFastParamsTemp.shadowUserAccount});
        await tokenInstance.approve(global.chains[2].approach.instance.address, value, {from: userFastParamsTemp.shadowUserAccount});
        let allowance = await tokenInstance.allowance(userFastParamsTemp.shadowUserAccount, global.chains[2].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before shadowUserAccount", await web3.eth.getBalance(userFastParamsTemp.shadowUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));
        // user mint lock
        let userFastBurnReceipt = await global.chains[2].approach.instance.userFastBurn(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            web3.utils.toWei(userFastParamsTemp.value.toString()),
            userFastParamsTemp.origUserAccount,
            {from: userFastParamsTemp.shadowUserAccount, value: global.chains[2].approach.shadowLockFee});
        // console.log("userFastBurn receipt", userFastBurnReceipt.logs);
        assert.checkWeb3Event(userFastBurnReceipt, {
            event: 'UserFastBurnLogger',
            args: {
                smgID: web3.utils.padRight(userFastParamsTemp.smgID, 64),
                tokenPairID: userFastParamsTemp.tokenPairID,
                value: value,
                fee: global.chains[2].approach.shadowLockFee,
                userAccount: userFastParamsTemp.origUserAccount.toLowerCase(),
            }
        });
        // console.log("after shadowUserAccount", await web3.eth.getBalance(userFastParamsTemp.shadowUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[1] -> Coin1 -> smgFastBurn  ==>  success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[5];
        smgFastParamsTemp.shadowUserAccount = global.accounts[6];
        smgFastParamsTemp.uniqueID = uniqueInfo.coin1FastBurn;
        smgFastParamsTemp.tokenPairID = global.chains[1].coin.tokenPairID;

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgFastBurn, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.origUserAccount);

        // user mint lock
        let smgFastBurnReceipt = await global.chains[1].approach.instance.smgFastBurn(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account});
        // console.log("smgFastBurn receipt", smgFastBurnReceipt.logs);
        assert.checkWeb3Event(smgFastBurnReceipt, {
            event: 'SmgFastBurnLogger',
            args: {
                uniqueID: smgFastParamsTemp.uniqueID,
                smgID: web3.utils.padRight(smgFastParamsTemp.smgID, 64),
                tokenPairID: smgFastParamsTemp.tokenPairID,
                value: value,
                userAccount: smgFastParamsTemp.origUserAccount
            }
        });
    } catch (err) {
        assert.fail(err);
    }
});



//------give more fee------
it('Original[2] -> Token2 -> userFastMint  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[3];
        userFastParamsTemp.shadowUserAccount = global.accounts[4];
        userFastParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userFastParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        // let mintQuotaValue = await global.chains[2].approach.parnters.quota.getMintQuota(userFastParamsTemp.tokenPairID, userFastParamsTemp.smgID);
        // console.log("mintQuotaValue", mintQuotaValue);

        let value = web3.utils.toWei(userFastParamsTemp.value.toString());
        await global.chains[2].token.tokenCreator.mintToken(global.chains[2].token.name, global.chains[2].token.symbol,
            userFastParamsTemp.origUserAccount, value);
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[2].token.origTokenAccount);
        let balance = await tokenInstance.balanceOf(userFastParamsTemp.origUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[2].approach.instance.address, 0, {from: userFastParamsTemp.origUserAccount});
        await tokenInstance.approve(global.chains[2].approach.instance.address, value, {from: userFastParamsTemp.origUserAccount});
        let allowance = await tokenInstance.allowance(userFastParamsTemp.origUserAccount, global.chains[2].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));
        // user mint lock
        let userMintLockReceipt = await global.chains[2].approach.instance.userFastMint(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            value,
            userFastParamsTemp.shadowUserAccount,
            {from: userFastParamsTemp.origUserAccount, value: global.chains[2].approach.origLockFee*2}
        );
        // assert.checkWeb3Event(userMintLockReceipt, {
        //     event: 'UserMintLockLogger',
        //     args: {
        //         smgID: userFastParamsTemp.smgID,
        //         tokenPairID: userFastParamsTemp.tokenPairID,
        //         value: userFastParamsTemp.value,
        //         fee: global.chains[2].approach.origLockFee,
        //         userAccount: userFastParamsTemp.shadowUserAccount,
        //     }
        // });
        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        // console.log("after origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Token2 -> smgFastMint  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[3];
        smgFastParamsTemp.shadowUserAccount = global.accounts[4];
        smgFastParamsTemp.uniqueID = uniqueInfo.token2FastMint;
        smgFastParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgFastBurn, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.shadowUserAccount);

        // user mint lock
        let smgFastMintReceipt = await global.chains[1].approach.instance.smgFastMint(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account});
        // console.log("smgFastMint receipt", smgFastMintReceipt.logs);
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Token2 -> userFastBurn  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[3];
        userFastParamsTemp.shadowUserAccount = global.accounts[4];
        userFastParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userFastParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        // let mintQuotaValue = await global.chains[1].approach.parnters.quota.getBurnQuota(userFastParamsTemp.tokenPairID, userFastParamsTemp.smgID);
        // console.log("mintQuotaValue", mintQuotaValue);

        let value = web3.utils.toWei(userFastParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[2].token.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(userFastParamsTemp.shadowUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[1].approach.instance.address, 0, {from: userFastParamsTemp.shadowUserAccount});
        await tokenInstance.approve(global.chains[1].approach.instance.address, value, {from: userFastParamsTemp.shadowUserAccount});
        let allowance = await tokenInstance.allowance(userFastParamsTemp.shadowUserAccount, global.chains[1].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
        // user mint lock
        let userMintLockReceipt = await global.chains[1].approach.instance.userFastBurn(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            web3.utils.toWei(userFastParamsTemp.value.toString()),
            userFastParamsTemp.origUserAccount,
            {from: userFastParamsTemp.shadowUserAccount, value: global.chains[1].approach.shadowLockFee*2}
        );
        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        // console.log("after origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Token2 -> smgFastBurn  ==> success', async () => {
    try {
        // global.accounts[3] is the chain1 original address of the user.
        // global.accounts[4] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[3];
        smgFastParamsTemp.shadowUserAccount = global.accounts[4];
        smgFastParamsTemp.uniqueID = uniqueInfo.token2FastBurn;
        smgFastParamsTemp.tokenPairID = global.chains[2].token.tokenPairID;

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgFastBurn, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.origUserAccount);

        // user burn
        let smgFastBurnReceipt = await global.chains[2].approach.instance.smgFastBurn(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account});
        // console.log("smgFastBurn receipt", smgFastBurnReceipt.logs);
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Coin2 -> userFastMint  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[5];
        userFastParamsTemp.shadowUserAccount = global.accounts[6];
        userFastParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        // let mintOracleValue = await global.chains[2].approach.parnters.oracle.getDeposit(userFastParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        // let mintQuotaValue = await global.chains[2].approach.parnters.quota.getMintQuota(userFastParamsTemp.tokenPairID, userFastParamsTemp.smgID);
        // console.log("mintQuotaValue", mintQuotaValue);

        let value = web3.utils.toWei(userFastParamsTemp.value.toString());
        let totalValue = new BN(value).add(new BN(global.chains[2].approach.origLockFee*2)).toString();

        // user mint lock
        let userMintLockReceipt = await global.chains[2].approach.instance.userFastMint(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            value,
            userFastParamsTemp.shadowUserAccount,
            {from: userFastParamsTemp.origUserAccount, value: totalValue});
        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        // console.log("after origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[2].approach.instance.address));
    } catch (err) {
        assert.fail(err);
    }
});

it('Shadow[1] -> Coin2 -> smgFastMint  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[5];
        smgFastParamsTemp.shadowUserAccount = global.accounts[6];
        smgFastParamsTemp.uniqueID = uniqueInfo.coin2FastMint;
        smgFastParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 1;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve1, sk, typesArrayList.smgFastMint, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.shadowUserAccount);

        // user mint lock
        let smgFastMintReceipt = await global.chains[1].approach.instance.smgFastMint(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.shadowUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account});
        // console.log("smgFastMint receipt", smgFastMintReceipt.logs);
    } catch (err) {
        assert.fail(err);
    }
});


it('Shadow[1] -> Coin2 -> userFastBurn  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let userFastParamsTemp = Object.assign({}, userFastParams);
        userFastParamsTemp.origUserAccount = global.accounts[5];
        userFastParamsTemp.shadowUserAccount = global.accounts[6];
        userFastParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        // let mintOracleValue = await global.chains[1].approach.parnters.oracle.getDeposit(userFastParamsTemp.smgID);
        // console.log("mintOracleValue", mintOracleValue);

        // let mintQuotaValue = await global.chains[1].approach.parnters.quota.getBurnQuota(userFastParamsTemp.tokenPairID, userFastParamsTemp.smgID);
        // console.log("mintQuotaValue", mintQuotaValue);

        let value = web3.utils.toWei(userFastParamsTemp.value.toString());
        // get token instance
        let tokenInstance = await getRC20TokenInstance(global.chains[2].coin.shadowTokenAccount);
        let balance = await tokenInstance.balanceOf(userFastParamsTemp.shadowUserAccount);
        assert.equal(value, balance.toString());

        // approve value
        await tokenInstance.approve(global.chains[1].approach.instance.address, 0, {from: userFastParamsTemp.shadowUserAccount});
        await tokenInstance.approve(global.chains[1].approach.instance.address, value, {from: userFastParamsTemp.shadowUserAccount});
        let allowance = await tokenInstance.allowance(userFastParamsTemp.shadowUserAccount, global.chains[1].approach.instance.address);
        assert.equal(value, allowance.toString());

        // console.log("before origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
        // console.log("before crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
        // user mint lock
        let userMintLockReceipt = await global.chains[1].approach.instance.userFastBurn(
            userFastParamsTemp.smgID,
            userFastParamsTemp.tokenPairID,
            web3.utils.toWei(userFastParamsTemp.value.toString()),
            userFastParamsTemp.origUserAccount,
            {from: userFastParamsTemp.shadowUserAccount, value: global.chains[1].approach.shadowLockFee*2}
        );
        // console.log("userMintLock receipt", userMintLockReceipt.logs);
        // console.log("after origUserAccount", await web3.eth.getBalance(userFastParamsTemp.origUserAccount));
        // console.log("after crossApproach", await web3.eth.getBalance(global.chains[1].approach.instance.address));
    } catch (err) {
        assert.fail(err);
    }
});

it('Original[2] -> Coin2 -> smgFastBurn  ==> success', async () => {
    try {
        // global.accounts[5] is the chain1 original address of the user.
        // global.accounts[6] is the chain2 shadow address of the user.
        let smgFastParamsTemp = Object.assign({}, smgFastParams);
        smgFastParamsTemp.origUserAccount = global.accounts[5];
        smgFastParamsTemp.shadowUserAccount = global.accounts[6];
        smgFastParamsTemp.uniqueID = uniqueInfo.coin2FastBurn;
        smgFastParamsTemp.tokenPairID = global.chains[2].coin.tokenPairID;

        let value = web3.utils.toWei(smgFastParamsTemp.value.toString());

        let pkId = 2;
        let sk = skInfo.smg1[pkId];
        let {R, s} = buildMpcSign(global.schnorr.curve2, sk, typesArrayList.smgFastBurn, smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.tokenPairID, value, smgFastParamsTemp.origUserAccount);

        // console.log("pk1:", global.storemanGroups[1].gpk1);
        // console.log("pk2:", global.storemanGroups[1].gpk2);
        // user mint lock
        let smgFastBurnReceipt = await global.chains[2].approach.instance.smgFastBurn(
            smgFastParamsTemp.uniqueID,
            smgFastParamsTemp.smgID,
            smgFastParamsTemp.tokenPairID,
            value,
            smgFastParamsTemp.origUserAccount,
            R,
            s,
            {from: global.storemanGroups[1].account});
            // console.log("smgFastBurn receipt", smgFastBurnReceipt);
            // console.log("smgFastBurn receipt logs", smgFastBurnReceipt.logs);
        } catch (err) {
        assert.fail(err);
    }
});

after("finish...   -> success", async function () {
    let origUserAccount = global.accounts[3];
    let value = web3.utils.toWei(userFastParams.value.toString());
    await global.chains[1].token.tokenCreator.burnToken(global.chains[1].token.name, global.chains[1].token.symbol,
        origUserAccount, value);
    await global.chains[2].token.tokenCreator.burnToken(global.chains[2].token.name, global.chains[2].token.symbol,
        origUserAccount, value);
});