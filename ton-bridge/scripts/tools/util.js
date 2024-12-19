const { TonClient,  WalletContractV4, Address, internal,storeMessage,external }  = require( "@ton/ton");

const { mnemonicToPrivateKey } = require('ton-crypto');
const { getHttpEndpoint } = require('@orbs-network/ton-access');
const {  beginCell } = require('@ton/core') 



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function monitorTransactionbyHash(client, addr, txhash, txlt, allTransactions) {
    const myAddress = Address.parse(addr);
    let tx = await client.getTransaction(myAddress,txlt, txhash)
    for (const outMessage of tx.outMessages.values()) {
        const outMessageCell = beginCell().store(storeMessage(outMessage)).endCell();
        const outMessageHash = outMessageCell.hash().toString('hex');
        await monitorTransactionExternalIn(allTransactions, client, outMessage.info.dest.toString({testOnly:true}), outMessageHash)
    }

}
async function monitorTransactionExternalIn(allTransactions,client, from,  msgHash) {
        const myAddress = Address.parse(from); // address that you want to fetch transactions from
        const maxRetry = 30;
        let retry=0;
        let to_lt = "0"
        while(retry++ < maxRetry) {
            const transactions = await client.getTransactions(myAddress, {
                to_lt ,
                limit: 100,
            });
            console.log("transactions length:", transactions.length)
            for (let i=0; i<transactions.length; i++) {
                let tx = transactions[i]
                if(i == 0) {
                    to_lt = tx.lt.toString()
                    console.log("to_lt:", to_lt)
                }
                // console.log("tx:", tx)
                const transactionHash = tx.hash().toString('hex');
                console.log("tx hash is:",i, tx.lt, transactionHash)
                const inMessage = tx.inMessage;
                let inMessageHash
                // if (inMessage?.info.type === 'external-in') {
                const inMessageCell = beginCell().store(storeMessage(inMessage)).endCell();
                inMessageHash = inMessageCell.hash().toString('hex');
                //   console.log("inMessageHash", inMessageHash, msgHash);
                if(inMessageHash == msgHash) {
                    console.log("found:", tx.lt, tx.hash().toString('hex'))
                    allTransactions.push(tx)
                    if(tx.outMessagesCount!=0){
                        for (const outMessage of tx.outMessages.values()) {
                            console.log("outMessage:", outMessage)
                            const outMessageCell = beginCell().store(storeMessage(outMessage)).endCell();
                            const outMessageHash = outMessageCell.hash().toString('hex');
                            console.log("outMessageHash:", outMessageHash)
                            await monitorTransactionExternalIn(allTransactions, client, outMessage.info.dest.toString(), outMessageHash)
                        }
                    }
                    return allTransactions
                }
            }
            await sleep(1000)
        }
}

module.exports = {
    monitorTransactionExternalIn,monitorTransactionbyHash
}
