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
import {HexStringToBuffer,BufferrToHexString} from "../tests/utils";
import * as fs from "fs";
import { compile } from '@ton/blueprint';
import * as opcodes from "./opcodes"
import {OP_CROSS_SmgRelease} from "./opcodes";

export const BIP44_CHAINID = 0x4567; //todo change later
export const TON_COIN_ACCOUT = "0x0000000000000000000000000000000000000000000000000000000000000000"; // 32 bytes
export const WK_CHIANID = "0";

export type BridgeConfig = {
    owner:Address,
    halt: number,
    init: number,
    smgFeeProxy:Address,
    oracleAdmin:Address,
    robotAdmin:Address,
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
            .storeAddress(config.robotAdmin) // robotAdmin
            .storeDict() // about Contract and Agent fee
            .storeDict() // about tokenPairFee
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
            .storeDict() // cross_admin
            .endCell()) // extended
        .endCell();
}

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

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendSetFee(
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
            body: beginCell()
                .storeUint(opcodes.OP_FEE_SetTokenPairFee, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.srcChainId, 32)
                .storeUint(opts.dstChainId, 32)
                .storeUint(opts.contractFee, 32)
                .storeUint(opts.agentFee, 32)
                .endCell(),
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
        }
    ) {
        let from = opts.fromAccount.substring(0,2).toLowerCase() == "0x"?opts.fromAccount.substring(2):opts.fromAccount
        let to = opts.toAccount.substring(0,2).toLowerCase() == "0x"?opts.toAccount.substring(2):opts.toAccount

        console.log("xxxxxfromxxxx",from);
        console.log("xxxxxtoxxxx",to);

        let fromBuffer = Buffer.from(from,'hex')
        let toBuffer = Buffer.from(to,'hex')

        console.log("fromBuffer.length",from.length);
        console.log("toBuffer.length",to.length);

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                //.storeUint(opcodes.OP_TOKENPAIR_Add, 32)
                .storeUint(opcodes.OP_TOKENPAIR_Upsert, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.tokenPairId, 32)
                .storeUint(opts.fromChainID, 32)
                .storeUint(opts.toChainID, 32)
                .storeUint(fromBuffer.length, 8)
                .storeBuffer(fromBuffer)
                .storeUint(toBuffer.length, 8)
                .storeBuffer(toBuffer)
                .endCell(),
        });
    }

    async sendUserLock(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            smgID:string,
            tokenPairID:number,
            crossValue:bigint,
            dstUserAccount:Address,
        }
    ) {

        // 1. get tokenpair from bridge
        let tokePairInfo = await this.getTokenPair(provider,opts.tokenPairID);
        console.log("tokePairInfo",tokePairInfo);

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


        let sendUserLock = async ()=>{
            let ret = await provider.internal(via, {
                value: opts.value,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                body: beginCell()
                    .storeUint(opcodes.OP_CROSS_UserLock, 32)
                    .storeUint(opts.queryID ?? 0, 64)
                    .storeUint(BigInt(opts.smgID), 256)
                    .storeUint(opts.tokenPairID, 32)
                    .storeUint(opts.crossValue, 256)
                    .storeAddress(opts.dstUserAccount)
                    .endCell()
            });
            return ret;
        }
        console.log("tokenAccount",tokenAccount,"TON_COIN_ACCOUT",TON_COIN_ACCOUT);
        console.log("(len)tokenAccount",tokenAccount.length,"(len)TON_COIN_ACCOUT",TON_COIN_ACCOUT.length);
        // 3.1 ton
        if(tokenAccount === TON_COIN_ACCOUT.substring(2) ){
            console.log("entering ton coin........");
            let ret = await sendUserLock();
            return;
        }

        //let addrFriedly = Address.parseFriendly(HexStringToBuffer(tokenAccount));
        let addRaw = Address.parse(WK_CHIANID+":"+ tokenAccount);
        let c = JettonMinter.createFromAddress(addRaw);
        let jp =  await provider.open(c);
        // 3.2 original Token
        let admin = await jp.getAdminAddress();
        console.log("JettonMinter address , admin address, bridge address", jp.address,admin, this.address)
        if (admin != this.address){
            console.log("entering original Token........");
            let JwBridgeAddr = await jp.getWalletAddress(this.address);
            console.log("JwBridge address, bridge address",JwBridgeAddr,this.address);

            console.log("via....",via);

            if(!Address.isAddress(via.address)){
                throw "invalid via.address"
            }
            let JwUserAddr = await jp.getWalletAddress(via.address);
            console.log("JwUserAddr address, via.address",JwUserAddr,via.address);

            let JwUserSc = await JettonWallet.createFromAddress(JwUserAddr);
            let JwBridgeSc = await JettonWallet.createFromAddress(JwBridgeAddr);

            let jwu =  await provider.open(JwUserSc);
            let jwb =  await provider.open(JwBridgeSc);

            console.log("before lock  user(usdt_balance) = %d, bridge(usdt_balance)  = %d",
                await jwu.getJettonBalance(),
                await jwb.getJettonBalance())

            let forwardAmount = toNano('0.05');
            const sendResult = await jwu.sendTransfer(via,
                toNano('0.1'), //tons
                opts.crossValue, this.address,
                this.address, beginCell().endCell(), forwardAmount, beginCell().endCell());

            console.log("After lock  user(usdt_balance) = %d, bridge(usdt_balance)  = %d",
                await jwu.getJettonBalance(),
                await jwb.getJettonBalance());
            let ret = await sendUserLock();
            return;
        }

        // 3.3 wrapped Token
        if (admin == this.address){
            console.log("entering wrapped Token........");
            let JwBridgeAddr = await jp.getWalletAddress(this.address);
            console.log("JwBridge address, bridge address",JwBridgeAddr,this.address);

            console.log("via....",via);

            if(!Address.isAddress(via.address)){
                throw "invalid via.address"
            }
            let JwUserAddr = await jp.getWalletAddress(via.address);
            console.log("JwUserAddr address, via.address",JwUserAddr,via.address);

            let JwUserSc = await JettonWallet.createFromAddress(JwUserAddr);
            let JwBridgeSc = await JettonWallet.createFromAddress(JwBridgeAddr);

            let jwu =  await provider.open(JwUserSc);
            let jwb =  await provider.open(JwBridgeSc);

            console.log("before lock  user(dog_balance) = %d, bridge(dog_balance)  = %d",
                await jwu.getJettonBalance(),
                await jwb.getJettonBalance())

            let forwardAmount = toNano('0.05');
            const sendResult = await jwu.sendBurn(via,
                toNano('0.1'), //tons
                opts.crossValue, this.address,
                beginCell().endCell());

            console.log("After lock  user(dog_balance) = %d, bridge(dog_balance)  = %d",
                await jwu.getJettonBalance(),
                await jwb.getJettonBalance());
            let ret = await sendUserLock();
            return;
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
            jettonAdminAddr:Address,        // used to check whether wrapped token or original token
            bridgeJettonWalletAddr: Address, // used to send wrapped token
            e:bigint,
            p:bigint,
            s:bigint,
        }
    ) {

        let part2Cell = beginCell()
            .storeUint(opts.fee, 256)
            .storeAddress(opts.userAccount)
            .endCell();

        let part3Cell = beginCell()
            .storeUint(opts.e, 256)
            .storeUint(opts.p, 256)
            .storeUint(opts.s, 256)
            .endCell();

        let part4Cell  = beginCell()
            .storeAddress(opts.jettonAdminAddr)
            .storeAddress(opts.bridgeJettonWalletAddr)
            .endCell();

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opcodes.OP_CROSS_SmgRelease, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(BigInt(opts.uniqueID), 256)
                .storeUint(BigInt(opts.smgID), 256)
                .storeUint(opts.tokenPairID, 32)
                .storeUint(opts.releaseValue, 256)
                .storeRef(part2Cell)
                .storeRef(part3Cell)
                .storeRef(part4Cell)
                .endCell()
        });
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
            robotAdmin: feeConfig.stack.readAddress(),
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
            fromAccount:result.stack.readBuffer().toString('hex'),
            toChainID:result.stack.readNumber(),
            toAccount:result.stack.readBuffer().toString('hex'),
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
                .storeUint(opcodes.OP_ORACLE_SetSMG, 32) // op (op #1 = increment)
                .storeUint(0, 64) // query id
                .storeUint(opts.id, 256)
                .storeUint(opts.gpkX, 256)
                .storeUint(opts.gpkY, 256)
                .storeUint(opts.startTime, 64)
                .storeUint(opts.endTime, 64)
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
                .storeUint(opcodes.OP_ORACLE_CommitSMG, 32) // op (op #1 = increment)
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
            adminAddr:string,
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
                .storeUint(opcodes.OP_EXTEND_AddCrossAdmin, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeBuffer(Buffer.from(opts.adminAddr,'hex'))
                .endCell(),
        });
    }

    async getFirstAdmin(provider: ContractProvider,){
        const { stack } = await provider.get("get_first_crossAdmin", []);
        console.log("stack:", stack)
        return stack.readBuffer().toString('hex');
    }

    async getNextAdmin(provider: ContractProvider,adminAddr:Address){
        const { stack } = await provider.get("get_next_crossAdmin", [{ type: 'slice', cell: beginCell().storeAddress(adminAddr).endCell()}]);
        return stack.readBuffer().toString('hex');
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

    async sendUpgradeSC(provider: ContractProvider, code: Cell,
        opts: {
            sender: Sender,
            value: bigint,
            queryID?: number,
        }
    ) {
        await provider.internal(opts.sender, {
            value: opts.value,
            body: beginCell()
            .storeUint(opcodes.OP_UPGRADE, 32) // op (op #1 = increment)
            .storeUint(0, 64) // query id
            .storeRef(code)
            .endCell()
        });
    }

    async getVersion(provider: ContractProvider) {
        const result = await provider.get('version', []);
        return result.stack.readString()
    }
}
