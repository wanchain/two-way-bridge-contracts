import { TonClient,  WalletContractV4, Address } from "@ton/ton";
import { getHttpEndpoints , getHttpEndpoint,Network} from "@orbs-network/ton-access";
import {getSecureRandomNumber} from "@ton/crypto";

const TONCLINET_TIMEOUT = 60 * 1000 * 1000;
export async function getClient(network:Network):Promise<TonClient> {
    const endpoints = await getHttpEndpoints({ network:network });
    const total = endpoints.length;
    if(!total){
        throw new Error("no http endpoint found!");
    }
    const indexUsed = await getSecureRandomNumber(0,total)
    console.log("http endpoint is =>",endpoints[indexUsed]);
    return  new TonClient({ endpoint:endpoints[indexUsed],timeout:TONCLINET_TIMEOUT });
    /*const endpoint = await getHttpEndpoint({ network:network });
    return  new TonClient({ endpoint });*/
}