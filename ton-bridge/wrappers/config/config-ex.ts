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

export const configTestnetObs:TonConfig =  {
    network:{
        network:"testnet", // testnet|mainnet
    },
    usingDbCache:true,
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


export const configTestTonApi:TonConfig =  {
    network:{
        network:"testnet", // testnet|mainnet
    },
    usingDbCache:true,
    urls:[
        {
            url:'https://testnet.tonapi.io',
            //apiKey:'',
            vendor:'tonapi',
        }]
}

export const configMainTonApi:TonConfig =  {
    network:{
        network:"mainnet", // testnet|mainnet
    },
    usingDbCache:true,
    urls:[
        {
            url:'https://tonapi.io',
            //apiKey:'',
            vendor:'tonapi',
        }]
}
