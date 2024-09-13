import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

const OP_UPSERT_SMG = 0x80000001;
const OP_DELETE_SMG = 0x80000002;
export const Opcodes = {
    upsert: OP_UPSERT_SMG,
    delete: OP_DELETE_SMG,
};

export class TokenManager implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) { }

    static createForDeploy(code: Cell, initialValue: number): TokenManager {
        const data = beginCell()
            .storeUint(initialValue, 64)
            .endCell();
        const workchain = 0; // deploy to workchain 0
        const address = contractAddress(workchain, { code, data });
        return new TokenManager(address, { code, data });
    }

    async getCounter(provider: ContractProvider) {
        const { stack } = await provider.get("counter", []);
        return stack.readBigNumber();
    }
    async getCalc(provider: ContractProvider) {
        const { stack } = await provider.get("calc", []);
        return stack.readBigNumber();
    }
    async sendIncrement(provider: ContractProvider, via: Sender) {
        const messageBody = beginCell()
            .storeUint(1, 32) // op (op #1 = increment)
            .storeUint(0, 64) // query id
            .endCell();
        await provider.internal(via, {
            value: "0.2", // send 0.002 TON for gas
            body: messageBody
        });
    }
    async sendDeploy(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: "0.01", // send 0.01 TON to contract for rent
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            bounce: false
        });
    }

}
