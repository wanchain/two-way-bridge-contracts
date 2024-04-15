from typing import Literal
from typing import Final
from pyteal import *
import pyteal as pt
from beaker import *
from beaker.lib.storage import BoxMapping, BoxList
import schnorr.EcSchnorrVerifier as ec

from bridgelib import *

class StoremanGroupConfig(abi.NamedTuple):
    gpk: abi.Field[abi.StaticBytes[Literal[64]]]
    startTime: abi.Field[abi.Uint64]
    endTime: abi.Field[abi.Uint64]
    status: abi.Field[abi.Uint8]
    

    # struct TokenPairInfo {
    #   AncestorInfo aInfo;               /// TODO:
    #   uint      fromChainID;            /// index in coinType.txt; e.g. eth=60, etc=61, wan=5718350
    #   bytes     fromAccount;            /// from address
    #   uint      toChainID;              ///
    #   bytes     toAccount;              /// to token address
    # }   
class TokenPairInfo(abi.NamedTuple):
    id: abi.Field[abi.Uint64]
    fromChainID: abi.Field[abi.Uint64]
    fromAccount: abi.Field[abi.DynamicBytes]
    toChainID: abi.Field[abi.Uint64]
    toAccount: abi.Field[abi.DynamicBytes]

class CrossTokenInfo(abi.NamedTuple):
    contractFee: abi.Field[abi.Uint64]
    fromAccount: abi.Field[abi.DynamicBytes]
    toAccount: abi.Field[abi.DynamicBytes]

# struct GetFeesReturn {
#     uint256 contractFee;
#     uint256 agentFee;
# }
class FeeInfo(abi.NamedTuple):
    contractFee: abi.Field[abi.Uint64]
    agentFee: abi.Field[abi.Uint64]

TransactionHash = abi.StaticBytes[Literal[32]]
CurrentChainID = Int(2147483931)

class BridgeState:
    # Care should be taken to ensure if multiple BoxMapping types are used, there is no overlap with keys. 
    # If there may be overlap, a prefix argument MUST be set in order to provide a unique namespace.
    mapTxStatus = BoxMapping(TransactionHash, abi.Uint8)
    mapTokenPairContractFee = BoxMapping(abi.String, abi.Uint64)
    mapContractFee = BoxMapping(abi.String,abi.Uint64) # key  fromChainId*2**32+toChainID
    mapAgentFee = BoxMapping(abi.String,abi.Uint64) # key  fromChainId*2**32+toChainID

    mapTokenPairInfo = BoxMapping(abi.String, TokenPairInfo)
    pair_list = BoxList(abi.Uint64, 200) # max 200 pairs
    total_pair_count: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="total pair count",
    )

    owner: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="owner of the token manager",
    )
    admin: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="admin of the token manager",
    )
    feeProxy: Final[GlobalStateValue] = GlobalStateValue(
        TealType.bytes,
        descr="fee proxy address",
    )
    initialized: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="initialized flag",
    )

    latest_wrapped_token_id: Final[GlobalStateValue] = GlobalStateValue(
        TealType.uint64,
        descr="latest wrapped token id",
    )
    # lockedTime: depercated. only for HTLC
    # smgFeeReceiverTimeout: useless
    ## oracle
    mapStoremanGroupConfig = BoxMapping(abi.StaticBytes[Literal[32]], StoremanGroupConfig)


    
app = Application(
    "bridge", 
    descr="Cross chain entry point", 
    state=BridgeState()
)

###
# API Methods
###

@app.external
def setAdmin(
    adminAccount: abi.Address
)   -> Expr:
    return app.state.admin.set(adminAccount.get())

@app.external
def admin(
    *,
    output: abi.Address
)    -> Expr:
    return output.set(app.state.admin.get())


@app.external(read_only=True)
def getTokenPairFee(
    tokenPairID: abi.Uint64,
    *,
    output: abi.Uint64,
) -> Expr:
    key = abi.make(abi.String)
    return Seq(
        getTokenPairFeeKey(tokenPairID).store_into(key),
        app.state.mapTokenPairContractFee[key].store_into(output)
    )

