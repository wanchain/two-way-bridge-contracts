import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {Address, Cell, toNano,TupleItemInt} from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Bridge } from '../wrappers/Bridge';


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
describe('Oracle', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Bridge');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let smgFeeProxy: SandboxContract<TreasuryContract>;
    let oracleAdmin: SandboxContract<TreasuryContract>;
    let operator:  SandboxContract<TreasuryContract>;
    let bridge: SandboxContract<Bridge>;
    let admin1: SandboxContract<TreasuryContract>;
    let admin2: SandboxContract<TreasuryContract>;

    let smgID1: string = "0x000000000000000000000000000000000000000000000041726965735f303438";
    let smgID2: string = "0x000000000000000000000000000000000000000000000041726965735f303437";

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        smgFeeProxy = await blockchain.treasury('smgFeeProxy');
        oracleAdmin = await blockchain.treasury('oracleAdmin');
        operator = await blockchain.treasury('operator');
        admin1 = await blockchain.treasury('admin1');
        admin2 = await blockchain.treasury('admin2');
        let c = Bridge.createFromConfig(
            {
                owner: deployer.address,
                halt:0,
                init:0,
                smgFeeProxy:smgFeeProxy.address,
                oracleAdmin:oracleAdmin.address,
                operator:operator.address,
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
        console.log("admin1.address(bigInt)==>",BigInt("0x"+admin1.address.hash.toString('hex')));
        console.log("admin2.address(bigInt)==>",BigInt("0x"+admin2.address.hash.toString('hex')));


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
        expect(first_smg_id).toEqual(0n)
    });
    it('add first smg', async () => {
        let txRet = await bridge.sendSetStoremanGroupConfig(oracleAdmin.getSender(),{
            id: BigInt(smgID1), gpkX: 2n, gpkY:3n, 
            startTime: 3, endTime: 4,
            value: toNano('0.01'),
            queryID:1,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: oracleAdmin.address,
            to: bridge.address,
            success: true,
        });
        const first_smg_id = await bridge.getFirstStoremanGroupID();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(BigInt(smgID1));

        const next_smg_id = await bridge.getNextStoremanGroupID(first_smg_id);
        console.log("next_smg_id:",next_smg_id);
        expect(next_smg_id).toEqual(0n);
    });
    it('add first smg commit, without sleep, should fail', async () => {
        await bridge.sendSetStoremanGroupConfig(oracleAdmin.getSender(),{
            id: BigInt(smgID1), gpkX: 2n, gpkY:3n, 
            startTime: 3, endTime: 4,
            value: toNano('0.01'),
            queryID:1,
        })

        //commit
        let txRet = await bridge.sendSetStoremanGroupConfigCommit(oracleAdmin.getSender(),{
            id: BigInt(smgID1), gpkX: 2n, gpkY:3n, 
            startTime: 3, endTime: 4,
            value: toNano('0.01'),
            queryID:1,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: oracleAdmin.address,
            to: bridge.address,
            success: false,
        });
        let first_smg_id = await bridge.getFirstStoremanGroupID();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(BigInt(smgID1));

        let get_first_smg_id_Commited = await bridge.getFirstStoremanGroupIDCommited();
        console.log("get_first_smg_id_Commited:",get_first_smg_id_Commited);
        expect(get_first_smg_id_Commited).toEqual(BigInt("0x0"));

    });

    it('add first smg commit, with sleep, should success', async () => {
        await bridge.sendSetStoremanGroupConfig(oracleAdmin.getSender(),{
            id: BigInt(smgID1), gpkX: 2n, gpkY:3n, 
            startTime: 3, endTime: 4,
            value: toNano('0.01'),
            queryID:1,
        })

        await sleep(1000)
        //commit
        let txRet = await bridge.sendSetStoremanGroupConfigCommit(oracleAdmin.getSender(),{
            id: BigInt(smgID1), gpkX: 2n, gpkY:3n, 
            startTime: 3, endTime: 4,
            value: toNano('0.01'),
            queryID:1,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: oracleAdmin.address,
            to: bridge.address,
            success: true,
        });
        const first_smg_id = await bridge.getFirstStoremanGroupID();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(BigInt(smgID1));

        let get_first_smg_id_Commited = await bridge.getFirstStoremanGroupIDCommited();
        console.log("get_first_smg_id_Commited:",get_first_smg_id_Commited);
        expect(get_first_smg_id_Commited).toEqual(BigInt(smgID1));

        let smg = await bridge.getStoremanGroupConfig(first_smg_id)
        console.log("smg:",smg)
        let smgc = await bridge.getStoremanGroupConfigCommited(first_smg_id)
        console.log("smgc:",smgc)
    });


    it('add second smg', async () => {
        let txRet = await bridge.sendSetStoremanGroupConfig(oracleAdmin.getSender(),{
            id: BigInt(smgID1), gpkX: 2n, gpkY:3n, 
            startTime: 3, endTime: 4,
            value: toNano('0.01'),
            queryID:1,
        })
        let txRet2 = await bridge.sendSetStoremanGroupConfig(oracleAdmin.getSender(),{
            id: BigInt(smgID2), gpkX: 2n, gpkY:3n, 
            startTime: 3, endTime: 4,
            value: toNano('0.01'),
            queryID:1,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: oracleAdmin.address,
            to: bridge.address,
            success: true,
        });
        const first_smg_id = await bridge.getFirstStoremanGroupID();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(BigInt(smgID2));

        const next_smg_id = await bridge.getNextStoremanGroupID(first_smg_id);
        console.log("next_smg_id:",next_smg_id);
        expect(next_smg_id).toEqual(BigInt(smgID1));

        let smg = await bridge.getStoremanGroupConfig(next_smg_id)
        console.log("smg:", smg)

    });

    it('add second smg commited, remove', async () => {
        let txRet = await bridge.sendSetStoremanGroupConfig(oracleAdmin.getSender(),{
            id: BigInt(smgID1), gpkX: 2n, gpkY:3n, 
            startTime: 3, endTime: 4,
            value: toNano('0.01'),
            queryID:1,
        })
        expect(txRet.transactions).toHaveTransaction({
            from: oracleAdmin.address,
            to: bridge.address,
            success: true,
        });

        let txRet2 = await bridge.sendSetStoremanGroupConfig(oracleAdmin.getSender(),{
            id: BigInt(smgID2), gpkX: 2n, gpkY:3n, 
            startTime: 3, endTime: 4,
            value: toNano('0.01'),
            queryID:1,
        })
        expect(txRet2.transactions).toHaveTransaction({
            from: oracleAdmin.address,
            to: bridge.address,
            success: true,
        });
        let first_smg_id = await bridge.getFirstStoremanGroupID();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(BigInt(smgID2));

        let next_smg_id = await bridge.getNextStoremanGroupID(first_smg_id);
        console.log("next_smg_id:",next_smg_id);
        expect(next_smg_id).toEqual(BigInt(smgID1));

        await sleep(2000)
        let txRet3 = await bridge.sendSetStoremanGroupConfigCommit(oracleAdmin.getSender(),{
            id: BigInt(smgID1), gpkX: 2n, gpkY:3n, 
            startTime: 3, endTime: 4,
            value: toNano('0.1'),
            queryID:1,
        })
        expect(txRet3.transactions).toHaveTransaction({
            from: oracleAdmin.address,
            to: bridge.address,
            success: true,
        });
        // only commit smg1, do not commit smg2
        let first_smg_idCommited = await bridge.getFirstStoremanGroupIDCommited();
        console.log("first_smg_idCommited:",first_smg_idCommited);
        expect(first_smg_idCommited).toEqual(BigInt(smgID1));

        let next_smg_idCommited = await bridge.getNextStoremanGroupIDCommited(first_smg_idCommited);
        console.log("next_smg_idCommited:",next_smg_idCommited);
        expect(next_smg_idCommited).toEqual(BigInt(0));

        // remove
        let txRet4 = await bridge.sendRemoveStoremanGroup(oracleAdmin.getSender(),{
            id: BigInt(smgID2), 
            value: toNano('0.01'),
            queryID:1,
        })
        expect(txRet4.transactions).toHaveTransaction({
            from: oracleAdmin.address,
            to: bridge.address,
            success: true,
        });
        first_smg_id = await bridge.getFirstStoremanGroupID();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(BigInt(smgID1));
        first_smg_idCommited = await bridge.getFirstStoremanGroupIDCommited();
        console.log("first_smg_idCommited:",first_smg_idCommited);
        expect(first_smg_idCommited).toEqual(BigInt(smgID1));
        txRet4 = await bridge.sendRemoveStoremanGroup(oracleAdmin.getSender(),{
            id: BigInt(smgID1), 
            value: toNano('0.01'),
            queryID:1,
        })
        expect(txRet4.transactions).toHaveTransaction({
            from: oracleAdmin.address,
            to: bridge.address,
            success: true,
        });
        first_smg_id = await bridge.getFirstStoremanGroupID();
        console.log("first_smg_id:",first_smg_id);
        expect(first_smg_id).toEqual(BigInt(0));
        first_smg_idCommited = await bridge.getFirstStoremanGroupIDCommited();
        console.log("first_smg_idCommited:",first_smg_idCommited);
        expect(first_smg_idCommited).toEqual(BigInt(0));
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
        let nextAdmin = await bridge.getNextAdmin(admin2.address)
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
