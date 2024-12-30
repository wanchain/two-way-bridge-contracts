import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, Slice } from '@ton/core';
import * as opcodes from  "./opcodes";
import { HttpApi } from '@ton/ton';
import { getHttpEndpoint } from "@orbs-network/ton-access";
import internal from 'stream';

import {BIP44_CHAINID} from './const/const-value';
import {codeTable} from "./code/encode-decode";

import {logger} from './utils/logger'
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
            operator: Address,
        }
    ) {
        let msg = beginCell()
            .storeUint(opcodes.OP_FEE_SetFeeOperator, 32) // op (op #1 = increment)
            .storeAddress(opts.operator)
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
        let msg = beginCell()
            .storeUint(opcodes.OP_GROUPAPPROVE_TranferFoundation, 32) // op (op #1 = increment)
            .storeAddress(opts.foundation)
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
        logger.info(formatUtil.format("send crosss bridge address:%s",opts.toAddr));
        let msg = beginCell()
        .storeUint(opcodes.OP_COMMON_SetHalt, 32)
        .storeUint(opts.halt, 2)
        .endCell();
        logger.info(formatUtil.format("sendCrossHalt msg:", msg));
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
            .storeUint(opcodes.OP_FEE_AddCrossAdmin, 32) // op (op #1 = increment)
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
            .storeUint(opcodes.OP_FEE_DelCrossAdmin, 32) // op (op #1 = increment)
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
        let toBuffer, fromBuffer
        if(opts.fromChainID == BIP44_CHAINID) {
            let fromAddr = Address.parseFriendly(opts.fromAccount)
            fromBuffer = fromAddr.address.hash
            toBuffer = Buffer.from(opts.toAccount.startsWith("0x")?opts.toAccount.slice(2):opts.toAccount,'hex')
        } else if(opts.toChainID == BIP44_CHAINID) {
            let toAddr = Address.parseFriendly(opts.toAccount)
            toBuffer = toAddr.address.hash
            fromBuffer = Buffer.from(opts.fromAccount.startsWith("0x")?opts.fromAccount.slice(2):opts.fromAccount,'hex')
        } else {
            throw("Error chain ID.")
        }
        logger.info(formatUtil.format("fromBuffer,toBuffer:", fromBuffer.toString('hex'), toBuffer.toString('hex')));

        let msg = beginCell()
            .storeUint(opcodes.OP_TOKENPAIR_Upsert, 32)
            .storeUint(opts.tokenPairId, 32)
            .storeUint(opts.fromChainID, 32)
            .storeUint(opts.toChainID, 32)
            .storeUint(fromBuffer.length, 8)
            .storeUint(toBuffer.length, 8)
            .storeRef(beginCell().storeBuffer(fromBuffer).endCell())
            .storeRef(beginCell().storeBuffer(toBuffer).endCell())
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
        let msg = beginCell()
        .storeUint(opcodes.OP_UPGRADE_Code, 32) // op (op #1 = increment)
        .storeRef(opts.code)
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
