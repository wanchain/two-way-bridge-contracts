import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {Address, Cell, toNano,fromNano, TupleItemInt, beginCell} from '@ton/core';
import '@ton/test-utils';
import {Bridge, TON_COIN_ACCOUT,BIP44_CHAINID} from '../wrappers/Bridge';
import { compile } from '@ton/blueprint';
import { GroupApprove } from '../wrappers/GroupApprove';
import { common } from '../wrappers/common';

const schnorr = require('./tools-secp256k1.js');

function AccountToBig(addr: Address) {
    return BigInt("0x" + addr.hash.toString('hex'));
};

const skSmg = Buffer.from("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex');
const gpk = schnorr.getPKBySk(skSmg);
const gpkX = gpk.startsWith("0x") || gpk.startsWith("0X")? gpk.substring(0,66): `0x${gpk.substring(0,64)}`;
const gpkY = gpk.startsWith("0x") || gpk.startsWith("0X")? `0x${gpk.substring(66)}`: `0x${gpk.substring(64)}`;
console.log("gpkX, gpkY:", gpkX, gpkY)
const smgId = "0x000000000000000000000000000000000000000000746573746e65745f303638";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

describe('GroupApprove', () => {
    let code: Cell;
    let codeBridge: Cell;

    beforeAll(async () => {
        code = await compile('GroupApprove');
        codeBridge = await compile('Bridge');

    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let smgFeeProxy: SandboxContract<TreasuryContract>;
    let oracleAdmin: SandboxContract<TreasuryContract>;
    let robotAdmin: SandboxContract<TreasuryContract>;
    let groupApprove: SandboxContract<GroupApprove>;
    let bridge: SandboxContract<Bridge>;
    let owner2: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        smgFeeProxy = await blockchain.treasury('smgFeeProxy');
        oracleAdmin = await blockchain.treasury('oracleAdmin');
        robotAdmin = await blockchain.treasury('robotAdmin');
        owner2 = await blockchain.treasury('owner2');



        let c_bridge = Bridge.createFromConfig(
            {
                owner: deployer.address,
                //admin: deployer.address,
                halt: 0,
                init: 0,
                smgFeeProxy: smgFeeProxy.address,
                oracleAdmin: oracleAdmin.address,
                robotAdmin: robotAdmin.address,
            },
            codeBridge
        )

        bridge = blockchain.openContract(c_bridge);
        const deployResultBridge = await bridge.sendDeploy(deployer.getSender(), toNano('1000'));
        expect(deployResultBridge.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            deploy: true,
            success: true,
        });
        console.log("bridge.address==>",bridge.address);
        console.log("bridge.address(bigInt)==>",BigInt("0x"+bridge.address.hash.toString('hex')));

        let c = GroupApprove.createFromConfig(
            {
                chainId: 1,
                taskId:  0,
                foundation: oracleAdmin.address,
                bridge: bridge.address,
            },
            code
        )
        groupApprove = blockchain.openContract(c);

        const deployResult = await groupApprove.sendDeploy(deployer.getSender());

        //console.log("deployResult==>",deployResult.transactions);

        // console.log("deployer==>",deployer);
        // console.log("deployer.address==>",deployer.address);
        // console.log("deployer.address(bigInt)==>",BigInt("0x"+deployer.address.hash.toString('hex')));
        console.log("GroupApprove.address==>",groupApprove.address);
        console.log("GroupApprove.address(bigInt)==>",BigInt("0x"+groupApprove.address.hash.toString('hex')));


        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: groupApprove.address,
            deploy: true,
            success: true,
        });        

    });


    it('add first smg', async () => {
        let user1 = await blockchain.treasury('user1');


        // 获取余额（返回的是nano TON）
        const balance = await user1.getBalance();
        
        // 转换为TON单位
        console.log("balance 00000000:", fromNano(balance))

        // let txRet = await groupApprove.sendTransferCrossOwner(smgFeeProxy.address, {
        //     sender: user1.getSender(),
        //     value: toNano('97'),
        //     queryID:1,
        // })
        // expect(txRet.transactions).toHaveTransaction({
        //     from: user1.address,
        //     to: groupApprove.address,
        //     success: true,
        // });
        // console.log("txRet:", txRet.transactions)
        // console.log("txRet:", txRet.transactions[1].totalFees)
        // console.log("txRet:", txRet.transactions[2].totalFees)

        const balance2 = await user1.getBalance();
        
        // 转换为TON单位
        console.log("balance 1111111:", fromNano(balance2))
    });

    it.only('group approve set halt', async () => {
        let user1 = await blockchain.treasury('user1');

        let info = await bridge.getCrossConfig()
        console.log("getCrossConfig:", info)
        expect(info.halt).toEqual(0)
        const balance = await user1.getBalance();
        
        console.log("balance before tx:", fromNano(balance))
        // get task
        let taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)


        let txRet = await groupApprove.sendCrossHalt(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            chainId: BIP44_CHAINID,
            toAddr: bridge.address,
            halt: 1,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });
        // console.log("txRet:", txRet.transactions)
        // console.log("txRet:", txRet.transactions[1].totalFees)
        // console.log("txRet:", txRet.transactions[2].totalFees)

        const balance2 = await user1.getBalance();
        
        console.log("balance after tx:", fromNano(balance2))

        // get task
        taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)

        let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("task:", task)

        // send approve and exec

        // let hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
        let hashBuf = GroupApprove.computeHash(BigInt(0), BigInt(BIP44_CHAINID));
        console.log("hashBuf:", hashBuf, BigInt(`0x${hashBuf.toString('hex')}`))

        let sig = schnorr.getSecSchnorrSByMsgHash(skSmg,hashBuf);
        const e = BigInt(sig.e);

        const p = BigInt(sig.p);
        const s = BigInt(sig.s);        
        txRet = await groupApprove.sendApproveExec(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            taskId: 0,
            smgId: BigInt(smgId),
            e, p, s
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });
        info = await bridge.getCrossConfig()
        console.log("getCrossConfig:", info)
        expect(info.halt).toEqual(1)
        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("halt msg task:", task)
    });    



    // it('group approve transfer owner', async () => {
    //     let user1 = await blockchain.treasury('user1');

    //     let info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     expect(info.halt).toEqual(0)
    //     const balance = await user1.getBalance();
        
    //     console.log("balance before tx:", fromNano(balance))
    //     // get task
    //     let taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)


    //     let txRet = await groupApprove.sendTransferCrossOwner(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         chainId: 1,
    //         toAddr: bridge.address,
    //         owner: owner2.address,
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     // console.log("txRet:", txRet.transactions)
    //     // console.log("txRet:", txRet.transactions[1].totalFees)
    //     // console.log("txRet:", txRet.transactions[2].totalFees)

    //     const balance2 = await user1.getBalance();
        
    //     console.log("balance after tx:", fromNano(balance2))

    //     // get task
    //     taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)

    //     let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("task:", task)

    //     // send approve and exec
    //     txRet = await groupApprove.sendApproveExec(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         taskId: 0,
    //         smgId: beginCell().endCell().beginParse(),
    //         r: beginCell().endCell().beginParse(),
    //         s: beginCell().endCell().beginParse(),
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     // expect(info.halt).toEqual(1)
    //     // await sleep(2500);
    //     task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("halt msg task:", task)
    // });    
    
    // it('group approve transfer oracle admin', async () => {
    //     let user1 = await blockchain.treasury('user1');

    //     let info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     expect(info.halt).toEqual(0)
    //     const balance = await user1.getBalance();
        
    //     console.log("balance before tx:", fromNano(balance))
    //     // get task
    //     let taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)


    //     let txRet = await groupApprove.sendTransferOracleAdmin(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         chainId: 1,
    //         toAddr: bridge.address,
    //         oracleAdmin: owner2.address,
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     // console.log("txRet:", txRet.transactions)
    //     // console.log("txRet:", txRet.transactions[1].totalFees)
    //     // console.log("txRet:", txRet.transactions[2].totalFees)

    //     const balance2 = await user1.getBalance();
        
    //     console.log("balance after tx:", fromNano(balance2))

    //     // get task
    //     taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)

    //     let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("task:", task)

    //     // send approve and exec
    //     txRet = await groupApprove.sendApproveExec(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         taskId: 0,
    //         smgId: beginCell().endCell().beginParse(),
    //         r: beginCell().endCell().beginParse(),
    //         s: beginCell().endCell().beginParse(),
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     // expect(info.halt).toEqual(1)
    //     // await sleep(2500);
    //     task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("halt msg task:", task)
    // });     
    // it('group approve transfer robot admin', async () => {
    //     let user1 = await blockchain.treasury('user1');

    //     let info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     expect(info.halt).toEqual(0)
    //     const balance = await user1.getBalance();
        
    //     console.log("balance before tx:", fromNano(balance))
    //     // get task
    //     let taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)


    //     let txRet = await groupApprove.sendTransferRobotAdmin(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         chainId: 1,
    //         toAddr: bridge.address,
    //         robotAdmin: owner2.address,
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     // console.log("txRet:", txRet.transactions)
    //     // console.log("txRet:", txRet.transactions[1].totalFees)
    //     // console.log("txRet:", txRet.transactions[2].totalFees)

    //     const balance2 = await user1.getBalance();
        
    //     console.log("balance after tx:", fromNano(balance2))

    //     // get task
    //     taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)

    //     let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("task:", task)

    //     // send approve and exec
    //     txRet = await groupApprove.sendApproveExec(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         taskId: 0,
    //         smgId: beginCell().endCell().beginParse(),
    //         r: beginCell().endCell().beginParse(),
    //         s: beginCell().endCell().beginParse(),
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     // expect(info.halt).toEqual(1)
    //     // await sleep(2500);
    //     task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("halt msg task:", task)
    // });       

    // it('group approve add cross admin', async () => {
    //     let user1 = await blockchain.treasury('user1');

    //     let info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     expect(info.halt).toEqual(0)
    //     const balance = await user1.getBalance();
        
    //     console.log("balance before tx:", fromNano(balance))
    //     // get task
    //     let taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)


    //     let txRet = await groupApprove.sendAddCrossAdmin(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         chainId: 1,
    //         toAddr: bridge.address,
    //         admin: owner2.address,
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     // console.log("txRet:", txRet.transactions)
    //     // console.log("txRet:", txRet.transactions[1].totalFees)
    //     // console.log("txRet:", txRet.transactions[2].totalFees)

    //     const balance2 = await user1.getBalance();
        
    //     console.log("balance after tx:", fromNano(balance2))

    //     // get task
    //     taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)

    //     let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("task:", task)

    //     // send approve and exec
    //     txRet = await groupApprove.sendApproveExec(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         taskId: 0,
    //         smgId: beginCell().endCell().beginParse(),
    //         r: beginCell().endCell().beginParse(),
    //         s: beginCell().endCell().beginParse(),
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     // expect(info.halt).toEqual(1)
    //     // await sleep(2500);
    //     task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("halt msg task:", task)
    // });        

    // it('group approve remove cross admin', async () => {
    //     let user1 = await blockchain.treasury('user1');

    //     let info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     expect(info.halt).toEqual(0)
    //     const balance = await user1.getBalance();
        
    //     console.log("balance before tx:", fromNano(balance))
    //     // get task
    //     let taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)


    //     let txRet = await groupApprove.sendAddCrossAdmin(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         chainId: 1,
    //         toAddr: bridge.address,
    //         admin: owner2.address,
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     // console.log("txRet:", txRet.transactions)
    //     // console.log("txRet:", txRet.transactions[1].totalFees)
    //     // console.log("txRet:", txRet.transactions[2].totalFees)

    //     const balance2 = await user1.getBalance();
        
    //     console.log("balance after tx:", fromNano(balance2))

    //     // get task
    //     taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)

    //     let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("task:", task)

    //     // send approve and exec
    //     txRet = await groupApprove.sendApproveExec(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         taskId: 0,
    //         smgId: beginCell().endCell().beginParse(),
    //         r: beginCell().endCell().beginParse(),
    //         s: beginCell().endCell().beginParse(),
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     // expect(info.halt).toEqual(1)
    //     // await sleep(2500);
    //     task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("halt msg task:", task)
    // });       
    
    // it('group approve set fee proxy', async () => {
    //     let user1 = await blockchain.treasury('user1');

    //     let info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     expect(info.halt).toEqual(0)
    //     const balance = await user1.getBalance();
        
    //     console.log("balance before tx:", fromNano(balance))
    //     // get task
    //     let taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)


    //     let txRet = await groupApprove.sendSetFeeProxy(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         chainId: 1,
    //         toAddr: bridge.address,
    //         feeProxy: owner2.address,
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     // console.log("txRet:", txRet.transactions)
    //     // console.log("txRet:", txRet.transactions[1].totalFees)
    //     // console.log("txRet:", txRet.transactions[2].totalFees)

    //     const balance2 = await user1.getBalance();
        
    //     console.log("balance after tx:", fromNano(balance2))

    //     // get task
    //     taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)

    //     let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("task:", task)

    //     // send approve and exec
    //     txRet = await groupApprove.sendApproveExec(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         taskId: 0,
    //         smgId: beginCell().endCell().beginParse(),
    //         r: beginCell().endCell().beginParse(),
    //         s: beginCell().endCell().beginParse(),
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     // expect(info.halt).toEqual(1)
    //     // await sleep(2500);
    //     task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("halt msg task:", task)
    // }); 
    
    // it('group approve transfer foundation', async () => {
    //     let user1 = await blockchain.treasury('user1');

    //     const balance = await user1.getBalance();
    //     console.log("balance before tx:", fromNano(balance))

    //     let txRet = await groupApprove.sendTransferFoundation(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         chainId: 1,
    //         toAddr: bridge.address,
    //         foundation: owner2.address,
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     // console.log("txRet:", txRet.transactions)
    //     // console.log("txRet:", txRet.transactions[1].totalFees)
    //     // console.log("txRet:", txRet.transactions[2].totalFees)

    //     const balance2 = await user1.getBalance();
        
    //     console.log("balance after tx:", fromNano(balance2))


    // });   
    
    // it('group approve add cross admin', async () => {
    //     let user1 = await blockchain.treasury('user1');

    //     let info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     expect(info.halt).toEqual(0)
    //     const balance = await user1.getBalance();
        
    //     console.log("balance before tx:", fromNano(balance))
    //     // get task
    //     let taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)


    //     let txRet = await groupApprove.sendAddCrossAdmin(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         chainId: 1,
    //         toAddr: bridge.address,
    //         admin: owner2.address,
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     // console.log("txRet:", txRet.transactions)
    //     // console.log("txRet:", txRet.transactions[1].totalFees)
    //     // console.log("txRet:", txRet.transactions[2].totalFees)

    //     const balance2 = await user1.getBalance();
        
    //     console.log("balance after tx:", fromNano(balance2))

    //     // get task
    //     taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)

    //     let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("task:", task)

    //     // send approve and exec
    //     txRet = await groupApprove.sendApproveExec(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         taskId: 0,
    //         smgId: beginCell().endCell().beginParse(),
    //         r: beginCell().endCell().beginParse(),
    //         s: beginCell().endCell().beginParse(),
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     // expect(info.halt).toEqual(1)
    //     // await sleep(2500);
    //     task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("halt msg task:", task)
    // });   
    
    // it('group approve add token pair', async () => {
    //     let user1 = await blockchain.treasury('user1');

    //     let info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     expect(info.halt).toEqual(0)
    //     const balance = await user1.getBalance();
        
    //     console.log("balance before tx:", fromNano(balance))
    //     // get task
    //     let taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)

    //     let tokenPairId = 0x999;
    //     let fromChainID = 0x1234;
    //     let toChainID = 0x4567;
    //     let fromAccount = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    //     let toAccount = "kQDwf9dYB-a40vYJsmSGD5RBxLhaiagIGOBoP3EGfyV5O7gA";
    //     let txRet = await groupApprove.sendAddTokenPair(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         chainId: 1,
    //         toAddr: bridge.address,
    //         tokenPairId, 
    //         fromChainID,
    //         fromAccount,
    //         toChainID,
    //         toAccount,
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     // console.log("txRet:", txRet.transactions)
    //     // console.log("txRet:", txRet.transactions[1].totalFees)
    //     // console.log("txRet:", txRet.transactions[2].totalFees)

    //     const balance2 = await user1.getBalance();
        
    //     console.log("balance after tx:", fromNano(balance2))

    //     // get task
    //     taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)

    //     let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("task:", task)

    //     // send approve and exec
    //     txRet = await groupApprove.sendApproveExec(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         taskId: 0,
    //         smgId: beginCell().endCell().beginParse(),
    //         r: beginCell().endCell().beginParse(),
    //         s: beginCell().endCell().beginParse(),
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     // expect(info.halt).toEqual(1)
    //     // await sleep(2500);
    //     task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("halt msg task:", task)
    // });         
    // it('group approve remove token pair', async () => {
    //     let user1 = await blockchain.treasury('user1');

    //     let info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     expect(info.halt).toEqual(0)
    //     const balance = await user1.getBalance();
        
    //     console.log("balance before tx:", fromNano(balance))
    //     // get task
    //     let taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)

    //     let tokenPairId = 0x999;
    //     let fromChainID = 0x1234;
    //     let toChainID = 0x4567;
    //     let fromAccount = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    //     let toAccount = "kQDwf9dYB-a40vYJsmSGD5RBxLhaiagIGOBoP3EGfyV5O7gA";
    //     let txRet = await groupApprove.sendRemoveTokenPair(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         chainId: 1,
    //         toAddr: bridge.address,
    //         tokenPairId, 
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     // console.log("txRet:", txRet.transactions)
    //     // console.log("txRet:", txRet.transactions[1].totalFees)
    //     // console.log("txRet:", txRet.transactions[2].totalFees)

    //     const balance2 = await user1.getBalance();
        
    //     console.log("balance after tx:", fromNano(balance2))

    //     // get task
    //     taskCount = await groupApprove.getProposolCount()
    //     console.log("taskCount:", taskCount)

    //     let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("task:", task)

    //     // send approve and exec
    //     txRet = await groupApprove.sendApproveExec(user1.getSender(), {
    //         value: toNano('97'),
    //         queryID:1,
    //         taskId: 0,
    //         smgId: beginCell().endCell().beginParse(),
    //         r: beginCell().endCell().beginParse(),
    //         s: beginCell().endCell().beginParse(),
    //     })
    //     expect(txRet.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: groupApprove.address,
    //         success: true,
    //     });
    //     info = await bridge.getCrossConfig()
    //     console.log("getCrossConfig:", info)
    //     // expect(info.halt).toEqual(1)
    //     // await sleep(2500);
    //     task = await groupApprove.getProposolById(BigInt(taskCount - 1))
    //     console.log("halt msg task:", task)
    // });       
});
