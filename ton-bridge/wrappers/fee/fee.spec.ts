import {storageFeeCalculator} from "./fee";

describe('fee', () => {
    let client;
    beforeAll(async () => {
        //client = await getClient();
    }, 50000);

    it('compute bigData storage fee', async () => {
        let storageFee = storageFeeCalculator(2925115, 22491, 1753338948, 1753341635);
        console.log("storageFee", storageFee);
    }, 500000);

    it('compute bigData storage fee(year)', async () => {
        let storageFee = storageFeeCalculator(2925115, 22491, 0, 365 * 86400);
        console.log("storageFee", storageFee);
    }, 500000);

    it('compute jettonWallet fee', async () => {
        const cellCount = 18;
        const bitSize = 8402;
        let storageFee = storageFeeCalculator(bitSize, cellCount, 0, 365 * 86400);
        console.log("storageFee", storageFee);
    }, 500000);

    it('compute jettonWallet fee (usdt_jacob)', async () => {
        const cellCount = 18;
        const bitSize = 8274;
        let storageFee = storageFeeCalculator(bitSize, cellCount, 1752544455, 1753343936);
        console.log("storageFee", storageFee);
    }, 500000);

    it('compute bigData storage fee(two days)', async () => {
        const cellCount = 43009;
        const bitSize = 5593429;
        let storageFee = storageFeeCalculator(bitSize, cellCount, 0, 2 * 86400);
        console.log("storageFee", storageFee);
    }, 500000);
});