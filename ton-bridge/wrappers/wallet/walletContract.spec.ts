import {TON_FEE} from "../fee/fee";

const config:TonClientConfig =  {
    network:"testnet", // testnet|mainnet
    tonClientTimeout: 60 * 1000 * 1000,
}
import '@ton/test-utils';
import {sleep} from "../utils/utils";

const skSmg = new Buffer("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex');

import {
    getSenderByPrvKey,
    getSender,
    openWallet,
    getWalletByPrvKey,
    getWalletByMnemonic,
    getTonAddrBySecPrvKey, getSenderBySecPrvKey, getWalletBySecPrvKey, getWalletAddrByPublicKey
} from "./walletContract";

import {KeyPair, mnemonicNew, mnemonicToWalletKey} from '@ton/crypto';
import {CommonMessageInfoRelaxedInternal, WalletContractV4} from "@ton/ton";
import {getClient, TonClientConfig} from "../client/client";
import {Address, beginCell, ContractProvider, MessageRelaxed, SendMode, toNano} from "@ton/core";


describe('walletContract', () => {
    let mnemonics: string[][] = [[""],[""],[""],[""],[""]];
    let accounts: WalletContractV4[] = [];
    let  keys: KeyPair[] = [];

    beforeAll(async () => {
        // create 5 account for example test

        for(let i = 0 ;i<5;i++){
            let mnemonic = await mnemonicNew(2);
            mnemonics[i] = await mnemonicNew();
            console.log(`mnemonics[${i}]=>`,mnemonics[i]);
        }
    });

    beforeEach(async () => {

    });

    it('getWalletByMnemonic', async () => {
        for(let i = 0; i < 5;i++){
            let tempMnemonic = mnemonics[i].join(" ");
            accounts.push(await getWalletByMnemonic(tempMnemonic));
            console.log(`address[${i}]=>`,accounts[i].address);
        }
    });

    it('getWalletAddrByPk', async () => {
        console.log(await getWalletAddrByPublicKey(Buffer.from('497c3bc8bc7712f179d791e26a18544259909b11460fbf74027faf1a68ad515c','hex')));
    });

    it('address should equal (from mnemonic and from private key) success', async () => {
        for(let i = 0; i < 5;i++){
            let tempMnemonic = mnemonics[i];
            keys.push(await mnemonicToWalletKey(tempMnemonic));
            console.log(`pk[${i}]=>`,keys[i].publicKey.toString('hex'));
            console.log(`prvKey[${i}]=>`,keys[i].secretKey.toString('hex'));
            console.log(`mnemonics[${i}]=>`,tempMnemonic);

            let wallet = await getWalletByPrvKey(keys[i].secretKey);
            console.log(`address[${i}] from private key=>`,wallet.address);
            console.log(`address[${i}] from mnenomic =>`,accounts[i].address);

            expect((wallet.address.equals(accounts[i].address))).toBe(true);
        }
    });

    it('only for test print', async () => {
        for(let i = 0; i < 5;i++){
            console.log(`pk[${i}]=>`,keys[i].publicKey.toString('hex'));
            console.log(`prvKey[${i}]=>`,keys[i].secretKey.toString('hex'));
            console.log(`mnemonics[${i}]=>`,mnemonics[i]);
            console.log(`address[${i}] from private key=>`,accounts[i].address);
        }
    });

    it('get address by sec prv key', async () => {
        let rawAddr = "0:19dc7b6d850bd27b74b46017b8a23b014acd02f1fc324ad6f4a46159f024a8d1";
        let addr = "EQAZ3HtthQvSe3S0YBe4ojsBSs0C8fwyStb0pGFZ8CSo0QSE";
        let ret = await getTonAddrBySecPrvKey(skSmg);
        expect(ret.rawAddr).toBe(rawAddr);
        expect(ret.addr).toBe(addr);
    });

    it('active the wallet by sec prv key', async () => {
        let rawAddr = "0:19dc7b6d850bd27b74b46017b8a23b014acd02f1fc324ad6f4a46159f024a8d1";
        let addr = "EQAZ3HtthQvSe3S0YBe4ojsBSs0C8fwyStb0pGFZ8CSo0QSE";

        let client = await getClient(config);
        let wallet = await getWalletBySecPrvKey(skSmg)
        let walletOpened = await client.open(wallet);
        let seq = await walletOpened.getSeqno();
        let via = await getSenderBySecPrvKey(client,skSmg);

        let contractProvide = client.provider(Address.parse(addr));
        let ret = await contractProvide.internal(via,{
            value:TON_FEE.TRANS_FEE_NORMAL,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        })
        console.log("ret", ret);
        let newSeq = seq;
        while (newSeq == seq) {
            await sleep(2000);
            newSeq = await walletOpened.getSeqno();
        }
    },50000);
});
