import { TonClient,  WalletContractV4, Address } from "@ton/ton";
import { getHttpEndpoints , Network} from "@orbs-network/ton-access";
import {getSecureRandomNumber} from "@ton/crypto";

export async function getClient(network:Network):Promise<TonClient> {
    const endpoints = await getHttpEndpoints({ network:network });
    const total = endpoints.length;
    if(!total){
        throw new Error("no http endpoint found!");
    }
    const indexUsed = await getSecureRandomNumber(0,total)
    return  new TonClient({ endpoint:endpoints[indexUsed] });
}