@app.external
def setTokenPairFee(
    tokenPairID: abi.Uint64,
    contractFee: abi.Uint64,
) -> Expr:
    key = abi.make(abi.String)
    return Seq(
        getTokenPairFeeKey(tokenPairID).store_into(key),
        app.state.mapTokenPairContractFee[key].set(contractFee),
    )

@app.external
def setTokenPairFees(
    tokenPairID: abi.DynamicArray[abi.Uint64] ,
    contractFee: abi.DynamicArray[abi.Uint64] ,
) -> Expr:
    i = ScratchVar(TealType.uint64)
    key = abi.make(abi.String)
    id = abi.make(abi.Uint64)
    v = abi.make(abi.Uint64)
    return Seq(
        For(i.store(Int(0)), i.load() < tokenPairID.length(), i.store(i.load() + Int(1))).Do(
            tokenPairID[i.load()].store_into(id),
            getTokenPairFeeKey(id).store_into(key),
            contractFee[i.load()].store_into(v),
            app.state.mapTokenPairContractFee[key].set(v)
        )
    )

@app.external(read_only=True)
def getFee(
    srcChainID: abi.Uint64,
    destChainID: abi.Uint64,
    *,
    output: FeeInfo
) -> Expr:
    KEYc = abi.make(abi.String)
    KEYa = abi.make(abi.String)
    contractFee = abi.make(abi.Uint64)
    agentFee = abi.make(abi.Uint64)
    return Seq(
        getContractFeeKey(srcChainID, destChainID).store_into(KEYc),
        getAgentFeeKey(srcChainID, destChainID).store_into(KEYa),
        app.state.mapContractFee[KEYc].store_into(contractFee),
        app.state.mapAgentFee[KEYa].store_into(agentFee),
        output.set(
            contractFee, agentFee
        ),
    )

@app.external
def setFee(
    srcChainID: abi.Uint64,
    destChainID: abi.Uint64,
    contractFee: abi.Uint64,
    agentFee: abi.Uint64,
) -> Expr:
    KEYc = abi.make(abi.String)
    KEYa = abi.make(abi.String)
    return Seq(
        getContractFeeKey(srcChainID, destChainID).store_into(KEYc),
        getAgentFeeKey(srcChainID, destChainID).store_into(KEYa),
        app.state.mapContractFee[KEYc].set(contractFee),
        app.state.mapAgentFee[KEYa].set(agentFee)
    )

@app.external
def setFees(
    srcChainID: abi.DynamicArray[abi.Uint64],
    destChainID: abi.DynamicArray[abi.Uint64],
    contractFee: abi.DynamicArray[abi.Uint64],
    agentFee: abi.DynamicArray[abi.Uint64],
) -> Expr:
    KEYc = abi.make(abi.String)
    KEYa = abi.make(abi.String)

    i = ScratchVar(TealType.uint64)
    ksrcChainID = abi.make(abi.Uint64)
    kdestChainID = abi.make(abi.Uint64)
    vcontractFee = abi.make(abi.Uint64)
    vagentFee = abi.make(abi.Uint64)

    return Seq(
        For(i.store(Int(0)), i.load() < contractFee.length(), i.store(i.load() + Int(1))).Do(
            srcChainID[i.load()].store_into(ksrcChainID),
            destChainID[i.load()].store_into(kdestChainID),
            contractFee[i.load()].store_into(vcontractFee),
            agentFee[i.load()].store_into(vagentFee),

            getContractFeeKey(ksrcChainID, kdestChainID).store_into(KEYc),
            app.state.mapContractFee[KEYc].set(vcontractFee),
            getAgentFeeKey(ksrcChainID, kdestChainID).store_into(KEYa),
            app.state.mapAgentFee[KEYa].set(vagentFee)
        )
    )

