
import {getClient, TonClientConfig} from "./client";
import {WanTonClient} from "./client-interface";

let client:WanTonClient;

// function isInterface(obj:any,inter:wanTonClient){
//     return true;
// }

describe('client interface', () => {

    beforeAll(async () => {
        client = await getClient();
        // if(client instanceof wanTonClient){
        //     console.log("interface ok");
        // }else{
        //     console.log("interface KO");
        // }
    },50000);

    it('client interface', async () => {

    },500000);

});