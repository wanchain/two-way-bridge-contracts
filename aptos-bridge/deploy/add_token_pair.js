const { HexString } = require('aptos');
const aptos = require('aptos');

const NODE_URL = "https://fullnode.devnet.aptoslabs.com/v1";
const FAUCET_URL = "https://faucet.devnet.aptoslabs.com";

(async () => {
  const client = new aptos.AptosClient(NODE_URL);
  const account = new aptos.AptosAccount(new HexString('0x1a5a769fc953d0228a41919efb175a73699e9b4dc55159624645c727328fa6c6').toUint8Array());
  console.log('address', account.address());
  const payload = {
    type: "entry_function_payload",
    function: "0x1::coin::transfer",
    type_arguments: ["0x1::aptos_coin::AptosCoin"],
    arguments: ['0x6c340f986adfa947bf84b87db56e986c8f2bae66c31cf3d1bc7183856fbdec86', 100],
  };

  const tx = await client.generateTransaction(account.address(), payload);
  // console.log('tx', tx);
  const signedTx = await client.signTransaction(account, tx);
  // console.log('signed', signedTx);
  const txs = await await client.submitTransaction(signedTx);
  console.log('txs', txs);


})().then(console.log).catch(console.log);