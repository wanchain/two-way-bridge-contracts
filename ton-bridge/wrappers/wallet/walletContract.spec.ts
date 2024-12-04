import '@ton/test-utils';

const skSmg = new Buffer("097e961933fa62e3fef5cedef9a728a6a927a4b29f06a15c6e6c52c031a6cb2b", 'hex');

import {getSenderByPrvKey,getSender,openWallet,getWalletByPrvKey,getWalletByMnemonic} from "../wallet/walletContract";

import {KeyPair, mnemonicNew, mnemonicToWalletKey} from '@ton/crypto';
import {WalletContractV4} from "@ton/ton";

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
});
