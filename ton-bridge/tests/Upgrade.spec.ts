import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {Address, Cell, toNano,TupleItemInt} from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Bridge } from '../wrappers/Bridge';

describe('Bridge', () => {
    let code: Cell;
    let fakeCode : Cell;

    beforeAll(async () => {
        code = await compile('Bridge');
        fakeCode = await compile('Fake');
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

    it('upgrade to fake sc', async () => {
        let v1 = await bridge.getVersion()
        expect(v1).toBe('0.1')
        const queryID=1;
        const ret = await bridge.sendUpgradeSC(fakeCode ,{
            sender: deployer.getSender(),
            value: toNano('1'),
            queryID,
        });
        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });
        let v2 = await bridge.getVersion()
        expect(v2).toBe('Fake')
    })

    it('should addTokenPair success', async () => {
        let getFailed = 0;
        try{
            await bridge.getUpdatedInt()
        }catch(err){
            getFailed = 1
        }
        expect(getFailed).toBe(1)

        
        const user1 = await blockchain.treasury('user1');
        const queryID=1;

        const ret = await bridge.sendUpdateInt({
            sender: deployer.getSender(),
            value: toNano('1'),
            queryID,
        });
        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });
        // console.log("ret",ret);
        let updatedInt = await bridge.getUpdatedInt()
        console.log("updatedInt2:", updatedInt);
        expect(updatedInt).toBe(12345678)
    });

});