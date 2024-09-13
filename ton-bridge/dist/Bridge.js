"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bridge = exports.Opcodes = exports.bridgeConfigToCell = void 0;
const core_1 = require("@ton/core");
function bridgeConfigToCell(config) {
    return (0, core_1.beginCell)()
        .storeAddress(config.owner)
        .storeAddress(config.admin)
        .storeUint(config.halt, 2)
        .storeUint(config.init, 2)
        .storeRef((0, core_1.beginCell)() // *****about fee begin*****
        .storeAddress(config.smgFeeProxy) // feeProxyAddress
        .storeDict() // about Contract and Agent fee
        .storeDict() // about tokenPairFee
        .endCell()) // *****about fee end*****
        .storeRef((0, core_1.beginCell)() // *****about oracle begin*****
        .storeAddress(config.oracleAdmin) // oracleAdmin
        .storeDict() // mapSmgConfig
        .storeDict() // mapSmgTxStatus
        .endCell()) // *****about oracle end*****
        .storeRef((0, core_1.beginCell)() // *****about tm begin*****
        .storeDict() // mapTokenPairInfo
        .storeDict() // mapWrappedToken
        .endCell()) // *****about tm end*****
        .storeRef((0, core_1.beginCell)().endCell()) // extended
        .endCell();
}
exports.bridgeConfigToCell = bridgeConfigToCell;
exports.Opcodes = {
    verify: 0x7e8764ef,
    verifyEcdsa: 0x7e8764ee,
    addAdmin: 0x01,
    removeAdmin: 0x02,
    transferOwner: 0x03,
    setHalt: 0x04,
    initialize: 0x05,
    setFee: 0x10,
    setFees: 0x11,
    userLock: 0x12,
    smgMint: 0x13,
    userBurn: 0x14,
    userRelease: 0x15,
    setSmgFeeProxy: 0x16,
    setTokenPairFee: 0x17,
    setTokenPairFees: 0x18,
    // token manager
    addTokenPair: 0x21,
    removeTokenPair: 0x22,
    updateTokenPair: 0x23,
    // op about oracle
    transferOracleAdmin: 0x31,
    setStoremanGroupConfig: 0x32,
    setStoremanGroupStatus: 0x33,
    acquireReadySmgInfo: 0x35,
    // op about groupApprove
    transferFoundation: 0x41,
    AcquireReadySmgInfo: 0x42,
    proposal: 0x43,
    approveAndExecute: 0x44,
    Initialize: 0x45,
};
class Bridge {
    constructor(address, init) {
        this.address = address;
        this.init = init;
    }
    static createFromAddress(address) {
        return new Bridge(address);
    }
    static createFromConfig(config, code, workchain = 0) {
        const data = bridgeConfigToCell(config);
        const init = { code, data };
        return new Bridge((0, core_1.contractAddress)(workchain, init), init);
    }
    async sendDeploy(provider, via, value) {
        await provider.internal(via, {
            value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)().endCell(),
        });
    }
    async sendAddAdmin(provider, via, opts) {
        let isValid = core_1.Address.isAddress(opts.adminAddr);
        if (!isValid) {
            await Promise.reject("in valid address");
        }
        await provider.internal(via, {
            value: opts.value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)()
                .storeUint(exports.Opcodes.addAdmin, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeAddress(opts.adminAddr)
                .endCell(),
        });
    }
    async sendSetFee(provider, via, opts) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)()
                .storeUint(exports.Opcodes.setFee, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.srcChainId, 32)
                .storeUint(opts.dstChainId, 32)
                .storeUint(opts.contractFee, 32)
                .storeUint(opts.agentFee, 32)
                .endCell(),
        });
    }
    async sendAddTokenPair(provider, via, opts) {
        let from = opts.fromAccount.substring(0, 2).toLowerCase() == "0x" ? opts.fromAccount.substring(2) : opts.fromAccount;
        let to = opts.toAccount.substring(0, 2).toLowerCase() == "0x" ? opts.toAccount.substring(2) : opts.toAccount;
        console.log("xxxxxfromxxxx", from);
        console.log("xxxxxtoxxxx", to);
        let fromBuffer = Buffer.from(from, 'hex');
        let toBuffer = Buffer.from(to, 'hex');
        console.log("fromBuffer.length", from.length);
        console.log("toBuffer.length", to.length);
        await provider.internal(via, {
            value: opts.value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)()
                .storeUint(exports.Opcodes.addTokenPair, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.tokenPairId, 32)
                .storeUint(opts.fromChainID, 32)
                .storeUint(opts.toChainID, 32)
                .storeUint(fromBuffer.length, 8)
                .storeBuffer(fromBuffer)
                .storeUint(toBuffer.length, 8)
                .storeBuffer(toBuffer)
                .endCell(),
        });
    }
    async getCrossConfig(provider) {
        const result = await provider.get('get_cross_config', []);
        return {
            owner: result.stack.readAddress(),
            admin: result.stack.readAddress(),
            halt: result.stack.readNumber(),
            init: result.stack.readNumber()
        };
    }
    async getFee(provider, srcChainId, dstChainId) {
        const result = await provider.get('get_fee', [{ type: 'int', value: BigInt(srcChainId) },
            { type: 'int', value: BigInt(dstChainId) }]);
        return {
            contractFee: result.stack.readNumber(),
            agentFee: result.stack.readNumber()
        };
    }
    async getTokenPair(provider, tokenPairId) {
        const result = await provider.get('get_token_pair', [{ type: 'int', value: BigInt(tokenPairId) }]);
        // todo getTokenPair
        return {
            fromChainID: result.stack.readNumber(),
            toChainID: result.stack.readNumber(),
            fromAccount: result.stack.readBuffer().toString('hex'),
            toAccount: result.stack.readBuffer().toString('hex'),
        };
    }
}
exports.Bridge = Bridge;
