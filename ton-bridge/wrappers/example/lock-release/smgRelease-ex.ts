import {getClient, wanTonSdkInit} from "../../client/client";
import {getSenderByPrvKey, getWalletByPrvKey} from "../../wallet/walletContract";
import {Address} from "@ton/core";
import {BridgeAccess} from "../../contractAccess/bridgeAccess";
import {getQueryID, sleep, toNumberByDecimal} from "../../utils/utils";
import {common} from "../../common";
import {BIP44_CHAINID, TON_COIN_ACCOUNT_STR} from "../../const/const-value";

import {getJettonAddress} from "../../wallet/jetton";
import {TON_FEE} from "../../fee/fee";

import {configMainnetNoDb, configTestnetNoDb} from "../../config/config-ex";
import {WanTonClient} from "../../client/client-interface";

const schnorr = require("../../sign/tools-secp256k1.js");
const smgConfig = require("../../testData/smg.json");

const prvList = require('../../testData/prvlist')

const optimist = require('optimist');
let argv = optimist
    .usage("Usage: $0")
    .alias('h', 'help')
    .describe('network', 'network name testnet|mainnet')
    .describe('tpId', 'token pair Id')
    .describe('releaseValue', 'releaseValue')
    .describe('releaseFee', 'releaseFee')
    .describe('decimal', 'decimal of the lock token or coin')
    .describe('smgId', 'storeman group Id')
    .describe('destAddr', 'address of ton address')
    .string(['smgId'])
    .argv;

console.log(optimist.argv);
console.log("smgId", argv['smgId']);
console.log("destAddr", argv['destAddr']);
console.log((Object.getOwnPropertyNames(optimist.argv)).length);


if ((Object.getOwnPropertyNames(optimist.argv)).length < 6) {
    optimist.showHelp();
    process.exit(0);
}

global.network = argv["network"];
const config = require('../../config/config');

let client = null;

const scAddresses = require(config.contractOutput);

let releaseValue = toNumberByDecimal(argv['releaseValue'], argv['decimal'])
let releaseFee = toNumberByDecimal(argv['releaseFee'], argv['decimal'])
let bridgeScAddr = scAddresses.bridgeAddress
let aliceSender;
let aliceWallet, bobWallet, bobAddress;

async function init() {

    if (global.network == 'testnet') {
        await wanTonSdkInit(configTestnetNoDb);
    } else {
        await wanTonSdkInit(configMainnetNoDb);
    }

    client = await getClient();
    aliceWallet = await getWalletByPrvKey(Buffer.from(prvList[0], 'hex'));
    bobWallet = await getWalletByPrvKey(Buffer.from(prvList[1], 'hex'));
    bobAddress = bobWallet.address;
    aliceSender = await getSenderByPrvKey(client, Buffer.from(prvList[0], 'hex'));
}

async function getAgentFee(tokenPairID: number, srcChainId: number, dstChainId: number) {
    let ba = BridgeAccess.create(client, bridgeScAddr);
    let tokenPairFee = await ba.readContract('getTokenPairFee', [tokenPairID]);
    let chainFee = await ba.readContract('getChainFee', [srcChainId, dstChainId]);
    if (chainFee.agentFee) {
        return chainFee.agentFee
    } else {
        return tokenPairFee.agentFee
    }
}

async function getJettonWalletAddr(client: WanTonClient, tokenAccountAddr: Address, ownerAddress: Address) {
    if (tokenAccountAddr.equals(Address.parse(TON_COIN_ACCOUNT_STR))) {
        return Address.parse(TON_COIN_ACCOUNT_STR);
    } else {
        return getJettonAddress(client, tokenAccountAddr, ownerAddress);
    }
}

async function buildSmgReleaseParameters(client: WanTonClient, input: {
    smgID: string,
    tokenPairID: number,
    releaseValue: bigint,
    releaseFee: bigint,
    value: bigint,
    queryID: bigint,
    uniqueID: bigint,
    tokenCoinAccount: Address,
    destAccount: Address,
    fwTonAmount: bigint,
    totalTonAmount: bigint,
    bridgeScAddr: Address
}) {
    let bridgeJwAddress = await getJettonWalletAddr(client, input.tokenCoinAccount, input.bridgeScAddr);


    let msgHashResult = common.computeHash(BigInt(BIP44_CHAINID),
        BigInt(input.uniqueID),
        BigInt(input.tokenPairID),
        BigInt(input.releaseValue),
        BigInt(releaseFee),
        input.tokenCoinAccount,
        input.destAccount);
    console.log("smgConfig.skSmg=>", smgConfig.skSmg);
    let sig = schnorr.getSecSchnorrSByMsgHash(Buffer.from(smgConfig.skSmg, 'hex'), msgHashResult.hashBuf);
    console.log("sig=>", sig);
    const e = BigInt(sig.e);

    const p = BigInt(sig.p);
    const s = BigInt(sig.s);

    return {
        value: input.value,
        queryID: input.queryID,
        uniqueID: input.uniqueID,
        smgID: input.smgID,
        tokenPairID: input.tokenPairID,
        releaseValue: input.releaseValue,
        fee: releaseFee,
        userAccount: input.destAccount,
        bridgeJettonWalletAddr: bridgeJwAddress,
        e,
        p,
        s,
        fwTonAmount: input.fwTonAmount,
        totalTonAmount: input.totalTonAmount,
    }
}


async function smgRelease() {
    console.log("Entering smgRelease", "tpId", argv['tpId']);
    let ba = BridgeAccess.create(client, bridgeScAddr.toString());
    console.log("bridgeScAddr", bridgeScAddr.toString());
    let retTp = await ba.readContract("getTokenPair", [argv['tpId']])
    let transValueSmg: bigint = TON_FEE.TRANS_FEE_SMG_RELEASE;

    try {
        let smgReleasePara = await buildSmgReleaseParameters(client, {
            smgID: smgConfig.smgId,
            tokenPairID: argv['tpId'],
            releaseValue: releaseValue,
            releaseFee,
            value: transValueSmg,
            queryID: BigInt(await getQueryID()),
            uniqueID: BigInt(await getQueryID()),  // should be txHas->bigInt, here is the example.
            tokenCoinAccount: Address.parse(retTp.tokenAccount),
            destAccount: Address.parse(argv['destAddr']),
            fwTonAmount: TON_FEE.FWD_TON_AMOUNT_TRANSFER_JETTON,
            totalTonAmount: TON_FEE.TOTAL_TON_AMOUNT_TRANSFER_JETTON,
            bridgeScAddr: Address.parse(bridgeScAddr),
        })
        let ret = await ba.writeContract('sendSmgRelease', aliceSender, smgReleasePara)
        await sleep(3000);
        console.log("ret", ret);

    } catch (err) {
        console.error("error: %s", err);
        await sleep(3000);
    }


}

async function main() {

    await init();
    await smgRelease();

}

main();

//ts-node smgRelease-ex.ts --network testnet --tpId 1030 --releaseValue 100 --releaseFee 10 --decimal 6 --smgId 0x000000000000000000000000000000000000000000746573746e65745f303638 --destAddr EQCGOHmrNm3u_ilZ5qdtpIDmfVfkQsWsqxyvPywT_7_fOzZh
//ts-node smgRelease-ex.ts --network testnet --tpId 1032 --releaseValue 0.003 --releaseFee 0.002 --decimal 9 --smgId 0x000000000000000000000000000000000000000000746573746e65745f303638 --destAddr EQC8A1FkKCiSm4VDJh83MabRub9ES5j3J8u0zugaqf4gspwk