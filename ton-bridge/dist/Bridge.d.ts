import { Address, Cell, Contract, ContractProvider, Sender } from '@ton/core';
export declare type BridgeConfig = {
    owner: Address;
    admin: Address;
    halt: number;
    init: number;
    smgFeeProxy: Address;
    oracleAdmin: Address;
};
export declare type CrossConfig = {
    owner: Address;
    admin: Address;
    halt: number;
    init: number;
};
export declare function bridgeConfigToCell(config: BridgeConfig): Cell;
export declare const Opcodes: {
    verify: number;
    verifyEcdsa: number;
    addAdmin: number;
    removeAdmin: number;
    transferOwner: number;
    setHalt: number;
    initialize: number;
    setFee: number;
    setFees: number;
    userLock: number;
    smgMint: number;
    userBurn: number;
    userRelease: number;
    setSmgFeeProxy: number;
    setTokenPairFee: number;
    setTokenPairFees: number;
    addTokenPair: number;
    removeTokenPair: number;
    updateTokenPair: number;
    transferOracleAdmin: number;
    setStoremanGroupConfig: number;
    setStoremanGroupStatus: number;
    acquireReadySmgInfo: number;
    transferFoundation: number;
    AcquireReadySmgInfo: number;
    proposal: number;
    approveAndExecute: number;
    Initialize: number;
};
export declare class Bridge implements Contract {
    readonly address: Address;
    readonly init?: {
        code: Cell;
        data: Cell;
    } | undefined;
    constructor(address: Address, init?: {
        code: Cell;
        data: Cell;
    } | undefined);
    static createFromAddress(address: Address): Bridge;
    static createFromDeploy(): Promise<Address>;
    sendAddAdmin(provider: ContractProvider, via: Sender, opts: {
        adminAddr: Address;
        value: bigint;
        queryID?: number;
    }): Promise<void>;
    sendSetFee(provider: ContractProvider, via: Sender, opts: {
        value: bigint;
        queryID?: number;
        srcChainId: number;
        dstChainId: number;
        contractFee: number;
        agentFee: number;
    }): Promise<void>;
    sendAddTokenPair(provider: ContractProvider, via: Sender, opts: {
        value: bigint;
        queryID?: number;
        tokenPairId: number;
        fromChainID: number;
        fromAccount: string;
        toChainID: number;
        toAccount: string;
    }): Promise<void>;
    getCrossConfig(provider: ContractProvider): Promise<{
        owner: Address;
        admin: Address;
        halt: number;
        init: number;
    }>;
    getFee(provider: ContractProvider, srcChainId: number, dstChainId: number): Promise<{
        contractFee: number;
        agentFee: number;
    }>;
    getTokenPair(provider: ContractProvider, tokenPairId: number): Promise<{
        fromChainID: number;
        toChainID: number;
        fromAccount: string;
        toAccount: string;
    }>;
}
