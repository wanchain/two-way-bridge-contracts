import { TonClient,  WalletContractV4, Address } from "@ton/ton";
import { getHttpEndpoints , getHttpEndpoint,Network} from "@orbs-network/ton-access";
import {getSecureRandomNumber} from "@ton/crypto";
import {logger} from '../utils/logger'
import {TONCLINET_TIMEOUT} from "../const/const-value";
import {DBAccess} from "../db/DbAccess";
import path from "path";
import {WanTonClient} from "./client-interface";
import {TonApiClient} from "./tonapi-client";

const formatUtil = require('util');

export interface TonClientConfig {
    network: Network;
    tonClientTimeout?:number;
}

export interface TonUrlConfig{
    url?:string;
    apiKey?:string;
    vendor?:string; //tonApi
}

export interface TonConfig {
    network:TonClientConfig;
    urls?:TonUrlConfig[];
    usingDbCache?: boolean;
    scanTrans?:boolean;
}


let  g_tonConfig:TonConfig;

export function getGlobalTonConfig(){
    return g_tonConfig;
}

export function isTestnet(){
    if(!g_tonConfig){
        return false; // default mainnet
    }
    return g_tonConfig.network?.network == 'testnet';
}

let DBDataDir: string;
let buildDBDataDir = ()=>{
    if(isTestnet()){
        DBDataDir = path.join(...[__dirname,"/../data/testnet/"]);
    }else{
        DBDataDir = path.join(...[__dirname,"/../data/mainnet/"]);
    }

    logger.info("__dirname",__dirname);
    logger.info("DBDataDir",DBDataDir);

};

export function getDBDataDir(){
    return DBDataDir
}
export async function wanTonSdkInit(tcf:TonConfig){
    if(tcf == null){
        throw new Error(`invalid ton config ${tcf}`);
    }
    g_tonConfig = tcf;

    buildDBDataDir();

    let dbAccess = await DBAccess.getDBAccess();
    if(dbAccess){
        await dbAccess.init(g_tonConfig.scanTrans);
    }
}

const toncenter_testnet_apikey ="73ee18f6b52a360e9db390f146a8c6af161549495d6e9794ae3efd2e412fa7a2";
const toncenter_apikey ="16f38715eb1a0984abf42148d5ed042589f8bf11768141ecb944feae8102913a";

const default_test_url= "https://testnet.toncenter.com/api/v2/jsonRPC"
const default_url= "https://toncenter.com/api/v2/jsonRPC"

const tonapi_apikey="AH4MNTSJ5HBH4KAAAAAJQ2O2QNEXAKZWGAMTFLFJC4BMWNGDNFYXSKUOPQ4KRJSXJDSL65I";
const tonapi_testnet_apikey="AH4MNTSJ5HBH4KAAAAAJQ2O2QNEXAKZWGAMTFLFJC4BMWNGDNFYXSKUOPQ4KRJSXJDSL65I";

export async function getClient():Promise<WanTonClient> {
    logger.info(formatUtil.format("getClient config %s",JSON.stringify(g_tonConfig)));

    let finalClientConfig = null;
    // get client by url
    if(g_tonConfig.urls?.length){
        let urls = g_tonConfig.urls;
        const totalUrls = urls.length;
        const indexUsed = await getSecureRandomNumber(0,totalUrls)
        if(urls[indexUsed].vendor?.toLowerCase() == 'tonapi'){
            finalClientConfig = {
                baseUrl:urls[indexUsed].url,
                apiKey: urls[indexUsed].apiKey ?? (g_tonConfig.network.network === 'mainnet' ? tonapi_apikey : tonapi_testnet_apikey)
            }
            logger.info(formatUtil.format("getClient final config %s",JSON.stringify(finalClientConfig)));
            return new TonApiClient(finalClientConfig);
        }else{
            finalClientConfig = { endpoint:urls[indexUsed].url ?? (g_tonConfig.network.network === 'mainnet' ? default_url:default_test_url),
                timeout:g_tonConfig.network.tonClientTimeout ?? TONCLINET_TIMEOUT,
                apiKey: urls[indexUsed].apiKey ?? (g_tonConfig.network.network === 'mainnet' ? toncenter_apikey : toncenter_testnet_apikey) }
            logger.info(formatUtil.format("getClient final config %s",JSON.stringify(finalClientConfig)));
            return  new TonClient(finalClientConfig);
        }
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