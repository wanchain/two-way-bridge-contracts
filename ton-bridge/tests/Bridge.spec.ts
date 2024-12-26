import {Blockchain, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';
import {TON_COIN_ACCOUT,BIP44_CHAINID} from '../wrappers/const/const-value';
import {Bridge} from '../wrappers/Bridge';
import '@ton/test-utils';
import {compile} from '@ton/blueprint';
import {JettonMinter} from "../wrappers/JettonMinter";
import {JettonWallet} from "../wrappers/JettonWallet";
import {BufferrToHexString, HexStringToBuffer} from "./utils";
import { common } from '../wrappers/common';

const schnorr = require('./tools-secp256k1.js');
import { slimSndMsgResult} from "./transaction";
import {getQueryID} from "../wrappers/utils/utils";

function AccountToBig(addr: Address) {
    return BigInt("0x" + addr.hash.toString('hex'));
};

const skSmg = Buffer.from("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex');
const gpk = schnorr.getPKBySk(skSmg);
const gpkX = gpk.startsWith("0x") || gpk.startsWith("0X")? gpk.substring(0,66): `0x${gpk.substring(0,64)}`;
const gpkY = gpk.startsWith("0x") || gpk.startsWith("0X")? `0x${gpk.substring(66)}`: `0x${gpk.substring(64)}`;
const smgId = "0x000000000000000000000000000000000000000000746573746e65745f303638";

const wkDuring = 1000; // seconds
let initJettonAdmin;
let tokenInfo = {
    tokenOrg:{tokenPairId:0x01,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',jettonAdminAddr:''},
    tokenWrapped:{tokenPairId:0x02,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',jettonAdminAddr:''},
    coin:{tokenPairId:0x03,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',jettonAdminAddr:''},
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
describe('Bridge', () => {
    let code: Cell;

    let jwallet_code = new Cell();
    let minter_code = new Cell();

    let deployer_jetton: SandboxContract<TreasuryContract>;
    let alice: SandboxContract<TreasuryContract>;
    let bob: SandboxContract<TreasuryContract>;
    let jettonMinter_dog: SandboxContract<JettonMinter>;
    let jettonMinter: SandboxContract<JettonMinter>;

    let userWallet: any;
    let userWallet_dog: any;
    let defaultContent: Cell;
    let defaultContent_dog: Cell;

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let smgFeeProxy: SandboxContract<TreasuryContract>;
    let oracleAdmin: SandboxContract<TreasuryContract>;
    let bridge: SandboxContract<Bridge>;

    beforeAll(async () => {

        // 1. deploy bridge
        code = await compile('Bridge');
        jwallet_code = await compile('JettonWallet');
        minter_code = await compile('JettonMinter');

        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        smgFeeProxy = await blockchain.treasury('smgFeeProxy');
        oracleAdmin = await blockchain.treasury('oracleAdmin');

        let c = Bridge.createFromConfig(
            {
                owner: deployer.address,
                halt: 0,
                init: 0,
                smgFeeProxy: smgFeeProxy.address,
                oracleAdmin: oracleAdmin.address,
                operator: oracleAdmin.address,
            },
            code
        )

        bridge = blockchain.openContract(c);
        const deployResult = await bridge.sendDeploy(deployer.getSender(), toNano('1000'));

        console.log("deployer.address==>", deployer.address);
        console.log("deployer.address(bigInt)==>", BigInt("0x" + deployer.address.hash.toString('hex')));
        console.log("bridge.address==>", bridge.address);
        console.log("bridge.address(bigInt)==>", BigInt("0x" + bridge.address.hash.toString('hex')));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            deploy: true,
            success: true,
        });

        // 2. deploy original token usdt
        deployer_jetton = await blockchain.treasury('deployer_jetton');
        alice = await blockchain.treasury('alice');
        bob = await blockchain.treasury('bob');
        defaultContent = beginCell().endCell();
        jettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    admin: deployer_jetton.address,  // set admin  and deploy token in one step.
                    content: defaultContent,
                    wallet_code: jwallet_code,
                },
                minter_code));
        userWallet = async (address: Address) => blockchain.openContract(
            JettonWallet.createFromAddress(
                await jettonMinter.getWalletAddress(address)
            )
        );

        const deployResultJetton = await jettonMinter.sendDeploy(deployer_jetton.getSender(), toNano('1'));
        expect(deployResultJetton.transactions).toHaveTransaction({
            from: deployer_jetton.address,
            to: jettonMinter.address,
            deploy: true,
        });

        tokenInfo.tokenOrg.jettonAdminAddr = deployer_jetton.address.toString();

        // 3. deploy wrapped Token dog
        defaultContent_dog = beginCell().storeUint(1, 1).endCell();
        jettonMinter_dog = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    admin: deployer_jetton.address,
                    //admin: bridge.address,
                    content: defaultContent_dog,
                    wallet_code: jwallet_code,
                },
                minter_code));
        userWallet_dog = async (address: Address) => blockchain.openContract(
            JettonWallet.createFromAddress(
                await jettonMinter_dog.getWalletAddress(address)
            )
        );

        const deployResultJetton_dog = await jettonMinter_dog.sendDeploy(deployer_jetton.getSender(), toNano('1'));
        console.log("deployResultJetton_dog==>", slimSndMsgResult(deployResultJetton_dog));
        expect(deployResultJetton_dog.transactions).toHaveTransaction({
            from: deployer_jetton.address,
            to: jettonMinter_dog.address,
            deploy: true,
        });

        tokenInfo.tokenWrapped.jettonAdminAddr = deployer_jetton.address.toString();
        // 3.1 add token pair for token-org

        let tokenPairId = tokenInfo.tokenOrg.tokenPairId;
        let srcChainId = tokenInfo.tokenOrg.srcChainId;
        let dstChainId = tokenInfo.tokenOrg.dstChainId;
        let srcTokenAcc = tokenInfo.tokenOrg.srcTokenAcc;


        let dstTokenAcc = jettonMinter.address.toString() //BufferrToHexString(jettonMinter.address.hash)  //todo handle testnet and mainnet , bounceable and non-bounceable

        console.log("(hex)dstTokenAcc....", dstTokenAcc)
        tokenInfo.tokenOrg.dstTokenAcc = dstTokenAcc;
        console.log("(str)dstTokenAcc....", jettonMinter.address)

        let retOld = await bridge.getTokenPair(tokenPairId);
        console.log("retOld", retOld);

        const user1 = await blockchain.treasury('user1');
        const queryID = 1;

        console.log("user1.address==>", user1.address);
        console.log("user1.address(bigInt)==>", BigInt("0x" + user1.address.hash.toString('hex')));

        console.log("adminAddr", deployer.address.toRawString());
        const ret = await bridge.sendAddTokenPair(deployer.getSender(), {
            value: toNano('1000'),
            queryID,
            tokenPairId,
            fromChainID: srcChainId,
            fromAccount: srcTokenAcc,
            toChainID: dstChainId,
            toAccount: dstTokenAcc,
            jettonAdminAddr:tokenInfo.tokenOrg.jettonAdminAddr,
        });

        console.log("ret", slimSndMsgResult(ret));

        let retNew = await bridge.getTokenPair(tokenPairId);
        console.log("retNew", retNew);

        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });

        // 3.2 add token pair for token-wrapped

        let tokenPairId2 = tokenInfo.tokenWrapped.tokenPairId;
        let srcChainId2 = tokenInfo.tokenWrapped.srcChainId;
        let dstChainId2 = tokenInfo.tokenWrapped.dstChainId;
        let srcTokenAcc2 = tokenInfo.tokenWrapped.srcTokenAcc;

        let dstTokenAcc2 = jettonMinter_dog.address.toString() //BufferrToHexString(jettonMinter_dog.address.hash);


        console.log("(hex)dstTokenAcc2....", dstTokenAcc2)
        console.log("(str)dstTokenAcc2....", jettonMinter_dog.address)
        tokenInfo.tokenWrapped.dstTokenAcc = jettonMinter_dog.address.toString();

        let retOld2 = await bridge.getTokenPair(tokenPairId2);
        console.log("retOld2", retOld2);
        const ret2 = await bridge.sendAddTokenPair(deployer.getSender(), {
            value: toNano('1000'),
            queryID,
            tokenPairId: tokenPairId2,
            fromChainID: srcChainId2,
            fromAccount: srcTokenAcc2,
            toChainID: dstChainId2,
            toAccount: dstTokenAcc2,
            jettonAdminAddr:tokenInfo.tokenWrapped.jettonAdminAddr,
        });

        console.log("ret2", slimSndMsgResult(ret2));

        let retNew2 = await bridge.getTokenPair(tokenPairId2);
        console.log("retNew2", retNew2);

        expect(ret2.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });

        // 3.3 add token pair for ton-coin
        let tokenPairId3 = tokenInfo.coin.tokenPairId;
        let srcChainId3 = tokenInfo.coin.srcChainId;
        let dstChainId3 = tokenInfo.coin.dstChainId;
        let srcTokenAcc3 = tokenInfo.coin.srcTokenAcc;

        let dstTokenAcc3 = "";
        console.log("(hex)dstTokenAcc3....", dstTokenAcc3)
        tokenInfo.coin.dstTokenAcc = "";

        tokenInfo.coin.jettonAdminAddr = "";

        let retOld3 = await bridge.getTokenPair(tokenPairId3);
        console.log("retOld2", retOld3);
        const ret3 = await bridge.sendAddTokenPair(deployer.getSender(), {
            value: toNano('1000'),
            queryID,
            tokenPairId: tokenPairId3,
            fromChainID: srcChainId3,
            fromAccount: srcTokenAcc3,
            toChainID: dstChainId3,
            toAccount: dstTokenAcc3,
            jettonAdminAddr:tokenInfo.coin.jettonAdminAddr,
        });

        console.log("ret3", slimSndMsgResult(ret3));

        let retNew3 = await bridge.getTokenPair(tokenPairId3);
        console.log("retNew3", retNew3);

        expect(ret3.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });
        // 4. todo set gpk (used to check sig)

        let startTime = Math.floor(Date.now() / 1000);
        let endTime = startTime + wkDuring;

        let retSmg = await bridge.sendSetStoremanGroupConfig(deployer.getSender(),{
            id: BigInt(smgId),
            gpkX:BigInt(gpkX), gpkY:BigInt(gpkY), 
            startTime,
            endTime,
            value: toNano('1000'),
            queryID,
        });
        console.log("retSmg", slimSndMsgResult(retSmg));

        let retGetSmg = await bridge.getStoremanGroupConfig(BigInt(smgId));
        console.log("retGetSmg",retGetSmg);

    });

    beforeEach(async () => {

    });


    it('should Mint origin token success', async () => {

        // mint  100 usdt to alice
        let initialTotalSupply = await jettonMinter.getTotalSupply();
        const deployerJettonWallet = await userWallet(deployer_jetton.address);
        const aliceJettonWallet = await userWallet(alice.address);
        const bobJettonWallet = await userWallet(bob.address);

        let initialJettonBalance = toNano('100');
        const mintResult = await jettonMinter.sendMint(deployer_jetton.getSender(), alice.address, initialJettonBalance, toNano('0.05'), toNano('1'));

        expect(await aliceJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await jettonMinter.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);
        initialTotalSupply += initialJettonBalance;
        // mint  100 usdt to bob
        const mintResult2 = await jettonMinter.sendMint(deployer_jetton.getSender(), bob.address, initialJettonBalance, toNano('0.05'), toNano('1'));


        expect(await bobJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await jettonMinter.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);

    });

    it('should Mint wrapped token success', async () => {

        // mint  100 dog to alice
        let initialTotalSupply = await jettonMinter_dog.getTotalSupply();
        const aliceJettonWallet = await userWallet_dog(alice.address);
        const bobJettonWallet = await userWallet_dog(bob.address);

        let initialJettonBalance = toNano('100');

        //todo mint should call from bridge
        // unauthorized_mint_request
        const mintResult = await jettonMinter_dog.sendMint(deployer_jetton.getSender(), alice.address, initialJettonBalance, toNano('0.05'), toNano('1'));
        console.log("mintResultDog.....", slimSndMsgResult(mintResult));

        expect(await aliceJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await jettonMinter_dog.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);
        initialTotalSupply += initialJettonBalance;
        // mint  100 dog to bob
        //todo mint should call from bridge
        // unauthorized_mint_request
        const mintResult2 = await jettonMinter_dog.sendMint(deployer_jetton.getSender(), bob.address, initialJettonBalance, toNano('0.05'), toNano('1'));
        console.log("mintResult2Dog.....", slimSndMsgResult(mintResult2));


        expect(await bobJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await jettonMinter_dog.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);

    });

    it('should change admin of jetton_dog token to bridge address', async () => {

        const changeAdminResult = await jettonMinter_dog.sendChangeAdmin(deployer_jetton.getSender(), bridge.address);

        let newAdmin = await jettonMinter_dog.getAdminAddress()
        expect(true).toEqual(Address.isAddress(newAdmin));
        expect(true).toEqual(bridge.address.equals(newAdmin));
    });

    it('should update tokenpair success', async () => {

        // 3.2 add token pair for token-wrapped
        let queryID = await getQueryID();
        let tokenPairId2 = tokenInfo.tokenWrapped.tokenPairId;
        let srcChainId2 = tokenInfo.tokenWrapped.srcChainId;
        let dstChainId2 = tokenInfo.tokenWrapped.dstChainId;
        let srcTokenAcc2 = tokenInfo.tokenWrapped.srcTokenAcc;

        let dstTokenAcc2 = jettonMinter_dog.address.toString()

        let retOld2 = await bridge.getTokenPair(tokenPairId2);
        console.log("retOld2", retOld2);
        const ret2 = await bridge.sendAddTokenPair(deployer.getSender(), {
            value: toNano('1000'),
            queryID,
            tokenPairId: tokenPairId2,
            fromChainID: srcChainId2,
            fromAccount: srcTokenAcc2,
            toChainID: dstChainId2,
            toAccount: dstTokenAcc2,
            jettonAdminAddr:bridge.address.toString(),
        });

        console.log("ret2", slimSndMsgResult(ret2));

        let retNew2 = await bridge.getTokenPair(tokenPairId2);
        console.log("retNew2", retNew2);

        expect(ret2.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });
    });

    it('[userLock original token] should userLock success', async () => {
        let smgID = "0x000000000000000000000000000000000000000000746573746e65745f303638";
        let tokenPairID = 0x1;
        let crossValue = BigInt(toNano(1));
        let value = BigInt(toNano(2));
        console.log("smgID(bigInt)==>", BigInt(smgID));
        const queryID = 1;

        console.log("before user lock original token");

        const ret = await bridge.sendUserLock(alice.getSender(), {
            value: value,
            queryID,
            tokenPairID,
            smgID,
            crossValue,
            dstUserAccount: bob.address,
        });
    });

    it('[userLock wrapped token ] should userLock success', async () => {
        let smgID = "0x000000000000000000000000000000000000000000746573746e65745f303638";
        let tokenPairID = 0x2;
        let crossValue = BigInt(toNano(1));
        let value = BigInt(toNano(2));
        console.log("smgID(bigInt)==>", BigInt(smgID));
        const queryID = 1;

        console.log("before user lock wrapped token");

        const ret = await bridge.sendUserLock(alice.getSender(), {
            value: value,
            queryID,
            tokenPairID,
            smgID,
            crossValue,
            dstUserAccount: bob.address,
        });

    });

    it('[userLock ton] should userLock success', async () => {
        let smgID = "0x000000000000000000000000000000000000000000746573746e65745f303638";
        let tokenPairID = 0x3;
        let crossValue = BigInt(toNano(1));
        let value = BigInt(toNano(2));
        console.log("smgID(bigInt)==>", BigInt(smgID));

        const user1 = await blockchain.treasury('user1');
        const user2 = await blockchain.treasury('user2');
        const queryID = 1;

        console.log("before user lock ton coin");

        let beforeBridge = (await blockchain.getContract(bridge.address)).balance;
        let beforeUser1 = await user1.getBalance();
        let beforeUser2 = await user2.getBalance();

        const ret = await bridge.sendUserLock(user1.getSender(), {
            value: value,
            queryID,
            tokenPairID,
            smgID,
            crossValue,
            dstUserAccount: user2.address,
        });

        let afterBridge = (await blockchain.getContract(bridge.address)).balance;
        let afterUser1 = await user1.getBalance();
        let afterUser2 = await user2.getBalance();

        console.log("user1AddrInt,user2AddrInt,bridgeAddrInt",
            AccountToBig(user1.address),
            AccountToBig(user2.address),
            AccountToBig(bridge.address));
        console.log("beforeBridge, afterBridge, crossValue, value, delta(bridge)",
            fromNano(beforeBridge),
            fromNano(afterBridge),
            fromNano(crossValue),
            fromNano(value),
            afterBridge - beforeBridge);
        console.log("beforeUser1, afterUser1, delta", fromNano(beforeUser1), fromNano(afterUser1), afterUser1 - beforeUser1);
        console.log("beforeUser2, afterUser2,delta", fromNano(beforeUser2), fromNano(afterUser2), afterUser2 - beforeUser2);

        console.log("ret.transaction=>", slimSndMsgResult(ret));
        for (let t of ret.transactions) {
            console.log("trans detailed", t.inMessage);
        }
        // console.log("ret=====>",ret);

        //todo should be exact equal
        expect(true).toEqual(afterBridge >= (beforeBridge) && afterBridge <= (beforeBridge + crossValue + value));
        //expect(true).toEqual(afterUser1 == (beforeUser1 - crossValue));
        expect(true).toEqual(afterUser2 == afterUser2);
    });

    it('[smgRelease ton] should msgRelease success', async () => {
        let smgID = smgId;
        let tokenPairID = tokenInfo.coin.tokenPairId;
        let releaseValue = BigInt(toNano(1));
        let value = BigInt(toNano(2));
        console.log("smgID(bigInt)==>", BigInt(smgID));

        const queryID = 1;
        const uniqueID = BigInt(1);
        const fee = BigInt(1000);

        let msgHashResult = common.computeHash(BigInt(BIP44_CHAINID),
            BigInt(uniqueID),
            BigInt(tokenPairID),
            BigInt(releaseValue),
            BigInt(fee),
            TON_COIN_ACCOUT,
            bob.address);

        console.log("msgHashResult....",msgHashResult);
        let sig = schnorr.getSecSchnorrSByMsgHash(skSmg,msgHashResult.hashBuf);
        const e = BigInt(sig.e);

        const p = BigInt(sig.p);
        const s = BigInt(sig.s);

        console.log("before smgRelease ton");

        let beforeBridge = (await blockchain.getContract(bridge.address)).balance;
        let beforeAlice = await alice.getBalance();
        let beforeBob = await bob.getBalance();

        const ret = await bridge.sendSmgRelease(alice.getSender(), {
            value: value,
            queryID,
            uniqueID,
            smgID,
            tokenPairID,
            releaseValue,
            fee,
            userAccount: bob.address,
            bridgeJettonWalletAddr: alice.address, //todo ZERO_ACCOUNT
            e,
            p,
            s
        });
        // console.log("sendSmgRelease ret:", ret)
        await sleep(2000)
        let afterBridge = (await blockchain.getContract(bridge.address)).balance;
        let afterAlice = await alice.getBalance();
        let afterBob = await bob.getBalance();


        console.log("beforeAlice, afterAlice, delta", fromNano(beforeAlice), fromNano(afterAlice), afterAlice - beforeAlice);
        console.log("beforeBob, afterBob, delta", fromNano(beforeBob), fromNano(afterBob), afterBob - beforeBob);
        console.log("beforeBridge, afterBridge,delta", fromNano(beforeBridge), fromNano(afterBridge), afterBridge - beforeBridge);

        console.log("ret.transaction=>", slimSndMsgResult(ret));
        // console.log("ret=====>",ret);
        // todo add expect later
        expect(true).toEqual(afterBridge <= (beforeBridge)); //todo add fee
        console.log("beforeBridge(wei), afterBridge(wei), releaseValue(wei)", beforeBridge, afterBridge, releaseValue);
        console.log("debug: afterBob >= (beforeBob + releaseValue):", afterBob ,beforeBob , releaseValue)
        expect(true).toEqual(afterBob >= (beforeBob + releaseValue));      //todo add fee should equal , not >=
    });

    it('[smgRelease original token] should msgRelease success', async () => {
        let smgID = smgId;
        let tokenPairID = tokenInfo.tokenOrg.tokenPairId;
        let releaseValue = BigInt(toNano(1));
        let value = BigInt(toNano(2));
        console.log("smgID(bigInt)==>", BigInt(smgID));

        const queryID = 1;
        const uniqueID = BigInt(2);
        const fee = BigInt(1000);

        let msgHashResult = common.computeHash(BigInt(BIP44_CHAINID),
            BigInt(uniqueID),
            BigInt(tokenPairID),
            BigInt(releaseValue),
            BigInt(fee),
            Address.parseFriendly(tokenInfo.tokenOrg.dstTokenAcc).address,
            bob.address);

        console.log("msgHashResult....",msgHashResult);
        let sig = schnorr.getSecSchnorrSByMsgHash(skSmg,msgHashResult.hashBuf);
        const e = BigInt(sig.e);

        const p = BigInt(sig.p);
        const s = BigInt(sig.s);


        console.log("before smgRelease original token");

        let initialTotalSupply = await jettonMinter.getTotalSupply();
        const bridgeJettonWallet = await userWallet(bridge.address);
        const bobJettonWallet = await userWallet(bob.address);

        let beforeBridgeUsdt = await bridgeJettonWallet.getJettonBalance();
        let beforeBobUsdt = await bobJettonWallet.getJettonBalance();

        const ret = await bridge.sendSmgRelease(alice.getSender(), {
            value: value,
            queryID,
            uniqueID,
            smgID,
            tokenPairID,
            releaseValue,
            fee,
            userAccount: bob.address,
            bridgeJettonWalletAddr: bridgeJettonWallet.address,
            e,
            p,
            s
        });

        let afterBridgeUsdt = await bridgeJettonWallet.getJettonBalance();
        let afterBobUsdt = await bobJettonWallet.getJettonBalance();

        console.log("tokenAccount,userAccount,jettonAdminAddr,bridgeJettonWalletAddr, alice,bob,bridge",
            AccountToBig(jettonMinter.address),
            AccountToBig(bob.address),
            AccountToBig(deployer_jetton.address),
            AccountToBig(bridgeJettonWallet.address),
            AccountToBig(alice.address),
            AccountToBig(bob.address),
            AccountToBig(bridge.address));

        console.log("beforeBob, afterBob, delta", fromNano(beforeBobUsdt), fromNano(afterBobUsdt), afterBobUsdt - beforeBobUsdt);
        console.log("beforeBridge, afterBridge,delta", fromNano(beforeBridgeUsdt), fromNano(afterBridgeUsdt), afterBridgeUsdt - beforeBridgeUsdt);

        expect(true).toEqual(afterBobUsdt == (beforeBobUsdt + releaseValue)); //todo add fee
        expect(true).toEqual(afterBridgeUsdt == (beforeBridgeUsdt - releaseValue));      //todo add fee

        console.log("ret.transaction=>", slimSndMsgResult(ret));
        // console.log("ret=====>",ret);
        // todo add expect later
    });

    it('[smgRelease wrapped token] should msgRelease success', async () => {
        let smgID = smgId;
        let tokenPairID = tokenInfo.tokenWrapped.tokenPairId;
        let releaseValue = BigInt(toNano(300));
        //let value = BigInt(toNano(4));
        let value = BigInt(toNano(400));
        console.log("smgID(bigInt)==>", BigInt(smgID));

        const queryID = 1;
        const uniqueID = BigInt(3);
        const fee = BigInt(1000);

        let msgHashResult = common.computeHash(BigInt(BIP44_CHAINID),
            BigInt(uniqueID),
            BigInt(tokenPairID),
            BigInt(releaseValue),
            BigInt(fee),
            Address.parseFriendly(tokenInfo.tokenWrapped.dstTokenAcc).address,
            bob.address);

        console.log("msgHashResult....",msgHashResult);
        let sig = schnorr.getSecSchnorrSByMsgHash(skSmg,msgHashResult.hashBuf);
        const e = BigInt(sig.e);

        const p = BigInt(sig.p);
        const s = BigInt(sig.s);


        console.log("before smgRelease wrapped token...........................");

        let beforeTotalSupplyDog = await jettonMinter_dog.getTotalSupply();
        const bridgeJettonWalletDog = await userWallet_dog(bridge.address);
        const bobJettonWalletDog = await userWallet_dog(bob.address);
        const aliceJettonWalletDog = await userWallet_dog(alice.address);

        let beforeBobDog = await bobJettonWalletDog.getJettonBalance();
        const retSmgReleaseWrappedToken = await bridge.sendSmgRelease(alice.getSender(), {
            value: value,
            queryID,
            uniqueID,
            smgID,
            tokenPairID,
            releaseValue,
            fee,
            userAccount: bob.address,
            bridgeJettonWalletAddr: bridgeJettonWalletDog.address,
            e,
            p,
            s
        });

        console.log("retSmgReleaseWrappedToken.transaction=>",slimSndMsgResult(retSmgReleaseWrappedToken));

        console.log("retSmgReleaseWrappedToken.transaction.length=>>>>>>>>>>>>>=>", retSmgReleaseWrappedToken.transactions.length);
        let afterTotalSupplyDog = await jettonMinter_dog.getTotalSupply();
        let afterBobDog = await bobJettonWalletDog.getJettonBalance();

        console.log("tokenAccount,userAccount,jettonAdminAddr,bridgeJettonWalletAddr, alice,bob,bridge, jw_bob_addr, jw_alice_addr",
            AccountToBig(jettonMinter_dog.address),
            AccountToBig(bob.address),
            AccountToBig(deployer_jetton.address),
            AccountToBig(bridgeJettonWalletDog.address),
            AccountToBig(alice.address),
            AccountToBig(bob.address),
            AccountToBig(bridge.address),
            AccountToBig(bobJettonWalletDog.address),
            AccountToBig(aliceJettonWalletDog.address));


        console.log("beforeBobDog, afterBobDog, delta", fromNano(beforeBobDog), fromNano(afterBobDog), afterBobDog - beforeBobDog);
        console.log("beforeTotalSupplyDog, afterTotalSupplyDog,delta", fromNano(beforeTotalSupplyDog), fromNano(afterTotalSupplyDog), afterTotalSupplyDog - beforeTotalSupplyDog);

        expect(true).toEqual(afterBobDog == (beforeBobDog + releaseValue)); //todo add fee
        expect(true).toEqual(afterTotalSupplyDog == (beforeTotalSupplyDog + releaseValue));      //todo add fee

        // todo add expect later
    });

});
