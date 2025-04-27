import 'dotenv/config';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { assert } from 'console';
import { keccak256 } from 'viem';

// Input parameters
const PRIVATE_KEY = process.env.PK; // Private key, needs to be set separately
const RPC_URL = process.env.RPC_URL || 'https://fullnode.mainnet.sui.io:443'; // Using testnet RPC URL
const TOKEN_MESSENGER_MINTER_ID = '0x2aa6c5d56376c371f88a6cc42e852824994993cb9bab8d3e6450cbe3cb32b94e';
const USDC_ID = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7';
const MESSAGE_TRANSMITTER_STATE_ID = '0xf68268c3d9b1df3215f2439400c1c4ea08ac4ef4bb7d6f3ca6a2a239e17510af';
const TOKEN_MESSENGER_MINTER_STATE_ID = '0x45993eecc0382f37419864992c12faee2238f5cfe22b98ad3bf455baf65c8a2f';
const TREASURY_ID = '0x57d6725e7a8b49a7b2a612f6bd66ab5f39fc95332ca48be421c3229d514a6de7';
const DENY_LIST_ID = process.env.DENY_LIST_ID || '0x403';
const FEE_CONFIG_ID = '0xbb93514a7e8774a4f9aca575793f766e3a21d0a936785129be4f99c0263e1d0f';
const FEE_COLLECTOR_CONFIG_ID = '0xc259516354cac6854e0b40b135a6eec493a55c03f1d865e9c4c4e74f69d8c4cf';
const FEE_PACKAGE_ID = '0x16b03acd7aa1fd34e913282b69ebd778951db2a4a55b4015f1d7f0d5a7f40b2d';
// Additional parameters
const USDC_AMOUNT = 5; // Amount in smallest units (e.g., 1 USDC = 1000000)
const DESTINATION_DOMAIN = 6; // Replace with the correct destination domain
const DESTINATIOIN_CHAIN_ID = 1073741841; // base bip44 chainId
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
