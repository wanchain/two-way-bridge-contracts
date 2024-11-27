import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {Address, Cell, toNano,fromNano, TupleItemInt, beginCell} from '@ton/core';
import '@ton/test-utils';
import {Bridge, TON_COIN_ACCOUT,BIP44_CHAINID} from '../wrappers/Bridge';
import { compile } from '@ton/blueprint';
import { GroupApprove } from '../wrappers/GroupApprove';
import { common } from '../wrappers/common';
const schnorr = require('./tools-secp256k1.js');


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
    let fakeCode : Cell;

    beforeAll(async () => {
        code = await compile('GroupApprove');
        codeBridge = await compile('Bridge');
        fakeCode = await compile('Fake');
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
                chainId: BIP44_CHAINID,
                taskId:  0,
                foundation: oracleAdmin.address,
                bridge: bridge.address,
            },
            code
        )
        groupApprove = blockchain.openContract(c);

        const deployResult = await groupApprove.sendDeploy(deployer.getSender());
        console.log("GroupApprove.address==>",groupApprove.address);
        console.log("GroupApprove.address(bigInt)==>",BigInt("0x"+groupApprove.address.hash.toString('hex')));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: groupApprove.address,
            deploy: true,
            success: true,
        });     
        
        // add smg
        let startTime = Math.floor(Date.now()/1000)
        let endTime = Math.floor(Date.now()/1000) + 3600*24
        let ret = await bridge.sendSetStoremanGroupConfig(oracleAdmin.getSender(),{
            id: BigInt(smgId),
            gpkX:BigInt(gpkX), gpkY:BigInt(gpkY), 
            startTime,
            endTime,
            value: toNano('1000'),
            queryID: 1,
        });
        expect(ret.transactions).toHaveTransaction({
            from: oracleAdmin.address,
            to: bridge.address,
            success: true,
        });  
        await sleep(1000 * 1);
        let smg = await bridge.getStoremanGroupConfig(BigInt(smgId))
        console.log("getStoremanGroupConfig:", smg)
        ret = await bridge.sendSetStoremanGroupConfigCommit(oracleAdmin.getSender(),{
            id: BigInt(smgId),
            gpkX:BigInt(gpkX), gpkY:BigInt(gpkY), 
            startTime,
            endTime,
            value: toNano('1000'),
            queryID: 1,
        });
        expect(ret.transactions).toHaveTransaction({
            from: oracleAdmin.address,
            to: bridge.address,
            success: true,
        }); 
    });



    it('group approve set halt', async () => {
        let user1 = await blockchain.treasury('user1');

        let info = await bridge.getCrossConfig()
        console.log("getCrossConfig:", info)
        expect(info.halt).toEqual(0)
        const balance = await user1.getBalance();
        console.log("balance before tx:", fromNano(balance))
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


        const balance2 = await user1.getBalance();
        console.log("balance after tx:", fromNano(balance2))

        // get task
        taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("task:", task)
        expect(task.executed).toEqual(0)

        // send approve and exec

        // let hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
        let hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
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
        console.log("msg task:", task)
        expect(task.executed).toEqual(1)
    });    

    it('group approve transfer cross owner', async () => {
        let user1 = await blockchain.treasury('user1');

        let info = await bridge.getCrossConfig()
        console.log("getCrossConfig:", info)
        expect(info.halt).toEqual(0)
        const balance = await user1.getBalance();
        
        console.log("balance before tx:", fromNano(balance))
        // get task
        let taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        expect(taskCount).toEqual(0)

        let txRet = await groupApprove.sendTransferCrossOwner(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            chainId: BIP44_CHAINID,
            toAddr: bridge.address,
            owner: owner2.address,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });

        const balance2 = await user1.getBalance();
        console.log("balance after tx:", fromNano(balance2))

        // get task
        taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        expect(taskCount).toEqual(1)

        let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("task:", task)
        expect(task.executed).toEqual(0)
        // send approve and exec
        let hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
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
        expect(info.owner.toString()).toEqual(owner2.address.toString())
        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("msg task:", task)
        expect(task.executed).toEqual(1)
    });    
    
    it('group approve transfer oracle admin', async () => {
        let user1 = await blockchain.treasury('user1');

        let info = await bridge.getCrossConfig()
        console.log("getCrossConfig:", info)
        expect(info.halt).toEqual(0)
        const balance = await user1.getBalance();
        
        console.log("balance before tx:", fromNano(balance))
        // get task
        let taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        expect(taskCount).toEqual(0)    

        let txRet = await groupApprove.sendTransferOracleAdmin(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            chainId: BIP44_CHAINID,
            toAddr: bridge.address,
            oracleAdmin: owner2.address,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });

        const balance2 = await user1.getBalance();
        console.log("balance after tx:", fromNano(balance2))

        // get task
        taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        expect(taskCount).toEqual(1) 

        let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("task:", task)

        // send approve and exec
        let hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
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
        expect(info.oracleAdmin.toString()).toEqual(owner2.address.toString())

        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("msg task:", task)
        expect(task.executed).toEqual(1)
    });     
    it('group approve transfer robot admin', async () => {
        let user1 = await blockchain.treasury('user1');

        let info = await bridge.getCrossConfig()
        console.log("getCrossConfig:", info)
        expect(info.halt).toEqual(0)
        const balance = await user1.getBalance();
        console.log("balance before tx:", fromNano(balance))

        let txRet = await groupApprove.sendTransferRobotAdmin(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            chainId: BIP44_CHAINID,
            toAddr: bridge.address,
            robotAdmin: owner2.address,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });


        const balance2 = await user1.getBalance();
        console.log("balance after tx:", fromNano(balance2))

        // get task
        let taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        expect(taskCount).toEqual(1) 

        let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("task:", task)

        // send approve and exec
        let hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
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
        expect(info.robotAdmin.toString()).toEqual(owner2.address.toString())
        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("msg task:", task)
        expect(task.executed).toEqual(1)
    });       
    it('group approve set fee proxy', async () => {
        let user1 = await blockchain.treasury('user1');

        let info = await bridge.getCrossConfig()
        console.log("getCrossConfig:", info)
        expect(info.halt).toEqual(0)
        const balance = await user1.getBalance();
        
        console.log("balance before tx:", fromNano(balance))
        // get task
        let taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        expect(taskCount).toEqual(0) 


        let txRet = await groupApprove.sendSetFeeProxy(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            chainId: BIP44_CHAINID,
            toAddr: bridge.address,
            feeProxy: owner2.address,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });

        const balance2 = await user1.getBalance();
        console.log("balance after tx:", fromNano(balance2))

        // get task
        taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)

        let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("task:", task)

        // send approve and exec
        let hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
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
        expect(info.feeProxyAdmin.toString()).toEqual(owner2.address.toString())

        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("msg task:", task)
        expect(task.executed).toEqual(1)
    }); 
    it('group approve add cross admin, remove cross admin', async () => {
        let user1 = await blockchain.treasury('user1');

        let info = await bridge.getCrossConfig()
        console.log("getCrossConfig:", info)
        expect(info.halt).toEqual(0)
        const balance = await user1.getBalance();
        
        console.log("balance before tx:", fromNano(balance))
        // get task
        let taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        expect(taskCount).toEqual(0) 

        console.log("owner2.address(bigInt)==>", "0x" + bridge.address.hash.toString('hex'));

        let txRet = await groupApprove.sendAddCrossAdmin(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            chainId: BIP44_CHAINID,
            toAddr: bridge.address,
            admin: owner2.address,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });

        const balance2 = await user1.getBalance();
        
        console.log("balance after tx:", fromNano(balance2))

        // get task
        taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        expect(taskCount).toEqual(1) 

        let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("task:", task)

        // send approve and exec
        let hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
        console.log("hashBuf:", hashBuf, BigInt(`0x${hashBuf.toString('hex')}`))

        let sig = schnorr.getSecSchnorrSByMsgHash(skSmg,hashBuf);
        let e = BigInt(sig.e);
        let p = BigInt(sig.p);
        let s = BigInt(sig.s);        
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

        console.log("owner2:", owner2.address)
        console.log("owner2.address(bigInt)==>", BigInt("0x" + owner2.address.hash.toString('hex')));
        let a0 = await bridge.getFirstAdmin()
        console.log("first admin:", a0)

        expect(a0).toEqual(owner2.address.toString())
        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        expect(task.executed).toEqual(1)

        // remove

        txRet = await groupApprove.sendRemoveCrossAdmin(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            chainId: BIP44_CHAINID,
            toAddr: bridge.address,
            admin: owner2.address,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });

        // get task
        taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        expect(taskCount).toEqual(2) 

        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("task:", task)

        // send approve and exec
        hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
        console.log("hashBuf:", hashBuf, BigInt(`0x${hashBuf.toString('hex')}`))

        sig = schnorr.getSecSchnorrSByMsgHash(skSmg,hashBuf);
        e = BigInt(sig.e);
        p = BigInt(sig.p);
        s = BigInt(sig.s);        
        txRet = await groupApprove.sendApproveExec(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            taskId: taskCount - 1,
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

        console.log("owner2:", owner2.address)
        console.log("owner2.address(bigInt)==>", BigInt("0x" + owner2.address.hash.toString('hex')));
        a0 = await bridge.getFirstAdmin()
        console.log("first admin:", a0)

        expect(a0).toEqual("")
        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("msg task:", task)
        expect(task.executed).toEqual(1)
    });        

     
    
    it('group approve transfer foundation', async () => {
        let user1 = await blockchain.treasury('user1');

        // get task
        let taskCount = await groupApprove.getProposolCount()
        expect(taskCount).toEqual(0)

        let txRet = await groupApprove.sendTransferFoundation(user1.getSender(), {
            value: toNano('0.1'),
            queryID:1,
            chainId: BIP44_CHAINID,
            toAddr: groupApprove.address,
            foundation: owner2.address,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });

        const balance2 = await user1.getBalance();
        console.log("balance after tx:", fromNano(balance2))

        // get task
        taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        expect(taskCount).toEqual(1)

        let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("task:", task)
        expect(task.executed).toEqual(0)
        // send approve and exec
        let hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
        console.log("hashBuf:", hashBuf, BigInt(`0x${hashBuf.toString('hex')}`))

        let sig = schnorr.getSecSchnorrSByMsgHash(skSmg,hashBuf);
        const e = BigInt(sig.e);
        const p = BigInt(sig.p);
        const s = BigInt(sig.s);        
        txRet = await groupApprove.sendApproveExec(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            taskId: taskCount - 1,
            smgId: BigInt(smgId),
            e, p, s
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });

        let config = await groupApprove.getConfig()
        console.log("getConfig:", config)
        console.log("owner2:", owner2.address)
        expect(config.foundation.toString()).toEqual(owner2.address.toString())
        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("msg task:", task)
        expect(task.executed).toEqual(1)

    });   

    it('group approve upgrade', async () => {
        let user1 = await blockchain.treasury('user1');

        let info = await bridge.getCrossConfig()
        console.log("getCrossConfig:", info)
        expect(info.halt).toEqual(0)
        let version = await bridge.getVersion()
        console.log("getVersion:", version)
        expect(version).toEqual("0.1")
        const balance = await user1.getBalance();
        
        console.log("balance before tx:", fromNano(balance))
        // get task
        let taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)
        expect(taskCount).toEqual(0) 


        let txRet = await groupApprove.sendUpgradeSC(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            chainId: BIP44_CHAINID,
            toAddr: bridge.address,
            code: fakeCode,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });

        const balance2 = await user1.getBalance();
        console.log("balance after tx:", fromNano(balance2))

        // get task
        taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)

        let task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("task:", task)

        // send approve and exec
        let hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
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
        version = await bridge.getVersion()
        console.log("getVersion:", version)
        expect(version).toEqual("Fake")

        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("msg task:", task)
        expect(task.executed).toEqual(1)
    });     
    it.only('group approve add token pair', async () => {
        let user1 = await blockchain.treasury('user1');

        let info = await bridge.getCrossConfig()
        console.log("getCrossConfig:", info)
        expect(info.halt).toEqual(0)
        const balance = await user1.getBalance();
        
        console.log("balance before tx:", fromNano(balance))
        // get task
        let taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)

        let tokenPairId = 999;
        let fromChainID = 1234;
        let toChainID = BIP44_CHAINID;
        let fromAccount = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
        let toAccount = "EQB6Ipa85lD-LVxypTA3xQs2dmdcM_VeUUQexul6_TDOPu_d";
        let txRet = await groupApprove.sendAddTokenPair(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            chainId: BIP44_CHAINID,
            toAddr: bridge.address,
            tokenPairId, 
            fromChainID,
            fromAccount,
            toChainID,
            toAccount,
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
        let hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
        console.log("hashBuf:", hashBuf, BigInt(`0x${hashBuf.toString('hex')}`))

        let sig = schnorr.getSecSchnorrSByMsgHash(skSmg,hashBuf);
        let e = BigInt(sig.e);
        let p = BigInt(sig.p);
        let s = BigInt(sig.s);        
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
        let tokenPair = await bridge.getTokenPair(tokenPairId)
        console.log("tokenPair:", tokenPair)
        expect(tokenPair.fromChainID).toEqual(fromChainID)
        expect(tokenPair.toChainID).toEqual(toChainID)
        expect(tokenPair.fromAccount).toEqual(fromAccount)
        expect(tokenPair.toAccount).toEqual(toAccount)
        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("msg task:", task)
        expect(task.executed).toEqual(1)

        // remove
        txRet = await groupApprove.sendRemoveTokenPair(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            chainId: BIP44_CHAINID,
            toAddr: bridge.address,
            tokenPairId, 
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });   
        
        // get task
        taskCount = await groupApprove.getProposolCount()
        console.log("taskCount:", taskCount)

        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("task:", task)

        // send approve and exec
        hashBuf = GroupApprove.computeHash(BigInt(taskCount - 1), BigInt(BIP44_CHAINID));
        console.log("hashBuf:", hashBuf, BigInt(`0x${hashBuf.toString('hex')}`))

        sig = schnorr.getSecSchnorrSByMsgHash(skSmg,hashBuf);
        e = BigInt(sig.e);
        p = BigInt(sig.p);
        s = BigInt(sig.s);        
        txRet = await groupApprove.sendApproveExec(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            taskId: taskCount - 1,
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
        tokenPair = await bridge.getTokenPair(tokenPairId)
        console.log("tokenPair:", tokenPair)
        expect(tokenPair.fromChainID).toEqual(0)
        expect(tokenPair.toChainID).toEqual(0)
        expect(tokenPair.fromAccount).toEqual("")
        expect(tokenPair.toAccount).toEqual("")        
        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("msg task:", task)
        expect(task.executed).toEqual(1)        
    });         
     
});
