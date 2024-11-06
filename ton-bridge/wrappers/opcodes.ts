export const OP_SIG                             = 0x10000000;
export const OP_SIG_Verify                      = 0x10000001;
export const OP_SIG_VerifyEcdsa                 = 0x10000002;

export const OP_COMMON                          = 0x20000000;
export const OP_COMMON_TransferOwner            = 0x20000003;
export const OP_COMMON_SetHalt                  = 0x20000004;
export const OP_COMMON_Initialize               = 0x20000005;

export const OP_FEE                             = 0x30000000;
export const OP_FEE_SetChainFee                 = 0x30000001;
export const OP_FEE_SetChainFees                = 0x30000002;
export const OP_FEE_SetSmgFeeProxy              = 0x30000003;
export const OP_FEE_SetRobotAdmin               = 0x30000003;
export const OP_FEE_SetTokenPairFee             = 0x30000004;
export const OP_FEE_SetTokenPairFees            = 0x30000005;

export const OP_CROSS                           = 0x40000000;
export const OP_CROSS_UserLock                  = 0x40000001;
export const OP_CROSS_SmgMint                   = 0x40000002;
export const OP_CROSS_UserBurn                  = 0x40000003;
export const OP_CROSS_UserRelease               = 0x40000004;
export const OP_CROSS_SmgRelease                = 0x40000005;

export const OP_TOKENPAIR                       = 0x50000000;
export const OP_TOKENPAIR_Add                   = 0x50000001;
export const OP_TOKENPAIR_Remove                = 0x50000002;
export const OP_TOKENPAIR_Upsert                = 0x50000003;

export const OP_ORACLE                          = 0x60000000;
export const OP_ORACLE_TransferOracleAdmin      = 0x60000001;
export const OP_ORACLE_SetSMG                   = 0x60000002;
export const OP_ORACLE_DeleteSMG                = 0x60000002;
export const OP_ORACLE_AcquireReadySmgInfo      = 0x60000004;

export const OP_GP_TransferFoundation           = 0x70000001;
export const OP_GP_AcquireReadySmgInfo          = 0x70000002;
export const OP_GP_Proposal                     = 0x70000003;
export const OP_GP_ApproveAndExecute            = 0x70000004;
export const OP_GP_Initialize                   = 0x70000005;

export const OP_EXTEND                          = 0x80000000;
export const OP_EXTEND_AddCrossAdmin            = 0x80000001;
export const OP_EXTEND_DelCrossAdmin            = 0x80000002;
export const OP_EXTEND_UpdateAddInt             = 0x80000007;
export const OP_UPGRADE                         = 0x90000000;