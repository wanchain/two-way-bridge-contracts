import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, Slice } from '@ton/core';
import * as opcodes from  "./opcodes";
import { HttpApi } from '@ton/ton';
import { getHttpEndpoint } from "@orbs-network/ton-access";
import internal from 'stream';

export type GroupApproveConfig = {
    chainId: number;
    taskId:  number;
    foundation: Address;
    bridge: Address;
};

export function GroupApproveConfigToCell(config: GroupApproveConfig): Cell {
    return beginCell()
        .storeUint(config.taskId, 256)
        .storeAddress(config.foundation)
        .storeAddress(config.bridge)
        .storeDict()
        .endCell();
}


export class GroupApprove implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new GroupApprove(address);
    }

    static createFromConfig(config: GroupApproveConfig, code: Cell) {
        const data = GroupApproveConfigToCell(config);
        const init = { code, data };
        return new GroupApprove(contractAddress(0, init), init);
    }


    async sendDeploy(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value:"0.1",
            body: beginCell().endCell(),
        });
    }

    async sendTransferCrossOwner(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,
            owner: Address,
        }
    ) {
        let msg = beginCell()
            .storeUint(opcodes.OP_COMMON_TransferOwner, 32) // op (op #1 = increment)
            .storeAddress(opts.owner)
            .endCell()
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)                
                .storeRef(msg)
                .endCell()
        });
    }
    async sendTransferOracleAdmin(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,
            oracleAdmin: Address,
        }
    ) {
        let msg = beginCell()
            .storeUint(opcodes.OP_ORACLE_TransferOracleAdmin, 32) // op (op #1 = increment)
            .storeAddress(opts.oracleAdmin)
            .endCell()
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)                
                .storeRef(msg)
                .endCell()
        });
    }    
    async sendTransferRobotAdmin(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,
            robotAdmin: Address,
        }
    ) {
        let msg = beginCell()
            .storeUint(opcodes.OP_ORACLE_TransferOracleAdmin, 32) // op (op #1 = increment)
            .storeAddress(opts.robotAdmin)
            .endCell()
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)                
                .storeRef(msg)
                .endCell()
        });
    }      
    async sendTransferFoundation(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,
            foundation: Address,
        }
    ) {
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_TranferFoundation, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeAddress(opts.foundation)                
                .endCell()
        });
    }       
    async sendCrossHalt(
        provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,
            halt: number,
        }
    ) {
        console.log("send crosss bridge address:", opts.toAddr)
        let msg = beginCell()
        .storeUint(opcodes.OP_COMMON_SetHalt, 32)
        .storeUint(opts.halt, 2)
        .endCell();
        console.log("sendCrossHalt msg:", msg)
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)
                .storeRef(msg)
                .endCell()
        });
    }    
    async sendAddCrossAdmin(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,
            admin: Address,
        }
    ) {
        let msg = beginCell()
            .storeUint(opcodes.OP_EXTEND_AddCrossAdmin, 32) // op (op #1 = increment)
            .storeAddress(opts.admin)
            .endCell()
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)                
                .storeRef(msg)
                .endCell()
        });
    }    
    async sendRemoveCrossAdmin(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,
            admin: Address,
        }
    ) {
        let msg = beginCell()
            .storeUint(opcodes.OP_EXTEND_DelCrossAdmin, 32) // op (op #1 = increment)
            .storeAddress(opts.admin)
            .endCell()
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)                
                .storeRef(msg)
                .endCell()
        });
    }   
    async sendAddTokenPair(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,
            tokenPairId:number,
            fromChainID:number,
            fromAccount:string,
            toChainID:number,
            toAccount:string,        }
    ) {
        let from = opts.fromAccount.substring(0,2).toLowerCase() == "0x"?opts.fromAccount.substring(2):opts.fromAccount
        let to = opts.toAccount.substring(0,2).toLowerCase() == "0x"?opts.toAccount.substring(2):opts.toAccount

        let fromBuffer = Buffer.from(from,'hex')
        let toBuffer = Buffer.from(to,'hex')
     
        let msg = beginCell()
            .storeUint(opcodes.OP_TOKENPAIR_Upsert, 32)
            .storeUint(opts.tokenPairId, 32)
            .storeUint(opts.fromChainID, 32)
            .storeUint(opts.toChainID, 32)
            .storeUint(fromBuffer.length, 8)
            .storeBuffer(fromBuffer)
            .storeUint(toBuffer.length, 8)
            .storeBuffer(toBuffer)        
            .endCell()
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)                
                .storeRef(msg)
                .endCell()
        });
    }    
    async sendRemoveTokenPair(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,
            tokenPairId: number,
        }
    ) {
        let msg = beginCell()
            .storeUint(opcodes.OP_TOKENPAIR_Remove, 32) // op (op #1 = increment)
            .storeUint(opts.tokenPairId, 32)
            .endCell()
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)                
                .storeRef(msg)
                .endCell()
        });
    }      
    async sendSetFeeProxy(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,
            feeProxy: Address,
        }
    ) {
        let msg = beginCell()
            .storeUint(opcodes.OP_FEE_SetSmgFeeProxy, 32) // op (op #1 = increment)
            .storeAddress(opts.feeProxy)
            .endCell()
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeUint(opts.chainId, 64)  // chainId
                .storeAddress(opts.toAddr)                
                .storeRef(msg)
                .endCell()
        });
    }        
    async sendApproveExec(
        provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            taskId: number,
            smgId: bigint,
            e:bigint,
            p:bigint,
            s:bigint,
        }
    ) {
        let proof = beginCell()
        .storeUint(opts.e, 256)
        .storeUint(opts.p, 256)
        .storeUint(opts.s, 256)
        .endCell();
        await provider.internal(sender, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Execute, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(0, 256) // smgid
                .storeUint(opts.taskId,64)
                .storeRef(proof)
                .endCell(),
        });
    }
    async getProposolCount(provider: ContractProvider) {
        const result = await provider.get('get_proposol_count', []);
        return result.stack.readNumber()
    }
    async getProposolById(provider: ContractProvider, id: bigint) {
        const result = await provider.get('get_proposol', [{ type: 'int', value: id }]);
        return {
            toAddr: result.stack.readAddress(),
            msg:result.stack.readCell().asSlice(),
            executed: result.stack.readNumber()
        }
    }   
    
    static computeHash(proposolId:bigint, currentChainId: bigint) {
        let msg = beginCell()
            .storeUint(proposolId, 64)
            .storeUint(currentChainId, 32)
            .endCell()

        return msg.hash();
    } 
}
