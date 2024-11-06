import { Address, Cell, Contract, ContractProvider, Sender } from '@ton/core';
export declare type BridgeConfig = {
    owner: Address;
    halt: number;
    init: number;
    smgFeeProxy: Address;
    oracleAdmin: Address;
};
export declare function bridgeConfigToCell(config: BridgeConfig): Cell;
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
    static createForDeploy(config: BridgeConfig): Promise<Bridge>;
    static createFromConfig(config: BridgeConfig, code: Cell, workchain?: number): Bridge;
    sendDeploy(provider: ContractProvider, via: Sender): Promise<void>;
    sendAddTokenPair(provider: ContractProvider, tokenPairId: number, fromChainID: number, fromAccount: string, toChainID: number, toAccount: string, opts: {
        sender: Sender;
        value: bigint;
        queryID?: number;
    }): Promise<void>;
    sendTransferOwner(provider: ContractProvider, newOwner: Address, opts: {
        sender: Sender;
        value: bigint;
        queryID?: number;
    }): Promise<void>;
    getCrossConfig(provider: ContractProvider): Promise<{
        owner: Address;
        halt: number;
        init: number;
    }>;
    getFee(provider: ContractProvider, srcChainId: number, dstChainId: number): Promise<{
        contractFee: number;
        agentFee: number;
    }>;
    getTokenPair(provider: ContractProvider, tokenPairId: number): Promise<{
        fromChainID: number;
        fromAccount: string;
        toChainID: number;
        toAccount: string;
    }>;
    getFirstTokenPairID(provider: ContractProvider): Promise<number>;
    getNextTokenPairID(provider: ContractProvider): Promise<number>;
    getFirstStoremanGroupID(provider: ContractProvider): Promise<bigint>;
    getNextStoremanGroupID(provider: ContractProvider, id: bigint): Promise<bigint>;
    getStoremanGroupConfig(provider: ContractProvider, id: bigint): Promise<{
        gpk: bigint;
        startTime: bigint;
        endTime: bigint;
    }>;
    sendSetStoremanGroupConfig(provider: ContractProvider, id: bigint, gpk: bigint, startTime: number, endTime: number, opts: {
        sender: Sender;
        value: bigint;
        queryID?: number;
    }): Promise<void>;
}
