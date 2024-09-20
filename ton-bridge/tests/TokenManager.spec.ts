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



    it('should addTokenPair success', async () => {
        let tokenPairId = 0x999;
        let fromChainID = 0x1234;
        let toChainID = 0x4567;
        let fromAccount = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
        let toAccount = "kQDwf9dYB-a40vYJsmSGD5RBxLhaiagIGOBoP3EGfyV5O7gA";

        let firstTokenPair = await bridge.getFirstTokenPairID()
        console.log("firstTokenPair:", firstTokenPair);

        const user1 = await blockchain.treasury('user1');
        const queryID=1;

        console.log("user1.address==>",user1.address);
        console.log("user1.address(bigInt)==>",BigInt("0x"+user1.address.hash.toString('hex')));

        console.log("adminAddr",deployer.address.toRawString());
        const ret = await bridge.sendAddTokenPair(tokenPairId, fromChainID,fromAccount,toChainID,toAccount, {
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
        firstTokenPair = await bridge.getFirstTokenPairID()
        console.log("firstTokenPair:", firstTokenPair);
        expect(firstTokenPair).toBe(tokenPairId)

        let retNew = await bridge.getTokenPair(tokenPairId);
        console.log("retNew",retNew);
        expect(retNew.fromChainID).toBe(fromChainID)
        expect(retNew.toChainID).toBe(toChainID)
        expect(retNew.fromAccount).toBe(fromAccount)
        expect(retNew.toAccount).toBe(toAccount)
    });

});