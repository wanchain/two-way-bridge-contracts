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
    let robotAdmin: SandboxContract<TreasuryContract>;
    let admin1: SandboxContract<TreasuryContract>;
    let admin2: SandboxContract<TreasuryContract>;

    let bridge: SandboxContract<Bridge>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        smgFeeProxy = await blockchain.treasury('smgFeeProxy');
        oracleAdmin = await blockchain.treasury('oracleAdmin');
        robotAdmin = await blockchain.treasury('robotAdmin');
        admin1 = await blockchain.treasury('admin1');
        admin2 = await blockchain.treasury('admin2');
        let c = Bridge.createFromConfig(
            {
                owner: deployer.address,
                halt:0,
                init:0,
                smgFeeProxy:smgFeeProxy.address,
                oracleAdmin:oracleAdmin.address,
                robotAdmin:robotAdmin.address,
            },
            code
        )
        bridge = blockchain.openContract(c);

        const deployResult = await bridge.sendDeploy(deployer.getSender(),toNano('1000'));

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



    it('should addAdmin success', async () => {
        let firstAdmin = await bridge.getFirstAdmin()
        console.log("firstAdmin 00:", firstAdmin);
        expect(firstAdmin).toBe('')

        let queryID=1;
        let ret = await bridge.sendAddAdmin(deployer.getSender(),{
            value: toNano('1'),
            queryID,
            adminAddr:admin1.address,
        });
        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });
        // console.log("ret",ret);
        let firstAdmin1 = await bridge.getFirstAdmin()
        console.log("firstAdmin:", firstAdmin1);
        expect(firstAdmin1).toEqual(admin1.address.toString())

        queryID=2;
        ret = await bridge.sendAddAdmin(deployer.getSender(),{
            value: toNano('1'),
            queryID,
            adminAddr:admin2.address,
        });
        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });
        // console.log("ret",ret);
        firstAdmin1 = await bridge.getFirstAdmin()
        console.log("firstAdmin:", firstAdmin1);
        expect(firstAdmin1).toEqual(admin2.address.toString())
        let nextAdmin = await bridge.getNextAdmin(admin1.address)
        console.log("nextAdmin:", nextAdmin);
        expect(nextAdmin).toEqual(admin1.address.toString())

        // remove
        queryID=3;
        ret = await bridge.sendRemoveAdmin(deployer.getSender(),{
            value: toNano('1'),
            queryID,
            adminAddr:admin2.address,
        });
        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });
        // console.log("ret",ret);
        firstAdmin1 = await bridge.getFirstAdmin()
        console.log("firstAdmin:", firstAdmin1);
        expect(firstAdmin1).toEqual(admin1.address.toString())

        // remove
        queryID=4;
        ret = await bridge.sendRemoveAdmin(deployer.getSender(),{
            value: toNano('1'),
            queryID,
            adminAddr:admin1.address,
        });
        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });
        // console.log("ret",ret);
        firstAdmin1 = await bridge.getFirstAdmin()
        console.log("firstAdmin:", firstAdmin1);
        expect(firstAdmin1).toEqual("")
    });

});