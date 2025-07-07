//
import {toNano} from "@ton/core";

export const TON_FEE = {
    TRANS_FEE_NORMAL: toNano('0.1'),

    // for mint token
    FWD_FEE_MINT_JETTON: toNano('0.01'),
    TOTAL_FEE_MINT_JETTON: toNano('0.2'),

    // for deploy contract
    TRANS_FEE_DEPLOY: toNano('0.1'),

    // for user lock
    TRANS_FEE_USER_LOCK_TOKEN: toNano('1'),
    NOTIFY_FEE_USER_LOCK: toNano('0.8'),

    // for smg release
    TRANS_FEE_SMG_RELEASE: toNano('1'),
    TRANS_FEE_SMG_RELEASE_TOKEN: toNano('0.5'),        // for smgRelease, the first tx value
    FWD_TON_AMOUNT_TRANSFER_JETTON: toNano('0.0'),     // for smgRelease , send token
    TOTAL_TON_AMOUNT_TRANSFER_JETTON: toNano('0.2'),   // for smgRelease , send token
}

