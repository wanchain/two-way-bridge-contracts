import {
    Address,
    Contract, ContractProvider,
    OpenedContract,
    StateInit,
    Transaction,
} from "@ton/core";

export interface WanTonClient{
    getBalance(address: Address): Promise<bigint>;

    getTransactions(address: Address, opts: {
        limit: number;
        lt?: string;
        hash?: string;
        to_lt?: string;
        inclusive?: boolean;
        archival?: boolean;
    }): Promise<Transaction[]>;

    /**
     * Get transaction by it's id
     * @param address address
     * @param lt logical time
     * @param hash transaction hash
     * @returns transaction or null if not exist
     */
    getTransaction(address: Address, lt: string, hash: string): Promise<Transaction | null>;

    isContractDeployed(address: Address): Promise<boolean>;

    /**
     * Open contract
     * @param src source contract
     * @returns contract
     */
    open<T extends Contract>(src: T): OpenedContract<T>;

    /**
     * Create a provider
     * @param address address
     * @param init optional init
     * @returns provider
     */
    provider(address: Address, init?: StateInit | null): ContractProvider;
}

export function IsWanTonClient(obj: any): obj is WanTonClient {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'provider' in obj &&
        typeof obj.provider === 'function' && !('treasury' in obj)
    );
}