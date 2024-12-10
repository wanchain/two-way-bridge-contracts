import core_1, { Address, Cell, Contract, ContractProvider, MessageRelaxed, Sender, SendMode } from "@ton/core";
import {TonClient} from "@ton/ton";
import {Bridge} from '../Bridge';

export class BridgeAccess {
    private client: TonClient;
    private readonly contractAddr: Address;

    static create(client:TonClient,contractAddr:string):BridgeAccess {
        let addr = Address.parse(contractAddr);
        return new BridgeAccess(client, addr);
    }

    constructor(client:TonClient,contractAddr:Address){
        this.client = client;
        this.contractAddr = contractAddr;
    }

    async writeContract(methodName:string,via:Sender,opts:any){
        if(!methodName.startsWith('send')){
            throw new Error(`${methodName} is not supported Non send method`);
        }
        try{
                let  c =  Bridge.createFromAddress(this.contractAddr);
                let  cOpened =  this.client.open(c);
                return await cOpened[methodName](via,opts);
            }catch(err){
                console.log("err=>",err);
                throw new Error(`${methodName} is not supported Non send method`);
            }
    }

    async readContract(methodName:string,parameters:any[]){
        if(!methodName.startsWith('get')){
            throw new Error(`${methodName} is not supported Non send method`);
        }
        try{
            let  c =  Bridge.createFromAddress(this.contractAddr);
            let  cOpened = this.client.open(c);
            console.log("methodName=>",methodName);
            return await cOpened[methodName](...parameters);
        }catch(err){
            console.log(err);
            throw new Error(`${methodName} is not supported Non send method`);
        }
    }
}

/*
1. put down all the getMethod
2. for users, all the parameter value is hexString, or bigInt, or Address, or string
3. convert the input value to the value which is used in Bridge.ts class
4. use client's runGetMessage or use the Bridge.ts?
 */

