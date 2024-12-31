import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, Slice } from '@ton/core';
import * as opcodes from  "./opcodes";
import { HttpApi } from '@ton/ton';
import { getHttpEndpoint } from "@orbs-network/ton-access";
import internal from 'stream';

import {BIP44_CHAINID} from './const/const-value';
import {codeTable} from "./code/encode-decode";

import {logger} from './utils/logger'
import {OP_GROUPAPPROVE_Proposol_TransferOwner} from "./opcodes";
const formatUtil = require('util');



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


    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
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
        await provider.internal(sender, {
            value: opts.value,
            body: codeTable[opcodes.OP_GROUPAPPROVE_Proposol_TransferOwner].enCode(opts)
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
        await provider.internal(sender, {
            value: opts.value,
            body: codeTable[opcodes.OP_GROUPAPPROVE_Proposol_TransferOracleAdmin].enCode(opts)
        });
    }    
    async sendTransferRobotAdmin(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,
            operator: Address,
        }
    ) {
        await provider.internal(sender, {
            value: opts.value,
            body: codeTable[opcodes.OP_GROUPAPPROVE_Proposol_TransferOperator].enCode(opts)
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
            body: codeTable[opcodes.OP_GROUPAPPROVE_Proposol_TranferFoundation].enCode(opts)
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
        await provider.internal(sender, {
            value: opts.value,
            body: codeTable[opcodes.OP_GROUPAPPROVE_Proposol_SetHalt].enCode(opts)
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
        await provider.internal(sender, {
            value: opts.value,
            body: codeTable[opcodes.OP_GROUPAPPROVE_Proposol_AddCrossAdmin].enCode(opts)
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
        await provider.internal(sender, {
            value: opts.value,
            body: codeTable[opcodes.OP_GROUPAPPROVE_Proposol_DelCrossAdmin].enCode(opts)
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
            toAccount:string,
            jettonAdminAddr:string
        }
    ) {
        await provider.internal(sender, {
            value: opts.value,
            body: codeTable[opcodes.OP_GROUPAPPROVE_Proposol_TOKENPAIR_Upsert].enCode(opts)
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
        await provider.internal(sender, {
            value: opts.value,
            body: codeTable[opcodes.OP_GROUPAPPROVE_Proposol_TOKENPAIR_Remove].enCode(opts)
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
        await provider.internal(sender, {
            value: opts.value,
            body: codeTable[opcodes.OP_GROUPAPPROVE_Proposol_SetSmgFeeProxy].enCode(opts)
        });
    }        
    async sendUpgradeSC(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            chainId:number,
            toAddr: Address,            
            code: Cell,
        }
    ) {
        await provider.internal(sender, {
            value: opts.value,
            body: codeTable[opcodes.OP_GROUPAPPROVE_Proposol_UpgradeSc].enCode(opts)
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
                .storeUint(opts.smgId, 256)
                .storeUint(opts.taskId,64)
                .storeRef(proof)
                .endCell(),
        });
    }
    async getProposolCount(provider: ContractProvider) {
        const result = await provider.get('get_proposol_count', []);
        return result.stack.readNumber()
    }
    async getConfig(provider: ContractProvider) {
        const result = await provider.get('get_config', []);
        let foundation = result.stack.readAddress();
        let bridge = result.stack.readAddress();
        return {
            foundation, bridge
        }
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
