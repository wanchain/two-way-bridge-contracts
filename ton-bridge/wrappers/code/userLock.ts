import {getQueryID} from "../utils/utils";
import {isAddrDepolyed} from "../wallet/walletContract";
import {JettonMaster, TonClient} from "@ton/ton";
import {BridgeAccess} from "../contractAccess/bridgeAccess";
import {Address, beginCell, ContractProvider, internal, toNano} from "@ton/core";
import {BIP44_CHAINID, TON_COIN_ACCOUNT_STR,LOCK_COIN,LOCK_ORIGINAL_TOKEN,LOCK_WRAPPED_TOKEN} from "../const/const-value";
import * as opcodes from "../opcodes";
import {Maybe} from "@ton/core/src/utils/maybe";
import {StateInit} from "@ton/core";
import {Cell} from "@ton/core";
import {Blockchain} from "@ton/sandbox";
import {Bridge} from "../Bridge";
const formatUtil = require('util');

export async function buildUserLockMessages(opts: {
    value: bigint,
    smgID:string,
    tokenPairID:number,
    crossValue:bigint,
    dstUserAccount:string, // hex string
    bridgeScAddr:string,
    client:TonClient|Blockchain,
    senderAccount:string,
}){

    console.log("buildUserLockMessages","opts",opts);

    let queryID = await getQueryID();
    if(! Address.isAddress(Address.parse(opts.bridgeScAddr))){
        throw new Error(formatUtil.format("invalid bridgeScAddr %s",opts.bridgeScAddr));
    }

    if( !(await isAddrDepolyed(opts.client,opts.bridgeScAddr))){
        throw new Error(formatUtil.format("contract %s is not deployed",opts.bridgeScAddr));
    }
    let tokenPairInfo = (await getTokenPairInfo(opts.client,Address.parse(opts.bridgeScAddr),opts.tokenPairID));
    let tokenAccount = tokenPairInfo.tokenAccount
    let fromChainID  = tokenPairInfo.srcChainID
    let dstChainID = tokenPairInfo.toChainID

    let lockFee = BigInt(await getFee(opts.client,Address.parse(opts.bridgeScAddr),opts.tokenPairID,fromChainID,dstChainID));
    console.log("lockFee=%s",lockFee.toString(10));
    let addrTokenAccount:Address;
    let jwAddrBridgeSc:Address;
    let jwAddrSrc:Address;

    console.log("tokenAccount",tokenAccount);
    console.log("TON_COIN_ACCOUNT_STR",TON_COIN_ACCOUNT_STR);
    if(tokenAccount == TON_COIN_ACCOUNT_STR){
        jwAddrBridgeSc = jwAddrSrc = addrTokenAccount = Address.parse(TON_COIN_ACCOUNT_STR)
        return buildLockCoinMessages(opts,jwAddrBridgeSc,jwAddrSrc,addrTokenAccount,lockFee);
    }else{
        addrTokenAccount = Address.parse(tokenAccount);
        jwAddrBridgeSc = await getJettonWalletAddr(opts.client,addrTokenAccount,Address.parse(opts.bridgeScAddr))
        jwAddrSrc = await getJettonWalletAddr(opts.client,addrTokenAccount,Address.parse(opts.senderAccount))

        let jettonAdminAddr:Address;
        jettonAdminAddr = await getJettonAdminAddr(opts.client,addrTokenAccount);
        console.log("jettonAdminAddr from getJettonAdminAddr",jettonAdminAddr.toString());
        addrTokenAccount = Address.parse(tokenAccount);
        if(jettonAdminAddr.toString() == opts.bridgeScAddr.toString()){
            return buildLockWrappedTokenMessages(opts,jwAddrBridgeSc,jwAddrSrc,addrTokenAccount,lockFee);
        }else{
            return buildLockOriginalTokenMessages(opts,jwAddrBridgeSc,jwAddrSrc,addrTokenAccount,lockFee);
        }
    }
    throw new Error("unknown tokenAccount");
}


async function buildInternalMessage(src: {
    to: Address | string,
    value: bigint | string,
    bounce?: Maybe<boolean>,
    init?: Maybe<StateInit>,
    body?: Maybe<Cell | string>
}){
    return internal(src);
}

