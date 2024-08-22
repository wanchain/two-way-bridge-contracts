import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Signature } from '../wrappers/Signature';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Signature', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Signature');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let signature: SandboxContract<Signature>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        let c = Signature.createFromConfig(
            {
                id: 0,
                counter: 0,
            },
            code
        )

        signature = blockchain.openContract(c);

        deployer = await blockchain.treasury('deployer');


        const deployResult = await signature.sendDeploy(deployer.getSender(), toNano('1000'));

        //console.log("deployResult==>",deployResult.transactions);

        console.log("deployer.address==>",deployer.address);
        console.log("signature.address==>",signature.address);

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: signature.address,
            deploy: true,
            success: true,
        });
    });



    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and counter are ready to use
    });

    it('should verify success', async () => {
        const user1 = await blockchain.treasury('user0');
        const s: bigint = BigInt("0x41a885d245e69a5af45bc51ff0dad6e3505e45deb7de1db50fc01c69cd8bdc2c");
        const gpk_x: bigint = BigInt("0xaceaa17ffb7bfafe15e2c026801400564854c9839a1665b65f18b228dd55ebcd");
        const gpk_y: bigint = BigInt("0x2dafc900306c08a0f1c79caec116744d2ed3a16e150e8b3d4e39c9458a62c823");
        const e: bigint = BigInt("0xd3d5f9bfc2d77ba575cc1407dae0079ebc9999b9744b77ccef3c5dcadda23643");
        const p: bigint = BigInt("0x000000000000000000000000000000000000000000000000000000000000001c");
        const msg: bigint = BigInt("0xa5cd2c07cc4a833c5b55a114cfebe49e13c19039d70324cca5ad3e6e37e4b657");
        const queryID=1;
        const verifyRet = await signature.sendVerify(user1.getSender(), {
            s,
            gpk_x,
            gpk_y,
            e,
            p,
            msg,
            value: toNano('1000'),
            queryID,
        });

        console.log("verifyRet",verifyRet);

        expect(verifyRet.transactions).toHaveTransaction({
            from: user1.address,
            to: signature.address,
            success: true,
        });

    });

    it('should verify success (s>Q/2)', async () => {
        const user1 = await blockchain.treasury('user0');
        const s: bigint = BigInt("0xa6050a51fb7ca8827181c0d855fc6b335d9fcd6895f9f672402d50b652804132");
        const gpk_x: bigint = BigInt("0xaceaa17ffb7bfafe15e2c026801400564854c9839a1665b65f18b228dd55ebcd");
        const gpk_y: bigint = BigInt("0x2dafc900306c08a0f1c79caec116744d2ed3a16e150e8b3d4e39c9458a62c823");
        const e: bigint = BigInt("0x93d84747a53a6064f38a465a66c888f7457121e20cfb3eba6869b7fbcf91dcf0");
        const p: bigint = BigInt("0x000000000000000000000000000000000000000000000000000000000000001c");
        const msg: bigint = BigInt("0xb7ad2a05abd8ba23607acaf4cc139f468f16d584a79f9d797f7fcdc5d8848278");
        const queryID=1;
        const verifyRet = await signature.sendVerify(user1.getSender(), {
            s,
            gpk_x,
            gpk_y,
            e,
            p,
            msg,
            value: toNano('1000'),
            queryID,
        });

        console.log("verifyRet",verifyRet);

        expect(verifyRet.transactions).toHaveTransaction({
            from: user1.address,
            to: signature.address,
            success: true,
        });

    });

    it('should  verifyEcdsa success', async () => {
        const user1 = await blockchain.treasury('user0');
        const s: bigint = BigInt("0x9fcc4ce124d0a28e989e0adb4576b1c6ee167f070e4f0b9a8012b4ca08243aab");
        const gpk_x: bigint = BigInt("0x501f1e8c8e135e2311397ac1812b59e0736cc8ec37765a8945dfcbf831e0d4bc");
        const gpk_y: bigint = BigInt("0x0b99db98637d628dacb978239e683a30852558bb2bb0029fb10e61f10883010d");
        const e: bigint = BigInt("0x5342866e228f42b01dcb19ff2ae0e0e972a36ffce053af7b5c9ffbc0419d166f");
        const p: bigint = BigInt("0x0000000000000000000000000000000000000000000000000000000000000001");
        const msg: bigint = BigInt("0x5d822a3b0c7e531cef44e1c8027d29c8443bc822fa7fc22f9e4ddef3c69356eb");
        const queryID=1;
        const verifyRet = await signature.sendVerifyEcdsa(user1.getSender(), {
            s,
            gpk_x,
            gpk_y,
            e,
            p,
            msg,
            value: toNano('1000'),
            queryID,
        });

        console.log("verifyRet",verifyRet);
        console.log("user1.address",user1.address);

        expect(verifyRet.transactions).toHaveTransaction({
            from: user1.address,
            to: signature.address,
            success: true,
        });

    });

    it('should verify success (V=27)', async () => {
        const user1 = await blockchain.treasury('user0');
        const s: bigint = BigInt("0xf519b4f10ed0b357e02fd58452bfbfb0706e797c2c99e519049dfb2475afc375");
        const gpk_x: bigint = BigInt("0x2ac82469c7188f8ec40b4bac5e8d1788114a8722a5b5b33ab7152c4a50f02305");
        const gpk_y: bigint = BigInt("0xcc7508e50cc6ecb865d9204d14c9a274f9ec3572231077cb095be607541f7d6e");
        const e: bigint = BigInt("0xdd14237b21aefd10aa74ccbf94ebf645c8d8958669cdf9fec08d053599e57581");
        const p: bigint = BigInt("0x000000000000000000000000000000000000000000000000000000000000001b");
        const msg: bigint = BigInt("0x4c9ee83cba5fa1d567696678a425d57d613594f44231743657db104abac794af");
        const queryID=1;
        const verifyRet = await signature.sendVerify(user1.getSender(), {
            s,
            gpk_x,
            gpk_y,
            e,
            p,
            msg,
            value: toNano('1000'),
            queryID,
        });

        console.log("verifyRet",verifyRet);
        console.log("user1.address",user1.address);

        expect(verifyRet.transactions).toHaveTransaction({
            from: user1.address,
            to: signature.address,
            success: true,
        });

    });

});
