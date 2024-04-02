let {Provider, utils, types} = require('zksync-ethers')
let ethers = require('ethers')
const zkProvider = Provider.getDefaultProvider(types.Network.Sepolia);

let urlEth = "https://eth-sepolia.g.alchemy.com/v2/0D8dSiPtnPLI0gLSuCLu5f9oEC7tLenH"
const ethProvider = new ethers.providers.JsonRpcProvider(urlEth);

let urlPoly = "https://rpc.public.zkevm-test.net"
const polyProvider = new ethers.providers.JsonRpcProvider(urlPoly);

var scAddrZk = '0x9ca973044e65414D4E885D4c56De725C39Ef43D7' // by Jacob   // have TestEcRecover
scAddrZk = '0xbd45dc9f8Ef55d41230A3e40fAB4E54a9d88fd77'
scAddrZk='0x87947BF333068A3a9D815e9a67C864DE2A378982'

var scAddrEth = '0xdE1Ae3c465354f01189150f3836C7C15A1d6671D' //zkSepolia
scAddrEth = '0x2712Bc9F116eD06022f39950248CaD8fB22797B2' //zkSepolia, add assembly,add middle data , add getRByRecover
scAddrEth = '0x1B680c9693f9EEcECc2c15F7dD0D97F755D4E82D' //zkSepolia, add assembly,add middle data , add getRByRecover

var scAddrPoly = '0x1B765Da9D2b444a76983aCEb68d1850155aeE672'

const contractAbi = [{
    "inputs": [],
    "name": "Q",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [{"internalType": "bytes32", "name": "m", "type": "bytes32"}, {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
    }, {"internalType": "bytes32", "name": "r", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
    }],
    "name": "TestRecover",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "pure",
    "type": "function"
}, {
    "inputs": [{"internalType": "bytes32", "name": "m", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "_v",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "_r", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "_s",
        "type": "bytes32"
    }],
    "name": "_ecrecover",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [{"internalType": "uint8", "name": "parity", "type": "uint8"}, {
        "internalType": "bytes32",
        "name": "px",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "message", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "e",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "s", "type": "bytes32"}],
    "name": "_verify",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "pure",
    "type": "function"
}, {
    "inputs": [{"internalType": "uint8", "name": "parity", "type": "uint8"}, {
        "internalType": "bytes32",
        "name": "px",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "message", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "e",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "s", "type": "bytes32"}],
    "name": "_verify2",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [{"internalType": "bytes32", "name": "parity", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "px",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "message", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "e",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "s", "type": "bytes32"}],
    "name": "getM",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [{"internalType": "bytes32", "name": "parity", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "px",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "message", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "e",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "s", "type": "bytes32"}],
    "name": "getR",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [{"internalType": "uint8", "name": "parity", "type": "uint8"}, {
        "internalType": "bytes32",
        "name": "px",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "message", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "e",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "s", "type": "bytes32"}],
    "name": "getRByRecover",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [{"internalType": "bytes32", "name": "parity", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "px",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "message", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "e",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "s", "type": "bytes32"}],
    "name": "getS",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [{"internalType": "bytes32", "name": "parity", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "px",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "message", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "e",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "s", "type": "bytes32"}],
    "name": "getV",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [{"internalType": "bytes32", "name": "signature", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "px",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "e",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "parity", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "message",
        "type": "bytes32"
    }],
    "name": "verify",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "pure",
    "type": "function"
}, {
    "inputs": [{"internalType": "bytes32", "name": "signature", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "px",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "e",
        "type": "bytes32"
    }, {"internalType": "bytes32", "name": "parity", "type": "bytes32"}, {
        "internalType": "bytes32",
        "name": "message",
        "type": "bytes32"
    }],
    "name": "verify2",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
}]

const contractZk = new ethers.Contract(scAddrZk, contractAbi, zkProvider);
const contractEth = new ethers.Contract(scAddrEth, contractAbi, ethProvider)
const contractPoly = new ethers.Contract(scAddrPoly, contractAbi, polyProvider)


async function sleep(time) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, time);
    });
}


