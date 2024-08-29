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
    let bridge: SandboxContract<Bridge>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');

        let c = Bridge.createFromConfig(
            {
                owner: deployer.address,
                admin:deployer.address,
                halt:0,
                init:0,
            },
            code
        )

        bridge = blockchain.openContract(c);

        //deployer = await blockchain.treasury('deployer');


        const deployResult = await bridge.sendDeploy(deployer.getSender(), toNano('1000'));

        //console.log("deployResult==>",deployResult.transactions);

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

    });

});