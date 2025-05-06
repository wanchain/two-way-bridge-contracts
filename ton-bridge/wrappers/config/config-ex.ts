import {TonConfig} from "../client/client";

export const configTestnet:TonConfig =  {
    network:{
        network:"testnet", // testnet|mainnet
    },
    usingDbCache:true,
    urls:[
        {
            //url:'',
            //apiKey:''
        }]
}

export const configMainnet:TonConfig =  {
    network:{
        network:"mainnet", // testnet|mainnet
    },
    usingDbCache:true,
    urls:[
        {
            //url:'',
            //apiKey:''
        }]
}
