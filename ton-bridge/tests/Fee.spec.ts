import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {Address, Cell, toNano,TupleItemInt} from '@ton/core';
import {Bridge } from '../wrappers/Bridge';
import {TON_COIN_ACCOUT,BIP44_CHAINID} from '../wrappers/const/const-value';
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
    let operator:  SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        smgFeeProxy = await blockchain.treasury('smgFeeProxy');
        oracleAdmin = await blockchain.treasury('oracleAdmin');
        operator = await blockchain.treasury('operator');

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
        console.log("bridge.address(bigInt)==>",BigInt("0x"+bridge.address.hash.toString('hex')));


        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            deploy: true,
            success: true,
        });
        // add tokenPair 2
        let tokenPairId = 888;
        let fromChainID = 1234;
        let toChainID = BIP44_CHAINID;
        let fromAccount = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
        let toAccount = "EQB6Ipa85lD-LVxypTA3xQs2dmdcM_VeUUQexul6_TDOPu_d";
        const queryID=1;



        let ret = await bridge.sendAddTokenPair(deployer.getSender(),{
            tokenPairId, fromChainID,fromAccount,toChainID,toAccount,
            value: toNano('1'),
            queryID,
        });
        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });

        // add tokenPair 2
        tokenPairId = 999;
        ret = await bridge.sendAddTokenPair(deployer.getSender(),{
            tokenPairId, fromChainID,fromAccount,toChainID,toAccount,
            value: toNano('1'),
            queryID,
        });
        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });
    });

    it('should set tokenpair fee success', async () => {
        let tokenPairId = 999;
        let tokenPairId2 = 888;
        let fee1 = 99901

        const queryID=1;

        let ret = await bridge.sendSetTokenPairFee(operator.getSender(),{
            tokenPairID:tokenPairId,
            fee:fee1,
            value: toNano('1'),
            queryID,
        });
        expect(ret.transactions).toHaveTransaction({
            from: operator.address,
            to: bridge.address,
            success: true,
        });
        // console.log("ret",ret);
        let tokenPairFee = await bridge.getTokenPairFee(tokenPairId)
        console.log("tokenPairFee:", tokenPairFee);
        expect(tokenPairFee).toBe(fee1)

    });

    it('should set feeProxy address success', async () => {
        const queryID=1;
        let ret = await bridge.sendSetFeeProxy(operator.getSender(),{
            feeProxy:operator.address,
            value: toNano('1'),
            queryID,
        });
        expect(ret.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            success: true,
        });
        // console.log("ret",ret);
        let crossConfig = await bridge.getCrossConfig()
        console.log("crossConfig:", crossConfig);
        expect(crossConfig.feeProxyAdmin).toBe(operator.address)

    });


    it('should set tokenpair fees success', async () => {
        let tokenPairId = 999;
        let tokenPairId2 = 888;
        let fee1 = 99901
        let fee2 = 99902

        const queryID=1;

        let ret = await bridge.sendSetTokenPairFees(operator.getSender(),{
            tokenPairID:[tokenPairId, tokenPairId2],
            fee:[fee1, fee2],
            value: toNano('1'),
            queryID,
        });
        expect(ret.transactions).toHaveTransaction({
            from: operator.address,
            to: bridge.address,
            success: true,
        });
        // console.log("ret",ret);
        let tokenPairFee = await bridge.getTokenPairFee(tokenPairId)
        console.log("tokenPairFee:", tokenPairFee);
        expect(tokenPairFee).toBe(fee1)
        tokenPairFee = await bridge.getTokenPairFee(tokenPairId2)
        console.log("tokenPairFee:", tokenPairFee);
        expect(tokenPairFee).toBe(fee2)

    });




    it('should set chain fee success', async () => {
        let srcChainId1 = 1001;
        let srcChainId2 = 1002;
        let dstChainId1 = 2001;
        let dstChainId2 = 2002;
        let fee1 = 3001
        let fee2 = 3002

        const queryID=1;

        let ret = await bridge.sendSetChainFee(operator.getSender(),{
            srcChainId:srcChainId1,
            dstChainId:dstChainId1,
            contractFee:fee1,
            agentFee:fee2,
            value: toNano('1'),
            queryID,
        });
        expect(ret.transactions).toHaveTransaction({
            from: operator.address,
            to: bridge.address,
            success: true,
        });
        // console.log("ret",ret);
        let chainfee = await bridge.getChainFee(srcChainId1, dstChainId1)
        console.log("chainfee:", chainfee);
        expect(chainfee.contractFee).toBe(fee1)
        expect(chainfee.agentFee).toBe(fee2)


    });


    it('should set chain fees success', async () => {
        let srcChainId1 = 1001;
        let srcChainId2 = 1002;
        let dstChainId1 = 2001;
        let dstChainId2 = 2002;
        let fee1 = 3001
        let fee2 = 3002

        const queryID=1;

        let ret = await bridge.sendSetChainFees(operator.getSender(),{
            srcChainId:[srcChainId1,srcChainId2],
            dstChainId:[dstChainId1,dstChainId2],
            contractFee:[fee1,fee2],
            agentFee:[fee2,fee1],
            value: toNano('1'),
            queryID,
        });
        expect(ret.transactions).toHaveTransaction({
            from: operator.address,
            to: bridge.address,
            success: true,
        });
        // console.log("ret",ret);
        let chainfee = await bridge.getChainFee(srcChainId1, dstChainId1)
        console.log("chainfee:", chainfee);
        expect(chainfee.contractFee).toBe(fee1)
        expect(chainfee.agentFee).toBe(fee2)

        chainfee = await bridge.getChainFee(srcChainId2, dstChainId2)
        console.log("chainfee:", chainfee);
        expect(chainfee.contractFee).toBe(fee2)
        expect(chainfee.agentFee).toBe(fee1)


    });

});