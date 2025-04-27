import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { createInterface } from 'readline';

// Set up RPC provider (using devnet, change as needed)
const client = new SuiClient({ url: getFullnodeUrl('testnet'), timeoutMs: 60000 });

const PACKAGE_ID = '0xbb06a0fa00fda53b18b82fa36abdfabdbbf53dbc42d51ea80065f8de10a25a87'; // New package ID
const FEE_CONFIG_ID = '0x5273632246b772b26a1c48692c97a77d0dcafe0bcc87d601073c2961b7cf8338'; // New FeeConfig ID
const FEE_COLLECTOR_CONFIG_ID = '0xbdcf21edcbec352410280158a54be106f8c26e51f731d26b461b222187aff8ff'; // New FeeCollectorConfig ID

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

let keypair;

async function main() {
    console.log("Welcome to the Contract Interaction Script");
    console.log("------------------------------------------");

    while (true) {
        console.log("\nMain Menu:");
        console.log("1. Read Contract State");
        console.log("2. Write Contract State");
        console.log("3. Exit");

        const choice = await askQuestion("Enter your choice (1-3): ");

        switch (choice) {
            case '1':
                await readContractState();
                break;
            case '2':
                await writeContractState();
                break;
            case '3':
                rl.close();
                return;
            default:
                console.log("Invalid choice. Please try again.");
        }
    }
}

async function readContractState() {
    while (true) {
        console.log("\nRead Contract State:");
        console.log("1. Read Fee Manager state");
        console.log("2. Read Fee Collector state");
        console.log("3. Read fee for a specific chain ID");
        console.log("4. Return to Main Menu");

        const choice = await askQuestion("Enter your choice (1-4): ");

        switch (choice) {
            case '1':
                await readFeeManagerState();
                break;
            case '2':
                await readFeeCollectorState();
                break;
            case '3':
                await readSpecificFee();
                break;
            case '4':
                return;
            default:
                console.log("Invalid choice. Please try again.");
        }
    }
}

async function writeContractState() {
    if (!keypair) {
        const authChoice = await askQuestion("Choose authentication method:\n1. Private Key\n2. Mnemonic Phrase\nEnter your choice (1-2): ");
        
        if (authChoice === '1') {
            const privateKey = await askQuestion("Enter your private key: ");
            keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
        } else if (authChoice === '2') {
            const mnemonic = await askQuestion("Enter your mnemonic phrase: ");
            keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        } else {
            console.log("Invalid choice. Please try again.");
            return;
        }
        console.log("Derived address:", keypair.getPublicKey().toSuiAddress());
    }

    while (true) {
        console.log("\nWrite Contract State:");
        console.log("1. Set fee for a chain");
        console.log("2. Change Fee Manager admin");
        console.log("3. Change Fee Collector admin");
        console.log("4. Change Fee Recipient");
        console.log("5. Collect Fee");
        console.log("6. Change Fee Manager operator");
        console.log("7. Return to Main Menu");

        const choice = await askQuestion("Enter your choice (1-7): ");

        switch (choice) {
            case '1':
                await setFee();
                break;
            case '2':
                await changeFeeManagerAdmin();
                break;
            case '3':
                await changeFeeCollectorAdmin();
                break;
            case '4':
                await changeFeeRecipient();
                break;
            case '5':
                await collectFee();
                break;
            case '6':
                await changeFeeManagerOperator();
                break;
            case '7':
                return;
            default:
                console.log("Invalid choice. Please try again.");
        }
    }
}

// Read functions

async function readFeeManagerState() {
    try {
        const feeConfig = await client.getObject({
            id: FEE_CONFIG_ID,
            options: { showContent: true }
        });
        console.log("Fee Manager Admin:", feeConfig.data.content.fields.admin);
        console.log("Fee Manager Operator:", feeConfig.data.content.fields.operator);
    } catch (error) {
        console.error("Error reading Fee Manager state:", error);
    }
}

async function readFeeCollectorState() {
    try {
        const feeCollectorConfig = await client.getObject({
            id: FEE_COLLECTOR_CONFIG_ID,
            options: { showContent: true }
        });
        console.log("Fee Collector Admin:", feeCollectorConfig.data.content.fields.admin);
        console.log("Fee Recipient:", feeCollectorConfig.data.content.fields.fee_recipient);
    } catch (error) {
        console.error("Error reading Fee Collector state:", error);
    }
}

