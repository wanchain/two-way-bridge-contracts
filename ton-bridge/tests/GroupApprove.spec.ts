import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {Address, Cell, toNano,fromNano, TupleItemInt, beginCell} from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { GroupApprove } from '../wrappers/GroupApprove';
import {Bridge} from '../wrappers/Bridge';

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
    let groupApprove: SandboxContract<GroupApprove>;
    let bridge: SandboxContract<Bridge>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        smgFeeProxy = await blockchain.treasury('smgFeeProxy');
        oracleAdmin = await blockchain.treasury('oracleAdmin');

        let c = GroupApprove.createFromConfig(
            {
                chainId: 1,
                taskId:  0,
                foundation: oracleAdmin.address
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

        let c_bridge = Bridge.createFromConfig(
            {
                owner: deployer.address,
                //admin: deployer.address,
                halt: 0,
                init: 0,
                smgFeeProxy: smgFeeProxy.address,
                oracleAdmin: oracleAdmin.address,
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

    });


    it('add first smg', async () => {
        let user1 = await blockchain.treasury('user1');


        // 获取余额（返回的是nano TON）
        const balance = await user1.getBalance();
        
        // 转换为TON单位
        console.log("balance 00000000:", fromNano(balance))

        let txRet = await groupApprove.sendTransferCrossOwner(smgFeeProxy.address, {
            sender: user1.getSender(),
            value: toNano('97'),
            queryID:1,
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
            chainId: 1,
            toAddr: bridge.address,
            gpAddr: groupApprove.address,
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
        txRet = await groupApprove.sendApproveExec(user1.getSender(), {
            value: toNano('97'),
            queryID:1,
            taskId: 0,
            smgId: beginCell().endCell().beginParse(),
            r: beginCell().endCell().beginParse(),
            s: beginCell().endCell().beginParse(),
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: groupApprove.address,
            success: true,
        });
        info = await bridge.getCrossConfig()
        console.log("getCrossConfig:", info)
        expect(info.halt).toEqual(1)
        await sleep(2500);
        task = await groupApprove.getProposolById(BigInt(taskCount - 1))
        console.log("halt msg task:", task)
    });    
});
