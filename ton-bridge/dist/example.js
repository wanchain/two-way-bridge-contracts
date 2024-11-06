const { getHttpEndpoint } = require( "@orbs-network/ton-access")
const { mnemonicToWalletKey } = require("ton-crypto")
const { TonClient,  Address } = require( "@ton/ton")
const Bridge = require('./Bridge.js')

const sc_addr_test = 'EQCZoPNr_BILxHK3YjtOppvxYN1OYwrFwdVz8X-HYqfHiTw2'
async function main() {
    let sc =  Bridge.Bridge.createFromAddress(Address.parse(sc_addr_test))
    console.log("sc:", sc)
    const endpoint = await getHttpEndpoint({ network: "testnet" });
    const client = new TonClient({ endpoint });
    const bridge = client.open(sc);
    let info = await bridge.getCounter();
    console.log("getCounter:", info)

    info = await bridge.getCrossConfig();
    console.log("getCrossConfig:", info)
}

main()