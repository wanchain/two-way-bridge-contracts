import {getClient} from "../client/client";
const scAddress = require('../testData/contractAddress.json');
async function main(){
    let client = await getClient('testnet');
    let ret = await client.getContractState(scAddress.bridgeAddress);
    console.log("ret=>",ret);
    client = null;
}

main();
