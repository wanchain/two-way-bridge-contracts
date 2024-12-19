const { mnemonicNew, mnemonicToPrivateKey, KeyPair } = require('ton-crypto');
const { WalletContractV4, TonClient } = require('@ton/ton');
const { getHttpEndpoint } = require('@orbs-network/ton-access');

async function generateWallet() {
    try {
        let mnemonic;
        if(process.env.MNEMONIC) {
            mnemonic = process.env.MNEMONIC.split(' ')
        }  else {
            mnemonic = await mnemonicNew();
            console.log('mnemonic:', mnemonic.join(' '));
            console.log("Please backup it")
        }

        const keyPair = await mnemonicToPrivateKey(mnemonic);

        const endpoint = await getHttpEndpoint();
        const client = new TonClient({ endpoint });

        const wallet = WalletContractV4.create({
            publicKey: keyPair.publicKey,
            workchain: 0
        });

        const address = wallet.address.toString({testOnly:true, bounceable:false});
        
        console.log('address:', address);
        // console.log('公钥:', Buffer.from(keyPair.publicKey).toString('hex'));
        // console.log('私钥:', Buffer.from(keyPair.secretKey).toString('hex'));

    } catch (error) {
        console.error('error:', error);
    }
}

generateWallet();