@ABIReturnSubroutine
def getTokenAccount(
    tokenPairID: abi.Uint64,
    *,
    output: abi.String,
    ) -> pt.Expr:
    KEY = abi.make(abi.String)
    tInfo = TokenPairInfo()
    toChainID = abi.make(abi.Uint64)
    fromChainID = abi.make(abi.Uint64)
    return Seq(
        getTokenPairInfoKey(tokenPairID).store_into(KEY),
        app.state.mapTokenPairInfo[KEY].store_into(tInfo),
        tInfo.toChainID.store_into(toChainID),
        tInfo.fromChainID.store_into(fromChainID),
        If(toChainID.get() ==  CurrentChainID)
        .Then(
            tInfo.toAccount.store_into(output)
        )
        .ElseIf(fromChainID.get() ==  CurrentChainID)
        .Then(
            tInfo.fromAccount.store_into(output) 
        )
        .Else(
            Reject()
        )
    )



@ABIReturnSubroutine
def getCrossTokenInfo(
    tokenPairID: abi.Uint64,
    *,
    output: CrossTokenInfo,
    ) -> pt.Expr:
    contractFee = abi.make(abi.Uint64)
    key = abi.make(abi.String)
    (chain0 := abi.make(abi.Uint64)).set(0)
    tInfo = TokenPairInfo()
    toChainID = abi.make(abi.Uint64)
    fromChainID = abi.make(abi.Uint64)
    toAccount = abi.make(abi.DynamicBytes)
    fromAccount = abi.make(abi.DynamicBytes)
    return Seq(
        getTokenPairFeeKey(tokenPairID).store_into(key),
        app.state.mapTokenPairContractFee[key].store_into(contractFee),

        getTokenPairInfoKey(tokenPairID).store_into(key),
        app.state.mapTokenPairInfo[key].store_into(tInfo),
        tInfo.toChainID.store_into(toChainID),
        tInfo.fromChainID.store_into(fromChainID),
        If(fromChainID.get() ==  Int(0)).Then(Reject()),
        If(toChainID.get() ==  Int(0)).Then(Reject()),
        If(toChainID.get() ==  CurrentChainID)
        .Then(
            If(contractFee.get() == Int(0)).Then(
                getContractFeeKey(toChainID, fromChainID).store_into(key),
                app.state.mapContractFee[key].set(contractFee)
            ),
            If(contractFee.get() == Int(0)).Then(
                getContractFeeKey(toChainID, chain0).store_into(key),
                app.state.mapContractFee[key].set(contractFee)            
            ),
            tInfo.toAccount.store_into(fromAccount),
            tInfo.fromAccount.store_into(toAccount)            
        )
        .ElseIf(fromChainID.get() ==  CurrentChainID)
        .Then(
            If(contractFee.get() == Int(0)).Then(
                getContractFeeKey(fromChainID, toChainID).store_into(key),
                app.state.mapContractFee[key].set(contractFee)
            ),
            If(contractFee.get() == Int(0)).Then(
                getContractFeeKey(fromChainID, chain0).store_into(key),
                app.state.mapContractFee[key].set(contractFee)            
            ),
            tInfo.toAccount.store_into(toAccount),
            tInfo.fromAccount.store_into(fromAccount)      
        )
        .Else(
            Reject()
        ),
        output.set(contractFee, fromAccount, toAccount)
    )

     
