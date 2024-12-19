
const { getHttpEndpoint }  = require( "@orbs-network/ton-access");
const { mnemonicToWalletKey }  = require( "ton-crypto");
const { TonClient,  WalletContractV4, Address, internal,storeMessage,external }  = require( "@ton/ton");

const { Cell, toNano, TupleItemInt, fromNano, beginCell, Sender}  = require( '@ton/core');
const {monitorTransactionExternalIn} = require('./util.js')
const opcodes = require('../../wan-ton-sdk/dist/opcodes')
const {codeTable} = require("../../wan-ton-sdk/dist/code/encode-decode");

const scAddr = require('../../deployed.json');
const { BIP44_CHAINID } = require("../../wan-ton-sdk/dist/const/const-value.js");


const OwnerNew = "kQDWz-NUdUepoyMk_lTbjETCUdNSB-wfIjQFbigdVWhDg4DJ"


async function main() {
    // open wallet v4 (notice the correct wallet version here)
    let mnemonic = process.env.WALLET_MNEMONIC?  process.env.WALLET_MNEMONIC : ""

    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const endpoint = await getHttpEndpoint({ network: "testnet" });
    console.log("endpoint:", endpoint)
    const client = new TonClient({ endpoint, timeout:200*1000 });
    const walletContract = client.open(wallet);

    let bodyMessage = codeTable[opcodes.OP_TOKENPAIR_Upsert].enCode({
        tokenPairId:100,
        fromChainID:BIP44_CHAINID,
        fromAccount:"",
        toChainID:100,
        toAccount:"0xdabD997aE5E4799BE47d6E69D9431615CBa28f48",
    })    
    let transfer = await walletContract.createTransfer({
        secretKey: key.secretKey,
        seqno: await walletContract.getSeqno(),
        messages: [internal({
            to: scAddr.bridge,
            value: toNano("0.1"),
            body: bodyMessage
        })]
    });
    const externalMessage = external({
        to: walletContract.address,
        body: transfer,
        init: null
    });
    const inMessageCell = beginCell().store(storeMessage(externalMessage)).endCell();
    // external-in message hash
    const inMessageHash = inMessageCell.hash().toString('hex');
    console.log("inMessageHash:", inMessageHash)
    await walletContract.send(transfer)
    let allTransactions = []
    await monitorTransactionExternalIn(allTransactions, client, wallet.address.toString(), inMessageHash)        
    console.log("allTransactions:", allTransactions.map(item=>item.hash().toString('hex')))

}
main()

