"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bridge = exports.Opcodes = exports.bridgeConfigToCell = void 0;
const core_1 = require("@ton/core");
const fs = __importStar(require("fs"));
const ton_access_1 = require("@orbs-network/ton-access");
const ton_crypto_1 = require("ton-crypto");
const ton_1 = require("@ton/ton");
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
    static async createFromDeploy() {
        const workchain = 0; // deploy to workchain 0
        const fileContent = fs.readFileSync(__dirname + "/../build/Bridge.compiled.json", 'utf8');
        const cimpiledJson = JSON.parse(fileContent);
        console.log("cimpiledJson:", cimpiledJson);
        const code = core_1.Cell.fromBoc(Buffer.from(cimpiledJson.hex, 'hex'))[0];
        let initialCounterValue = Date.now();
        const data = (0, core_1.beginCell)()
            .storeUint(initialCounterValue, 64)
            .endCell();
        const init = { code, data };
        let SC = new Bridge((0, core_1.contractAddress)(workchain, init), init);
        // open wallet v4 (notice the correct wallet version here)
        let mnemonic = process.env.WALLET_MNEMONIC ? process.env.WALLET_MNEMONIC : "";
        const key = await (0, ton_crypto_1.mnemonicToWalletKey)(mnemonic.split(" "));
        const wallet = ton_1.WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
        const endpoint = await (0, ton_access_1.getHttpEndpoint)({ network: "testnet" });
        const client = new ton_1.TonClient({ endpoint });
        // open wallet and read the current seqno of the wallet
        const walletContract = client.open(wallet);
        const walletSender = walletContract.sender(key.secretKey);
        const seqno = await walletContract.getSeqno();
        // send the deploy transaction
        const bridge = client.open(SC);
        //   await counterContract.sendDeploy(walletSender);
        // wait until confirmed
        let currentSeqno = seqno;
        while (currentSeqno == seqno) {
            console.log("waiting for deploy transaction to confirm...");
            currentSeqno = await walletContract.getSeqno();
        }
        console.log("deploy transaction confirmed:", bridge.address);
        return bridge.address;
    }
    // static createFromConfig(config: BridgeConfig, code: Cell, workchain = 0) {
    //     const data = bridgeConfigToCell(config);
    //     const init = { code, data };
    //     return new Bridge(contractAddress(workchain, init), init);
    // }
    // async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    //     await provider.internal(via, {
    //         value,
    //         sendMode: SendMode.PAY_GAS_SEPARATELY,
    //         body: beginCell().endCell(),
    //     });
    // }
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
