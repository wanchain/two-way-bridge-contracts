import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
///////////// The opcode copy from fc file /////////////////////////////////
const OP_SIG                          = 0x10000000;
const OP_SIG_Verify                    = 0x10000001;
const OP_SIG_VerifyEcdsa               = 0x10000002;

const OP_COMMON                           = 0x20000000;  
const OP_COMMON_TransferOwner             = 0x20000003;
const OP_COMMON_SetHalt                   = 0x20000004;
const OP_COMMON_Initialize                = 0x20000005;

const OP_FEE                            = 0x30000000;
const OP_FEE_SetChainFee                        = 0x30000001;
const OP_FEE_SetChainFees                       = 0x30000002;
const OP_FEE_SetSmgFeeProxy             = 0x30000003;
const OP_FEE_SetRobotAdmin             = 0x30000003;

const OP_FEE_SetTokenPairFee               = 0x30000004;
const OP_FEE_SetTokenPairFees              = 0x30000005;

const OP_CROSS                  = 0x40000000;
const OP_CROSS_UserLock                  = 0x40000001;
const OP_CROSS_SmgMint                   = 0x40000002;
const OP_CROSS_UserBurn                  = 0x40000003;
const OP_CROSS_UserRelease               = 0x40000004;


const OP_TOKENPAIR              = 0x50000000;
const OP_TOKENPAIR_Add              = 0x50000001;
const OP_TOKENPAIR_Remove           = 0x50000002;
const OP_TOKENPAIR_Upsert           = 0x50000003;

const OP_ORACLE         = 0x60000000;
const OP_ORACLE_TransferOracleAdmin         = 0x60000001;
const OP_ORACLE_SetSMG                      = 0x60000002;
const OP_ORACLE_DeleteSMG                   = 0x60000002;
const OP_ORACLE_AcquireReadySmgInfo         = 0x60000004;

const OP_GP_TransferFoundation        = 0x70000001;
const OP_GP_AcquireReadySmgInfo       = 0x70000002;
const OP_GP_Proposal                  = 0x70000003;
const OP_GP_ApproveAndExecute         = 0x70000004;
const OP_GP_Initialize                = 0x70000005;

const OP_EXTEND         = 0x80000000;
const OP_EXTEND_AddCrossAdmin = 0x80000001;
const OP_EXTEND_DelCrossAdmin = 0x80000002;
/////////////////////////////////////////////////////////////

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
                .storeUint(OP_SIG_Verify, 32)
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
                .storeUint(OP_SIG_VerifyEcdsa, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.s, 256)
                .storeUint(opts.gpk_x, 256)
                .storeUint(opts.gpk_y, 256)
                .storeRef(extraCell)
                .endCell(),
        });
    }

}
