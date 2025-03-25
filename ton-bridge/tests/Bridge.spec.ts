import {Blockchain, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell, Sender} from '@ton/core';
import {TON_COIN_ACCOUT, BIP44_CHAINID, BIP44_WANCHAIN_CHAINID} from '../wrappers/const/const-value';
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
import {CoinBalance, TokenBalance} from "../wrappers/wallet/balance";
import {getSenderByPrvKey} from "../wrappers";

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
let   tokenInfo = {
    coin:{tokenPairId:0x01,srcChainId:BIP44_WANCHAIN_CHAINID,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',jettonAdminAddr:''},
    tokenOrg:{tokenPairId:0x02,srcChainId:BIP44_WANCHAIN_CHAINID,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',jettonAdminAddr:''},
    tokenWrapped:{tokenPairId:0x03,srcChainId:BIP44_WANCHAIN_CHAINID,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',jettonAdminAddr:''},

}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
let operator: SandboxContract<TreasuryContract>;
let bridge: SandboxContract<Bridge>;

describe('Bridge', () => {


    beforeAll(async () => {

        // 1. deploy bridge
        code = await compile('Bridge');
        jwallet_code = await compile('JettonWallet');
        minter_code = await compile('JettonMinter');

        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        smgFeeProxy = await blockchain.treasury('smgFeeProxy');
        oracleAdmin = await blockchain.treasury('oracleAdmin');
        operator = await blockchain.treasury('operator');

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
        console.log("smgFeeProxy==>", smgFeeProxy.address);

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

        console.log("usdt jetton admin ==>", deployer_jetton.address);
        console.log("usdt jetton token address  ==>", jettonMinter.address);
        console.log("usdt jetton wallet address(bridge)  ==>", (await jettonMinter.getWalletAddress(bridge.address)));
        tokenInfo.tokenOrg.jettonAdminAddr = deployer_jetton.address.toString();
        tokenInfo.tokenOrg.dstTokenAcc = jettonMinter.address.toString();

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


        console.log("dog (wrapped) jetton admin ==>", deployer_jetton.address);
        console.log("dog (wrapped) jetton token address  ==>", jettonMinter_dog.address);
        console.log("dog (wrapped) jetton wallet address(bridge)  ==>", (await jettonMinter_dog.getWalletAddress(bridge.address)));
        tokenInfo.tokenWrapped.jettonAdminAddr = deployer_jetton.address.toString();
        tokenInfo.tokenWrapped.dstTokenAcc = jettonMinter_dog.address.toString();
        // 3 add token pair for token-org

        for(let key of Object.keys(tokenInfo)) {
            const queryID = 1;
            const ret = await bridge.sendAddTokenPair(deployer.getSender(), {
                value: toNano('0.1'),
                queryID,
                tokenPairId: tokenInfo[key].tokenPairId,
                fromChainID: tokenInfo[key].srcChainId,
                fromAccount: tokenInfo[key].srcTokenAcc,
                toChainID: tokenInfo[key].dstChainId,
                toAccount: tokenInfo[key].dstTokenAcc,
                jettonAdminAddr:tokenInfo[key].jettonAdminAddr,
            });

            console.log("ret", slimSndMsgResult(ret));
        }

        // 4. set gpk (used to check sig)

        let startTime = Math.floor(Date.now() / 1000);
        let endTime = startTime + wkDuring;

        let retSmg = await bridge.sendSetStoremanGroupConfig(deployer.getSender(),{
            id: BigInt(smgId),
            gpkX:BigInt(gpkX), gpkY:BigInt(gpkY), 
            startTime,
            endTime,
            value: toNano('1000'),
            queryID: await getQueryID(),
        });
        console.log("retSmg", slimSndMsgResult(retSmg));

        let retGetSmg = await bridge.getStoremanGroupConfig(BigInt(smgId));
        console.log("retGetSmg",retGetSmg);

        // 5. set contractFee and AgentFee
        await setFee(bridge,oracleAdmin);
    });

    beforeEach(async () => {

    });

    it('empty test case used to debug beforeAll', async () => {
        printCaseSeperator(it.name);
    })

    it('should Mint origin token success', async () => {

        // mint  100 usdt to alice
        let initialTotalSupply = await jettonMinter.getTotalSupply();
        const deployerJettonWallet = await userWallet(deployer_jetton.address);
        const aliceJettonWallet = await userWallet(alice.address);
        const bobJettonWallet = await userWallet(bob.address);
        const bridgeJettonWallet = await userWallet(bridge.address);

        let initialJettonBalance = toNano('100');
        const mintResult = await jettonMinter.sendMint(deployer_jetton.getSender(), alice.address, initialJettonBalance, toNano('0.05'), toNano('1'));

        expect(await aliceJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await jettonMinter.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);
        initialTotalSupply += initialJettonBalance;
        // mint  100 usdt to bob
        const mintResult2 = await jettonMinter.sendMint(deployer_jetton.getSender(), bob.address, initialJettonBalance, toNano('0.05'), toNano('1'));


        expect(await bobJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await jettonMinter.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);
        initialTotalSupply += initialJettonBalance;

        // mint  100 usdt to bridge
        const mintResult3 = await jettonMinter.sendMint(deployer_jetton.getSender(), bridge.address, initialJettonBalance, toNano('0.05'), toNano('1'));


        expect(await bridgeJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await jettonMinter.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);

        printCaseSeperator(it.name)
    });

        it('should Mint wrapped token success', async () => {

            // mint  100 dog to alice
            let initialTotalSupply = await jettonMinter_dog.getTotalSupply();
            const aliceJettonWallet = await userWallet_dog(alice.address);
            const bobJettonWallet = await userWallet_dog(bob.address);
            const bridgeJettonWallet = await userWallet_dog(bridge.address);

            let initialJettonBalance = toNano('100');

            const mintResult = await jettonMinter_dog.sendMint(deployer_jetton.getSender(), alice.address, initialJettonBalance, toNano('0.05'), toNano('1'));
            console.log("mintResultDog.....", slimSndMsgResult(mintResult));

            expect(await aliceJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
            expect(await jettonMinter_dog.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);
            initialTotalSupply += initialJettonBalance;

            // mint  100 dog to bob
            const mintResult2 = await jettonMinter_dog.sendMint(deployer_jetton.getSender(), bob.address, initialJettonBalance, toNano('0.05'), toNano('1'));
            console.log("mintResult2Dog.....", slimSndMsgResult(mintResult2));
            expect(await bobJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
            expect(await jettonMinter_dog.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);
            initialTotalSupply += initialJettonBalance;


            const mintResult3 = await jettonMinter_dog.sendMint(deployer_jetton.getSender(), bridge.address, initialJettonBalance, toNano('0.05'), toNano('1'));
            console.log("mintResult3Dog.....", slimSndMsgResult(mintResult3));
            expect(await bridgeJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
            expect(await jettonMinter_dog.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);
            initialTotalSupply += initialJettonBalance;

            printCaseSeperator(it.name)
        });

        it('should change admin of jetton_dog token to bridge address', async () => {

            const changeAdminResult = await jettonMinter_dog.sendChangeAdmin(deployer_jetton.getSender(), bridge.address);

            let newAdmin = await jettonMinter_dog.getAdminAddress()
            expect(true).toEqual(Address.isAddress(newAdmin));
            expect(true).toEqual(bridge.address.equals(newAdmin));

            await displayAllTokenPair(bridge);
            printCaseSeperator(it.name)
        });

        it('[userLock coin] should userLock success', async () => {
            let smgID = "0x000000000000000000000000000000000000000000746573746e65745f303638";
            let tokenPairID = tokenInfo.coin.tokenPairId;
            let crossValue = BigInt(toNano(1));
            let value = BigInt(toNano(2));
            console.log("smgID(bigInt)==>", BigInt(smgID));
            const queryID = 1;

            console.log("before user lock original token");
            console.log("alice's address",alice.address.toString());
            console.log("value",fromNano(value),"crossValue",fromNano(crossValue));
            console.log("Before balance of coin",
                "alice:",fromNano( await CoinBalance(blockchain,alice.address)),
                "bridge:",fromNano(await CoinBalance(blockchain,bridge.address)),
            );
            const ret = await bridge.sendUserLock(alice.getSender(), {
                value: value,
                queryID,
                tokenPairID,
                smgID,
                crossValue,
                dstUserAccount: bob.address.toString(),
                client:blockchain,
                senderAccount:alice.address.toString(),
                bridgeScAddr:bridge.address.toString(),
            });

            console.log("ret", slimSndMsgResult(ret));
            console.log("After balance of coin",
                "alice:",fromNano( await CoinBalance(blockchain,alice.address)),
                "bridge:",fromNano(await CoinBalance(blockchain,bridge.address)),
            );
            printCaseSeperator(it.name)
        });

        it('[userLock original token] should userLock success', async () => {
            let smgID = "0x000000000000000000000000000000000000000000746573746e65745f303638";
            let tokenPairID = tokenInfo.tokenOrg.tokenPairId;
            let crossValue = BigInt(toNano(1));
            let value = BigInt(toNano(2));
            console.log("smgID(bigInt)==>", BigInt(smgID));
            const queryID = 1;

            console.log("before user lock original token");
            console.log("alice's address",alice.address.toString());
            console.log("value",fromNano(value),"crossValue",fromNano(crossValue));
            console.log("Before balance of coin",
                "alice:",fromNano( await CoinBalance(blockchain,alice.address)),
                "bridge:",fromNano(await CoinBalance(blockchain,bridge.address)),
            );
            console.log("Before balance of token",
                "alice:",fromNano(await TokenBalance(blockchain,Address.parse(tokenInfo.tokenOrg.dstTokenAcc),alice.address)),
                "bridge:",fromNano(await TokenBalance(blockchain,Address.parse(tokenInfo.tokenOrg.dstTokenAcc),bridge.address)),
            );
            const ret = await bridge.sendUserLock(alice.getSender(), {
                value: value,
                queryID,
                tokenPairID,
                smgID,
                crossValue,
                dstUserAccount: bob.address.toString(),
                client:blockchain,
                senderAccount:alice.address.toString(),
                bridgeScAddr:bridge.address.toString(),
            });

            console.log("ret", slimSndMsgResult(ret));
            console.log("After balance of coin",
                "alice:",fromNano( await CoinBalance(blockchain,alice.address)),
                "bridge:",fromNano(await CoinBalance(blockchain,bridge.address)),
                );
            console.log("After balance of token",
                "alice:",fromNano(await TokenBalance(blockchain,Address.parse(tokenInfo.tokenOrg.dstTokenAcc),alice.address)),
                "bridge:",fromNano(await TokenBalance(blockchain,Address.parse(tokenInfo.tokenOrg.dstTokenAcc),bridge.address)),
            );
            printCaseSeperator(it.name)
        });

        it('[userLock wrapped token ] should userLock success', async () => {
            let smgID = "0x000000000000000000000000000000000000000000746573746e65745f303638";
            let tokenPairID = tokenInfo.tokenWrapped.tokenPairId;
            let crossValue = BigInt(toNano(0.5));
            let value = BigInt(toNano(2));
            console.log("smgID(bigInt)==>", BigInt(smgID));
            const queryID = 1;

            console.log("before user lock original token");
            console.log("alice's address",alice.address.toString());
            console.log("value",fromNano(value),"crossValue",fromNano(crossValue));
            console.log("Before balance of coin",
                "alice:",fromNano( await CoinBalance(blockchain,alice.address)),
                "bridge:",fromNano(await CoinBalance(blockchain,bridge.address)),
            );
            console.log("Before balance of token",
                "alice:",fromNano(await TokenBalance(blockchain,Address.parse(tokenInfo.tokenWrapped.dstTokenAcc),alice.address)),
                "bridge:",fromNano(await TokenBalance(blockchain,Address.parse(tokenInfo.tokenWrapped.dstTokenAcc),bridge.address)),
            );
            const ret = await bridge.sendUserLock(alice.getSender(), {
                value: value,
                queryID,
                tokenPairID,
                smgID,
                crossValue,
                dstUserAccount: bob.address.toString(),
                client:blockchain,
                senderAccount:alice.address.toString(),
                bridgeScAddr:bridge.address.toString(),
            });

            console.log("ret", slimSndMsgResult(ret));
            console.log("After balance of coin",
                "alice:",fromNano( await CoinBalance(blockchain,alice.address)),
                "bridge:",fromNano(await CoinBalance(blockchain,bridge.address)),
            );
            console.log("After balance of token",
                "alice:",fromNano(await TokenBalance(blockchain,Address.parse(tokenInfo.tokenWrapped.dstTokenAcc),alice.address)),
                "bridge:",fromNano(await TokenBalance(blockchain,Address.parse(tokenInfo.tokenWrapped.dstTokenAcc),bridge.address)),
            );
            printCaseSeperator(it.name)

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

            printCaseSeperator(it.name);
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

            console.log(
                "tokenAccount",jettonMinter.address,
                "userAccount",(bob.address),
                "jettonAdminAddr",(deployer_jetton.address),
                "bridgeJettonWalletAddr",(bridgeJettonWallet.address),
                "alice",(alice.address),
                "bob",(bob.address),
                "bridge",(bridge.address));

            console.log("beforeBob, afterBob, delta", fromNano(beforeBobUsdt), fromNano(afterBobUsdt), afterBobUsdt - beforeBobUsdt);
            console.log("beforeBridge, afterBridge,delta", fromNano(beforeBridgeUsdt), fromNano(afterBridgeUsdt), afterBridgeUsdt - beforeBridgeUsdt);

            expect(true).toEqual(afterBobUsdt == (beforeBobUsdt + releaseValue - fee));
            expect(true).toEqual(afterBridgeUsdt == (beforeBridgeUsdt - releaseValue));

            console.log("ret.transaction=>", slimSndMsgResult(ret));

            printCaseSeperator(it.name);
        });

        it('[smgRelease wrapped token] should msgRelease success', async () => {
            let smgID = smgId;
            let tokenPairID = tokenInfo.tokenWrapped.tokenPairId;
            let releaseValue = BigInt(toNano(1));
            let value = BigInt(toNano(2));
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


            console.log("before smgRelease original token");

            let initialTotalSupply = await jettonMinter_dog.getTotalSupply();
            const bridgeJettonWallet = await userWallet_dog(bridge.address);
            const bobJettonWallet = await userWallet_dog(bob.address);

            let beforeBridgeDog = await bridgeJettonWallet.getJettonBalance();
            let beforeBobDog = await bobJettonWallet.getJettonBalance();

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

            let afterBridgeDog = await bridgeJettonWallet.getJettonBalance();
            let afterBobDog = await bobJettonWallet.getJettonBalance();

            console.log(
                "tokenAccount",jettonMinter.address,
                "userAccount",(bob.address),
                "jettonAdminAddr",(deployer_jetton.address),
                "bridgeJettonWalletAddr",(bridgeJettonWallet.address),
                "alice",(alice.address),
                "bob",(bob.address),
                "bridge",(bridge.address));

            console.log("beforeBob, afterBob, delta", fromNano(beforeBobDog), fromNano(afterBobDog), afterBobDog - beforeBobDog);
            console.log("beforeBridge, afterBridge,delta", fromNano(beforeBridgeDog), fromNano(afterBridgeDog), afterBridgeDog - beforeBridgeDog);

            expect(true).toEqual(afterBobDog == (beforeBobDog + releaseValue - fee));
            expect(true).toEqual(afterBridgeDog == (beforeBridgeDog - releaseValue));

            console.log("ret.transaction=>", slimSndMsgResult(ret));

            printCaseSeperator(it.name);
        });


});

async function printCaseSeperator(name:string){
    console.log("\n=============="+name+"==================\n");
}

async  function setFee(bridge:SandboxContract<Bridge>,operator:SandboxContract<TreasuryContract>){
    let contractChainFee = toNano('0.01')
    let contractTokenPairFee = toNano('0.02')
    let agentFee = toNano('0.03')

    // set chain fee
    for(let key of Object.keys(tokenInfo)){
        const queryID=await getQueryID();
        let ret = await bridge.sendSetChainFee(operator.getSender(),{
            srcChainId:tokenInfo[key].srcChainId,
            dstChainId:tokenInfo[key].dstChainId,
            contractFee:Number(contractChainFee),
            agentFee:Number(agentFee),
            value: toNano('0.01'),
            queryID,
        });

        ret = await bridge.sendSetTokenPairFee(operator.getSender(),{
            tokenPairID:tokenInfo[key].tokenPairId,
            fee:Number(contractTokenPairFee),
            value: toNano('0.01'),
            queryID,
        });

        let tokenPairFee = await bridge.getTokenPairFee(tokenInfo[key].tokenPairId)
        console.log("tokenpairIdFee",tokenInfo[key].tokenPairId, tokenPairFee);

        let chainFee = await bridge.getChainFee(tokenInfo[key].srcChainId,tokenInfo[key].dstChainId);
        console.log("chainFee","srcChainId", tokenInfo[key].srcChainId,"desChainId",tokenInfo[key].dstChainId,chainFee);
    }
}

async function displayAllTokenPair(bridge:SandboxContract<Bridge>){
    console.log("displayAllTokenPair begin");
    for(let key of Object.keys(tokenInfo)) {
        const queryID = await getQueryID();
        let ret = await bridge.getTokenPair(tokenInfo[key].tokenPairId);
        console.log("tokenpairId", tokenInfo[key].tokenPairId, ret);
    }
    console.log("displayAllTokenPair end");
}
