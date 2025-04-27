import 'dotenv/config';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { assert } from 'console';
import { keccak256 } from 'viem';

// Input parameters
const PRIVATE_KEY = process.env.PK; // Private key, needs to be set separately
const RPC_URL = process.env.RPC_URL || 'https://fullnode.testnet.sui.io'; // Using testnet RPC URL
const TOKEN_MESSENGER_MINTER_ID = '0x31cc14d80c175ae39777c0238f20594c6d4869cfab199f40b69f3319956b8beb';
const USDC_ID = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29';
const MESSAGE_TRANSMITTER_STATE_ID = '0x98234bd0fa9ac12cc0a20a144a22e36d6a32f7e0a97baaeaf9c76cdc6d122d2e';
const TOKEN_MESSENGER_MINTER_STATE_ID = '0x5252abd1137094ed1db3e0d75bc36abcd287aee4bc310f8e047727ef5682e7c2';
const TREASURY_ID = '0x7170137d4a6431bf83351ac025baf462909bffe2877d87716374fb42b9629ebe';
const DENY_LIST_ID = process.env.DENY_LIST_ID || '0x403';
const FEE_CONFIG_ID = '0x5273632246b772b26a1c48692c97a77d0dcafe0bcc87d601073c2961b7cf8338';
const FEE_COLLECTOR_CONFIG_ID = '0xbdcf21edcbec352410280158a54be106f8c26e51f731d26b461b222187aff8ff';
const FEE_PACKAGE_ID = '0xbb06a0fa00fda53b18b82fa36abdfabdbbf53dbc42d51ea80065f8de10a25a87';
// Additional parameters
const USDC_AMOUNT = 10; // Amount in smallest units (e.g., 1 USDC = 1000000)
const DESTINATION_DOMAIN = 1; // Replace with the correct destination domain
const DESTINATIOIN_CHAIN_ID = 2147492648; // avax bip44 chainId
const EVM_USER_ADDRESS = '0x4Cf0A877E906DEaD748A41aE7DA8c220E4247D9e'; // Replace with the recipient's EVM address

if (!PRIVATE_KEY) {
  console.log("PK is not set. Please set the PK environment variable.");
  process.exit(1);
}