async function buildLockCoinMessages(opts: {
    value: bigint,
    smgID:string,
    tokenPairID:number,
    crossValue:bigint,
    dstUserAccount:string, // hex string
    bridgeScAddr:string,
    client:TonClient|Blockchain,
    senderAccount:string,
},jwAddrBridgeSc:Address,jwAddrSrc:Address,addrTokenAccount:Address,lockFee:bigint){
    console.log("buildLockCoinMessages","jwAddrBridgeSc",jwAddrBridgeSc.toString(),"jwAddrSrc",jwAddrSrc.toString(),"addrTokenAccount",addrTokenAccount.toString(),"lockFee",lockFee);
    let queryId = await getQueryID();
    let dstUserAccountBuffer = Buffer.from(opts.dstUserAccount,'hex');
    let dstUserAccountBufferLen = dstUserAccountBuffer.length
    let extraCell = beginCell()
        .storeAddress(addrTokenAccount)
        .storeAddress(jwAddrSrc)
        .storeAddress(jwAddrBridgeSc)
        .endCell()
    let body = beginCell()
        .storeUint(opcodes.OP_CROSS_UserLock, 32)
        .storeUint(queryId, 64)
        .storeUint(BigInt(opts.smgID), 256)
        .storeUint(opts.tokenPairID, 32)
        .storeUint(opts.crossValue, 256)
        .storeUint(dstUserAccountBufferLen,8)
        .storeBuffer(dstUserAccountBuffer,dstUserAccountBufferLen)
        .storeRef(extraCell)
        .endCell()
    let msg = await buildInternalMessage({to:opts.bridgeScAddr,value:opts.value,body:body,bounce:true});
    return {
        internalMsg:msg,
        body:body,
        to:opts.bridgeScAddr,
    }
}

async function buildLockOriginalTokenMessages(opts: {
    value: bigint,
    smgID:string,
    tokenPairID:number,
    crossValue:bigint,
    dstUserAccount:string, // hex string
    bridgeScAddr:string,
    client:TonClient|Blockchain,
    senderAccount:string,
},jwAddrBridgeSc:Address,jwAddrSrc:Address,addrTokenAccount:Address,lockFee:bigint){
    console.log("buildLockOriginalTokenMessages","jwAddrBridgeSc",jwAddrBridgeSc.toString(),"jwAddrSrc",jwAddrSrc.toString(),"addrTokenAccount",addrTokenAccount.toString(),"lockFee",lockFee);

    // forward payLoad
    let queryId = await getQueryID();

    let dstUserAccountBuffer = Buffer.from(opts.dstUserAccount,'hex');
    let dstUserAccountBufferLen = dstUserAccountBuffer.length
    let extraCell = beginCell()
        .storeAddress(addrTokenAccount)
        .storeAddress(jwAddrSrc)
        .storeAddress(jwAddrBridgeSc)
        .endCell()
    let body = beginCell()
        .storeUint(opcodes.OP_CROSS_UserLock, 32)
        .storeUint(queryId, 64)
        .storeUint(BigInt(opts.smgID), 256)
        .storeUint(opts.tokenPairID, 32)
        .storeUint(opts.crossValue, 256)
        .storeUint(dstUserAccountBufferLen,8)
        .storeBuffer(dstUserAccountBuffer,dstUserAccountBufferLen)
        .storeRef(extraCell)
        .endCell()

    // sendToken payLoad
    let forwardAmount = lockFee;
    let sendTokenAmount = opts.crossValue;
    let sendJettonCel = beginCell()
        .storeUint(0xf8a7ea5, 32) // op 0xf8a7ea5
        .storeUint(queryId, 64) // op, queryId
        .storeCoins(sendTokenAmount) //jetton_amount
        .storeAddress(jwAddrBridgeSc)
        .storeAddress(Address.parse(opts.bridgeScAddr)) //response address
        .storeMaybeRef(null)
        .storeCoins(forwardAmount) // forward_ton_amount
        .storeMaybeRef(body)  //forwardPayload
        .endCell();



    let msg = await buildInternalMessage({to:jwAddrSrc,value:opts.value,body:sendJettonCel,bounce:true});
    return {
        internalMsg:msg,
        body:sendJettonCel,
        to:jwAddrSrc,
    }
}

