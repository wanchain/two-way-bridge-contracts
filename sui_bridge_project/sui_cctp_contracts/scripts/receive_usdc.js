import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Input parameters
const PRIVATE_KEY = process.env.PK; // Private key, needs to be set separately
const RPC_URL = process.env.RPC_URL || 'https://fullnode.testnet.sui.io'; // Using testnet RPC URL
const MESSAGE_TRANSMITTER_ID = '0x4931e06dce648b3931f890035bd196920770e913e43e45990b383f6486fdd0a5';
const TOKEN_MESSENGER_MINTER_ID = '0x31cc14d80c175ae39777c0238f20594c6d4869cfab199f40b69f3319956b8beb';
const USDC_ID = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29';
const MESSAGE_TRANSMITTER_STATE_ID = '0x98234bd0fa9ac12cc0a20a144a22e36d6a32f7e0a97baaeaf9c76cdc6d122d2e';
const TOKEN_MESSENGER_MINTER_STATE_ID = '0x5252abd1137094ed1db3e0d75bc36abcd287aee4bc310f8e047727ef5682e7c2';
const TREASURY_ID = '0x7170137d4a6431bf83351ac025baf462909bffe2877d87716374fb42b9629ebe';
const DENY_LIST_ID = process.env.DENY_LIST_ID || '0x403';

// Add CCTP Helper package ID
const CCTP_HELPER_ID = '0xbb06a0fa00fda53b18b82fa36abdfabdbbf53dbc42d51ea80065f8de10a25a87';

async function receiveUSDC(evmBurnTxMessage, attestation) {
  // Remove '0x' prefix and convert to Buffer
  const messageBuffer = Buffer.from(evmBurnTxMessage.replace('0x', ''), 'hex');
  const attestationBuffer = Buffer.from(attestation.replace('0x', ''), 'hex');

  console.log("evmBurnTxMessage (buffer):", messageBuffer);
  console.log("attestation (buffer):", attestationBuffer);

  // Create SuiClient and keypair
  const client = new SuiClient({ url: RPC_URL });
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(PRIVATE_KEY.replace('0x', ''), 'hex'));

  // Create Transaction
  const tx = new Transaction();

  // Add receive_message call
  const [receipt] = tx.moveCall({
    target: `${MESSAGE_TRANSMITTER_ID}::receive_message::receive_message`,
    arguments: [
      tx.pure.vector('u8', messageBuffer),
      tx.pure.vector('u8', attestationBuffer),
      tx.object(MESSAGE_TRANSMITTER_STATE_ID)
    ]
  });

  // Add handle_receive_message call
  const [stampReceiptTicketWithBurnMessage] = tx.moveCall({
    target: `${TOKEN_MESSENGER_MINTER_ID}::handle_receive_message::handle_receive_message`,
    arguments: [
      receipt,
      tx.object(TOKEN_MESSENGER_MINTER_STATE_ID),
      tx.object(DENY_LIST_ID),
      tx.object(TREASURY_ID)
    ],
    typeArguments: [`${USDC_ID}::usdc::USDC`]
  });

  // Add deconstruct_stamp_receipt_ticket_with_burn_message call
  const [stampReceiptTicket] = tx.moveCall({
    target: `${TOKEN_MESSENGER_MINTER_ID}::handle_receive_message::deconstruct_stamp_receipt_ticket_with_burn_message`,
    arguments: [
      stampReceiptTicketWithBurnMessage
    ]
  });

  // Add stamp_receipt call
  const [stampedReceipt] = tx.moveCall({
    target: `${MESSAGE_TRANSMITTER_ID}::receive_message::stamp_receipt`,
    arguments: [
      stampReceiptTicket,
      tx.object(MESSAGE_TRANSMITTER_STATE_ID)
    ],
    typeArguments: [`${TOKEN_MESSENGER_MINTER_ID}::message_transmitter_authenticator::MessageTransmitterAuthenticator`]
  });

  // Add complete_receive_message call
  tx.moveCall({
    target: `${MESSAGE_TRANSMITTER_ID}::receive_message::complete_receive_message`,
    arguments: [
      stampedReceipt,
      tx.object(MESSAGE_TRANSMITTER_STATE_ID)
    ]
  });

  // Add agent_mint call
  tx.moveCall({
    target: `${CCTP_HELPER_ID}::fee_collector::agent_mint`,
    arguments: [
      tx.pure.address(keypair.getPublicKey().toSuiAddress()),
      tx.pure.u64(0),
      tx.pure.vector('u8', [])
    ]
  });

  // Sign and execute transaction
  console.log("Broadcasting Sui receive_message tx...");
  try {
    // Set the sender explicitly
    const sender = keypair.getPublicKey().toSuiAddress();
    tx.setSender(sender);

    const { bytes, signature } = await tx.sign({ client, signer: keypair });
    const result = await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      requestType: 'WaitForLocalExecution',
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    console.log("Transaction result:", result);
    return result;
  } catch (error) {
    console.error("Error executing transaction:", error);
    throw error;
  }
}

// Usage example
async function main() {
  const evmBurnTxMessage = '0x000000000000000100000008000000000004af66000000000000000000000000eb08f243e5d3fcff26a9e38ae5520a669f4019d009c1efc7626f6d92fcdbf4cf2b0d82cc25620ac5406f082e7f8f0537dc640ef00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005425890298aed601595a70ab815c96711a31bc65702e89e1070f9a9350b3e6f98d15a59edefcf33ab71581e38c96270e423693cd00000000000000000000000000000000000000000000000000000000000027100000000000000000000000008d2d7e337bb8d416d7b7dc10450c0a426a256617';
  const attestation = "0xac19fddd7d9854ca507b20bef8e27f0d45c3a63f3269eb0c6f1f9dfcb5b1e504252dca733c25c22953724367d558565a82d2ae38e4abc36d76155a08fe8e76461b89bfe50122e80473981113f0a03829f7a6fd09ae713b52648d3f36e9df402fdc39d135796a9c2b36139c11d78ea884d5f43b365c575898d1f2fb3d3c8d4750051c";

  try {
    const result = await receiveUSDC(evmBurnTxMessage, attestation);
    console.log("USDC received successfully on Sui chain");
  } catch (error) {
    console.error("Error receiving USDC:", error);
  }
}

main();
