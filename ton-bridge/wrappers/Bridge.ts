import {logger} from './utils/logger'
const formatUtil = require('util');
import {buildUserLockMessages} from './code/userLock'

import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano
} from '@ton/core';
import {JettonMinter} from "./JettonMinter";
import {JettonWallet} from "./JettonWallet";
import {HexStringToBuffer,BufferrToHexString} from "./utils/utils";
import * as fs from "fs";
import * as opcodes from "./opcodes"
import {OP_CROSS_SmgRelease, OP_FEE_SetSmgFeeProxy} from "./opcodes";
import {codeTable} from "./code/encode-decode";
import {BIP44_CHAINID,TON_COIN_ACCOUT,TON_COIN_ACCOUNT_STR,WK_CHIANID} from "./const/const-value";
import {TonClient} from "@ton/ton";
import {Blockchain} from "@ton/sandbox";

import {WanTonClient} from "./client/client-interface";

export type BridgeConfig = {
    owner:Address,
    halt: number,
    init: number,
    smgFeeProxy:Address,
    oracleAdmin:Address,
    operator:Address,
};

export type CrossConfig = {
    owner:Address,
    admin:Address,
    halt: number,
    init: number,
};

export function bridgeConfigToCell(config: BridgeConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        // .storeAddress(config.admin)
        .storeUint(config.halt,2)
        .storeUint(config.init,2)

        .storeRef(beginCell() // *****about fee begin*****
            .storeAddress(config.smgFeeProxy) // feeProxyAddress
            .storeAddress(config.operator) // operator
            .storeDict() // about Contract and Agent fee
            .storeDict() // about tokenPairFee
            .storeDict() // cross_admin
            .endCell())  // *****about fee end*****

        .storeRef(beginCell()  // *****about oracle begin*****
            .storeAddress(config.oracleAdmin) // oracleAdmin
            .storeDict() // mapSmgConfig
            .storeDict() // mapSmgConfigCommit
            .storeDict() // mapSmgTxStatus
            .endCell()) // *****about oracle end*****

        .storeRef(beginCell() // *****about tm begin*****
            .storeDict() // mapTokenPairInfo
            //.storeDict() // mapWrappedToken
            .endCell()) // *****about tm end*****

        .storeRef(beginCell()
            .endCell()) // extended
        .endCell();
}


