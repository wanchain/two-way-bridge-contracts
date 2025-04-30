import { TonClient,  WalletContractV4, Address } from "@ton/ton";
import { getHttpEndpoints , getHttpEndpoint,Network} from "@orbs-network/ton-access";
import {getSecureRandomNumber} from "@ton/crypto";
import {logger} from '../utils/logger'
import {TONCLINET_TIMEOUT} from "../const/const-value";
import {DBAccess} from "../db/DbAccess";

const formatUtil = require('util');

export interface TonClientConfig {
    network: Network;
    tonClientTimeout?:number;
}

export interface TonUrlConfig{
    url?:string;
    apiKey?:string;
}

export interface TonConfig {
    network:TonClientConfig;
    urls?:TonUrlConfig[];
    usingDbCache?: boolean;
}


let  g_tonConfig:TonConfig;

export function getGlobalTonConfig(){
    return g_tonConfig;
}

export async function wanTonSdkInit(tcf:TonConfig){
    if(tcf == null){
        throw new Error(`invalid ton config ${tcf}`);
    }
    g_tonConfig = tcf;

    let dbAccess = await DBAccess.getDBAccess();
    if(dbAccess){
        await dbAccess.init();
    }
}

const toncenter_testnet_apikey ="73ee18f6b52a360e9db390f146a8c6af161549495d6e9794ae3efd2e412fa7a2";
const toncenter_apikey ="16f38715eb1a0984abf42148d5ed042589f8bf11768141ecb944feae8102913a";

const default_test_url= "https://testnet.toncenter.com/api/v2/jsonRPC"
const default_url= "https://toncenter.com/api/v2/jsonRPC"

export async function getClient():Promise<TonClient> {
    logger.info(formatUtil.format("getClient config %s",JSON.stringify(g_tonConfig)));

    // get client by url
    if(g_tonConfig.urls?.length){
        let urls = g_tonConfig.urls;
        const totalUrls = urls.length;
        const indexUsed = await getSecureRandomNumber(0,totalUrls)
        return  new TonClient({ endpoint:urls[indexUsed].url ?? (g_tonConfig.network.network === 'mainnet' ? default_url:default_test_url),
            timeout:g_tonConfig.network.tonClientTimeout ?? TONCLINET_TIMEOUT,
            apiKey: urls[indexUsed].apiKey ?? (g_tonConfig.network.network === 'mainnet' ? toncenter_apikey : toncenter_testnet_apikey) });
    }

    // get client by orbs access
    const endpoints = await getHttpEndpoints({ network:g_tonConfig.network.network});
    const total = endpoints.length;
    if(!total){
        throw new Error("no http endpoint found!");
    }
    const indexUsed = await getSecureRandomNumber(0,total)
    logger.info(formatUtil.format("(orbos)http endpoint is =>",endpoints[indexUsed]));
    return  new TonClient({ endpoint:endpoints[indexUsed],timeout:g_tonConfig.network.tonClientTimeout ?? TONCLINET_TIMEOUT});
}