# function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount)
@app.external
def userLock(
    smgID: pt.abi.StaticBytes[Literal[32]], 
    tokenPairID: abi.Uint64, 
    userAccount: abi.String,
    value: abi.Uint64, 
    ) -> Expr:
    #     event UserLockLogger(bytes32 indexed smgID, uint indexed tokenPairID, 
    #     address indexed tokenAccount, uint value, uint contractFee, bytes userAccount);

    # if to lock native coin, there are 2 txs.
    # if to lock assert, there are 3 txs, 1: contractFee, 2: assert transfer, 3: sc interface call.
    #   assosiated these 2 txs.  check the value is same in these 2 txs.
    contractFee = abi.make(abi.Uint64)
    toAccount = abi.make(abi.DynamicBytes)
    fromAccount = abi.make(abi.DynamicBytes)
    crossTokenInfo = CrossTokenInfo()
    left = abi.make(abi.Uint64)
    txid = abi.make(abi.String)
    return Seq(
        getCrossTokenInfo(tokenPairID).store_into(crossTokenInfo),
        crossTokenInfo.contractFee.store_into(contractFee),
        crossTokenInfo.toAccount.store_into(toAccount),
        crossTokenInfo.fromAccount.store_into(fromAccount),

        If(contractFee.get() > Int(0)).Then(
            InnerTxnBuilder.Execute(
                {
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver: app.state.feeProxy.get(),
                    TxnField.amount: contractFee.get(),
                }
            )
        ),
        If(fromAccount.get() == Itob(Int(0))).Then(
            Assert(Global.group_size() == Int(2)),
            Assert(Txn.group_index() == Int(1)),            
            left.set(pt.Gtxn[0].amount() - contractFee.get() - value.get()),
            txid.set(pt.Gtxn[0].tx_id())
        ).Else(
            Assert(Global.group_size() == Int(3)),
            Assert(Txn.group_index() == Int(2)),            
            left.set(pt.Gtxn[0].amount() - contractFee.get()),
            # check assert tx,  id, to, amount # TODO other fields need check?
            Assert(pt.Gtxn[1].asset_receiver() == Global.current_application_address()),
            Assert(pt.Gtxn[1].xfer_asset() == Btoi(fromAccount.get())),
            Assert(pt.Gtxn[1].asset_amount() == value.get()),
            txid.set(pt.Gtxn[1].tx_id())
        ),
        Assert(left.get() >= Int(0)),
        If(left.get() > Int(0)).Then(
            InnerTxnBuilder.Execute(
                {
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver: pt.Gtxn[0].sender(),
                    TxnField.amount: left.get(),
                }
            )            
        ),
        Log( Concat(
            Bytes("UserLockLogger:"), 
            smgID.get(), Bytes(":"),
            Itob(tokenPairID.get()), Bytes(":"),
            fromAccount.get(), Bytes(":"),
            Itob(value.get()), Bytes(":"),
            Itob(contractFee.get()), Bytes(":"),
            userAccount.get(), Bytes(":"), 
            txid.get()
        ))
    )



# function getSmgFeeProxy() internal view returns (address)
@app.external(read_only=True)
def getSmgFeeProxy(*, output: abi.Address) -> Expr:
    return output.set(app.state.feeProxy)

# repleace setPartners    
@app.external
def setSmgFeeProxy(proxy: abi.Address) -> Expr:
    return app.state.feeProxy.set(proxy.get())

# userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes calldata userAccount)
@app.external
def userBurn(
    # seed: abi.AssetTransferTransaction, 
    smgID: pt.abi.StaticBytes[Literal[32]], 
    tokenPairID: abi.Uint64, 
    value: abi.Uint64,
    fee: abi.Uint64,  
    tokenAccount: abi.Uint64,  
    userAccount: abi.String) -> Expr:
    #     event UserBurnLogger(bytes32 indexed smgID, uint indexed tokenPairID, 
    #   address indexed tokenAccount, uint value, uint contractFee, uint fee, bytes userAccount);

    smgID = smgID.get()
    tokenPairID = tokenPairID.get()
    value = value.get()
    fee = fee.get()
    tokenAccount = tokenAccount.get()
    userAccount = userAccount.get()

    UserBurnLogger = Concat(
        Bytes("UserBurnLogger:"),
        smgID, Bytes(":"),
        Itob(tokenPairID), Bytes(":"),
        Itob(tokenAccount), Bytes(":"),
        Itob(value), Bytes(":"),
        Itob(Int(88888888888)), Bytes(":"),
        Itob(Int(999)), Bytes(":"),
        userAccount, Bytes(":")
    )

    return Seq(
        Log(UserBurnLogger)
    )

