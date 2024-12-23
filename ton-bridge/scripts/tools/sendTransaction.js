const { TonClient,  WalletContractV4, Address, internal,storeMessage,external }  = require( "@ton/ton");

const { mnemonicToPrivateKey } = require('ton-crypto');
const { getHttpEndpoint } = require('@orbs-network/ton-access');
const {  beginCell } = require('@ton/core') 
const {monitorTransactionbyExternalIn,monitorTransactionbyHash} = require('./util.js')

async function sendAndMonitorTransaction(mnemonic, toAddress, amount) {
    try {
        const endpoint = await getHttpEndpoint({ network: "testnet" });
        const client = new TonClient({ endpoint, timeout:60000 });

        const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
        const wallet = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
        console.log("wallet address:", wallet.address.toString({testOnly:true, bounceable:true}))

        const contract = client.open(wallet);

        let transfer = await contract.createTransfer({
            secretKey: keyPair.secretKey,
            seqno: await contract.getSeqno(),
            messages: [internal({
                to: toAddress,
                value: amount,
                body: 'Hello TON123'
            })]
        });
        const externalMessage = external({
            to: contract.address,
            body: transfer,
            init: null
        });
        const inMessageCell = beginCell().store(storeMessage(externalMessage)).endCell();
        // external-in message hash
        const inMessageHash = inMessageCell.hash().toString('hex');
        console.log("inMessageHash:", inMessageHash)
        await contract.send(transfer)
        let {success,allTransactions} = await monitorTransactionbyExternalIn(client, wallet.address.toString(), inMessageHash)
        console.log("success, allTransactions:", true, allTransactions.map(item=>item.hash().toString('hex')))
    } catch (error) {
        console.error('发送交易错误:', error);
        return false;
    }
}

let mnemonic = process.env.WALLET_MNEMONIC?  process.env.WALLET_MNEMONIC : ""
const toAddress = '0QB6vfpR5XNDj5uDl81wSkxzqtJzmSIB6tcnJ0fGVRGmWb8A'; //
const amount = BigInt(10000000); // 1 TON


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


sendAndMonitorTransaction(mnemonic, toAddress, amount)
