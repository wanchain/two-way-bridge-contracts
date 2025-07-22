import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender } from '@ton/core';




export type FakeThrowConfig = {
};


export class FakeThrow implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new FakeThrow(address);
    }

    static createFromConfig(config: FakeThrowConfig, code: Cell) {
        const data = beginCell().endCell();
        const init = { code, data };
        return new FakeThrow(contractAddress(0, init), init);
    }


    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            body: beginCell().endCell(),
            bounce: false,
        });
    }

    
}
