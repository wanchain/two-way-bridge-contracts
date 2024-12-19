
const  {Bridge} = require("../../wrappers/Bridge.js") ;
const { getHttpEndpoint }  = require( "@orbs-network/ton-access");
const { mnemonicToWalletKey }  = require( "ton-crypto");
const { TonClient,  WalletContractV4, Address, internal,storeMessage,external }  = require( "@ton/ton");

const { Cell, toNano, TupleItemInt, fromNano, beginCell, Sender}  = require( '@ton/core');
const { GroupApprove }  = require( "../../wrappers/GroupApprove.js");
const {monitorTransactionExternalIn,monitorTransactionbyID} = require('./util.js')

const scAddr = require('./config.json')


const OwnerNew = "kQDWz-NUdUepoyMk_lTbjETCUdNSB-wfIjQFbigdVWhDg4DJ"


async function main() {
    // open wallet v4 (notice the correct wallet version here)
    let mnemonic = process.env.WALLET_MNEMONIC?  process.env.WALLET_MNEMONIC : ""

    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const endpoint = await getHttpEndpoint({ network: "testnet" });
    console.log("endpoint:", endpoint)
    const client = new TonClient({ endpoint, timeout:60000 });
    // open wallet and read the current seqno of the wallet
    const walletContract = client.open(wallet);
    const walletSender = walletContract.sender(key.secretKey);
    let seqno = await walletContract.getSeqno();

    const SC = await Bridge.createFromAddress(Address.parseFriendly(scAddr.bridge).address);
    const bridge = client.open(SC);
    console.log("contract address:", bridge.address.toString());
    let CrossConfig = await bridge.getCrossConfig();
    console.log("CrossConfig:",CrossConfig)
    

    // const SCGP = await GroupApprove.createFromAddress(Address.parseFriendly(scAddr.groupApprove).address);
    // const groupApprove = client.open(SCGP);
    // console.log("groupApprove contract address:", groupApprove.address.toString());
    // let GpConfig = await groupApprove.getConfig();
    // console.log("GpConfig:",GpConfig) 

    const OP_COMMON_TransferOwner           = 0x20000003;

    let bodyMessage =  beginCell()
        .storeUint(OP_COMMON_TransferOwner, 32) // op (op #1 = increment)
        .storeUint(0, 64) // query id
        .storeAddress(Address.parseFriendly(OwnerNew).address)                
        .endCell()
    let transfer = await walletContract.createTransfer({
        secretKey: key.secretKey,
        seqno: await walletContract.getSeqno(),
        messages: [internal({
            to: bridge.address,
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

