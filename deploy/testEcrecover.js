let {Provider, utils, types} = require('zksync-ethers')
let ethers = require('ethers')
const zkProvider = Provider.getDefaultProvider(types.Network.Sepolia);

let urlEth = "https://eth-sepolia.g.alchemy.com/v2/0D8dSiPtnPLI0gLSuCLu5f9oEC7tLenH"
const ethProvider = new ethers.providers.JsonRpcProvider(urlEth);

let scAddr = '0x9ca973044e65414D4E885D4c56De725C39Ef43D7'

let scAddrEth = '0xdE1Ae3c465354f01189150f3836C7C15A1d6671D'

const contractAbi = [{"inputs":[],"name":"Q","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"m","type":"bytes32"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"TestRecover","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint8","name":"parity","type":"uint8"},{"internalType":"bytes32","name":"px","type":"bytes32"},{"internalType":"bytes32","name":"message","type":"bytes32"},{"internalType":"bytes32","name":"e","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"_verify","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes32","name":"signature","type":"bytes32"},{"internalType":"bytes32","name":"px","type":"bytes32"},{"internalType":"bytes32","name":"","type":"bytes32"},{"internalType":"bytes32","name":"e","type":"bytes32"},{"internalType":"bytes32","name":"parity","type":"bytes32"},{"internalType":"bytes32","name":"message","type":"bytes32"}],"name":"verify","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"}]
const contract = new ethers.Contract(scAddr, contractAbi, zkProvider);
const contractEth = new ethers.Contract(scAddrEth,contractAbi,ethProvider)

async function sleep(time) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			resolve();
		}, time);
	});
}


async function main() {
    while (true) {
        try {
            let message = ethers.utils.keccak256([0x12, 0x34])
            let w = ethers.Wallet.createRandom()
            let sk = new ethers.utils.SigningKey(w.privateKey)
            let s = sk.signDigest(message)
            console.log("s", s, "\nm", message)
            let pkRecovered = ethers.utils.recoverPublicKey(message, s)
            console.log("\npkRecovered", pkRecovered, "\npkSigner", sk.publicKey)
            let addrEcovered = ethers.utils.computeAddress(pkRecovered)
            let addr = ethers.utils.computeAddress(sk.publicKey)

            console.log("addrRecover by function\t", ethers.utils.computeAddress(pkRecovered))
            console.log("addr of sk\t\t", ethers.utils.computeAddress(sk.publicKey))
            console.log("addr of wallet\t\t", w.address)
            if (addr == addrEcovered) {
                console.log("success")
            } else {
                console.log("XXXXXXXXXXXXXXXfailxxxxxxxxxxxxxx")
            }



            let ret = await contract.TestRecover(message, s.v, s.r, s.s);
            //let ret = await contract.TestRecover(message, 0x01, s.r, s.s);
            console.log("========ret", ret)



            let retEth =await contractEth.TestRecover(message, s.v, s.r, s.s)
            console.log("========retEth", retEth)


        } catch (e) {
            console.log("error", e)
        }
		await sleep(30000)
    }

}


async function SignHash(){

    let message = ethers.utils.keccak256([0x12, 0x34])
    let sk = new ethers.utils.SigningKey('0x' + process.env.PK)
    let s = sk.signDigest(message)
    console.log("s", s, "\nm", message)
    let pkRecovered = ethers.utils.recoverPublicKey(message, s)
    console.log("\npkRecovered", pkRecovered, "\npkSigner", sk.publicKey)
    let addrEcovered = ethers.utils.computeAddress(pkRecovered)
    let addr = ethers.utils.computeAddress(sk.publicKey)

    console.log("\naddrRecover", ethers.utils.computeAddress(pkRecovered))
    console.log("\naddr", ethers.utils.computeAddress(sk.publicKey))
    if (addr == addrEcovered) {
        console.log("success")
    } else {
        console.log("XXXXXXXXXXXXXXXfailxxxxxxxxxxxxxx")
    }
}

//Sign message , not sign hash of message.
async function SignMessage(){

    let w = ethers.Wallet.createRandom()
    //let s1 = await w.signMessage(ethers.utils.arrayify("0x1234"))
    let s1 = await w.signMessage("0x1234")
    console.log("s1",s1)
    let addrByVerify = ethers.utils.verifyMessage("0x1234",s1)
    console.log("addr of wallet",w.address,"addr from verifyMessage",addrByVerify)
}
main()