async function sendUSDC() {
  // Create SuiClient and keypair
  const client = new SuiClient({ url: RPC_URL });
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(PRIVATE_KEY.replace('0x', ''), 'hex'));
  const signer = keypair.getPublicKey().toSuiAddress();
  console.log("signer", signer);
  // Create Transaction
  const tx = new Transaction();

  // Get owned coins
  const ownedCoins = await client.getAllCoins({ owner: signer });
  const usdcStruct = ownedCoins.data.find(c => c.coinType.includes(USDC_ID));

  if (!usdcStruct || Number(usdcStruct.balance) < USDC_AMOUNT) {
    throw new Error("Insufficient tokens in wallet to initiate transfer.");
  }

  // Get required fee
  const requiredFee = await getRequiredFee(client, DESTINATIOIN_CHAIN_ID, FEE_CONFIG_ID);
  console.log(`Required fee for chain ${DESTINATIOIN_CHAIN_ID}: ${requiredFee} MIST`);

  // Get owned SUI coins
  const suiCoins = await client.getAllCoins({
    owner: signer,
    coinType: '0x2::sui::SUI'
  });

  // Find a SUI coin with sufficient balance for both fee and gas
  const totalRequired = requiredFee + BigInt(10000000); // fee + estimated gas
  const suiCoin = suiCoins.data.find(c => BigInt(c.balance) >= totalRequired);

  if (!suiCoin) {
    throw new Error(`Insufficient SUI for fees and gas. Required: ${totalRequired} MIST`);
  }

  // Split coins for fee
  const [feeCoin] = tx.splitCoins(
    tx.gas,
    [requiredFee]
  );

  // Split USDC to send in depositForBurn call
  const [usdcCoin] = tx.splitCoins(
    usdcStruct.coinObjectId,
    [USDC_AMOUNT]
  );

  console.log("USDC_ID", USDC_ID, usdcStruct.coinObjectId);

  // Call collect_fee function
  tx.moveCall({
    target: `${FEE_PACKAGE_ID}::fee_collector::collect_fee`,
    arguments: [
      tx.object(FEE_CONFIG_ID),
      tx.object(FEE_COLLECTOR_CONFIG_ID),
      tx.pure.u64(DESTINATIOIN_CHAIN_ID),
      feeCoin,
    ],
  });

  tx.transferObjects([feeCoin], tx.pure.address(keypair.getPublicKey().toSuiAddress()));

  // Create the deposit_for_burn move call
  tx.moveCall({
    target: `${TOKEN_MESSENGER_MINTER_ID}::deposit_for_burn::deposit_for_burn`,
    arguments: [
      usdcCoin, // Coin<USDC>
      tx.pure.u32(DESTINATION_DOMAIN),
      tx.pure.address(EVM_USER_ADDRESS),
      tx.object(TOKEN_MESSENGER_MINTER_STATE_ID),
      tx.object(MESSAGE_TRANSMITTER_STATE_ID),
      tx.object(DENY_LIST_ID),
      tx.object(TREASURY_ID)
    ],
    typeArguments: [`${USDC_ID}::usdc::USDC`],
  });

  // Broadcast the transaction
  console.log("Broadcasting sui deposit_for_burn tx...");
  try {
    // Set the sender explicitly
    tx.setSender(signer);

    const { bytes, signature } = await tx.sign({ client, signer: keypair });
    const output = await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      requestType: 'WaitForLocalExecution',
      options: {
        showEffects: true,
        showEvents: true,
        showInput: true,
      },
      gasBudget: 50000000,
    });

    assert(!output.effects.status.error);
    console.log(`deposit_for_burn transaction successful: ${output.digest} \n`);

    // Get USDC balance changes (optional)
    const balances = await client.getAllBalances({ owner: signer });
    const usdcBalance = balances.find(b => b.coinType.includes(USDC_ID))?.totalBalance;
    console.log(`New USDC balance: ${usdcBalance}`);

    // Get the message emitted from the tx
    const messageEvent = output.events?.find((event) => event.type.includes("send_message::MessageSent"));
    if (messageEvent && messageEvent.parsedJson) {
      const messageRaw = messageEvent.parsedJson.message;
      const messageBuffer = Buffer.from(messageRaw);
      const messageHex = `0x${messageBuffer.toString("hex")}`;
      const messageHash = keccak256(messageHex);
      console.log(`Message hash: ${messageHash}`);
      console.log(`Message: ${messageHex}`);
    } else {
      console.log("Message event not found in transaction output");
    }

    return output;
  } catch (error) {
    console.error("Error executing transaction:", error);
    if (error.cause?.effects) {
        console.error("Transaction effects:", JSON.stringify(error.cause.effects, null, 2));
    }
    if (error.cause?.events) {
        console.error("Transaction events:", JSON.stringify(error.cause.events, null, 2));
    }
    throw error;
  }
}

async function getRequiredFee(client, chainId, feeConfigId) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${FEE_PACKAGE_ID}::fee_manager::get_fee`,
    arguments: [
      tx.object(feeConfigId),
      tx.pure.u64(chainId)
    ],
  });

  const result = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: '0x0000000000000000000000000000000000000000000000000000000000000000'
  });

  if (result.effects.status.status === 'success') {
    const returnValue = result.results[0].returnValues[0];
    return returnValue[0].reduce((acc, byte, index) => acc + BigInt(byte) * (BigInt(256) ** BigInt(index)), BigInt(0));
  } else {
    throw new Error("Failed to get required fee");
  }
}

// Usage example
async function main() {
  try {
    const result = await sendUSDC();
    console.log("USDC sent successfully from Sui chain");
  } catch (error) {
    console.error("Error sending USDC:", error);
  }
}

main();


/**
 * @notice Returns formatted (packed) message with provided fields
 * @param _msgVersion the version of the message format
 * @param _msgSourceDomain Domain of home chain
 * @param _msgDestinationDomain Domain of destination chain
 * @param _msgNonce Destination-specific nonce
 * @param _msgSender Address of sender on source chain as bytes32
 * @param _msgRecipient Address of recipient on destination chain as bytes32
 * @param _msgDestinationCaller Address of caller on destination chain as bytes32
 * @param _msgRawBody Raw bytes of message body
 * @return Formatted message
 **/
/*
function _formatMessage(
  uint32 _msgVersion,
  uint32 _msgSourceDomain,
  uint32 _msgDestinationDomain,
  uint64 _msgNonce,
  bytes32 _msgSender,
  bytes32 _msgRecipient,
  bytes32 _msgDestinationCaller,
  bytes memory _msgRawBody
) internal pure returns (bytes memory) {
    return
        abi.encodePacked(
            _msgVersion,
            _msgSourceDomain,
            _msgDestinationDomain,
            _msgNonce,
            _msgSender,
            _msgRecipient,
            _msgDestinationCaller,
            _msgRawBody
        );
}
*/
