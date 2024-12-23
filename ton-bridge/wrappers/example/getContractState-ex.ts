const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}

import {getClient} from "../client/client";
import {TonClientConfig} from "../client/client";
const scAddress = require('../testData/contractAddress.json');
async function main(){
    let client = await getClient(config,"https://ton.access.orbs.network/55033c0ff5Bd3F8B62C092Ab4D238bEE463E5503/1/testnet/toncenter-api-v2/jsonRPC\n");
    let ret = await client.getContractState(scAddress.bridgeAddress);
    console.log("ret1=>",ret);
    client = null;

    client = await getClient(config);
    ret = await client.getContractState(scAddress.bridgeAddress);
    console.log("ret2=>",ret);
    client = null;

    const config1:TonClientConfig =  {
        network:"testnet", // testnet|mainnet
    }
    client = await getClient(config1);
    ret = await client.getContractState(scAddress.bridgeAddress);
    console.log("ret3=>",ret);
    client = null;
}

main();
