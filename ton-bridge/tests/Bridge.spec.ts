import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {Address, Cell, toNano,TupleItemInt} from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Bridge', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Bridge');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let smgFeeProxy: SandboxContract<TreasuryContract>;
    let oracleAdmin: SandboxContract<TreasuryContract>;
    let bridge: SandboxContract<Bridge>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        smgFeeProxy = await blockchain.treasury('smgFeeProxy');
        oracleAdmin = await blockchain.treasury('oracleAdmin');

        let c = Bridge.createFromConfig(
            {
                owner: deployer.address,
                halt:0,
                init:0,
                smgFeeProxy:smgFeeProxy.address,
                oracleAdmin:oracleAdmin.address,
            },
            code
        )
        bridge = blockchain.openContract(c);

        const deployResult = await bridge.sendDeploy(deployer.getSender());

        //console.log("deployResult==>",deployResult.transactions);

        console.log("deployer==>",deployer);
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
    });


    it.only('set cross owner', async () => {
        let retCrossConfigOld = await bridge.getCrossConfig()
        console.log("retCrossConfigOld",retCrossConfigOld);

        let oldOwner = retCrossConfigOld.owner;
        console.log("oldOwner",oldOwner);

        const user1 = await blockchain.treasury('user1');
        const queryID=1;

        console.log("user1.address==>",user1.address);
        console.log("user1.address(bigInt)==>",BigInt("0x"+user1.address.hash.toString('hex')));

        console.log("adminAddr",deployer.address.toRawString());
        const ret = await bridge.sendTransferOwner(  user1.address,
            {
            sender:deployer.getSender(),
            value: toNano('0.1'),
            queryID,
        });

        // console.log("ret",ret);

        let retCrossConfig = await bridge.getCrossConfig()
        console.log("retCrossConfig",retCrossConfig);

        let newOwner = retCrossConfig.owner;
        console.log("newOwner",newOwner);

        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });

        expect(newOwner.equals(user1.address));

    });


    // it('should setFee success', async () => {

    //     let srcChainId = 0x1234;
    //     let srcChainId2 = 0x1235;
    //     let dstChainId = 0x4567;
    //     let contractFee = 0x2345;
    //     let agentFee = 0x6789;
    //     let agentFee2 = 0x6780;

    //     let retOld = await bridge.getFee(srcChainId,dstChainId);
    //     console.log("retOld",retOld);

    //     const user1 = await blockchain.treasury('user1');
    //     const queryID=1;

    //     console.log("user1.address==>",user1.address);
    //     console.log("user1.address(bigInt)==>",BigInt("0x"+user1.address.hash.toString('hex')));

    //     console.log("adminAddr",deployer.address.toRawString());
    //     let ret = await bridge.sendSetFee(deployer.getSender(), {
    //         value: toNano('1000'),
    //         queryID,
    //         srcChainId,
    //         dstChainId,
    //         contractFee,
    //         agentFee,
    //     });
    //     ret = await bridge.sendSetFee(deployer.getSender(), {
    //         value: toNano('1000'),
    //         queryID,
    //         srcChainId:srcChainId2,
    //         dstChainId,
    //         contractFee,
    //         agentFee:agentFee2,
    //     });
    //     console.log("ret",ret);

    //     let retNew = await bridge.getFee(srcChainId,dstChainId);
    //     console.log("retNew",retNew);
    //     retNew = await bridge.getFee(srcChainId2,dstChainId);
    //     console.log("retNew2",retNew);
    //     expect(ret.transactions).toHaveTransaction({
    //         from: deployer.address,
    //         to: bridge.address,
    //         success: true,
    //     });

    // });




});