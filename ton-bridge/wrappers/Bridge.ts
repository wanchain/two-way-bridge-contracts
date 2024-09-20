import { Address, beginCell, BitString, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode} from '@ton/core';
import * as fs from "fs";
import { compile } from '@ton/blueprint';


export type BridgeConfig = {
    owner:Address,
    halt: number,
    init: number,
    smgFeeProxy:Address,
    oracleAdmin:Address,
};

// export type CrossConfig = {
//     owner:Address,
//     admin:Address,
//     halt: number,
//     init: number,
// };

export function bridgeConfigToCell(config: BridgeConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        // .storeAddress(config.admin)
        .storeUint(config.halt,2)
        .storeUint(config.init,2)

        .storeRef(beginCell() // *****about fee begin*****
            .storeAddress(config.smgFeeProxy) // feeProxyAddress
            .storeDict() // about Contract and Agent fee
            .storeDict() // about tokenPairFee
            .endCell())  // *****about fee end*****

        .storeRef(beginCell()  // *****about oracle begin*****
            .storeAddress(config.oracleAdmin) // oracleAdmin
            .storeDict() // mapSmgConfig
            .storeDict() // mapSmgTxStatus
            .endCell()) // *****about oracle end*****

        .storeRef(beginCell() // *****about tm begin*****
            .storeDict() // mapTokenPairInfo
            .endCell()) // *****about tm end*****

        .storeRef(beginCell().endCell()) // extended
        .endCell();
}
///////////// The opcode copy from fc file /////////////////////////////////
const OP_SIG                          = 0x10000000;
const OP_SIG_Verify                    = 0x10000001;
const OP_SIG_VerifyEcdsa               = 0x10000002;

const OP_COMMON                           = 0x20000000;  
const OP_COMMON_TransferOwner             = 0x20000003;
const OP_COMMON_SetHalt                   = 0x20000004;
const OP_COMMON_Initialize                = 0x20000005;

const OP_FEE                            = 0x30000000;
const OP_FEE_SetChainFee                        = 0x30000001;
const OP_FEE_SetChainFees                       = 0x30000002;
const OP_FEE_SetSmgFeeProxy             = 0x30000003;
const OP_FEE_SetRobotAdmin             = 0x30000003;

const OP_FEE_SetTokenPairFee               = 0x30000004;
const OP_FEE_SetTokenPairFees              = 0x30000005;

const OP_CROSS                  = 0x40000000;
const OP_CROSS_UserLock                  = 0x40000001;
const OP_CROSS_SmgMint                   = 0x40000002;
const OP_CROSS_UserBurn                  = 0x40000003;
const OP_CROSS_UserRelease               = 0x40000004;


const OP_TOKENPAIR              = 0x50000000;
const OP_TOKENPAIR_Add              = 0x50000001;
const OP_TOKENPAIR_Remove           = 0x50000002;
const OP_TOKENPAIR_Upsert           = 0x50000003;

const OP_ORACLE         = 0x60000000;
const OP_ORACLE_TransferOracleAdmin         = 0x60000001;
const OP_ORACLE_SetSMG                      = 0x60000002;
const OP_ORACLE_DeleteSMG                   = 0x60000002;
const OP_ORACLE_AcquireReadySmgInfo         = 0x60000004;

const OP_GP_TransferFoundation        = 0x70000001;
const OP_GP_AcquireReadySmgInfo       = 0x70000002;
const OP_GP_Proposal                  = 0x70000003;
const OP_GP_ApproveAndExecute         = 0x70000004;
const OP_GP_Initialize                = 0x70000005;