async function buildLockWrappedTokenMessages(opts:any,jwAddrBridgeSc:Address,jwAddrSrc:Address,addrTokenAccount:Address,lockFee:bigint){
    return {
        internalMsg:null,
        body:null,
        to:null,
    }
}

async function getFee(client:TonClient|Blockchain,bridgeScAddr:Address,tokenPairID:number,srcChainId,dstChainId){
    let fee = 0;
    if(client instanceof TonClient){
        let ba = BridgeAccess.create(client,bridgeScAddr.toString())
        let feeTp = await ba.readContract("getChainFee",[srcChainId,dstChainId])
        if(feeTp.contractFee != 0){
            fee =  feeTp.contractFee;
        }else{
            fee = await ba.readContract("getTokenPairFee",[tokenPairID]);
        }
    }else{
        let b = await Bridge.createFromAddress(bridgeScAddr)
        let opened = await client.openContract(b);
        let feeTp = await opened.getChainFee(srcChainId,dstChainId);
        if(feeTp.contractFee != 0){
            fee =  feeTp.contractFee;
        }else{
            fee = await opened.getTokenPairFee(tokenPairID);
        }
    }
    return fee;
}

async function getJettonWalletAddr(client:TonClient|Blockchain,jettonMasterAddr:Address,ownerAddr:Address){
    console.log("in getJettonWalletAddr", "jettonMasterAddr", jettonMasterAddr.toString(),"ownerAddr",ownerAddr.toString());
    if(client instanceof TonClient){
        let jettonMasterSc = JettonMaster.create(jettonMasterAddr)
        let jettonMasterScOpened = await client.open(jettonMasterSc)
        return await jettonMasterScOpened.getWalletAddress(ownerAddr)
    }else{
        let jettonMasterSc = JettonMaster.create(jettonMasterAddr)
        let jettonMasterScOpened = await client.openContract(jettonMasterSc)
        return await jettonMasterScOpened.getWalletAddress(ownerAddr)
    }

}

async function getJettonAdminAddr(client:TonClient|Blockchain,jettonMasterAddr:Address){
    console.log("in getJettonAdminAddr", "jettonMasterAddr", jettonMasterAddr.toString());
    if(client instanceof TonClient){
        let jettonMasterSc = JettonMaster.create(jettonMasterAddr)
        let jettonMasterScOpened = await client.open(jettonMasterSc)
        return (await jettonMasterScOpened.getJettonData()).adminAddress
    }else{
        let jettonMasterSc = JettonMaster.create(jettonMasterAddr)
        let jettonMasterScOpened = await client.openContract(jettonMasterSc)
        return (await jettonMasterScOpened.getJettonData()).adminAddress
    }
}

async function getTokenPairInfo(client:TonClient|Blockchain,bridgeScAddr:Address,tokenPairID:number){
    let tokePairInfo ;
    let tokenAccount = "";

    if(client instanceof TonClient){
        let ba = new BridgeAccess(client,bridgeScAddr)
        tokePairInfo = await ba.readContract("getTokenPair",[tokenPairID])
    }else{
        let b = Bridge.createFromAddress(bridgeScAddr);
        let opened = await client.openContract(b);
        tokePairInfo = await opened.getTokenPair(tokenPairID)
    }
    console.log("in getTokenPairInfo","tokenPairInfo",tokePairInfo,"tokenPairId",tokenPairID);
    if (tokePairInfo.fromChainID == BIP44_CHAINID){
        tokenAccount = tokePairInfo.fromAccount;
    }else{
        if(tokePairInfo.toChainID == BIP44_CHAINID){
            tokenAccount = tokePairInfo.toAccount;
        }else{
            throw new Error(formatUtil.format("invalid TokenPair %d",tokenPairID));
        }
    }

    if(! Address.isAddress(Address.parse(tokenAccount))){
        throw new Error(formatUtil.format("invalid tokenAccount %s",tokenAccount));
    }
    return {tokenAccount,srcChainID:tokePairInfo.fromChainID, toChainID:tokePairInfo.toChainID};
}