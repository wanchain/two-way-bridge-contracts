import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type BridgeConfig = {
    owner:Address,
    admin:Address,
    halt: number,
    init: number,
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
        .storeRef(beginCell().storeDict().endCell())
        .storeRef(beginCell().endCell())
        .storeRef(beginCell().endCell())
        .storeRef(beginCell().endCell())
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
    userRelease: 0x15,

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
}
