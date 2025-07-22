
const { getHttpEndpoint }  = require( "@orbs-network/ton-access");
const { mnemonicToWalletKey }  = require( "ton-crypto");
const { TonClient,  WalletContractV4, Address, internal,storeMessage,external }  = require( "@ton/ton");

const { Cell, toNano, TupleItemInt, fromNano, beginCell, Sender}  = require( '@ton/core');

const axios = require('axios');

const toAddress = "EQATyE021PCX0VrObm6-sTrEgjbfWvaxrgChINlhDl0QWDd7"   // test, 5000 cell

const fakeThrow = "EQC8A1FkKCiSm4VDJh83MabRub9ES5j3J8u0zugaqf4gspwk"

async function main() {
    let mnemonic = process.env.WALLET_MNEMONIC?  process.env.WALLET_MNEMONIC : ""
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    // const endpoint = await getHttpEndpoint({ network: "testnet"});
    const endpoint = 'https://testnet.toncenter.com/api/v2/jsonRPC'
    const API_KEY = 'b70dc1b6d3c1b95acfe5c04c6f0489a7c4f407fd2218cd4a763df295711f2e2e'
    const client = new TonClient({ endpoint, timeout:60000,
        apiKey: API_KEY });
    const walletContract = client.open(wallet);
    const walletSender = walletContract.sender(key.secretKey);

    // let id0 = await client.runMethod(toAddress, "get_first_id", [])
    // let id = id0.stack.readBuffer()
    // console.log("id:", id.toString('hex'))
    // while(id.toString('hex') != '0000000000000000000000000000000000000000000000000000000000000000') {
    //   id0 = await client.runMethod(toAddress, "get_next_id", [{type: 'int', value: parseInt('0x'+id.toString('hex'))}])
    //   id = id0.stack.readBuffer()
    //   console.log("id0:", id.toString('hex'))
    // }
    // return
    // return

    const bodyMessage =  beginCell()
      .storeUint(0x12345678, 32)
      .storeUint(Date.now(),64)
      .storeUint(1,64)
      .endCell()

    let signedMessage = await walletContract.createTransfer({
        secretKey: key.secretKey,
        seqno: await walletContract.getSeqno(),
        sendMode:3,
        messages: [internal({
            to: toAddress,
            value: toNano("0.05"),
            body: bodyMessage
        })]
    });
    const externalMessage = external({
      to: walletContract.address,
      body: signedMessage,
      init: null,
      //init: walletState.state === 'uninitialized' ? { code: wallet.init.code, data: wallet.init.data } : null,
    });

    // 10. 序列化 BOC
    const bocCell = beginCell().store(storeMessage(externalMessage)).endCell();
    const boc = bocCell.toBoc().toString('base64');
    console.log('External Message BOC:', boc);

    // 11. 发送交易

    const AXIOS_TIMEOUT = 10000;
    const response = await axios.post(
      endpoint,
      {
        id: '1',
        jsonrpc: '2.0',
        method: 'sendBocReturnHash',
        params: { boc }
      },
      {
        timeout: AXIOS_TIMEOUT,
        headers: API_KEY ? { 'X-API-Key': API_KEY } : {}
      }
    );
    console.log("response:",response.data)
}
main()

