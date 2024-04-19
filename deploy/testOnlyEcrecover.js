let {Provider, utils, types} = require('zksync-ethers')
let ethers = require('ethers')
const zkProvider = Provider.getDefaultProvider(types.Network.Sepolia);

let urlEth = "https://eth-sepolia.g.alchemy.com/v2/0D8dSiPtnPLI0gLSuCLu5f9oEC7tLenH"
const ethProvider = new ethers.providers.JsonRpcProvider(urlEth);

let urlPoly = "https://rpc.public.zkevm-test.net"
const polyProvider = new ethers.providers.JsonRpcProvider(urlPoly);

var scAddrZk = '0x9ca973044e65414D4E885D4c56De725C39Ef43D7' // by Jacob   // have TestEcRecover
scAddrZk='0xfC49223572c658B27642Cc64a845F95669Ab49db'

var scAddrEth = '0xdE1Ae3c465354f01189150f3836C7C15A1d6671D' //zkSepolia
scAddrEth = '0x2712Bc9F116eD06022f39950248CaD8fB22797B2' //zkSepolia, add assembly,add middle data , add getRByRecover
scAddrEth = '0x4d1025B68d73C56774B525dA24A934dfB98041D6' //zkSepolia, add assembly,add middle data , add getRByRecover

var scAddrPoly = '0x1B765Da9D2b444a76983aCEb68d1850155aeE672'
scAddrPoly = '0x44d9F33E880F42a1DBa296818C8b55b248B3dd47'

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

let Qstr='0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'
let HalfQstr='0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0'

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

        // not handle s and v
        let mym,myv,myr,mys
        mym = message
        myv = s.v
        myr = s.r
        mys = s.s
        console.log("\n\n\n")
        console.log("Not handle*************************************************************")
        console.log("m,v,r,s",mym,myv,myr,mys)
        moreThanHalfQ(mys)
        try {

            let retJacob = await contractEth.TestRecover(mym,myv,myr,mys);
            console.log("========(sepolia not handle v s,address TestRecover)", retJacob)

        } catch (e) {

            console.log("========(sepolia not handle v s,address from TestRecover)", e)
        }
	    try {

            let retJacob = await contractZk.TestRecover(mym,myv,myr,mys);
            console.log("========(zkSync not handle v s,address TestRecover)", retJacob)

        } catch (e) {

            console.log("========(zkSync not handle v s,address from TestRecover)", e)
        }

        console.log("Not handle*************************************************************")


        console.log("\n\n\n")
        console.log("Handled*************************************************************")
        // handled
        // change myv
        if(parseInt(s.v) == 27){
            myv = 28
        }
        if(parseInt(s.v) == 28){
            myv = 27
        }

        // change mys
        // myv = Q - s.v
        let bQ= ethers.BigNumber.from(Qstr)
        console.log("Q",bQ.toHexString())

        let bS = ethers.BigNumber.from(s.s)
        let bQMinusS = bQ.sub(bS)
        mys = bQMinusS.toHexString()
        console.log("Q-s",bQMinusS.toHexString())

        console.log("m,v,r,s",mym,myv,myr,mys)
        moreThanHalfQ(mys)
        try {

            let retJacob = await contractEth.TestRecover(mym,myv,myr,mys);
            console.log("========(sepolia handle v s,address from TestRecover)", retJacob)

        } catch (e) {
            console.log("========(sepolia handle v s,address from TestRecover)", e)
        }
       try {

            let retJacob = await contractZk.TestRecover(mym,myv,myr,mys);
            console.log("========(zkSync handle v s,address from TestRecover)", retJacob)

        } catch (e) {
            console.log("========(zkSync handle v s,address from TestRecover)", e)
        }

        console.log("Handled*************************************************************")

        break
        await sleep(3000)

    }

}

main()


function moreThanHalfQ(s){
    let bs= ethers.BigNumber.from(s)
    let bHalfQ = ethers.BigNumber.from(HalfQstr)
    if(bs.gt(bHalfQ)){
        console.log(">bHalfQ")
    }else{
        console.log("not >bHalfQ")
    }
}


/*
 * 
 hh --network zkSyncSepolia run ./deploy/deploy-ecrecover.js
 hh --network sepolia run ./deploy/deploy-ecrecover-sepolia.js
 hh --network polyZkTestnet run ./deploy/deploy-ecrecover-sepolia.js

 node testEcrecver.js

*/

/*
example of output:



jacob@jacob-virtual-machine:~/wanchain/two-way-bridge-contracts-opBnb/deploy$ node testOnlyEcrecover.js
s {
  r: '0xf1e1caf2d5468a7061d23b70f9a0f282aa12a3071f5acc777a8f48a4ef923d59',
  s: '0x379b1444e60e737f7af6a234482edb20a8e433c76180233a54b3063193644383',
  _vs: '0xb79b1444e60e737f7af6a234482edb20a8e433c76180233a54b3063193644383',
  recoveryParam: 1,
  v: 28,
  yParityAndS: '0xb79b1444e60e737f7af6a234482edb20a8e433c76180233a54b3063193644383',
  compact: '0xf1e1caf2d5468a7061d23b70f9a0f282aa12a3071f5acc777a8f48a4ef923d59b79b1444e60e737f7af6a234482edb20a8e433c76180233a54b3063193644383'
}
m 0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432

pkRecovered 0x049ef5c7eabc5bea98841eefac9aaef6f7c32535d493668ea3f212ed97b0c20a2a6c4803a843a03b68c80087e690a2013b06b643960cb39ac8eef0cb5afaaf6477
pkSigner 0x049ef5c7eabc5bea98841eefac9aaef6f7c32535d493668ea3f212ed97b0c20a2a6c4803a843a03b68c80087e690a2013b06b643960cb39ac8eef0cb5afaaf6477
addrRecover by function  0x5d4F391933840CbBAbCdb436C82794A3962AFb75
addr of sk               0x5d4F391933840CbBAbCdb436C82794A3962AFb75
addr of wallet           0x5d4F391933840CbBAbCdb436C82794A3962AFb75
success




Not handle*************************************************************
m,v,r,s 0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432 28 0xf1e1caf2d5468a7061d23b70f9a0f282aa12a3071f5acc777a8f48a4ef923d59 0x379b1444e60e737f7af6a234482edb20a8e433c76180233a54b3063193644383
not >bHalfQ
========(sepolia not handle v s,address TestRecover) 0x5d4F391933840CbBAbCdb436C82794A3962AFb75
========(zkSync not handle v s,address TestRecover) 0x5d4F391933840CbBAbCdb436C82794A3962AFb75
Not handle*************************************************************




Handled*************************************************************
Q 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
Q-s 0xc864ebbb19f18c8085095dcbb7d124de11caa91f4dc87d016b1f585b3cd1fdbe
m,v,r,s 0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432 27 0xf1e1caf2d5468a7061d23b70f9a0f282aa12a3071f5acc777a8f48a4ef923d59 0xc864ebbb19f18c8085095dcbb7d124de11caa91f4dc87d016b1f585b3cd1fdbe
>bHalfQ
========(sepolia handle v s,address from TestRecover) 0x5d4F391933840CbBAbCdb436C82794A3962AFb75
========(zkSync handle v s,address from TestRecover) 0x0000000000000000000000000000000000000000
Handled*************************************************************

 */

