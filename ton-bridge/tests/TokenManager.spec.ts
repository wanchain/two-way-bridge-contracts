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
    });



    it('should addTokenPair success', async () => {
        let tokenPairId = 999;
        let fromChainID = 1234;
        let toChainID = BIP44_CHAINID;
        let fromAccount = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
        let toAccount = "EQB6Ipa85lD-LVxypTA3xQs2dmdcM_VeUUQexul6_TDOPu_d";
        let jettonAdminAddr= "EQCT7rMc77KcPciOlxV-dfhYWK7RisB7lEAdGze2f0-vUI30";
        let walletCodeBase64 = "te6cckECEAEAA/AAART/APSkE/S88sgLAQIBYgIPAgLOAw4Es0IMcAkl8E4AHQ0wMBcbCOhRNfA9s84PpA+kAx+gAxcdch+gAx+gAwc6m0AALTHwEgghAPin6luo6FMDRZ2zzgIIIQF41FGbqOhjBERAPbPOA1JIIQWV8HvLqAQFBwsAioAg1yHtRND6APpA+kDUMATTHwGCAP/wIYIQF41FGboCghB73ZfeuhKx8vTTPwEw+gAwE6BQI8hQBPoCWM8WAc8WzMntVAH2A9M/AQH6APpAIfAC7UTQ+gD6QPpA1DBRNqFSKscF8uLBKML/8uLCVDRCcFQgE1QUA8hQBPoCWM8WAc8WzMkiyMsBEvQA9ADLAMkg+QBwdMjLAsoHy//J0AT6QPQEMfoAINdJwgDy4sTIghAXjUUZAcsfUAoByz9QCPoCBgCiI88WAc8WJvoCUAfPFsnIgBgBywVQBM8WcPoCQGN3UAPLa8zMI5FykXHiUAioE6CCCkPVgKAUvPLixQTJgED7AEATyFAE+gJYzxYBzxbMye1UA/DtRND6APpA+kDUMAjTPwEB+gBRUaAF+kD6QFNbxwVUc21wVCATVBQDyFAE+gJYzxYBzxbMySLIywES9AD0AMsAyfkAcHTIywLKB8v/ydBQDccFHLHy4sMK+gBRqKGL5yZWNlaXZlX3Rva2Vuc4/hQwIf4gMCHjDwUICQoAcFIaoBihyIIQc2LQnAHLHyQByz8j+gJYzxZQCc8WyciAEAHLBSXPFlAH+gJQBnFYy2rMyXH7ABBGAAoQOjlfAwCsggiYloC2CXL7AibXCwHDAATCABSwjirIgBABywVQBs8WcPoCcAHLaoIQ1TJ22wHLH1ADAcs/UAP6AsmBAIL7AFiSbDPiQAPIUAT6AljPFgHPFszJ7VQC1I6ENFnbPOBsIu1E0PoA+kD6QNQwECNfAyOCEG2OXjy6jjczUiLHBfLiwYIImJaAcPsCyIAQAcsFWM8WcPoCcAHLaoIQ1TJ22wHLHwHTPwExAcs/yYEAgvsA4AOCEHaKULK64wJfA4QP8vAMDQDm7UTQ+gD6QPpA1DAH0z8BAfoA+kAwUVGhUknHBfLiwSfC//LiwgWCCas/AKAWvPLiw8iCEHvdl94Byx9QBQHLP1AD+gIizxYBzxbJyIAYAcsFI88WcPoCAXFYy2rMyYBA+wBAE8hQBPoCWM8WAc8WzMntVACWUiLHBfLiwdM/AQH6QPoA9AQwyIAYAcsFUAPPFnD6AnDIghAPin6lAcsfUAUByz9Y+gIkzxZQBM8W9ABw+gLKAMlxWMtqzMmAQPsAABFPpEMMAA8uFNgAG6D2BdqJofQB9IH0gahhIUh89A==";

        let firstTokenPair = await bridge.getFirstTokenPairID()
        console.log("firstTokenPair:", firstTokenPair);

        const user1 = await blockchain.treasury('user1');
        const queryID=1;

        console.log("user1.address==>",user1.address);
        console.log("user1.address(bigInt)==>",BigInt("0x"+user1.address.hash.toString('hex')));

        console.log("adminAddr",deployer.address.toRawString());
        let ret = await bridge.sendAddTokenPair(deployer.getSender(),{
            tokenPairId, fromChainID,fromAccount,toChainID,toAccount,jettonAdminAddr,walletCodeBase64,
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
        // expect(retNew.jettonAdminAddr).toBe(jettonAdminAddr)


        ret = await bridge.sendRemoveTokenPair(deployer.getSender(),{
            tokenPairId,
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
        expect(firstTokenPair).toBe(0)
    });

});