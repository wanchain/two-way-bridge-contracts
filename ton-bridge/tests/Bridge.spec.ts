import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {Address, Cell, toNano, TupleItemInt, fromNano, beginCell} from '@ton/core';
import {Bridge, ZERO_ACCOUNT} from '../wrappers/Bridge';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import {JettonMinter} from "../wrappers/JettonMinter";
import {JettonWallet} from "../wrappers/JettonWallet";
import {BufferrToHexString,HexStringToBuffer} from "./utils";

describe('Bridge', () => {
    let code: Cell;

    let jwallet_code = new Cell();
    let minter_code = new Cell();

    let deployer_jetton:SandboxContract<TreasuryContract>;
    let alice:SandboxContract<TreasuryContract>;
    let bob:SandboxContract<TreasuryContract>;
    let jettonMinter_dog:SandboxContract<JettonMinter>;
    let jettonMinter:SandboxContract<JettonMinter>;

    let userWallet:any;
    let userWallet_dog:any;
    let defaultContent:Cell;
    let defaultContent_dog:Cell;

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let smgFeeProxy: SandboxContract<TreasuryContract>;
    let oracleAdmin: SandboxContract<TreasuryContract>;
    let bridge: SandboxContract<Bridge>;

    beforeAll(async () => {
        // 1. deploy bridge
        code = await compile('Bridge');
        jwallet_code   = await compile('JettonWallet');
        minter_code    = await compile('JettonMinter');

        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        smgFeeProxy = await blockchain.treasury('smgFeeProxy');
        oracleAdmin = await blockchain.treasury('oracleAdmin');

        let c = Bridge.createFromConfig(
            {
                owner: deployer.address,
                admin:deployer.address,
                halt:0,
                init:0,
                smgFeeProxy:smgFeeProxy.address,
                oracleAdmin:oracleAdmin.address,
            },
            code
        )

        bridge = blockchain.openContract(c);
        const deployResult = await bridge.sendDeploy(deployer.getSender(), toNano('1000'));

        console.log("deployer.address==>",deployer.address);
        console.log("deployer.address(bigInt)==>",BigInt("0x"+deployer.address.hash.toString('hex')));
        console.log("bridge.address==>",bridge.address);
        console.log("bridge.address(bigInt)==>",BigInt("0x"+bridge.address.hash.toString('hex')));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            deploy: true,
            success: true,
        });

        // 2. deploy original token usdt
        deployer_jetton       = await blockchain.treasury('deployer_jetton');
        alice    = await blockchain.treasury('alice');
        bob    = await blockchain.treasury('bob');
        defaultContent = beginCell().endCell();
        jettonMinter   = blockchain.openContract(
            await JettonMinter.createFromConfig(
                {
                    admin: deployer_jetton.address,     // todo the address can be bridgeAddress for wrapped token
                    content: defaultContent,
                    wallet_code: jwallet_code,
                },
                minter_code));
        userWallet = async (address:Address) => blockchain.openContract(
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


        // 3. deploy wrapped Token dog
        defaultContent_dog = beginCell().endCell();
        jettonMinter_dog   = blockchain.openContract(
            await JettonMinter.createFromConfig(
                {
                    admin: bridge.address,     // todo the address can be bridgeAddress for wrapped token
                    content: defaultContent_dog,
                    wallet_code: jwallet_code,
                },
                minter_code));
        userWallet_dog = async (address:Address) => blockchain.openContract(
            JettonWallet.createFromAddress(
                await jettonMinter_dog.getWalletAddress(address)
            )
        );

        const deployResultJetton_dog = await jettonMinter_dog.sendDeploy(deployer_jetton.getSender(), toNano('1'));
        expect(deployResultJetton_dog.transactions).toHaveTransaction({
            from: deployer_jetton.address,
            to: jettonMinter_dog.address,
            deploy: true,
        });

        // 3.1 add token pair for token-org
        let tokenPairId = 0x01;
        let srcChainId = 0x1234;
        let dstChainId = 0x4567;
        let srcTokenAcc = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
        //let dstTokenAcc = "0x32356335646535663562323836303733633539336564666437376234386162633761343865356134663364346364396434323866663933352e3535353334343433";

        let dstTokenAcc = BufferrToHexString(jettonMinter.address.toStringBuffer())  //todo handle testnet and mainnet , bounceable and non-bounceable

        console.log("(hex)dstTokenAcc....",dstTokenAcc)
        console.log("(str)dstTokenAcc....",jettonMinter.address)

        let retOld = await bridge.getTokenPair(tokenPairId);
        console.log("retOld",retOld);

        const user1 = await blockchain.treasury('user1');
        const queryID=1;

        console.log("user1.address==>",user1.address);
        console.log("user1.address(bigInt)==>",BigInt("0x"+user1.address.hash.toString('hex')));

        console.log("adminAddr",deployer.address.toRawString());
        const ret = await bridge.sendAddTokenPair(deployer.getSender(), {
            value: toNano('1000'),
            queryID,
            tokenPairId,
            fromChainID:srcChainId,
            fromAccount:srcTokenAcc,
            toChainID:dstChainId,
            toAccount:dstTokenAcc,
        });

        console.log("ret",ret);

        let retNew = await bridge.getTokenPair(tokenPairId);
        console.log("retNew",retNew);

        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });

        // 3.2 add token pair for token-wrapped
        let tokenPairId2 = 0x02;
        let srcChainId2 = 0x1234;
        let dstChainId2 = 0x4567;
        let srcTokenAcc2 = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

        let dstTokenAcc2 = BufferrToHexString(jettonMinter_dog.address.toStringBuffer())  //todo handle testnet and mainnet , bounceable and non-bounceable

        console.log("(hex)dstTokenAcc2....",dstTokenAcc2)
        console.log("(str)dstTokenAcc2....",jettonMinter_dog.address)

        let retOld2 = await bridge.getTokenPair(tokenPairId2);
        console.log("retOld2",retOld2);
        const ret2 = await bridge.sendAddTokenPair(deployer.getSender(), {
            value: toNano('1000'),
            queryID,
            tokenPairId:tokenPairId2,
            fromChainID:srcChainId2,
            fromAccount:srcTokenAcc2,
            toChainID:dstChainId2,
            toAccount:dstTokenAcc2,
        });

        console.log("ret2",ret2);

        let retNew2 = await bridge.getTokenPair(tokenPairId2);
        console.log("retNew",retNew2);

        expect(ret2.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });

        // 3.3 add token pair for ton-coin
        let tokenPairId3 = 0x03;
        let srcChainId3 = 0x1234;
        let dstChainId3 = 0x4567;
        let srcTokenAcc3 = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

        let dstTokenAcc3 = "0x0000000000000000000000000000000000000000";
        console.log("(hex)dstTokenAcc3....",dstTokenAcc2)


        let retOld3 = await bridge.getTokenPair(tokenPairId3);
        console.log("retOld2",retOld3);
        const ret3 = await bridge.sendAddTokenPair(deployer.getSender(), {
            value: toNano('1000'),
            queryID,
            tokenPairId:tokenPairId3,
            fromChainID:srcChainId3,
            fromAccount:srcTokenAcc3,
            toChainID:dstChainId3,
            toAccount:dstTokenAcc3,
        });

        console.log("ret3",ret3);

        let retNew3 = await bridge.getTokenPair(tokenPairId3);
        console.log("retNew3",retNew3);

        expect(ret3.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });
        // 4. todo set gpk (used to check sig)

    });


    beforeEach(async () => {

    });

    it('empty test',async ()=>{
        console.log("Entering empty test ....")
    })


    /*
    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and counter are ready to use
    });


    it('should addAdmin success', async () => {

        let retCrossConfigOld = await bridge.getCrossConfig()
        console.log("retCrossConfigOld",retCrossConfigOld);

        let oldAdmin = retCrossConfigOld.admin;
        console.log("oldAdmin",oldAdmin);

        const user1 = await blockchain.treasury('user1');
        const queryID=1;

        console.log("user1.address==>",user1.address);
        console.log("user1.address(bigInt)==>",BigInt("0x"+user1.address.hash.toString('hex')));

        console.log("adminAddr",deployer.address.toRawString());
        const ret = await bridge.sendAddAdmin(deployer.getSender(), {
            adminAddr:user1.address,
            value: toNano('1000'),
            queryID,
        });

        console.log("ret",ret);

        let retCrossConfig = await bridge.getCrossConfig()
        console.log("retCrossConfig",retCrossConfig);

        let newAdmin = retCrossConfig.admin;
        console.log("newAdmin",newAdmin);

        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });

        expect(newAdmin.equals(user1.address));

    });


    it('should setFee success', async () => {

        let srcChainId = 0x1234;
        let dstChainId = 0x4567;
        let contractFee = 0x2345;
        let agentFee = 0x6789;
        let retOld = await bridge.getFee(srcChainId,dstChainId);
        console.log("retOld",retOld);

        const user1 = await blockchain.treasury('user1');
        const queryID=1;

        console.log("user1.address==>",user1.address);
        console.log("user1.address(bigInt)==>",BigInt("0x"+user1.address.hash.toString('hex')));

        console.log("adminAddr",deployer.address.toRawString());
        const ret = await bridge.sendSetFee(deployer.getSender(), {
            value: toNano('1000'),
            queryID,
            srcChainId,
            dstChainId,
            contractFee,
            agentFee,
        });

        console.log("ret",ret);

        let retNew = await bridge.getFee(srcChainId,dstChainId);
        console.log("retNew",retNew);

        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });

    });*/


    /*it('should addTokenPair success', async () => {
        let tokenPairId = 0x999;
        let srcChainId = 0x1234;
        let dstChainId = 0x4567;
        let srcTokenAcc = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
        let dstTokenAcc = "0x32356335646535663562323836303733633539336564666437376234386162633761343865356134663364346364396434323866663933352e3535353334343433";

        let retOld = await bridge.getTokenPair(tokenPairId);
        console.log("retOld",retOld);

        const user1 = await blockchain.treasury('user1');
        const queryID=1;

        console.log("user1.address==>",user1.address);
        console.log("user1.address(bigInt)==>",BigInt("0x"+user1.address.hash.toString('hex')));

        console.log("adminAddr",deployer.address.toRawString());
        const ret = await bridge.sendAddTokenPair(deployer.getSender(), {
            value: toNano('1000'),
            queryID,
            tokenPairId,
            fromChainID:srcChainId,
            fromAccount:srcTokenAcc,
            toChainID:dstChainId,
            toAccount:dstTokenAcc,
        });

        console.log("ret",ret);

        let retNew = await bridge.getTokenPair(tokenPairId);
        console.log("retNew",retNew);

        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });

    });*/

    /*it('should userLock  ton success', async () => {
        let smgID = "0x000000000000000000000000000000000000000000746573746e65745f303638";
        let tokenPairID = 0x999;
        let crossValue = BigInt(toNano(1));
        let value = BigInt(toNano (2));
        console.log("smgID(bigInt)==>",BigInt(smgID));

        const user1 = await blockchain.treasury('user1');
        const user2 = await blockchain.treasury('user2');
        const queryID=1;

        console.log("before user lock");
        // console.log("user1.address==>",user1.address);
        // console.log("user1.address(bigInt)==>",BigInt("0x"+user1.address.hash.toString('hex')));
        // console.log("user1.balance(bigInt)==>",await user1.getBalance());
        //
        // console.log("user2.address==>",user2.address);
        // console.log("user2.address(bigInt)==>",BigInt("0x"+user2.address.hash.toString('hex')));
        // console.log("user2.balance(bigInt)==>",await user2.getBalance());
        //
        // console.log("bridge.address==>",bridge.address);
        // console.log("bridge.address(bigInt)==>",BigInt("0x"+bridge.address.hash.toString('hex')));
        // console.log("bridge.balance(bigInt)==>",(await blockchain.getContract(bridge.address)).balance);

        let beforeBridge = (await blockchain.getContract(bridge.address)).balance;
        let beforeUser1 = await user1.getBalance();
        let beforeUser2 = await user2.getBalance();



        const ret = await bridge.sendUserLock(user1.getSender(), {
            value: value,
            queryID,
            tokenPairID,
            smgID,
            crossValue,
            dstUserAccount:user2.address,
        });
        // console.log("after user lock");
        // console.log("user1.address==>",user1.address);
        // console.log("user1.address(bigInt)==>",BigInt("0x"+user1.address.hash.toString('hex')));
        // console.log("user1.balance(bigInt)==>",await user1.getBalance());
        //
        // console.log("user2.address==>",user2.address);
        // console.log("user2.address(bigInt)==>",BigInt("0x"+user2.address.hash.toString('hex')));
        // console.log("user2.balance(bigInt)==>",await user2.getBalance());
        //
        // console.log("bridge.address==>",bridge.address);
        // console.log("bridge.address(bigInt)==>",BigInt("0x"+bridge.address.hash.toString('hex')));
        // console.log("bridge.balance(bigInt)==>",(await blockchain.getContract(bridge.address)).balance);

        let afterBridge = (await blockchain.getContract(bridge.address)).balance;
        let afterUser1 = await user1.getBalance();
        let afterUser2 = await user2.getBalance();

        console.log("user1AddrInt,user2AddrInt,bridgeAddrInt",
            BigInt("0x"+user1.address.hash.toString('hex')),
            BigInt("0x"+user2.address.hash.toString('hex')),
            BigInt("0x"+bridge.address.hash.toString('hex')));
        console.log("beforeBridge, afterBridge, crossValue, value, delta(bridge)",
            fromNano(beforeBridge),
            fromNano(afterBridge),
            fromNano(crossValue),
            fromNano(value),
            afterBridge-beforeBridge);
        console.log("beforeUser1, afterUser1, delta",fromNano(beforeUser1),fromNano(afterUser1),afterUser1-beforeUser1);
        console.log("beforeUser2, afterUser2,delta",fromNano(beforeUser2),fromNano(afterUser2),afterUser2-beforeUser2);

        console.log("ret.transaction=>",ret.transactions);
        // console.log("ret=====>",ret);
        expect(true).toEqual(afterBridge == (beforeBridge + crossValue) );
        expect( true).toEqual(afterUser1 == (beforeUser1 - crossValue) );
        expect( true).toEqual(afterUser2 == afterUser1);

    });*/

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
        initialTotalSupply += initialJettonBalance;

        // alice userLock  lock usdt -> bridge contract
        /*let aliceUsdtBalance: bigint = await aliceJettonWallet.getJettonBalance();
        let sentAmount: bigint = toNano('10');
        let forwardAmount = toNano('0.05');

        let bridgeJettonWallet = await userWallet(bridge.address);
        let bridgeUsdtBalance: bigint = await bridgeJettonWallet.getJettonBalance();

        const sendResult = await aliceJettonWallet.sendTransfer(alice.getSender(),
            toNano('0.1'), //tons
            sentAmount, bridge.address,
            deployer.address, null, forwardAmount, null);

        expect(await aliceJettonWallet.getJettonBalance()).toEqual(aliceUsdtBalance - sentAmount);
        expect(await bridgeJettonWallet.getJettonBalance()).toEqual(bridgeUsdtBalance + sentAmount);
        expect(await jettonMinter.getTotalSupply()).toEqual(initialTotalSupply);*/

    });

    it('should Mint wrapped token success', async () => {

        // mint  100 usdt to alice
        let initialTotalSupply = await jettonMinter_dog.getTotalSupply();
        const aliceJettonWallet = await userWallet_dog(alice.address);
        const bobJettonWallet = await userWallet_dog(bob.address);

        let initialJettonBalance = toNano('100');

        //todo mint should call from bridge
        // unauthorized_mint_request
        const mintResult = await jettonMinter_dog.sendMint(deployer_jetton.getSender(), alice.address, initialJettonBalance, toNano('0.05'), toNano('1'));
        console.log("mintResult.....",mintResult);

        expect(await aliceJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await jettonMinter_dog.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);
        initialTotalSupply += initialJettonBalance;
        // mint  100 usdt to bob
        //todo mint should call from bridge
        // unauthorized_mint_request
        const mintResult2 = await jettonMinter_dog.sendMint(deployer_jetton.getSender(), bob.address, initialJettonBalance, toNano('0.05'), toNano('1'));
        console.log("mintResult2.....",mintResult2);


        expect(await bobJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await jettonMinter_dog.getTotalSupply()).toEqual(initialTotalSupply + initialJettonBalance);
        initialTotalSupply += initialJettonBalance;

    });

    it('[userLock original_token] should userLock success', async () => {
        let smgID = "0x000000000000000000000000000000000000000000746573746e65745f303638";
        let tokenPairID = 0x1;
        let crossValue = BigInt(toNano(1));
        let value = BigInt(toNano (2));
        console.log("smgID(bigInt)==>",BigInt(smgID));
        const queryID=1;

        console.log("before user lock");

        const ret = await bridge.sendUserLock(alice.getSender(), {
            value: value,
            queryID,
            tokenPairID,
            smgID,
            crossValue,
            dstUserAccount:bob.address,
        });
    });

    /*it('[userLock wrapped_token ] should userLock success', async () => {
        let smgID = "0x000000000000000000000000000000000000000000746573746e65745f303638";
        let tokenPairID = 0x2;
        let crossValue = BigInt(toNano(1));
        let value = BigInt(toNano (2));
        console.log("smgID(bigInt)==>",BigInt(smgID));
        const queryID=1;

        console.log("before user lock");

        const ret = await bridge.sendUserLock(alice.getSender(), {
            value: value,
            queryID,
            tokenPairID,
            smgID,
            crossValue,
            dstUserAccount:bob.address,
        });
    });*/

    /*it('[userLock ton] should userLock success', async () => {
        let smgID = "0x000000000000000000000000000000000000000000746573746e65745f303638";
        let tokenPairID = 0x3;
        let crossValue = BigInt(toNano(1));
        let value = BigInt(toNano (2));
        console.log("smgID(bigInt)==>",BigInt(smgID));

        const user1 = await blockchain.treasury('user1');
        const user2 = await blockchain.treasury('user2');
        const queryID=1;

        console.log("before user lock");

        let beforeBridge = (await blockchain.getContract(bridge.address)).balance;
        let beforeUser1 = await user1.getBalance();
        let beforeUser2 = await user2.getBalance();

        const ret = await bridge.sendUserLock(user1.getSender(), {
            value: value,
            queryID,
            tokenPairID,
            smgID,
            crossValue,
            dstUserAccount:user2.address,
        });
        // console.log("after user lock");
        // console.log("user1.address==>",user1.address);
        // console.log("user1.address(bigInt)==>",BigInt("0x"+user1.address.hash.toString('hex')));
        // console.log("user1.balance(bigInt)==>",await user1.getBalance());
        //
        // console.log("user2.address==>",user2.address);
        // console.log("user2.address(bigInt)==>",BigInt("0x"+user2.address.hash.toString('hex')));
        // console.log("user2.balance(bigInt)==>",await user2.getBalance());
        //
        // console.log("bridge.address==>",bridge.address);
        // console.log("bridge.address(bigInt)==>",BigInt("0x"+bridge.address.hash.toString('hex')));
        // console.log("bridge.balance(bigInt)==>",(await blockchain.getContract(bridge.address)).balance);

        let afterBridge = (await blockchain.getContract(bridge.address)).balance;
        let afterUser1 = await user1.getBalance();
        let afterUser2 = await user2.getBalance();

        console.log("user1AddrInt,user2AddrInt,bridgeAddrInt",
            BigInt("0x"+user1.address.hash.toString('hex')),
            BigInt("0x"+user2.address.hash.toString('hex')),
            BigInt("0x"+bridge.address.hash.toString('hex')));
        console.log("beforeBridge, afterBridge, crossValue, value, delta(bridge)",
            fromNano(beforeBridge),
            fromNano(afterBridge),
            fromNano(crossValue),
            fromNano(value),
            afterBridge-beforeBridge);
        console.log("beforeUser1, afterUser1, delta",fromNano(beforeUser1),fromNano(afterUser1),afterUser1-beforeUser1);
        console.log("beforeUser2, afterUser2,delta",fromNano(beforeUser2),fromNano(afterUser2),afterUser2-beforeUser2);

        console.log("ret.transaction=>",ret.transactions);
        for (let t of ret.transactions){
            console.log("trans detailed",t.inMessage);
        }
        // console.log("ret=====>",ret);
        expect(true).toEqual(afterBridge == (beforeBridge + crossValue) );
        expect( true).toEqual(afterUser1 == (beforeUser1 - crossValue) );
        expect( true).toEqual(afterUser2 == afterUser1);
    });*/

    it('[smgRelease ton] should msgRelease success', async () => {
        let smgID = "0x000000000000000000000000000000000000000000746573746e65745f303638";
        let tokenPairID = 0x3;
        let releaseValue = BigInt(toNano(1));
        let value = BigInt(toNano (2));
        console.log("smgID(bigInt)==>",BigInt(smgID));

        const queryID=1;
        const uniqueID=BigInt(1);
        const fee = BigInt(1000);

        const e = BigInt(0);
        const p = BigInt(0);
        const s = BigInt(0);

        console.log("before smgRelease ton");

        let beforeBridge = (await blockchain.getContract(bridge.address)).balance;
        let beforeAlice = await alice.getBalance();

        const ret = await bridge.sendSmgRelease(alice.getSender(), {
            value: value,
            queryID,
            uniqueID,
            smgID,
            tokenPairID,
            releaseValue,
            fee,
            //tokenAccount:ZERO_ACCOUNT,// todo how to get zero address of TON? or not use this parameter, use address from tokenPair?
            tokenAccount:alice.address,// todo how to get zero address of TON? or not use this parameter, use address from tokenPair?
            userAccount:alice.address,
            e,
            p,
            s
        });

        let afterBridge = (await blockchain.getContract(bridge.address)).balance;
        let afterAlice = await alice.getBalance();


        console.log("beforeAlice, afterAlice, delta",fromNano(beforeAlice),fromNano(afterAlice),afterAlice-beforeAlice);
        console.log("beforeBridge, afterBridge,delta",fromNano(beforeBridge),fromNano(afterBridge),afterBridge-beforeBridge);

        console.log("ret.transaction=>",ret.transactions);
        for (let t of ret.transactions){
            console.log("trans detailed",t.inMessage);
        }
        // console.log("ret=====>",ret);
        // todo add expect later
    });

});