async function readSpecificFee() {
    const chainId = await askQuestion("Enter the chain ID: ");
    try {
        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${PACKAGE_ID}::fee_manager::get_fee`,
            arguments: [
                tx.object(FEE_CONFIG_ID),
                tx.pure(chainId)
            ],
        });

        const result = await client.devInspectTransactionBlock({
            transactionBlock: tx,
            sender: '0x0000000000000000000000000000000000000000000000000000000000000000'
        });

        if (result.effects.status.status === 'success') {
            const returnValue = result.results[0].returnValues[0];
            const fee = returnValue[0].reduce((acc, byte, index) => acc + BigInt(byte) * (BigInt(256) ** BigInt(index)), BigInt(0));
            console.log(`Fee for chain ID ${chainId}: ${fee}`);
        } else {
            console.log("Transaction simulation failed:", result.effects.status);
        }
    } catch (error) {
        console.error("Error reading specific fee:", error);
    }
}

// Write functions

async function setFee() {
    const chainId = await askQuestion("Enter the chain ID: ");
    const fee = await askQuestion("Enter the fee amount: ");

    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${PACKAGE_ID}::fee_manager::set_fee`,
        arguments: [
            tx.object(FEE_CONFIG_ID),
            tx.pure(chainId),
            tx.pure(fee),
        ],
    });

    await executeTransaction(tx, "Set fee");
}

async function changeFeeManagerAdmin() {
    const newAdmin = await askQuestion("Enter the new admin address: ");

    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${PACKAGE_ID}::fee_manager::change_admin`,
        arguments: [
            tx.object(FEE_CONFIG_ID),
            tx.pure(newAdmin),
        ],
    });

    await executeTransaction(tx, "Change Fee Manager admin");
}

async function changeFeeCollectorAdmin() {
    const newAdmin = await askQuestion("Enter the new admin address: ");

    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${PACKAGE_ID}::fee_collector::change_admin`,
        arguments: [
            tx.object(FEE_COLLECTOR_CONFIG_ID),
            tx.pure(newAdmin),
        ],
    });

    await executeTransaction(tx, "Change Fee Collector admin");
}

async function changeFeeRecipient() {
    const newRecipient = await askQuestion("Enter the new fee recipient address: ");

    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${PACKAGE_ID}::fee_collector::change_fee_recipient`,
        arguments: [
            tx.object(FEE_COLLECTOR_CONFIG_ID),
            tx.pure(newRecipient),
        ],
    });

    await executeTransaction(tx, "Change Fee Recipient");
}

async function collectFee() {
    const chainId = await askQuestion("Enter the chain ID: ");
    
    // First, get the required fee for the chain
    const requiredFee = await getRequiredFee(chainId);
    console.log(`Required fee for chain ${chainId}: ${requiredFee} MIST`);

    const paymentAmount = await askQuestion(`Enter the payment amount (in MIST, minimum ${requiredFee}): `);
    
    if (BigInt(paymentAmount) < BigInt(requiredFee)) {
        console.log("Error: Payment amount is less than the required fee.");
        return;
    }

    const tx = new TransactionBlock();
    
    // Create a coin for payment
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(paymentAmount)]);

    // Call the collect_fee function
    tx.moveCall({
        target: `${PACKAGE_ID}::fee_collector::collect_fee`,
        arguments: [
            tx.object(FEE_CONFIG_ID),
            tx.object(FEE_COLLECTOR_CONFIG_ID),
            tx.pure(chainId),
            coin,
        ],
    });

    // If there's any remaining balance, transfer it back to the sender
    tx.transferObjects([coin], tx.pure(keypair.getPublicKey().toSuiAddress()));

    await executeTransaction(tx, "Collect fee");
}

async function getRequiredFee(chainId) {
    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${PACKAGE_ID}::fee_manager::get_fee`,
        arguments: [
            tx.object(FEE_CONFIG_ID),
            tx.pure(chainId)
        ],
    });

    const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: keypair.getPublicKey().toSuiAddress()
    });

    if (result.effects.status.status === 'success') {
        const returnValue = result.results[0].returnValues[0];
        return returnValue[0].reduce((acc, byte, index) => acc + BigInt(byte) * (BigInt(256) ** BigInt(index)), BigInt(0)).toString();
    } else {
        throw new Error("Failed to get required fee");
    }
}

async function executeTransaction(tx, operationName) {
    try {
        const result = await client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx,
        });
        console.log(`${operationName} transaction successful. Transaction digest:`, result.digest);
    } catch (error) {
        console.error(`Error executing ${operationName} transaction:`, error);
        if (error.cause && error.cause.effects) {
            console.error("Transaction effects:", JSON.stringify(error.cause.effects, null, 2));
        }
    }
}

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Add this new function
async function changeFeeManagerOperator() {
    const newOperator = await askQuestion("Enter the new operator address: ");

    const tx = new TransactionBlock();
    tx.moveCall({
        target: `${PACKAGE_ID}::fee_manager::change_operator`,
        arguments: [
            tx.object(FEE_CONFIG_ID),
            tx.pure(newOperator),
        ],
    });

    await executeTransaction(tx, "Change Fee Manager operator");
}

main().catch(console.error);
