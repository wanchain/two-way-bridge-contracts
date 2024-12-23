import { TonClient,  WalletContractV4, Address } from "@ton/ton";
import { getHttpEndpoints , getHttpEndpoint,Network} from "@orbs-network/ton-access";
import {getSecureRandomNumber} from "@ton/crypto";
import {logger} from '../utils/logger'

// const toncenter_testnet_apikey ="73ee18f6b52a360e9db390f146a8c6af161549495d6e9794ae3efd2e412fa7a2";
// const toncenter_mainnet_apikey ="16f38715eb1a0984abf42148d5ed042589f8bf11768141ecb944feae8102913a";

const formatUtil = require('util');

export interface TonClientConfig {
    network: Network;
    tonClientTimeout?:number;
}

export async function getClient(config:TonClientConfig,url?:string):Promise<TonClient> {
    logger.info(formatUtil.format("getClient config %s",JSON.stringify(config)));
    if(url?.length > 0){
        logger.info(formatUtil.format("(url)http endpoint is =>%s",url));
        return  new TonClient({ endpoint:url,timeout:config?.tonClientTimeout });
    }

    const endpoints = await getHttpEndpoints({ network:config.network });
    const total = endpoints.length;
    if(!total){
        throw new Error("no http endpoint found!");
    }
    const indexUsed = await getSecureRandomNumber(0,total)
    logger.info(formatUtil.format("http endpoint is =>",endpoints[indexUsed]));
    return  new TonClient({ endpoint:endpoints[indexUsed],timeout:config.tonClientTimeout });
    //return  new TonClient({ endpoint:"https://testnet.toncenter.com/api/v2/jsonRPC",timeout:TONCLINET_TIMEOUT,apiKey:toncenter_testnet_apikey});
}