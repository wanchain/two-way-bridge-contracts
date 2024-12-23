const { TonClient,  WalletContractV4, Address, internal,storeMessage,external }  = require( "@ton/ton");

const { mnemonicToPrivateKey } = require('ton-crypto');
const { getHttpEndpoint } = require('@orbs-network/ton-access');
const {  beginCell } = require('@ton/core') 



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function monitorTransactionbyHash(client, addr, txhash, txlt) {
    let allTransactions = []
    const myAddress = Address.parse(addr);
    let tx = await client.getTransaction(myAddress,txlt, txhash)
    for (const outMessage of tx.outMessages.values()) {
        const outMessageCell = beginCell().store(storeMessage(outMessage)).endCell();
        const outMessageHash = outMessageCell.hash().toString('hex');
        await findTransactionbyMsgHash(client,  outMessage.info.dest.toString({testOnly:true}), outMessageHash, allTransactions)
    }
    let success = true
    for(let i=0; i<allTransactions.length; i++) {
        success = success && allTransactions[i].description.aborted==false && allTransactions[i].description.computePhase.exitCode==0
            && allTransactions[i].description.computePhase.seccess && allTransactions[i].description.actionPhase.seccess
    }
    return {success,allTransactions}
}
async function monitorTransactionbyExternalIn(client, from,  msgHash){
    let allTransactions = []
    await waitTransactionbyExternalIn(client, from, msgHash, allTransactions);
    let success = true
    for(let i=0; i<allTransactions.length; i++) {
        success = success && allTransactions[i].description.aborted==false && allTransactions[i].description.computePhase.exitCode==0
            && allTransactions[i].description.computePhase.seccess && allTransactions[i].description.actionPhase.seccess
    }
    return {success,allTransactions}
}

// wait the new sub transactions to be confirmed
async function waitTransactionbyExternalIn(client, from,  msgHash, allTransactions) {
        const myAddress = Address.parse(from); // address that you want to fetch transactions from
        const maxRetry = 30;
        let retry=0;
        let to_lt = "0"
        while(retry++ < maxRetry) {
            console.log("call getTransactions, para:", myAddress.toString({testOnly:true}), to_lt);
            const transactions = await client.getTransactions(myAddress, {
                to_lt ,
                limit: 10,
            });
            console.log("transactions length:", transactions.length)
            for (let i=0; i<transactions.length; i++) {
                let tx = transactions[i]
                if(i == 0) {
                    to_lt = tx.lt.toString()
                }
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
                            await waitTransactionbyExternalIn(client, outMessage.info.dest.toString(), outMessageHash, allTransactions)
                        }
                    }
                    return
                }
            }
            await sleep(1000)
        }
}

// find old transactions.
async function findTransactionbyMsgHash(client, from,  msgHash, allTransactions) {
    const myAddress = Address.parse(from); // address that you want to fetch transactions from
    let maxRetry = 30;
    let txOpts = {
        limit: 10
    }
    while(maxRetry-- > 0){
        console.log("call findTransactionbyMsgHash, para:", from, txOpts);
        const transactions = await client.getTransactions(from, txOpts);
        console.log("transactions length:", transactions.length)
        for (let i=0; i<transactions.length; i++) {
            let tx = transactions[i]
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
                        await findTransactionbyMsgHash(client, outMessage.info.dest.toString(), outMessageHash, allTransactions)
                    }
                }
                return
            }
        }
        txOpts.hash = transactions[transactions.length - 1].hash().toString('base64')
        txOpts.lt =  transactions[transactions.length - 1].lt.toString()
    }
}
module.exports = {
    monitorTransactionbyExternalIn,monitorTransactionbyHash
}
