import {mnemonicToWalletKey, keyPairFromSecretKey} from "ton-crypto";
import {TonClient, WalletContractV4} from "@ton/ton";
import {ContractProvider, OpenedContract, Sender} from "@ton/core";


export async function getWalletByMnemonic(mnemonic: String): Promise<WalletContractV4> {
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    return WalletContractV4.create({publicKey: key.publicKey, workchain: 0});
}

export async function getWalletByPrvKey(privateKey: Buffer): Promise<WalletContractV4> {
    const key =  keyPairFromSecretKey(privateKey);
    return WalletContractV4.create({publicKey: key.publicKey, workchain: 0});
}

export function openWallet(client:TonClient,wallet:WalletContractV4):OpenedContract<WalletContractV4>{
    return client.open(wallet);
}

export function getSender(provider: OpenedContract<WalletContractV4>,secretKey:Buffer):Sender{
    return provider.sender(secretKey);
}

export async function getSenderByPrvKey(client:TonClient,privateKey: Buffer):Promise<Sender>{
    let wallet = await getWalletByPrvKey(privateKey);
    return getSender(openWallet(client,wallet),privateKey);
}