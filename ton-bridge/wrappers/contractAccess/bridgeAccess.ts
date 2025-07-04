import {Address, Sender} from "@ton/core";
import {Bridge} from '../Bridge';

import {logger} from '../utils/logger'
import {bigIntReplacer, formatError} from "../utils/utils";
import {WanTonClient} from "../client/client-interface";

const formatUtil = require('util');

export class BridgeAccess {
    private client: WanTonClient;
    private readonly contractAddr: Address;

    constructor(client: WanTonClient, contractAddr: Address) {
        this.client = client;
        this.contractAddr = contractAddr;
    }

    static create(client: WanTonClient, contractAddr: string): BridgeAccess {
        let addr = Address.parse(contractAddr);
        return new BridgeAccess(client, addr);
    }

    async writeContract(methodName: string, via: Sender, opts: any) {
        if (!methodName.startsWith('send')) {
            throw new Error(`${methodName} is not supported Non send method`);
        }
        try {
            let c = Bridge.createFromAddress(this.contractAddr);
            logger.info(formatUtil.format("writeContract contractAddress", this.contractAddr));
            let cOpened = this.client.open(c);
            return await cOpened[methodName](via, opts);
        } catch (err) {
            logger.error(formatUtil.format("writeContract err=>", "methodName", methodName, "opts", JSON.stringify(opts, bigIntReplacer), "err", err));
            throw new Error(`writeContract ${methodName} error ${formatError(err)}`);
        }
    }

    async readContract(methodName: string, parameters: any[]) {
        if (!methodName.startsWith('get')) {
            throw new Error(`${methodName} is not supported Non send method`);
        }
        try {
            let c = Bridge.createFromAddress(this.contractAddr);
            let cOpened = this.client.open(c);
            logger.info(formatUtil.format("methodName=>", methodName));
            return await cOpened[methodName](...parameters);
        } catch (err) {
            logger.error(formatUtil.format(formatError(err)), "methodName", methodName, "parameters", parameters);
            throw new Error(`readContract ${methodName} error ${formatError(err)}`);
        }
    }
}

/*
1. put down all the getMethod
2. for users, all the parameter value is hexString, or bigInt, or Address, or string
3. convert the input value to the value which is used in Bridge.ts class
4. use client's runGetMessage or use the Bridge.ts?
 */