# function verifySignature(uint curveID, bytes32 message, bytes memory PK, bytes memory r, bytes32 s)
# curveID is useless here.
@Subroutine(pt.TealType.uint64)
def verifySignature(mhash, PK, r, s)-> pt.Expr:
    rx = pt.Extract(r, pt.Int(0), pt.Int(32))
    ry = pt.Extract(r, pt.Int(32), pt.Int(32))

    px = pt.Extract(PK, pt.Int(0), pt.Int(32))
    py = pt.Extract(PK, pt.Int(32), pt.Int(32))


    # ecResult = ec.check_ecSchnorr_sig(s, px, py, rx, ry, mhash)
    return If(ec.check_ecSchnorr_sig(s, px, py, rx, ry, mhash)==Int(1), Int(1), Int(0))

@ABIReturnSubroutine
def acquireReadySmgInfo(
    smgID: abi.StaticBytes[Literal[32]],
    *,
    output: abi.StaticBytes[Literal[64]],
    ) -> pt.Expr:

    # TPK= Bytes("base16", "8cf8a402ffb0bc13acd426cb6cddef391d83fe66f27a6bde4b139e8c1d380104aad92ccde1f39bb892cdbe089a908b2b9db4627805aa52992c5c1d42993d66f5")
    # return TPK
    info = StoremanGroupConfig()
    return Seq(
        app.state.mapStoremanGroupConfig[smgID].store_into(info),
        output.set(info.gpk)
    ) 

@app.external(read_only=True)
def acquireReadySmgInfoTest(
    smgID: abi.StaticBytes[Literal[32]],
    # ss: abi.Uint64,
    *,
    output: abi.StaticBytes[Literal[64]],
    ) -> pt.Expr:
    tmp = abi.make(abi.StaticBytes[Literal[64]])
    return Seq(
        acquireReadySmgInfo(smgID).store_into(tmp),
        output.set(tmp),
    ) 
    

    

# function smgMint(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, address userAccount, bytes calldata r, bytes32 s)   
@app.external
def smgMint(
        uniqueID:pt.abi.StaticBytes[Literal[32]], 
        smgID:pt.abi.StaticBytes[Literal[32]],
        tokenPairID:abi.Uint64, value:abi.Uint64,
        fee: abi.Uint64, tokenAccount:abi.Uint64, 
        userAccount:abi.Address, 
        r:pt.abi.StaticBytes[Literal[64]], 
        s:pt.abi.StaticBytes[Literal[32]]) -> Expr:
    #    event SmgMintLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);
    PK = abi.make(abi.StaticBytes[Literal[64]])
    PK.set(acquireReadySmgInfo(smgID))
    PK = PK.get()

    uniqueID = uniqueID.get()
    smgID = smgID.get()
    tokenPairID = tokenPairID.get()
    value = value.get()
    fee = fee.get()
    tokenAccount = tokenAccount.get()
    userAccount = userAccount.get()

    SmgMintLogger = Concat(
        Bytes("SmgMintLogger:"),
        uniqueID, Bytes(":"),
        smgID, Bytes(":"),
        Itob(tokenPairID), Bytes(":"),
        Itob(value), Bytes(":"),
        Itob(tokenAccount), Bytes(":"),
        userAccount, Bytes(":")
    )

    r = r.get()
    s = s.get()
    alldata = Concat(Itob(CurrentChainID), uniqueID, 
        Itob(tokenPairID), Itob(value),  Itob(fee), 
        Itob(tokenAccount), userAccount)
    mhash = pt.Keccak256(alldata)
    verifyResult = verifySignature(mhash, PK, r, s)

    return Seq(
        Log(SmgMintLogger),
        # Assert(verifyResult == Int(1)),   # TODO check the signature. here for test.
        do_axfer(userAccount, tokenAccount, value)
    )




