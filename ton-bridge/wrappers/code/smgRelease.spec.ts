import {Address} from "@ton/core";
import {TON_COIN_ACCOUNT_STR} from "../const/const-value";
import {buildSmgReleaseMessage} from "./smgRelease";
import {codeTable} from "./encode-decode";
import {OP_CROSS_SmgRelease} from "../opcodes";

describe('smgRelease', () => {

    beforeAll(async () => {
    });

    it('build smgRelease message', async () => {
        try {
            let par = {
                value: BigInt(1),
                uniqueID: BigInt(0x12345678), // userLock hash , hash->bigint
                smgID: "0x000000000000000000000000000000000000000000746573746e65745f303638",
                tokenPairID: 1030,
                releaseValue: BigInt(100),
                fee: BigInt(10),
                userAccount: Address.parse(TON_COIN_ACCOUNT_STR), // userAccount on ton side
                fwTonAmount: BigInt(1),
                totalTonAmount: BigInt(11),
                bridgeJettonWalletAddr: Address.parse(TON_COIN_ACCOUNT_STR), // getJettonAddress(tokenAddr,addr)
                e: BigInt(4),
                p: BigInt(5),
                s: BigInt(6),
                queryID: BigInt(0),
                bridgeScAddr: "kQBtNxLicsStcS6NvaXmugOceVqHC1z2Bdl53hBdtODw4wXv"
            }
            let ret = await buildSmgReleaseMessage(par);
            console.log("ret", ret);

            let decoded = await codeTable[OP_CROSS_SmgRelease]["deCode"](ret.body);
            console.log("decoded", decoded);
        } catch (e) {
            console.error(e)
        }

    });
    it('build smgRelease message bad address', async () => {
        try {
            let par = {
                value: BigInt(1),
                uniqueID: BigInt(0x12345678), // userLock hash , hash->bigint
                smgID: "0x000000000000000000000000000000000000000000746573746e65745f303638",
                tokenPairID: 1030,
                releaseValue: BigInt(100),
                fee: BigInt(10),
                userAccount: Address.parse(TON_COIN_ACCOUNT_STR), // userAccount on ton side
                fwTonAmount: BigInt(1),
                totalTonAmount: BigInt(11),
                bridgeJettonWalletAddr: Address.parse(TON_COIN_ACCOUNT_STR), // getJettonAddress(tokenAddr,addr)
                e: BigInt(4),
                p: BigInt(5),
                s: BigInt(6),
                queryID: BigInt(0),
                bridgeScAddr: "0x1234"
            }
            let ret = await buildSmgReleaseMessage(par);
            console.log("ret", ret);

            let decoded = await codeTable[OP_CROSS_SmgRelease]["deCode"](ret.body);
            console.log("decoded", decoded);
        } catch (e) {
            console.error(e)
        }

    });

});