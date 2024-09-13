const OP_SIG_Verify                    = 0x10000001;
const OP_SIG_VerifyEcdsa               = 0x10000002;

const OP_COMMON_AddAdmin                  = 0x20000001;
const OP_COMMON_RemoveAdmin               = 0x20000002;
const OP_COMMON_TransferOwner             = 0x20000003;
const OP_COMMON_SetHalt                   = 0x20000004;
const OP_COMMON_Initialize                = 0x20000005;

const OP_FEE_Set                        = 0x30000001;
const OP_FEE_Sets                       = 0x30000002;
const OP_FEE_SetSmgFeeProxy             = 0x30000003;
const OP_FEE_SetTokenPairFee               = 0x30000004;
const OP_FEE_SetTokenPairFees              = 0x30000005;

const OP_CROSS_UserLock                  = 0x40000001;
const OP_CROSS_SmgMint                   = 0x40000002;
const OP_CROSS_UserBurn                  = 0x40000003;
const OP_CROSS_UserRelease               = 0x40000004;


const OP_TOKENPAIR_Add              = 0x50000001;
const OP_TOKENPAIR_Remove           = 0x50000002;
const OP_TOKENPAIR_Update           = 0x50000003;

const OP_ORACLE_TransferOracleAdmin       = 0x60000001;
const OP_ORACLE_SetStoremanGroupConfig    = 0x60000002;
const OP_ORACLE_SetStoremanGroupStatus    = 0x60000003;
const OP_ORACLE_AcquireReadySmgInfo       = 0x60000004;

const OP_GP_TransferFoundation        = 0x70000001;
const OP_GP_AcquireReadySmgInfo       = 0x70000002;
const OP_GP_Proposal                  = 0x70000003;
const OP_GP_ApproveAndExecute         = 0x70000004;
const OP_GP_Initialize                = 0x70000005;