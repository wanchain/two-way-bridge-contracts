/*
PayAttention:
    This SDK only support v4 version wallet contract
    for interface support all version of wallet contract, you can refer tonWeb sdk.
*/

import {
    KeyPair,
    keyPairFromSecretKey,
    keyPairFromSeed,
    mnemonicNew,
    mnemonicToPrivateKey,
    mnemonicToWalletKey
} from "@ton/crypto";
import {WalletContractV4} from "@ton/ton";
import {Address, OpenedContract, Sender} from "@ton/core";
import {Blockchain} from "@ton/sandbox";
import {IsWanTonClient, WanTonClient} from "../client/client-interface";

export async function getWalletByMnemonic(mnemonic: String): Promise<WalletContractV4> {
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    return WalletContractV4.create({publicKey: key.publicKey, workchain: 0});
}

export function openWallet(client: WanTonClient, wallet: WalletContractV4): OpenedContract<WalletContractV4> {
    return client.open(wallet);
}

export function getSender(provider: OpenedContract<WalletContractV4>, secretKey: Buffer): Sender {
    return provider.sender(secretKey);
}

// for ed25519 private key

export async function newWallet() {
    const mnemonics: string[] = await mnemonicNew(24); // Generate new menemonics
    const keypair1: KeyPair = await mnemonicToPrivateKey(mnemonics); // Generates KeyPair from mnemonics
    return {
        private: keypair1.secretKey.toString('hex'),
        publicKey: keypair1.publicKey.toString('hex'),
        wallet: WalletContractV4.create({publicKey: keypair1.publicKey, workchain: 0}),
        walletAddrTest: WalletContractV4.create({
            publicKey: keypair1.publicKey,
            workchain: 0
        }).address.toString({testOnly: true}),
        walletAddrMain: WalletContractV4.create({publicKey: keypair1.publicKey, workchain: 0}).address.toString()
    }
}

export async function getWalletStatus(client: WanTonClient, walletAddr: string) {
    let provider = await client.provider(Address.parse(walletAddr));
    let s = await provider.getState();
    //return s.state;
    return s;
}

export async function getWalletByPrvKey(privateKey: Buffer): Promise<WalletContractV4> {
    const key = keyPairFromSecretKey(privateKey);
    return WalletContractV4.create({publicKey: key.publicKey, workchain: 0});
}


export async function getTonAddrByPrvKey(privateKey: Buffer) {
    return {
        rawAddr: (await getWalletByPrvKey(privateKey)).address.toRawString(),
        Addr: (await getWalletByPrvKey(privateKey)).address.toString(),
    }
}

export async function getSenderByPrvKey(client: WanTonClient, privateKey: Buffer): Promise<Sender> {
    let wallet = await getWalletByPrvKey(privateKey);
    return getSender(openWallet(client, wallet), privateKey);
}

// example addr:        EQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPrHF
// example rawAddr:     0:ca6e321c7cce9ecedf0a8ca2492ec8592494aa5fb5ce0387dff96ef6af982a3e
export async function getWalletAddrByPrvKey(privateKey: Buffer) {
    return {
        addr: (await getWalletByPrvKey(privateKey)).address.toString(),
        rawAddr: (await getWalletByPrvKey(privateKey)).address.toRawString()
    }
}

export async function openWalletByPrvKey(client: WanTonClient, privateKey: Buffer) {
    return await openWallet(client, await getWalletByPrvKey(privateKey));
}

// for evm private key
export async function getWalletBySecPrvKey(privateKey: Buffer): Promise<WalletContractV4> {
    const key = keyPairFromSeed(privateKey);
    return WalletContractV4.create({publicKey: key.publicKey, workchain: 0});
}

export async function getTonAddrBySecPrvKey(privateKey: Buffer) {
    return {
        rawAddr: (await getWalletBySecPrvKey(privateKey)).address.toRawString(),
        addr: (await getWalletBySecPrvKey(privateKey)).address.toString(),
    }
}

export async function getSenderBySecPrvKey(client: WanTonClient, privateKey: Buffer): Promise<Sender> {
    let wallet = await getWalletBySecPrvKey(privateKey);
    const key = keyPairFromSeed(privateKey);
    return getSender(openWallet(client, wallet), key.secretKey);
}

export async function openWalletBySecPrvKey(client: WanTonClient, privateKey: Buffer) {
    return await openWallet(client, await getWalletBySecPrvKey(privateKey));
}

export async function getWalletAddrBySecPrvKey(privateKey: Buffer) {
    return {
        addr: (await getWalletBySecPrvKey(privateKey)).address.toString(),
        rawAddr: (await getWalletBySecPrvKey(privateKey)).address.toRawString()
    }
}

// others
export async function isAddrDepolyed(client: WanTonClient | Blockchain, addrStr: string) {
    if (IsWanTonClient(client)) {
        let addr = Address.parse(addrStr);
        return await client.isContractDeployed(addr);
    } else {
        let addr = Address.parse(addrStr);
        return (await client.getContract(addr)).accountState?.type === 'active'
    }
}

/*
    there is no function getWalletAddrBySecPublicKey,because tonAddr should use public of ED25519.
 */
export async function getWalletAddrByPublicKey(publicKey: Buffer) {
    let ret = WalletContractV4.create({publicKey: publicKey, workchain: 0});
    return ret.address.toString();
}