const OP_EXTEND         = 0x80000000;
const OP_EXTEND_AddCrossAdmin = 0x80000001;
const OP_EXTEND_DelCrossAdmin = 0x80000002;
/////////////////////////////////////////////////////////////
export class Bridge implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Bridge(address);
    }
    static async createForDeploy(config: BridgeConfig) {
        const workchain = 0; // deploy to workchain 0
        const code = await compile('Bridge');
        const data = bridgeConfigToCell(config);
        const init = { code, data };
        let SC = new Bridge(contractAddress(workchain, init), init);
        return SC
    }

    static createFromConfig(config: BridgeConfig, code: Cell, workchain = 0) {
        const data = bridgeConfigToCell(config);
        const init = { code, data };
        return new Bridge(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value:"0.01",
            body: beginCell().endCell(),
        });
    }

    // async sendAddAdmin(
    //     provider: ContractProvider,
    //     via: Sender,
    //     opts: {
    //         adminAddr:Address,
    //         value: bigint,
    //         queryID?: number,
    //     }
    // ) {
    //     let isValid = Address.isAddress(opts.adminAddr)
    //     if (!isValid){
    //         await Promise.reject("in valid address")
    //     }
    //     await provider.internal(via, {
    //         value: opts.value,
    //         sendMode: SendMode.PAY_GAS_SEPARATELY,
    //         body: beginCell()
    //             .storeUint(Opcodes.addAdmin, 32)
    //             .storeUint(opts.queryID ?? 0, 64)
    //             .storeAddress(opts.adminAddr)
    //             .endCell(),
    //     });
    // }

    // async sendSetFee(
    //     provider: ContractProvider,
    //     via: Sender,
    //     opts: {
    //         value: bigint,
    //         queryID?: number,
    //         srcChainId:number,
    //         dstChainId:number,
    //         contractFee:number,
    //         agentFee:number,
    //     }
    // ) {

    //     await provider.internal(via, {
    //         value: opts.value,
    //         sendMode: SendMode.PAY_GAS_SEPARATELY,
    //         body: beginCell()
    //             .storeUint(Opcodes.setFee, 32)
    //             .storeUint(opts.queryID ?? 0, 64)
    //             .storeUint(opts.srcChainId, 32)
    //             .storeUint(opts.dstChainId, 32)
    //             .storeUint(opts.contractFee, 32)
    //             .storeUint(opts.agentFee, 32)
    //             .endCell(),
    //     });
    // }

    async sendAddTokenPair(
        provider: ContractProvider,tokenPairId:number,fromChainID:number,fromAccount:string,toChainID:number,toAccount:string,
        opts: {
            sender: Sender,
            value: bigint,
            queryID?: number,
        }
    ) {
        console.log("xcvvvvvvv:", fromAccount, Buffer.from(fromAccount), Buffer.from(fromAccount).length)
        await provider.internal(opts.sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(OP_TOKENPAIR_Upsert, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(tokenPairId, 32)
                .storeUint(fromChainID, 32)
                .storeUint(toChainID, 32)
                .storeUint(fromAccount.length, 8)
                .storeBuffer(Buffer.from(fromAccount))
                .storeUint(toAccount.length, 8)
                .storeBuffer(Buffer.from(toAccount))
                .endCell(),
        });
    }
    async sendTransferOwner(
        provider: ContractProvider, newOwner: Address,
        opts: {
            sender: Sender,
            value: bigint,
            queryID?: number,
        }
    ) {
        let isValid = Address.isAddress(newOwner)
        if (!isValid){
            await Promise.reject("in valid address")
        }
        await provider.internal(opts.sender, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OP_COMMON_TransferOwner, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(newOwner)
                .endCell(),
        });
    }

     
    async getCrossConfig(provider: ContractProvider) {
        const result = await provider.get('get_cross_config', []);
        return {
            owner: result.stack.readAddress(),
            // admin: result.stack.readAddress(),
            halt:result.stack.readNumber(),
            init:result.stack.readNumber()
        }
    }

    async getFee(provider: ContractProvider,srcChainId:number,dstChainId:number) {
        const result = await provider.get('get_fee', [{ type: 'int', value: BigInt(srcChainId) },
            { type: 'int', value: BigInt(dstChainId)}]);
        return {
            contractFee:result.stack.readNumber(),
            agentFee:result.stack.readNumber()
        }
    }

    async getTokenPair(provider: ContractProvider,tokenPairId:number) {
        const result = await provider.get('get_token_pair', [{ type: 'int', value: BigInt(tokenPairId) }]);
        // todo getTokenPair
        return {
            fromChainID:result.stack.readNumber(),
            fromAccount:result.stack.readBuffer().toString(),
            toChainID:result.stack.readNumber(),
            toAccount:result.stack.readBuffer().toString(),
        }
    }
    async getFirstTokenPairID(provider: ContractProvider) {
        const result = await provider.get('get_first_tokenpair_id', []);
        // todo getTokenPair
        return result.stack.readNumber()
    }  
    async getNextTokenPairID(provider: ContractProvider) {
        const result = await provider.get('get_next_tokenpair_id', []);
        // todo getTokenPair
        return result.stack.readNumber()
    }      
    async getFirstStoremanGroupID(provider: ContractProvider) {
        const { stack } = await provider.get("get_first_smg_id", []);
        return stack.readBigNumber();
    }
    async getNextStoremanGroupID(provider: ContractProvider, id: bigint) {
        const { stack } = await provider.get("get_next_smg_id", [{ type: 'int', value: id }]);
        return stack.readBigNumber();
    }
    async getStoremanGroupConfig(provider: ContractProvider, id: bigint) {
        const { stack } = await provider.get("get_smgConfig", [{ type: 'int', value: id }]);
        return {
            gpk:stack.readBigNumber(),
            startTime:stack.readBigNumber(),
            endTime:stack.readBigNumber(),
        }
    }
    async sendSetStoremanGroupConfig(provider: ContractProvider, id: bigint, gpk: bigint, startTime: number, endTime: number,
        opts: {
            sender: Sender,
            value: bigint,
            queryID?: number,
        }
    ) {
        await provider.internal(opts.sender, {
            value: opts.value,
            body: beginCell()
            .storeUint(OP_ORACLE_SetSMG, 32) // op (op #1 = increment)
            .storeUint(0, 64) // query id
            .storeUint(id, 256)
            .storeUint(gpk, 256)
            .storeUint(startTime, 64)
            .storeUint(endTime, 64)
            .endCell()
        });
    }    
}
