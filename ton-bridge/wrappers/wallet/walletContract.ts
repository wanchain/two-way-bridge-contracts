/*
PayAttention:
    This SDK only support v4 version wallet contract
    for interface support all version of wallet contract, you can refer tonWeb sdk.
*/

import {mnemonicToWalletKey, keyPairFromSecretKey} from "ton-crypto";
import {TonClient, WalletContractV4} from "@ton/ton";
import {Address, ContractProvider, OpenedContract, Sender} from "@ton/core";
import {keyPairFromSeed} from "ton-crypto/dist/primitives/nacl";

export async function getWalletByMnemonic(mnemonic: String): Promise<WalletContractV4> {
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    return WalletContractV4.create({publicKey: key.publicKey, workchain: 0});
}

export function openWallet(client:TonClient,wallet:WalletContractV4):OpenedContract<WalletContractV4>{
    return client.open(wallet);
}



export function getSender(provider: OpenedContract<WalletContractV4>,secretKey:Buffer):Sender{
    return provider.sender(secretKey);
}

// for ed25519 private key
export async function getWalletByPrvKey(privateKey: Buffer): Promise<WalletContractV4> {
    const key =  keyPairFromSecretKey(privateKey);
    return WalletContractV4.create({publicKey: key.publicKey, workchain: 0});
}


export async function getTonAddrByPrvKey(privateKey: Buffer){
    return {
     rawAddr: (await getWalletByPrvKey(privateKey)).address.toRawString(),
     Addr:(await getWalletByPrvKey(privateKey)).address.toString(),
    }
}

export async function getSenderByPrvKey(client:TonClient,privateKey: Buffer):Promise<Sender>{
    let wallet = await getWalletByPrvKey(privateKey);
    return getSender(openWallet(client,wallet),privateKey);
}

export async function openWalletByPrvKey(client:TonClient,privateKey: Buffer){
    return await openWallet(client,await getWalletByPrvKey(privateKey));
}

// for evm private key
export async function getWalletBySecPrvKey(privateKey: Buffer):Promise<WalletContractV4>{
    const key =  keyPairFromSeed(privateKey);
    return WalletContractV4.create({publicKey: key.publicKey, workchain: 0});
}

export async function getTonAddrBySecPrvKey(privateKey: Buffer){
    return {
        rawAddr: (await getWalletBySecPrvKey(privateKey)).address.toRawString(),
        addr:(await getWalletBySecPrvKey(privateKey)).address.toString(),
    }
}

export async function getSenderBySecPrvKey(client:TonClient,privateKey: Buffer):Promise<Sender>{
    let wallet = await getWalletBySecPrvKey(privateKey);
    const key =  keyPairFromSeed(privateKey);
    return getSender(openWallet(client,wallet),key.secretKey);
}

export async function openWalletBySecPrvKey(client:TonClient,privateKey: Buffer){
    return await openWallet(client,await getWalletBySecPrvKey(privateKey));
}

// others
export async function isAddrDepolyed(client:TonClient,addrStr:string){
    let addr = Address.parse(addrStr);
    return await client.isContractDeployed(addr);
}


