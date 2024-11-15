import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, Slice } from '@ton/core';
import * as opcodes from  "./opcodes";
import { HttpApi } from '@ton/ton';
import { getHttpEndpoint } from "@orbs-network/ton-access";
import internal from 'stream';

export type GroupApproveConfig = {
    chainId: number;
    taskId:  number;
    foundation: Address;
};

export function GroupApproveConfigToCell(config: GroupApproveConfig): Cell {
    return beginCell()
        .storeUint(config.taskId, 256)
        .storeAddress(config.foundation)
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

    async sendTransferCrossOwner(provider: ContractProvider, owner: Address,
        opts: {
            sender: Sender,
            value: bigint,
            queryID?: number,
        }
    ) {
        let msg = beginCell()
            .storeUint(opcodes.OP_CROSS_TransOwner, 32) // op (op #1 = increment)
            .storeUint(0, 64) // query id
            .storeAddress(owner)
            .endCell()
        console.log(" debug: sendTransferCrossOwner:", owner)
        await provider.internal(opts.sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Proposol, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeRef(msg)
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
            gpAddr: Address,
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
                .storeAddress(opts.gpAddr)
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
            smgId: Slice,
            r: Slice,
            s: Slice,
        }
    ) {
        let proof = beginCell()  //  r, s
            .storeUint(0, 256)
            .storeUint(0, 256)
            .storeUint(0, 256)
        await provider.internal(sender, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opcodes.OP_GROUPAPPROVE_Execute, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.taskId,64)
                .storeUint(0, 256) // smgid
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
}
