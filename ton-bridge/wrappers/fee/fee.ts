//
import {toNano} from "@ton/core";
export const TON_FEE = {
    TRANS_FEE_NORMAL : toNano('0.1'),
    FWD_FEE_MINT_JETTON: toNano('0.01'),
    TOTAL_FEE_MINT_JETTON: toNano('0.2'),
    TRANS_FEE_DEPLOY: toNano('0.1'),
    TRANS_FEE_SMG_RELEASE: toNano('0.3'),
    TRANS_FEE_USER_LOCK_TOKEN:toNano('1'),
    NOTIFY_FEE_USER_LOCK:toNano('0.8'),
}