# smgRelease(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, address userAccount, bytes calldata r, bytes32 s)
@app.external
def smgRelease(
        uniqueID: pt.abi.StaticBytes[Literal[32]], 
        smgID: pt.abi.StaticBytes[Literal[32]], 
        tokenPairID: abi.Uint64, 
        value: abi.Uint64, fee: abi.Uint64, 
        tokenAccount: abi.Uint64, 
        userAccount: abi.Address, 
        r: abi.StaticBytes[Literal[64]], 
        s: abi.StaticBytes[Literal[32]]) -> Expr:
    #    event SmgReleaseLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address tokenAccount, address userAccount);
    PK = abi.make(abi.StaticBytes[Literal[64]])

    uniqueID = uniqueID.get()
    tokenPairID = tokenPairID.get()
    value = value.get()
    fee = fee.get()
    tokenAccount = tokenAccount.get()
    userAccount = userAccount.get()
    feeProxy = abi.make(abi.Address)

    SmgReleaseLogger = Concat(Bytes("SmgReleaseLogger:"),
        uniqueID, Bytes(":"),
        smgID.get(), Bytes(":"),
        Itob(tokenPairID), Bytes(":"),
        Itob(value), Bytes(":"),
        Itob(tokenAccount), Bytes(":"),
        userAccount
    )
    OpUp(mode=pt.OpUpMode.OnCall).ensure_budget(Int(9000),fee_source=pt.OpUpFeeSource.GroupCredit),
    r = r.get()
    s = s.get()
    alldata = Concat(Itob(CurrentChainID), uniqueID, 
        Itob(tokenPairID), Itob(value),  Itob(fee), 
        Itob(tokenAccount), userAccount)
    # alldata =pt.Bytes(
    #         "base16",
    #         "0x000000008000011b3260fca590c675be800bbcde4a9ed067ead46612e25b33bc9b6f027ef12326e60000000000000021000000000000003700000000000000010000000000000000fae7555ec7598a8e15fec080294b837cb3e440274de38bf770ac2371ccc85795",
    #     )
    mhash = pt.Keccak256(alldata)
    # mhash = pt.Bytes(
    #             "base16",
    #             "0xa9933eee7a63a3bd74d74f8492eb39dfb0d4b5eb426ee62a884b53d6909e6756",
    #         )

    status = abi.make(abi.Uint8)
    return Seq(
        status.set(0), # TODO, reset uniqueID status to 0 for test.
        app.state.mapTxStatus[uniqueID].set(status),
        app.state.mapTxStatus[uniqueID].store_into(status),
        Assert(status.get() == Int(0)),
        status.set(1),
        app.state.mapTxStatus[uniqueID].set(status),
        acquireReadySmgInfo(smgID).store_into(PK),
        Log(SmgReleaseLogger),
        Assert(verifySignature(mhash,  PK.get(), r, s) == Int(1)),

        If(tokenAccount == Int(0)).Then(
            InnerTxnBuilder.Execute(
                {
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver: Txn.sender(),
                    TxnField.amount: value,
                }
            ),
            If(fee > Int(0)).Then(
                feeProxy.set(app.state.feeProxy),
                InnerTxnBuilder.Execute(
                    {
                        TxnField.type_enum: TxnType.Payment,
                        TxnField.receiver: feeProxy.get(),
                        TxnField.amount: fee,
                    }
                )
            )
        ).Else(
            do_axfer(userAccount, tokenAccount, value),
            If(fee > Int(0)).Then(
                feeProxy.set(app.state.feeProxy),
                do_axfer(feeProxy.get(), tokenAccount, fee)
            )
        ),
    )

# @app.external
# def create_wrapped_token(
#     name: abi.String,
#     symbol: abi.String,
#     decimals: abi.Uint8,
#     total_supply: abi.Uint64,
#     *,
#     output: abi.Uint64
# ) -> Expr:
#     return Seq(
#         app.state.latest_wrapped_token_id.set(do_create_wrapped_token(name, symbol, decimals, total_supply)),
#         Log(Concat(Bytes("create_wrapped_token:"), 
#             Itob(app.state.latest_wrapped_token_id.get()),
#             name.get(),
#             Bytes(":"),
#             symbol.get(),
#             Bytes(":"),
#             Itob(decimals.get())),
#         ),
#         output.set(app.state.latest_wrapped_token_id)
#     )

# @app.external
# def get_latest_wrapped_token_id(*, output: abi.Uint64) -> Expr:
#     return output.set(app.state.latest_wrapped_token_id.get())