async function main() {
    while (true) {
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
        /*


            let ret = await contractZk.TestRecover(message, s.v, s.r, s.s);
        //let ret = await contractZk.TestRecover(message, 0x01, s.r, s.s);
            console.log("========ret", ret)
            */



            try{
                // error on zkSync
                let myS = "0x41a885d245e69a5af45bc51ff0dad6e3505e45deb7de1db50fc01c69cd8bdc2c"
                let myPx = "0xaceaa17ffb7bfafe15e2c026801400564854c9839a1665b65f18b228dd55ebcd"
                let myPy = "0x2dafc900306c08a0f1c79caec116744d2ed3a16e150e8b3d4e39c9458a62c823"
                let myE= "0xd3d5f9bfc2d77ba575cc1407dae0079ebc9999b9744b77ccef3c5dcadda23643"
                let myParity= "0x000000000000000000000000000000000000000000000000000000000000001c"
                let myMsg= "0xa5cd2c07cc4a833c5b55a114cfebe49e13c19039d70324cca5ad3e6e37e4b657"
                //shuld failure
                //
                let R1= await contractZk.getR(myParity,myPx,myMsg,myE,myS);
                let R2= await contractEth.getR(myParity,myPx,myMsg,myE,myS);

                let s1= await contractZk.getS(myParity,myPx,myMsg,myE,myS);
                let s2= await contractEth.getS(myParity,myPx,myMsg,myE,myS);

                let m1= await contractZk.getM(myParity,myPx,myMsg,myE,myS);
                let m2= await contractEth.getM(myParity,myPx,myMsg,myE,myS);

                let v1= await contractZk.getV(myParity,myPx,myMsg,myE,myS);
                let v2= await contractEth.getV(myParity,myPx,myMsg,myE,myS);

                let bigMyParity = ethers.BigNumber.from(myParity)
                let RByRecover1= await contractZk.getRByRecover(bigMyParity,myPx,myMsg,myE,myS);
                let RByRecover2= await contractEth.getRByRecover(bigMyParity,myPx,myMsg,myE,myS);

                console.log("m1,m2", m1,m2)
                console.log("R1,R2", R1,R2)
                console.log("v1,v2", v1,v2)
                console.log("s1,s2", s1,s2)
                console.log("RByRecover1,RByRecover2", RByRecover1,RByRecover2)

            }catch(e){
                console.log("middle data",e)
            }


        let myS = "0x41a885d245e69a5af45bc51ff0dad6e3505e45deb7de1db50fc01c69cd8bdc2c"
        let myPx = "0xaceaa17ffb7bfafe15e2c026801400564854c9839a1665b65f18b228dd55ebcd"
        let myPy = "0x2dafc900306c08a0f1c79caec116744d2ed3a16e150e8b3d4e39c9458a62c823"
        let myE = "0xd3d5f9bfc2d77ba575cc1407dae0079ebc9999b9744b77ccef3c5dcadda23643"
        let myParity = "0x000000000000000000000000000000000000000000000000000000000000001c"
        let myMsg = "0xa5cd2c07cc4a833c5b55a114cfebe49e13c19039d70324cca5ad3e6e37e4b657"
        try {
            // error on zkSync

            let retJacob = await contractZk.verify(myS, myPx, myPy, myE, myParity, myMsg);
            console.log("========(errorData,zkSync,verify)", retJacob)
        } catch (e) {
            console.log("========(errorData,zkSync,verify)", e)
        }

        try {

            let retJacob = await contractZk.verify2(myS, myPx, myPy, myE, myParity, myMsg);
            console.log("========(errorData,zkSync,verify2)", retJacob)

        } catch (e) {

            console.log("========(errorData,zkSync,verify2)", e)
        }

        try {

            let retJacob = await contractEth.verify(myS, myPx, myPy, myE, myParity, myMsg);
            console.log("========(errorData,sepolia,verify)", retJacob)
        } catch (e) {

            console.log("========(errorData,sepolia,verify)", e)
        }

        try {

            let retJacob = await contractEth.verify2(myS, myPx, myPy, myE, myParity, myMsg);
            console.log("========(errorData,sepolia,verify2)", retJacob)
        } catch (e) {
            console.log("========(errorData,sepolia,verify2)", e)
        }

        //
        try {

            let retJacob = await contractPoly.verify(myS, myPx, myPy, myE, myParity, myMsg);
            console.log("========(errorData,poly,verify)", retJacob)
        } catch (e) {

            console.log("========(errorData,poly,verify)", e)
        }

        try {

            let retJacob = await contractPoly.verify2(myS, myPx, myPy, myE, myParity, myMsg);
            console.log("========(errorData,poly,verify2)", retJacob)
        } catch (e) {
            console.log("========(errorData,poly,verify2)", e)
        }


// success on zkSync
        let yourS = "0xa6050a51fb7ca8827181c0d855fc6b335d9fcd6895f9f672402d50b652804132"
        let yourPx = "0xaceaa17ffb7bfafe15e2c026801400564854c9839a1665b65f18b228dd55ebcd"
        let yourPy = "0x2dafc900306c08a0f1c79caec116744d2ed3a16e150e8b3d4e39c9458a62c823"
        let yourE = "0x93d84747a53a6064f38a465a66c888f7457121e20cfb3eba6869b7fbcf91dcf0"
        let yourParity = "0x000000000000000000000000000000000000000000000000000000000000001c"
        let yourMsg = "0xb7ad2a05abd8ba23607acaf4cc139f468f16d584a79f9d797f7fcdc5d8848278"
// should sucess

        try {

            let yourRet = await contractZk.verify(yourS, yourPx, yourPy, yourE, yourParity, yourMsg);
            console.log("========(successData,zkSync,verify)", yourRet)
        } catch (e) {

            console.log("========(successData,zkSync,verify)", e)
        }

        try {

            yourRet = await contractZk.verify2(yourS, yourPx, yourPy, yourE, yourParity, yourMsg);
            console.log("========(successData,zkSync,verify2)", yourRet)
        } catch (e) {
            console.log("========(successData,zkSync,verify2)", e)
        }

        try {

            yourRet = await contractEth.verify(yourS, yourPx, yourPy, yourE, yourParity, yourMsg);
            console.log("========(successData,sepolia,verify)", yourRet)
        } catch (e) {

            console.log("========(successData,sepolia,verify)", e)
        }
        try {

            yourRet = await contractEth.verify2(yourS, yourPx, yourPy, yourE, yourParity, yourMsg);
            console.log("========(successData,sepolia,verify2)", yourRet)
        } catch (e) {

            console.log("========(successData,sepolia,verify2)", e)
        }

        //
        try {

            yourRet = await contractPoly.verify(yourS, yourPx, yourPy, yourE, yourParity, yourMsg);
            console.log("========(successData,poly,verify)", yourRet)
        } catch (e) {

            console.log("========(successData,poly,verify)", e)
        }
        try {

            yourRet = await contractPoly.verify2(yourS, yourPx, yourPy, yourE, yourParity, yourMsg);
            console.log("========(successData,poly,verify2)", yourRet)
        } catch (e) {

            console.log("========(successData,poly,verify2)", e)
        }

        			/*
                    let retEth =await contractEth.TestRecover(message, s.v, s.r, s.s)
                    console.log("========retEth", retEth)
                    */


        break
        await sleep(30000)

    }

}


async function SignHash() {

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
async function SignMessage() {

    let w = ethers.Wallet.createRandom()
    //let s1 = await w.signMessage(ethers.utils.arrayify("0x1234"))
    let s1 = await w.signMessage("0x1234")
    console.log("s1", s1)
    let addrByVerify = ethers.utils.verifyMessage("0x1234", s1)
    console.log("addr of wallet", w.address, "addr from verifyMessage", addrByVerify)
}

main()


/*
 * 
 hh --network zkSyncSepolia run ./deploy/deploy-ecrecover.js
 hh --network sepolia run ./deploy/deploy-ecrecover-sepolia.js
 hh --network polyZkTestnet run ./deploy/deploy-ecrecover-sepolia.js

 node testEcrecver.js

*/

