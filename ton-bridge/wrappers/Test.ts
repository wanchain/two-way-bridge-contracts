import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano } from '@ton/core';
import { FakeThrow } from './FakeThrow';



export type TestConfig = {
};


export class Test implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Test(address);
    }

    static createFromConfig(config: TestConfig, code: Cell) {
        const data = beginCell().storeDict().endCell();
        const init = { code, data };
        return new Test(contractAddress(0, init), init);
    }


    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendTransThrow(
        provider: ContractProvider,
        via: Sender,
        opts: {
            address: Address,
        }) {
        await provider.internal(via, {
            value: toNano('0.1'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x12345611, 32)
                .storeUint( 0x22334455, 64)
                .storeAddress(opts.address)
                .endCell(),
        });
    }
    async sendTransDic(
        provider: ContractProvider,
        via: Sender,
        opts: {
        }) {
        await provider.internal(via, {
            value: toNano('1'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x12345678, 32)
                .storeUint( Date.now()*1000, 64)
                .storeUint(100, 64)
                .endCell(),
        });
    }
}
