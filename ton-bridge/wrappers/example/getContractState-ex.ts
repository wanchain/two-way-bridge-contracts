global.TON_NETORK = "testnet";
import {getClient} from "../client/client";
const scAddress = require('../testData/contractAddress.json');
async function main(){
    let client = await getClient();
    let ret = await client.getContractState(scAddress.bridgeAddress);
    console.log("ret=>",ret);
    client = null;
}

main();
