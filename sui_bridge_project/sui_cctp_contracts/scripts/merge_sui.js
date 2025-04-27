import 'dotenv/config';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const PRIVATE_KEY = process.env.PK;
const RPC_URL = process.env.RPC_URL || 'https://fullnode.mainnet.sui.io';
// const RPC_URL = process.env.RPC_URL || 'https://fullnode.testnet.sui.io';

if (!PRIVATE_KEY) {
  console.log("PK is not set. Please set the PK environment variable.");
  process.exit(1);
}

async function mergeSUI() {
  // Create SuiClient and keypair
  const client = new SuiClient({ url: RPC_URL });
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(PRIVATE_KEY.replace('0x', ''), 'hex'));
  const signer = keypair.getPublicKey().toSuiAddress();
  console.log("Signer address:", signer);

  // Get all SUI coins
  const ownedCoins = await client.getAllCoins({ owner: signer });
  const suiCoins = ownedCoins.data.filter(c => c.coinType === '0x2::sui::SUI');

  // Sort coins by balance
  suiCoins.sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance)));

  // Print coin info
  console.log(`Found ${suiCoins.length} total SUI coins in wallet:`);
  const totalBalance = suiCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
  suiCoins.forEach((coin, i) => {
    console.log(`Coin ${i + 1}: ${coin.coinObjectId}`);
    console.log(`  Balance: ${coin.balance} MIST (${Number(coin.balance) / 1e9} SUI)`);
  });
  console.log(`Total balance: ${totalBalance} MIST (${Number(totalBalance) / 1e9} SUI)`);

  // If we have less than 3 coins, nothing to do
  if (suiCoins.length < 3) {
    console.log("\nNo work needed - less than 3 coins");
    return;
  }

  // Use largest coin for gas, merge all other coins into second largest
  const [gasCoin, mergeCoin, ...otherCoins] = suiCoins;
  console.log(`\nUsing largest coin ${gasCoin.coinObjectId} (${gasCoin.balance} MIST) for gas`);
  console.log(`Merging ${otherCoins.length} smaller coins into ${mergeCoin.coinObjectId} (${mergeCoin.balance} MIST)`);

  // Create transaction
  const tx = new Transaction();
  tx.setGasBudget(20000000);

  // Merge all other coins into second largest
  for (const coin of otherCoins) {
    tx.moveCall({
      target: '0x2::coin::join',
      arguments: [
        tx.object(mergeCoin.coinObjectId),
        tx.object(coin.coinObjectId)
      ],
      typeArguments: ['0x2::sui::SUI']
    });
  }

  // Execute transaction
  tx.setSender(signer);
  tx.setGasPayment([{
    objectId: gasCoin.coinObjectId,
    digest: gasCoin.digest,
    version: gasCoin.version,
  }]);

  try {
    const { bytes, signature } = await tx.sign({ client, signer: keypair });
    const result = await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      requestType: 'WaitForLocalExecution',
      options: {
        showEffects: true,
      }
    });
    console.log("Transaction successful!");
    console.log("Transaction digest:", result.digest);
  } catch (error) {
    console.error("Error executing transaction:", error);
    throw error;
  }
}

mergeSUI().catch(console.error);