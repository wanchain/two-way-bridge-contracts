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
import * as opcodes from "./opcodes"

export type BridgeConfig = {

};

export type CrossConfig = {
};

export function bridgeConfigToCell(config: BridgeConfig): Cell {
    return beginCell()
        .endCell();
}

export class AddressSc implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new AddressSc(address);
    }

    static createFromConfig(config: BridgeConfig, code: Cell, workchain = 0) {
        const data = bridgeConfigToCell(config);
        const init = { code, data };
        return new AddressSc(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendParse(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryID?: number,
            address:string,
        }
    ) {
        let buf = Buffer.from(opts.address.substring(0,2).toLowerCase() == '0x'?opts.address.substring(2):opts.address,'hex')
        console.log("Buffer",buf.toString('hex'),"len",buf.length);
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(opcodes.OP_TEST_ParseAddr, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(buf.length,8)
                .storeBuffer(buf)
                .endCell(),
        });
    }


}
