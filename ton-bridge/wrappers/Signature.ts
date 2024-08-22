import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type SignatureConfig = {
    id: number;
    counter: number;
};

export function signatureConfigToCell(config: SignatureConfig): Cell {
    return beginCell().endCell();
}

export const Opcodes = {
    verify: 0x7e8764ef, //todo should update verify
    verifyEcdsa:0x7e8764ee,
};

export class Signature implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Signature(address);
    }

    static createFromConfig(config: SignatureConfig, code: Cell, workchain = 0) {
        const data = signatureConfigToCell(config);
        const init = { code, data };
        return new Signature(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendVerify(
        provider: ContractProvider,
        via: Sender,
        opts: {
            s:bigint,
            gpk_x:bigint,
            gpk_y:bigint,
            e:bigint,
            p:bigint,
            msg:bigint,
            value: bigint;
            queryID?: number;
        }
    ) {
        let extraCell = beginCell()
            .storeUint(opts.e, 256)
            .storeUint(opts.p, 256)
            .storeUint(opts.msg, 256)
            .endCell()
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.verify, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.s, 256)
                .storeUint(opts.gpk_x, 256)
                .storeUint(opts.gpk_y, 256)
                .storeRef(extraCell)
                .endCell(),
        });
    }

    async sendVerifyEcdsa(
        provider: ContractProvider,
        via: Sender,
        opts: {
            s:bigint,
            gpk_x:bigint,
            gpk_y:bigint,
            e:bigint,
            p:bigint,
            msg:bigint,
            value: bigint;
            queryID?: number;
        }
    ) {
        let extraCell = beginCell()
            .storeUint(opts.e, 256)
            .storeUint(opts.p, 256)
            .storeUint(opts.msg, 256)
            .endCell()
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.verifyEcdsa, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.s, 256)
                .storeUint(opts.gpk_x, 256)
                .storeUint(opts.gpk_y, 256)
                .storeRef(extraCell)
                .endCell(),
        });
    }

}
