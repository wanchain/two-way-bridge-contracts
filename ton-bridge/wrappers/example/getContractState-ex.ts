import {Address} from "@ton/core";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}

import {getClient} from "../client/client";
import {TonClientConfig} from "../client/client";
async function main(){
    let client = await getClient(config,"https://ton.access.orbs.network/55033c0ff5Bd3F8B62C092Ab4D238bEE463E5503/1/testnet/toncenter-api-v2/jsonRPC\n");
    let ret = await client.getContractState(Address.parse(process.argv[2]));
    console.log("ret1=>",ret);
    client = null;
}

main();

// ts-node getContractState-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr