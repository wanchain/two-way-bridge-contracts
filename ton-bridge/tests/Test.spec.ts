import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {Address, Cell, toNano,fromNano, TupleItemInt, beginCell} from '@ton/core';
import '@ton/test-utils';
import {Test} from '../wrappers/Test';
import {FakeThrow} from '../wrappers/FakeThrow';
import { compile } from '@ton/blueprint';


describe('Test', () => {
    let testCode : Cell;
    let fakeThrowCode : Cell;

    beforeAll(async () => {
        testCode = await compile('Test');
        fakeThrowCode = await compile('FakeThrow');
    });
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let smgFeeProxy: SandboxContract<TreasuryContract>;
    let oracleAdmin: SandboxContract<TreasuryContract>;
    let operator: SandboxContract<TreasuryContract>;
    let test: SandboxContract<Test>;
    let fakeThrow:SandboxContract<FakeThrow>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        smgFeeProxy = await blockchain.treasury('smgFeeProxy');
        oracleAdmin = await blockchain.treasury('oracleAdmin');
        operator = await blockchain.treasury('operator');
        console.log("oracleAdmin.address(bigInt)==>",BigInt("0x"+oracleAdmin.address.hash.toString('hex')));
        console.log("deployer.address(bigInt)==>",BigInt("0x"+deployer.address.hash.toString('hex')));

        console.log("xxxx testCode:",  testCode)
        console.log("xxxx fakeThrowCode:",  fakeThrowCode)

        let c_test = Test.createFromConfig(
            {},
            testCode
        )

        test = blockchain.openContract(c_test);
        const deployResultBridge = await test.sendDeploy(deployer.getSender(), toNano('1000'));
        expect(deployResultBridge.transactions).toHaveTransaction({
            from: deployer.address,
            to: test.address,
            deploy: true,
            success: true,
        });


        let c_fakeThrow = FakeThrow.createFromConfig(
            {},
            fakeThrowCode
        )

        fakeThrow = blockchain.openContract(c_fakeThrow);
        const deployResultFakeThrow = await fakeThrow.sendDeploy(deployer.getSender(), toNano('1000'));
        // expect(deployResultFakeThrow.transactions).toHaveTransaction({
        //     from: deployer.address,
        //     to: fakeThrow.address,
        //     deploy: true,
        //     success: true,
        // });

    });

    it('test sendto cell count', async () => {
        let user1 = await blockchain.treasury('user1');
        let count = 1
        while(count-- > 0) {
            let txRet = await test.sendTransDic(deployer.getSender(), {})
            console.log("txRet:",count, txRet.transactions[1].totalFees)
            expect(txRet.transactions).toHaveTransaction({
                from: deployer.address,
                to: test.address,
                success: true,
            });
        }
    });  
    it('test sendto throw', async () => {
        let txRet = await test.sendTransThrow(deployer.getSender(), {
            address: fakeThrow.address
        })
        expect(txRet.transactions).toHaveTransaction({   // deployer ->test
            from: deployer.address,
            to: test.address,
            success: true,
        });
        expect(txRet.transactions).toHaveTransaction({  // test to throw
            from: test.address,
            to: fakeThrow.address,
            success: false,
        });
        expect(txRet.transactions).toHaveTransaction({  // bounced
            from: fakeThrow.address,
            to: test.address,
            success: true,
        });
    });     
    
     
});
