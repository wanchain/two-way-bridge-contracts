
import {getClient, TonClientConfig, wanTonSdkInit} from "./client";
import {IsWanTonClient, WanTonClient} from "./client-interface";
import {Blockchain} from "@ton/sandbox";
import {configTestnet, configTestTonApi} from "../config/config-ex";

let client:WanTonClient;

describe('client interface', () => {

    beforeAll(async () => {

    },50000);

    it('client tonApi', async () => {
        let config = Object.assign({},configTestTonApi);
        config.usingDbCache = false;
        await wanTonSdkInit(config);
        client = await getClient();
        if(IsWanTonClient(client)){
            console.log("interface ok");
        }else{
            console.log("interface KO");
        }
    },50000);

    it('client interface', async () => {
        let blockchain = await Blockchain.create();
        if(IsWanTonClient(blockchain)){
            console.log("interface ok");
        }else{
            console.log("interface KO");
        }
    },500000);

});