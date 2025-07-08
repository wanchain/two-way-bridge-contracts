export const BIP44_CHAINID = 0x8000025f;
export const BIP44_WANCHAIN_CHAINID = 0x8057414e; // 2153201998
export const TON_COIN_ACCOUT = "0x0000000000000000000000000000000000000000000000000000000000000000"; // 32 bytes
export const TON_COIN_ACCOUNT_STR = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
export const WK_CHIANID = "0";

export const ZERO_ACCOUNT_STR = TON_COIN_ACCOUNT_STR

// send_raw_message flags
export const REVERT_ON_ERRORS = 0;
export const PAY_FEES_SEPARATELY = 1;
export const IGNORE_ERRORS = 2;
export const BOUNCE_MESSAGE = 16;
export const SELFDESTRUCT_ON_EMPTY = 32;

// send_raw_message MODE
export const NORMAL = 0;
export const CARRY_REMAINING_GAS = 64;
export const CARRY_REMAINING_BALANCE = 128;


export const MAX_LIMIT = 90;

export const MAX_RETRY = 3;

//export const MAX_BACKTRACE_SECONDS = 30*86400;
export const MAX_BACKTRACE_SECONDS = 86400;

export const RETRY_INTERNAL_TIME = 20;

export const TONCLINET_TIMEOUT = 60 * 1000 * 1000;

export const MIN_SCAN_INTER = 20 * 1000;
export const MAX_SCAN_INTER = 40 * 1000;


export const DEFAUT_PARTNER = "wanchain";
export const PARTNER_LEN = 8;