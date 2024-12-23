const { TonClient,  WalletContractV4, Address, internal,storeMessage }  = require( "@ton/ton");

const { mnemonicToPrivateKey } = require('ton-crypto');
const { getHttpEndpoint } = require('@orbs-network/ton-access');
const {  beginCell } = require('@ton/core') 
const {monitorTransactionbyHash} = require('./util.js')

async function main() {
    const endpoint = await getHttpEndpoint({ network: "testnet" });
    // const endpoint = 'https://testnet.toncenter.com/api/v2/jsonRPC'
    const client = new TonClient({ endpoint, timeout:60000 });
    const addr = '0QDWz-NUdUepoyMk_lTbjETCUdNSB-wfIjQFbigdVWhDg90M'

    let targetTransaction = {
        lt: '29211135000001',
        hash: 'ad4ad133e24685d6830b69a8c06422884217efac5e852917e944d290d1ca2871'
    }
    console.log("tx hash:", targetTransaction.lt, targetTransaction.hash)
    let {success,allTransactions} =  await monitorTransactionbyHash(client, addr,Buffer.from(targetTransaction.hash,'hex').toString('base64'), targetTransaction.lt)
    console.log("success, allTransactions:", true, allTransactions.map(item=>item.hash().toString('hex')))
}

main()
