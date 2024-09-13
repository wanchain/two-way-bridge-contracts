import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { TokenManager } from '../wrappers/TokenManager';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('TokenManager', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('TokenManager');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let tokenManager: SandboxContract<TokenManager>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        let c = TokenManager.createForDeploy(
            code,0
        )

        tokenManager = blockchain.openContract(c);

        deployer = await blockchain.treasury('deployer');


        const deployResult = await tokenManager.sendDeploy(deployer.getSender());

        // console.log("deployResult==>",deployResult.transactions);

        console.log("deployer.address==>",deployer.address);
        console.log("tokenManager.address==>",tokenManager.address);

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tokenManager.address,
            deploy: true,
            success: true,
        });
    });

    it('initial: get_first_smg_id', async () => {
        const first_smg_id = await tokenManager.get_first_smg_id();
        console.log("first_smg_id:",first_smg_id);
    });
    it('add first smg', async () => {
        let user1 = await blockchain.treasury('user1');
        let txRet = await tokenManager.sendUpdateSmg(user1.getSender(), {
            id:112n, gpk:2n, startTime:3, endTime:4
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: tokenManager.address,
            success: true,
        });
        const first_smg_id = await tokenManager.get_first_smg_id();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(112n);

        const next_smg_id = await tokenManager.get_next_smg_id(first_smg_id);
        console.log("next_smg_id:",next_smg_id);
        expect(next_smg_id).toEqual(0n);
    });
    it('add second smg', async () => {
        let user1 = await blockchain.treasury('user1');
        let txRet
        txRet = await tokenManager.sendUpdateSmg(user1.getSender(), {
            id:112n, gpk:2n, startTime:3, endTime:4
        })
        txRet = await tokenManager.sendUpdateSmg(user1.getSender(), {
            id:111n, gpk:2n, startTime:3, endTime:4
        })
        expect(txRet.transactions).toHaveTransaction({
            from: user1.address,
            to: tokenManager.address,
            success: true,
        });
        const first_smg_id = await tokenManager.get_first_smg_id();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(111n);

        const next_smg_id = await tokenManager.get_next_smg_id(first_smg_id);
        console.log("next_smg_id:",next_smg_id);
        expect(next_smg_id).toEqual(112n);

        let smg = await tokenManager.get_smg(next_smg_id)
        console.log("smg:", smg)
    });
});
