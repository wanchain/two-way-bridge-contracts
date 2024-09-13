import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Oracle } from '../wrappers/Oracle';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Oracle', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Oracle');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let oracle: SandboxContract<Oracle>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        let c = Oracle.createForDeploy(
            code,0
        )

        oracle = blockchain.openContract(c);

        deployer = await blockchain.treasury('deployer');


        const deployResult = await oracle.sendDeploy(deployer.getSender());

        // console.log("deployResult==>",deployResult.transactions);

        console.log("deployer.address==>",deployer.address);
        console.log("oracle.address==>",oracle.address);

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: oracle.address,
            deploy: true,
            success: true,
        });
    });

    it('initial: get_first_smg_id', async () => {
        const first_smg_id = await oracle.get_first_smg_id();
        console.log("first_smg_id:",first_smg_id);
    });
    it('add first smg', async () => {
        let user1 = await blockchain.treasury('user1');
        let txRet = await oracle.sendUpdateSmg(user1.getSender(), {
            id:112n, gpk:2n, startTime:3, endTime:4
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: oracle.address,
            success: true,
        });
        const first_smg_id = await oracle.get_first_smg_id();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(112n);

        const next_smg_id = await oracle.get_next_smg_id(first_smg_id);
        console.log("next_smg_id:",next_smg_id);
        expect(next_smg_id).toEqual(0n);
    });
    it('add second smg', async () => {
        let user1 = await blockchain.treasury('user1');
        let txRet
        txRet = await oracle.sendUpdateSmg(user1.getSender(), {
            id:112n, gpk:2n, startTime:3, endTime:4
        })
        txRet = await oracle.sendUpdateSmg(user1.getSender(), {
            id:111n, gpk:2n, startTime:3, endTime:4
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: oracle.address,
            success: true,
        });
        const first_smg_id = await oracle.get_first_smg_id();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(111n);

        const next_smg_id = await oracle.get_next_smg_id(first_smg_id);
        console.log("next_smg_id:",next_smg_id);
        expect(next_smg_id).toEqual(112n);

        let smg = await oracle.get_smg(next_smg_id)
        console.log("smg:", smg)
    });
});
