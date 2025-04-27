import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { decodeAbiParameters, parseAbiParameters } from 'viem';
// Set up RPC provider (using testnet, change as needed)
const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// Replace with your actual package ID
const PACKAGE_ID = '0x2933ce6c0e0769402a79c3e61db5c6f24427e9168af839e88ecf1a461a64494b';

const MESSAGE_TRANSMITTER_ID = '0x4741a96a5903c80613f2d013492a47741cf10c6246ea38a724d354a09895cf8f';


// In-memory state
let state = { lastProcessedTimestamp: 1728878032692 };

// Interface for state management
const stateManager = {
    async loadState() {
        return state;
    },
    async saveState(newState) {
        state = newState;
    }
};

// Function to fetch and process events
async function fetchEvents(lastProcessedTimestamp) {
    console.log(`[${new Date().toISOString()}] Querying for new events...`);
    try {
        const events = await client.queryEvents({
            query: { MoveModule: { package: PACKAGE_ID, module: 'fee_collector' } },
            order: 'descending',
            limit: 1,
        });

        let newLastProcessedTimestamp = lastProcessedTimestamp;

        // console.log(1, JSON.stringify(events, null, 2));

        const events2 = await client.queryEvents({
            query: {
                Transaction: events.data[0].id.txDigest
            },
            order: 'descending',
        });

        // console.log(2, JSON.stringify(events2, null, 2));

        for (const event of events2.data) {
            if (event.type === `${MESSAGE_TRANSMITTER_ID}::send_message::MessageSent`) {
                const message = event.parsedJson.message;
                const hexMessage = Buffer.from(message).toString('hex');
                console.log('Message as hex:', hexMessage);
                const decodedMessage = decodeMessage(hexMessage);
                if (decodedMessage) {
                    console.log('Decoded message:', decodedMessage);
                } else {
                    console.log('Failed to decode message');
                }
            }
        }

        for (const event of events.data) {
            if (event.type === `${PACKAGE_ID}::fee_collector::FeeCollectedEvent`) {
                const eventTimestamp = Number(event.timestampMs);
                if (eventTimestamp > lastProcessedTimestamp) {
                    console.log('New FeeCollectedEvent:', {
                        chainId: event.parsedJson.chain_id,
                        amount: event.parsedJson.amount,
                        recipient: event.parsedJson.recipient,
                        timestamp: new Date(eventTimestamp).toISOString(),
                    });
                    newLastProcessedTimestamp = Math.max(newLastProcessedTimestamp, eventTimestamp);
                }
            }
        }

        return newLastProcessedTimestamp;
    } catch (error) {
        console.error('Error fetching events:', error);
        return lastProcessedTimestamp;
    }
}

function decodeMessage(hexMessage) {
    try {
        let offset = 0;
        const readUint32 = () => {
            const value = parseInt(hexMessage.slice(offset, offset + 8), 16);
            offset += 8;
            return value;
        };
        const readUint64 = () => {
            const value = BigInt(`0x${hexMessage.slice(offset, offset + 16)}`);
            offset += 16;
            return value;
        };
        const readBytes32 = () => {
            const value = `0x${hexMessage.slice(offset, offset + 64)}`;
            offset += 64;
            return value;
        };

        const decodedData = {
            msgVersion: readUint32(),
            msgSourceDomain: readUint32(),
            msgDestinationDomain: readUint32(),
            msgNonce: readUint64(),
            msgSender: readBytes32(),
            msgRecipient: readBytes32(),
            msgDestinationCaller: readBytes32(),
            msgRawBody: `0x${hexMessage.slice(offset)}`
        };

        return decodedData;
    } catch (error) {
        console.error('Error decoding message:', error);
        console.log('Raw hex message:', hexMessage);
        return null;
    }
}

// Main polling function
async function pollEvents() {
    while (true) {
        const currentState = await stateManager.loadState();
        const newLastProcessedTimestamp = await fetchEvents(currentState.lastProcessedTimestamp);
        if (newLastProcessedTimestamp > currentState.lastProcessedTimestamp) {
            await stateManager.saveState({ lastProcessedTimestamp: newLastProcessedTimestamp });
        }
        
        // Wait for 10 seconds before the next poll
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

// Start polling
pollEvents().catch(console.error);

// Export the pollEvents function and stateManager for potential use in other modules
export { pollEvents, stateManager };
