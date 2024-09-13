import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, TupleItemInt } from '@ton/core';

const OP_UPSERT_SMG = 0x80000001;
const OP_DELETE_SMG = 0x80000002;
export const Opcodes = {
    upsert: OP_UPSERT_SMG,
    delete: OP_DELETE_SMG,
};

export class Oracle implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) { }
    // static createFromAddress(address: Address) {
    //     return new Counter(address);
    // }

    // static createFromConfig(config: CounterConfig, code: Cell, workchain = 0) {
    //     const data = counterConfigToCell(config);
    //     const init = { code, data };
    //     return new Counter(contractAddress(workchain, init), init);
    // }

    static createForDeploy(code: Cell, initialValue: number): Oracle {
        const data = beginCell()
            .storeUint(initialValue, 64)
            .endCell();
        const workchain = 0; // deploy to workchain 0
        const address = contractAddress(workchain, { code, data });
        return new Oracle(address, { code, data });
    }

    async get_first_smg_id(provider: ContractProvider) {
        const { stack } = await provider.get("get_first_smg_id", []);
        return stack.readBigNumber();
    }
    async get_next_smg_id(provider: ContractProvider, id: bigint) {
        const { stack } = await provider.get("get_next_smg_id", [{ type: 'int', value: id }]);
        return stack.readBigNumber();
    }
    async get_smg(provider: ContractProvider, id: bigint) {
        const { stack } = await provider.get("get_smg", [{ type: 'int', value: id }]);
        return {
            gpk:stack.readBigNumber(),
            startTime:stack.readBigNumber(),
            endTime:stack.readBigNumber(),
        }
    }
    
    async sendUpdateSmg(provider: ContractProvider, via: Sender,opt:{
        id: bigint, gpk: bigint, startTime: number, endTime: number
    }) {
        const messageBody = beginCell()
            .storeUint(OP_UPSERT_SMG, 32) // op (op #1 = increment)
            .storeUint(0, 64) // query id
            .storeUint(opt.id, 256)
            .storeUint(opt.gpk, 256)
            .storeUint(opt.startTime, 64)
            .storeUint(opt.endTime, 64)
            .endCell();
        await provider.internal(via, {
            value: "1",
            sendMode: SendMode.PAY_GAS_SEPARATELY,
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