export class Bridge implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Bridge(address);
    }

    static createFromConfig(config: BridgeConfig, code: Cell, workchain = 0) {
        const data = bridgeConfigToCell(config);
        const init = { code, data };
        return new Bridge(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendSetTokenPairFee(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            tokenPairID:number,
            fee:number,
        }
    ) {

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: codeTable[opcodes.OP_FEE_SetTokenPairFee].enCode(opts),
        });
    }
    async sendSetTokenPairFees(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            tokenPairID:number[],
            fee:number[],
        }
    ) {

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: codeTable[opcodes.OP_FEE_SetTokenPairFees].enCode(opts),
        });
    }
    async sendSetChainFee(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            srcChainId:number,
            dstChainId:number,
            contractFee:number,
            agentFee:number,
        }
    ) {

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: codeTable[opcodes.OP_FEE_SetChainFee].enCode(opts),
        });
    }
    async sendSetChainFees(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            srcChainId:number[],
            dstChainId:number[],
            contractFee:number[],
            agentFee:number[],
        }
    ) {

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: codeTable[opcodes.OP_FEE_SetChainFees].enCode(opts),
        });
    }

    async sendAddTokenPair(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            tokenPairId:number,
            fromChainID:number,
            fromAccount:string,
            toChainID:number,
            toAccount:string,
            jettonAdminAddr:string,
            walletCodeBase64?:string,
        }
    ) {

        let bodyHex = codeTable[opcodes.OP_TOKENPAIR_Upsert].enCode(opts).toBoc().toString('hex');
        logger.info(formatUtil.format("bodyHex %s",bodyHex));
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: codeTable[opcodes.OP_TOKENPAIR_Upsert].enCode(opts),
        });
    }
    async sendRemoveTokenPair(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            tokenPairId:number,
        }
    ) {
        let bodyCell = codeTable[opcodes.OP_TOKENPAIR_Remove].enCode(opts);
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: bodyCell,
        });
    }

    async getJettonWalletAddr(provider: ContractProvider,jettonMaster:Address,owner:Address){
        let c = JettonMinter.createFromAddress(jettonMaster);
        let jettonMinterScOpened =  await provider.open(c);
        return await jettonMinterScOpened.getWalletAddress(owner);
    }

    async getJettonAdminAddr(provider: ContractProvider,jettonMaster:Address){
        let c = JettonMinter.createFromAddress(jettonMaster);
        let jettonMinterScOpened =  await provider.open(c);
        return await jettonMinterScOpened.getAdminAddress();
    }

    async getTokenAccount(provider: ContractProvider,tokenPairID:number){
        // 1. get tokenpair from bridge
        let tokePairInfo = await this.getTokenPair(provider,tokenPairID);
        logger.info(formatUtil.format("tokePairInfo",tokePairInfo));

        // 2. check src account and dst account
        let tokenAccount = "";
        if (tokePairInfo.fromChainID == BIP44_CHAINID){
            tokenAccount = tokePairInfo.fromAccount;
        }else{
            if(tokePairInfo.toChainID == BIP44_CHAINID){
                tokenAccount = tokePairInfo.toAccount;
            }else{
                throw "TokenPair not support"
            }
        }
        return tokenAccount;
    }

    async sendUserLock(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            smgID:string,
            tokenPairID:number,
            crossValue:bigint,
            dstUserAccount:string, // hex string
            client:WanTonClient|Blockchain,
            senderAccount:string,
            bridgeScAddr:string,
        },differentQueryID?: number,
    ) {

        let ret = await buildUserLockMessages({
            value: opts.value,
            smgID: opts.smgID,
            tokenPairID: opts.tokenPairID,
            crossValue: opts.crossValue,
            dstUserAccount: opts.dstUserAccount,
            bridgeScAddr: opts.bridgeScAddr,
            client: opts.client,
            senderAccount: opts.senderAccount
        },differentQueryID)
        console.log("ret==>",ret);
        console.log("ret.to==>",ret.to);

        if(ret.to.toString() == this.address.toString()){
            console.log("entering lock coin");
            let totalValue:bigint;
            totalValue = ret.value;
            await provider.internal(via, {
                value: totalValue,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                body: ret.body});
        }else{
             console.log("entering lock token");
             let provider = await opts.client.provider(ret.to as unknown as Address);
             await provider.internal(via, {
                 value: opts.value,
                 //sendMode: SendMode.PAY_GAS_SEPARATELY,
                 sendMode: SendMode.NONE,
                 body: ret.body})
        }
    }

    async sendSmgRelease(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            uniqueID:bigint,
            smgID:string,
            tokenPairID:number,
            releaseValue:bigint,
            fee:bigint,
            userAccount:Address,
            bridgeJettonWalletAddr: Address, // used to send wrapped token
            e:bigint,
            p:bigint,
            s:bigint,
            fwTonAmount:bigint,
            totalTonAmount:bigint,
        }
    ) {
        console.log("opts1",opts);
        let body = codeTable[opcodes.OP_CROSS_SmgRelease].enCode(opts);
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body});
    }

    async sendHalt(        
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            halt:number,
        }){
            await provider.internal(via, {
                value: opts.value,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                body: beginCell()
                    .storeUint(opcodes.OP_COMMON_SetHalt, 32)
                    .storeUint(opts.queryID ?? 0, 64)
                    .storeUint(opts.halt, 2)
                    .endCell(),
            });
    }
    async sendTransferCrossOwner(provider: ContractProvider, sender: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            owner: Address,
        }
    ) {
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_COMMON_TransferOwner, 32) // op (op #1 = increment)
                .storeUint(opts.queryID?opts.queryID:0, 64) // query id
                .storeAddress(opts.owner)                
                .endCell()
        });
    }
    
    async getCrossConfig(provider: ContractProvider) {
        const common = await provider.get('get_cross_config', []);
        let oracleAdmin = await provider.get('get_oracle_admin', [])
        let feeConfig = await provider.get('get_fee_config', [])
        return {
            owner: common.stack.readAddress(),
            halt:common.stack.readNumber(),
            init:common.stack.readNumber(),
            oracleAdmin: oracleAdmin.stack.readAddress(),
            feeProxyAdmin: feeConfig.stack.readAddress(),
            operator: feeConfig.stack.readAddress(),
        }
    }

    async getChainFee(provider: ContractProvider,srcChainId:number,dstChainId:number) {
        const result = await provider.get('get_chain_fee', [{ type: 'int', value: BigInt(srcChainId) },
            { type: 'int', value: BigInt(dstChainId)}]);
        return {
            contractFee:result.stack.readNumber(),
            agentFee:result.stack.readNumber()
        }
    }
    async getTokenPairFee(provider: ContractProvider,tokenpair:number) {
        const result = await provider.get('get_tokenpair_fee', [{ type: 'int', value: BigInt(tokenpair) }]);
        return result.stack.readNumber()
    }

    async getTokenPair(provider: ContractProvider,tokenPairId:number) {
        const result = await provider.get('get_token_pair', [{ type: 'int', value: BigInt(tokenPairId) }]);
        let fromChainID = result.stack.readNumber();
        let fromAccount = result.stack.readBuffer();
        let toChainID = result.stack.readNumber();
        let toAccount = result.stack.readBuffer();
        let jettonAdminAddr = result.stack.readBuffer();
        let exist = 1
        if(result.stack.remaining){
            exist = result.stack.readNumber();
        }
        let walletCode = Cell.EMPTY
        if(result.stack.remaining){
            walletCode = result.stack.readCellOpt();
        }


        let pair =  {fromChainID, toChainID, fromAccount:"", toAccount:"", jettonAdminAddr:"", walletCodeBase64:"",exist:""}
        if(pair.fromChainID == 0 || pair.toChainID == 0) {
            return pair
        }
        if(BIP44_CHAINID == fromChainID) {
            let addr = new Address(0, fromAccount)
            pair['fromAccount'] = addr.toString()
            pair['toAccount'] = "0x"+toAccount.toString('hex')
        } else {
            let addr = new Address(0, toAccount)
            pair['toAccount'] = addr.toString()
            pair['fromAccount'] = "0x"+fromAccount.toString('hex')
        }
        pair['exist'] = exist.toString();
        pair['jettonAdminAddr'] = (new Address(0, jettonAdminAddr)).toString()
        pair['walletCodeBase64'] = walletCode.toBoc().toString('base64');
        return pair
    }

    async getFirstTokenPairID(provider: ContractProvider) {
        const result = await provider.get('get_first_tokenpair_id', []);
        // todo getTokenPair
        return result.stack.readNumber()
    }

    async getNextTokenPairID(provider: ContractProvider, id: number) {
        const result = await provider.get('get_next_tokenpair_id', [{ type: 'int', value: BigInt(id) }]);
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
    async getFirstStoremanGroupIDCommited(provider: ContractProvider) {
        const { stack } = await provider.get("get_first_smg_id_Commited", []);
        return stack.readBigNumber();
    }

    async getNextStoremanGroupIDCommited(provider: ContractProvider, id: bigint) {
        const { stack } = await provider.get("get_next_smg_id_Commited", [{ type: 'int', value: id }]);
        return stack.readBigNumber();
    }
    async getStoremanGroupConfig(provider: ContractProvider, id: bigint) {
        const { stack } = await provider.get("get_smgConfig", [{ type: 'int', value: id }]);
        return {
            gpkX:stack.readBigNumber(),
            gpkY:stack.readBigNumber(),
            startTime:stack.readBigNumber(),
            endTime:stack.readBigNumber(),
        }
    }
    async getStoremanGroupConfigCommited(provider: ContractProvider, id: bigint) {
        const { stack } = await provider.get("get_smgConfigCommited", [{ type: 'int', value: id }]);
        return {
            gpkX:stack.readBigNumber(),
            gpkY:stack.readBigNumber(),
            startTime:stack.readBigNumber(),
            endTime:stack.readBigNumber(),
        }
    }
    async sendSetStoremanGroupConfig(provider: ContractProvider, sender: Sender,
        opts: {
            id: bigint, gpkX: bigint, gpkY:bigint, startTime: number, endTime: number,
            value: bigint,
            queryID?: number,
        }
    ) {
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_ORACLE_SetSMG, 32)
                .storeUint(0, 64) // query id
                .storeUint(opts.id, 256)
                .storeUint(opts.gpkX, 256)
                .storeUint(opts.gpkY, 256)
                .storeUint(opts.startTime, 64)
                .storeUint(opts.endTime, 64)
                .endCell()
        });
    }
    async sendRemoveStoremanGroup(provider: ContractProvider, sender: Sender,
        opts: {
            id: bigint,
            value: bigint,
            queryID?: number,
        }
    ) {
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_ORACLE_DeleteSMG, 32)
                .storeUint(0, 64) // query id
                .storeUint(opts.id, 256)
                .endCell()
        });
    }
    async sendSetStoremanGroupConfigCommit(provider: ContractProvider, sender: Sender,
        opts: {
            id: bigint, gpkX: bigint, gpkY:bigint, startTime: number, endTime: number,
            value: bigint,
            queryID?: number,
        }
    ) {
        await provider.internal(sender, {
            value: opts.value,
            body: beginCell()
                .storeUint(opcodes.OP_ORACLE_CommitSMG, 32)
                .storeUint(0, 64) // query id
                .storeUint(opts.id, 256)
                .storeUint(opts.gpkX, 256)
                .storeUint(opts.gpkY, 256)
                .storeUint(opts.startTime, 64)
                .storeUint(opts.endTime, 64)
                .endCell()
        });
    }    
    async getBalance(provider: ContractProvider) {
        let state = await provider.getState();
        return state.balance;
    }
    async sendAddAdmin(
        provider: ContractProvider,
        via:Sender,
        opts: {
            value: bigint,
            queryID?: number,
            adminAddr:Address,
        }
    ) {
        let isValid = Address.isAddress(opts.adminAddr)
        if (!isValid){
            await Promise.reject("in valid address")
        }
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opcodes.OP_FEE_AddCrossAdmin, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(opts.adminAddr)
                .endCell(),
        });
    }
    async sendRemoveAdmin(
        provider: ContractProvider,
        via:Sender,
        opts: {
            value: bigint,
            queryID?: number,
            adminAddr:Address,
        }
    ) {
        let isValid = Address.isAddress(opts.adminAddr)
        if (!isValid){
            await Promise.reject("in valid address")
        }
        return await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opcodes.OP_FEE_DelCrossAdmin, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(opts.adminAddr)
                .endCell(),
        });
    }
    async sendSetFeeProxy(
        provider: ContractProvider,
        via:Sender,
        opts: {
            value: bigint,
            queryID?: number,
            feeProxy:Address,
        }
    ) {
        let isValid = Address.isAddress(opts.feeProxy)
        if (!isValid){
            await Promise.reject("in valid address")
        }
        return await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opcodes.OP_FEE_SetSmgFeeProxy, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(opts.feeProxy)
                .endCell(),
        });
    }
    async getFirstAdmin(provider: ContractProvider,){
        const { stack } = await provider.get("get_first_crossAdmin", []);
        let s = stack.readBuffer();
        if(s.toString('hex') == '0000000000000000000000000000000000000000000000000000000000000000') {
            return ""
        }
        let addr = new Address(0, s)
        return addr.toString()
    }

    async getNextAdmin(provider: ContractProvider,adminAddr:Address){
        const { stack } = await provider.get("get_next_crossAdmin", [{ type: 'slice', cell: beginCell().storeAddress(adminAddr).endCell()}]);
        let s = stack.readBuffer();
        if (s.toString('hex') == '0000000000000000000000000000000000000000000000000000000000000000') {
            return ""
        }
        let addr = new Address(0, s)
        return addr.toString()
    }



    // for upgrade sc test
    async getUpdatedInt(provider: ContractProvider) {
        const result = await provider.get('get_updated_int', []);
        return result.stack.readNumber()
    }

    async sendUpdateInt(provider: ContractProvider,
        opts: {
            sender: Sender,
            value: bigint,
            queryID?: number,
        }
    ) {
        await provider.internal(opts.sender, {
            value: opts.value,
            body: beginCell()
            .storeUint(opcodes.OP_EXTEND_UpdateAddInt, 32) // op (op #1 = increment)
            .storeUint(0, 64) // query id
            .endCell()
        });
    }

    async sendUpgradeSC(provider: ContractProvider,via:Sender,
        opts: {
            value: bigint,
            queryID?: number,
            code:Cell,
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            body: beginCell()
            .storeUint(opcodes.OP_UPGRADE_Code, 32) // op (op #1 = increment)
            .storeUint(0, 64) // query id
            .storeRef(opts.code)
            .endCell()
        });
    }

    async getVersion(provider: ContractProvider) {
        const result = await provider.get('version', []);
        return result.stack.readString()
    }
}