@app.external(authorize=Authorize.only(app.state.owner.get()))
def opt_in_token_id(
    id: abi.Uint64,
) -> Expr:
    return Seq(do_opt_in(id.get()))

@app.external(authorize=Authorize.only(app.state.owner.get()))
def add_token_pair(
    id: abi.Uint64,
    from_chain_id: abi.Uint64,
    from_account: abi.DynamicBytes,
    to_chain_id: abi.Uint64,
    to_account: abi.DynamicBytes,
) -> Expr:
    key = abi.make(abi.String)
    return Seq(
        getTokenPairInfoKey(id).store_into(key),
        Assert(app.state.mapTokenPairInfo[key].exists() == Int(0)),
        (info := TokenPairInfo()).set(
            id,
            from_chain_id,
            from_account,
            to_chain_id,
            to_account,
        ),
        app.state.mapTokenPairInfo[key].set(info),
        app.state.pair_list[app.state.total_pair_count.get()].set(id),
        app.state.total_pair_count.set(app.state.total_pair_count.get() + Int(1)),
        Log(Concat(
            Bytes("add_token_pair:"),
            Itob(id.get()),
            Bytes(":"),
            Itob(from_chain_id.get()),
            Bytes(":"),
            from_account.get(),
            Bytes(":"),
            Itob(to_chain_id.get()),
            Bytes(":"),
            to_account.get(),
        )),
    )
    
@app.external(authorize=Authorize.only(app.state.owner.get()))
def update_token_pair(
    id: abi.Uint64,
    from_chain_id: abi.Uint64,
    from_account: abi.DynamicBytes,
    to_chain_id: abi.Uint64,
    to_account: abi.DynamicBytes,
) -> Expr:
    key = abi.make(abi.String)
    return Seq(
        getTokenPairInfoKey(id).store_into(key),
        Assert(app.state.mapTokenPairInfo[key].exists() == Int(1)),
        (info := TokenPairInfo()).set(
            id,
            from_chain_id,
            from_account,
            to_chain_id,
            to_account,
        ),
        app.state.mapTokenPairInfo[key].set(info),
        Log(Concat(
            Bytes("update_token_pair:"),
            Itob(id.get()),
            Bytes(":"),
            Itob(from_chain_id.get()),
            Bytes(":"),
            from_account.get(),
            Bytes(":"),
            Itob(to_chain_id.get()),
            Bytes(":"),
            to_account.get(),
        )),
    )

@app.external(read_only=True)
def get_token_pair(
    id: abi.Uint64,
    *,
    output: TokenPairInfo,
) -> Expr:
    key = abi.make(abi.String)
    return Seq(
        getTokenPairInfoKey(id).store_into(key),
        app.state.mapTokenPairInfo[key].store_into(output)
    )


##############
# Utility methods for inner transactions
##############

@Subroutine(TealType.none)
def do_axfer(rx: Expr, aid: Expr, amt: Expr) -> Expr:
    return InnerTxnBuilder.Execute(
        {
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: aid,
            TxnField.asset_amount: amt,
            TxnField.asset_receiver: rx,
            TxnField.fee: Int(1000),
        }
    )

@Subroutine(TealType.none)
def do_ax_burn(holder: Expr, aid: Expr, amt: Expr) -> Expr:
    return InnerTxnBuilder.Execute(
        {
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: aid,
            TxnField.asset_amount: amt,
            TxnField.asset_sender: holder,
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.fee: Int(1000),
            TxnField.sender: Global.current_application_address(),
        }
    )

@Subroutine(TealType.none)
def do_opt_in(aid: Expr) -> Expr:
    return do_axfer(Global.current_application_address(), aid, Int(0))

