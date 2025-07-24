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
    //FWD_TON_AMOUNT_TRANSFER_JETTON: toNano('0.1'),     // for smgRelease , send token, if > 0, will send notification to owner_address (not jwAddress)
    TOTAL_TON_AMOUNT_TRANSFER_JETTON: toNano('0.2'),   // for smgRelease , send token
}

export function storageFeeCalculator(bitSize: number, cellSize: number, lastSecondPaid: number, lastPaid: number) {
    let duration = lastPaid - lastSecondPaid;
    let size = bitSize;

    const bit_price_ps = 1
    const cell_price_ps = 500

    const pricePerSec = size * bit_price_ps +
        +cellSize * cell_price_ps

    let fee = Math.ceil(pricePerSec * duration / 2 ** 16) * 10 ** -9
    let mb = (size / 1024 / 1024 / 8).toFixed(5)
    let days = Math.floor(duration / (3600 * 24))

    let str = `Storage Fee: ${fee} TON (${mb} MB for ${days} days)`
    console.log(str);
    return (fee * 10 ** 9);
}

