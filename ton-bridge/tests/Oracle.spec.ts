import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {Address, Cell, toNano,TupleItemInt} from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Bridge } from '../wrappers/Bridge';

describe('Oracle', () => {
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

    it('initial: getFirstStoremanGroupID', async () => {
        const first_smg_id = await bridge.getFirstStoremanGroupID();
        console.log("first_smg_id:",first_smg_id);
    });
    it('add first smg', async () => {
        let user1 = await blockchain.treasury('user1');
        let txRet = await bridge.sendSetStoremanGroupConfig(112n, 2n, 3, 4, {
            sender: user1.getSender(),
            value: toNano('0.01'),
            queryID:1,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: bridge.address,
            success: true,
        });
        const first_smg_id = await bridge.getFirstStoremanGroupID();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(112n);

        const next_smg_id = await bridge.getNextStoremanGroupID(first_smg_id);
        console.log("next_smg_id:",next_smg_id);
        expect(next_smg_id).toEqual(0n);
    });
    it('add second smg', async () => {
        let user1 = await blockchain.treasury('user1');
        let txRet = await bridge.sendSetStoremanGroupConfig(112n, 2n, 3, 4, {
            sender: user1.getSender(),
            value: toNano('0.01'),
            queryID:1,
        })
        txRet = await bridge.sendSetStoremanGroupConfig(111n, 2n, 3, 4, {
            sender: user1.getSender(),
            value: toNano('0.01'),
            queryID:1,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: bridge.address,
            success: true,
        });
        const first_smg_id = await bridge.getFirstStoremanGroupID();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(111n);

        const next_smg_id = await bridge.getNextStoremanGroupID(first_smg_id);
        console.log("next_smg_id:",next_smg_id);
        expect(next_smg_id).toEqual(112n);

        let smg = await bridge.getStoremanGroupConfig(next_smg_id)
        console.log("smg:", smg)
    });
});