# @Subroutine(TealType.uint64)
# def do_create_wrapped_token(
#     name: abi.String,
#     symbol: abi.String,
#     decimals: abi.Uint8,
#     total_supply: abi.Uint64,
# ) -> Expr:
#     return Seq(
#         InnerTxnBuilder.Execute(
#             {
#                 TxnField.type_enum: TxnType.AssetConfig,
#                 TxnField.config_asset_name: name.get(),
#                 TxnField.config_asset_unit_name: symbol.get(),
#                 TxnField.config_asset_total: total_supply.get(),
#                 TxnField.config_asset_decimals: decimals.get(),
#                 TxnField.config_asset_manager: Global.current_application_address(),
#                 TxnField.config_asset_reserve: Global.current_application_address(),
#                 TxnField.config_asset_clawback: Global.current_application_address(),
#                 TxnField.config_asset_url: Bytes("https://bridge.wanchain.org"),
#                 TxnField.fee: Int(1000),
#             }
#         ),
#         InnerTxn.created_asset_id(),
#     )

@Subroutine(TealType.none)
def do_axfer(rx: Expr, aid: Expr, amt: Expr) -> Expr:
    return InnerTxnBuilder.Execute(
        {
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: aid,
            TxnField.asset_amount: amt,
            TxnField.asset_receiver: rx,
            TxnField.fee: Int(1000),
        }
    )

@Subroutine(TealType.none)
def do_ax_burn(holder: Expr, aid: Expr, amt: Expr) -> Expr:
    return InnerTxnBuilder.Execute(
        {
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: aid,
            TxnField.asset_amount: amt,
            TxnField.asset_sender: holder,
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.fee: Int(1000),
            TxnField.sender: Global.current_application_address(),
        }
    )

@Subroutine(TealType.none)
def do_opt_in(aid: Expr) -> Expr:
    return do_axfer(Global.current_application_address(), aid, Int(0))


###
# App lifecycle
###
@app.create
def create() -> Expr:
    return app.initialize_global_state()

@app.external(authorize=Authorize.only(Global.creator_address()))
def initialize(
    # seed: abi.PaymentTransaction, # pay for minimum balance
    owner: abi.Address, 
    admin: abi.Address,
    ) -> Expr:
    """Initializes the global state of the app.

    Args:
        owner: address of the owner
        admin: address of the admin
    """
    return Seq(
        Assert(app.state.initialized.get() == Int(0)),
        Pop(app.state.pair_list.create()),
        app.state.owner.set(owner.get()),
        app.state.admin.set(admin.get()),
        app.state.initialized.set(Int(1)),
    )


@app.update(authorize=Authorize.only(app.state.owner.get()))
def update() -> Expr:
    return Approve()

@app.delete
def delete() -> Expr:
    return Reject()

@app.opt_in
def opt_in() -> Expr:
    return Approve()

@app.clear_state
def clear_state() -> Expr:
    return Approve()

@app.close_out
def close_out() -> Expr:
    return Approve()



# oracle methods
@app.external
def set_storeman_group_config(
    id: abi.StaticBytes[Literal[32]],
    gpk: abi.StaticBytes[Literal[64]],
    startTime: abi.Uint64,
    endTime: abi.Uint64,
) -> Expr:
    return Seq(
        (status := abi.Uint8()).set(Int(0)),
        (info := StoremanGroupConfig()).set(gpk, startTime, endTime, status),
        app.state.mapStoremanGroupConfig[id].set(info),
        
    )

@app.external
def set_storeman_group_status(
    id: abi.StaticBytes[Literal[32]],
    status: abi.Uint8,
) -> Expr:

    return Seq(
        (info := StoremanGroupConfig()).decode(
            app.state.mapStoremanGroupConfig[id].get()
        ),
        (gpk := abi.StaticBytes(abi.StaticBytesTypeSpec(64))).set(info.gpk),
        (startTime := abi.Uint64()).set(info.startTime),
        (endTime := abi.Uint64()).set(info.endTime),
        (infoNew := StoremanGroupConfig()).set(gpk, startTime, endTime, status),
        app.state.mapStoremanGroupConfig[id].set(infoNew)
    )



@app.external
def get_smg_info(
    id: abi.StaticBytes[Literal[32]],
    *,
    output: StoremanGroupConfig,
) -> Expr:
    return app.state.mapStoremanGroupConfig[id].store_into(output)


if __name__ == "__main__":
    app.build().export("./artifacts_cross")
    print("done")
