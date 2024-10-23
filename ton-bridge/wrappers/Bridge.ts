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

export type BridgeConfig = {
    owner:Address,
    admin:Address,
    halt: number,
    init: number,
    smgFeeProxy:Address,
    oracleAdmin:Address,
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
        .storeAddress(config.admin)
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
            .storeDict() // mapWrappedToken
            .endCell()) // *****about tm end*****

        .storeRef(beginCell().endCell()) // extended
        .endCell();
}

export const Opcodes = {    
    verify: 0x7e8764ef,
    verifyEcdsa: 0x7e8764ee,

    addAdmin: 0x01,
    removeAdmin: 0x02,
    transferOwner: 0x03,
    setHalt: 0x04,
    initialize: 0x05,


    setFee: 0x10,
    setFees: 0x11,

    userLock: 0x12,
    smgMint: 0x13,

    userBurn: 0x14,
    smgRelease: 0x15,

    setSmgFeeProxy: 0x16,

    setTokenPairFee: 0x17,
    setTokenPairFees: 0x18,

// token manager
    addTokenPair: 0x21,
    removeTokenPair: 0x22,
    updateTokenPair: 0x23,

// op about oracle
    transferOracleAdmin: 0x31,
    setStoremanGroupConfig: 0x32,
    setStoremanGroupStatus: 0x33,
    acquireReadySmgInfo: 0x35,

// op about groupApprove
    transferFoundation: 0x41,
    AcquireReadySmgInfo: 0x42,
    proposal: 0x43,
    approveAndExecute: 0x44,
    Initialize: 0x45,
};

export const BIP44_CHAINID = 0x4567; //todo change later
export const ZERO_ACCOUNT = "0x0000000000000000000000000000000000000000";


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

    async sendAddAdmin(
        provider: ContractProvider,
        via: Sender,
        opts: {
            adminAddr:Address,
            value: bigint,
            queryID?: number,
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
                .storeUint(Opcodes.addAdmin, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(opts.adminAddr)
                .endCell(),
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
                .storeUint(Opcodes.setFee, 32)
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
                .storeUint(Opcodes.addTokenPair, 32)
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

        console.log("tokenAccount",tokenAccount);
        // 3.1 ton
        if(tokenAccount === ZERO_ACCOUNT.substring(2) ){
            console.log("entering ton coin........");
        }

        let addrFriedly = Address.parseFriendly(HexStringToBuffer(tokenAccount));
        let c = JettonMinter.createFromAddress(addrFriedly.address);
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
        }

        // 3.
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.userLock, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(BigInt(opts.smgID), 256)
                .storeUint(opts.tokenPairID, 32)
                .storeUint(opts.crossValue, 256)
                .storeAddress(opts.dstUserAccount)
                .endCell()
        });
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
            tokenAccount:Address,
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
            .storeAddress(opts.tokenAccount)
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
                .storeUint(Opcodes.smgRelease, 32)
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

    async getCrossConfig(provider: ContractProvider) {
        const result = await provider.get('get_cross_config', []);
        return {
            owner: result.stack.readAddress(),
            admin: result.stack.readAddress(),
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
            toChainID:result.stack.readNumber(),
            fromAccount:result.stack.readBuffer().toString('hex'),
            toAccount:result.stack.readBuffer().toString('hex'),
        }
    }
}
