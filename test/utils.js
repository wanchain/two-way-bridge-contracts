const Web3 = require('web3');
const assert = require('assert');
const MappingToken = artifacts.require("MappingToken");
const ethutil = require("ethereumjs-util");

// const JacksPotDelegate = artifacts.require('./JacksPotDelegate.sol');
// const JacksPotProxy = artifacts.require('./JacksPotProxy.sol');
// const TestHelper = artifacts.require('./test/TestHelper.sol');
const TestBasicStorage = artifacts.require('./test/TestBasicStorage.sol');
const QuotaDelegate = artifacts.require('./quota/QuotaDelegate.sol');
const QuotaProxy = artifacts.require('./quota/QuotaProxy.sol');
const TestQuotaHelper = artifacts.require('./test/TestQuotaHelper.sol');
const Bn128SchnorrVerifier = artifacts.require('./schnorr/Bn128SchnorrVerifier.sol');
const Secp256k1SchnorrVerifier = artifacts.require('./schnorr/Secp256k1SchnorrVerifier.sol');
const SignatureVerifier = artifacts.require('./schnorr/SignatureVerifier.sol');

const BigNumber = require('bignumber.js');

BigNumber.config({ EXPONENTIAL_AT: 1000 });

function stringToBytes(str) {  
    var bytes = new Array();  
    var len, c;  
    len = str.length;  
    for(var i = 0; i < len; i++) {  
        c = str.charCodeAt(i);  
        if(c >= 0x010000 && c <= 0x10FFFF) {  
            bytes.push(((c >> 18) & 0x07) | 0xF0);  
            bytes.push(((c >> 12) & 0x3F) | 0x80);  
            bytes.push(((c >> 6) & 0x3F) | 0x80);  
            bytes.push((c & 0x3F) | 0x80);  
        } else if(c >= 0x000800 && c <= 0x00FFFF) {  
            bytes.push(((c >> 12) & 0x0F) | 0xE0);  
            bytes.push(((c >> 6) & 0x3F) | 0x80);  
            bytes.push((c & 0x3F) | 0x80);  
        } else if(c >= 0x000080 && c <= 0x0007FF) {  
            bytes.push(((c >> 6) & 0x1F) | 0xC0);  
            bytes.push((c & 0x3F) | 0x80);  
        } else {  
            bytes.push(c & 0xFF);  
        }  
    }  
    return bytes;  
} 

function bytesToString(arr) {  
    if(typeof arr === 'string') {  
        return arr;  
    }  
    var str = '',  
        _arr = arr;  
    for(var i = 0; i < _arr.length; i++) {  
        var one = _arr[i].toString(2),  
            v = one.match(/^1+?(?=0)/);  
        if(v && one.length == 8) {  
            var bytesLength = v[0].length;  
            var store = _arr[i].toString(2).slice(7 - bytesLength);  
            for(var st = 1; st < bytesLength; st++) {  
                store += _arr[st + i].toString(2).slice(2);  
            }  
            str += String.fromCharCode(parseInt(store, 2));  
            i += bytesLength - 1;  
        } else {  
            str += String.fromCharCode(_arr[i]);  
        }  
    }  
    return str;  
}  

const getWeb3 = () => {
    const myWeb3 = new Web3(web3.currentProvider);
    return myWeb3;
};

const newContract = async (contract, ...args) => {
    const c = await contract.new(...args);
    const w = getWeb3();
    const instance = new w.eth.Contract(contract.abi, c.address);
    return instance;
};

const getContractAt = (contract, address) => {
    const w = getWeb3();
    const instance = new w.eth.Contract(contract.abi, address);
    return instance;
};

const getSchnorrVerifierContracts = async (accounts) => {
    const bn128 = await newContract(Bn128SchnorrVerifier);
    const secp256 = await newContract(Secp256k1SchnorrVerifier);
    const verifier = await newContract(SignatureVerifier);
    // console.log('bn128', bn128._address);
    // console.log('secp256', secp256._address);
    // console.log('verifier', verifier._address);

    await verifier.methods.register(0, secp256._address).send({from: accounts[0], gas: 1e7});
    await verifier.methods.register(1, bn128._address).send({from: accounts[0], gas: 1e7});

    return {
        bn128,
        secp256,
        verifier
    };
}

const getQuotaContracts = async (accounts) => {
    const quotaDelegate = await newContract(QuotaDelegate);
    
    const quotaProxy = await newContract(QuotaProxy);

    const helper = await newContract(TestQuotaHelper);

    await quotaProxy.methods.upgradeTo(quotaDelegate._address).send({ from: accounts[0], gas: 10000000 });

    try {
        await quotaProxy.methods.upgradeTo(quotaDelegate._address).send({ from: accounts[0], gas: 10000000 });
        assert(false, 'Should never get here');
    } catch (e) {
        assert.ok(e.message.match(/revert/));
    }

    try {
        await quotaProxy.methods.upgradeTo("0x0000000000000000000000000000000000000000").send({ from: accounts[0], gas: 10000000 });
        assert(false, 'Should never get here');
    } catch (e) {
        assert.ok(e.message.match(/revert/));
    }


    // const quota = await getContractAt(QuotaDelegate, quotaProxy._address);
    const quota = await getContractAt(QuotaDelegate, quotaDelegate._address);
    let ret = await quota.methods.config(
        helper._address,
        accounts[1],
        accounts[2],
        helper._address,
        helper._address,
        15000,
        "WAN",
    ).send({ from: accounts[0], gas: 10000000 });
    return {
        quota,
        quotaDelegate,
        quotaProxy,
        helper
    };
};


const clone = x => JSON.parse(JSON.stringify(x));


const getTestBasicStorage = async () => {
    const testBasicStorage = await newContract(TestBasicStorage);
    return testBasicStorage;
}

const resAssert = (res, gasUsed, eventName, item, value) => {
    assert.equal(Math.abs(Number(res.gasUsed) - Number(gasUsed)) < 200000, true, "Gas used not match:" + res.gasUsed.toString() + ":" + gasUsed.toString());
    if (eventName) {
        assert.equal(res.events[eventName] != undefined, true, "Event name not found");
    }

    if (item) {
        assert.equal(res.events[eventName].returnValues[item], value, "Event value incorrect");
    }
}

async function sleep(time) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, time);
    });
};

async function getRC20TokenInstance(tokenAccount) {
    return await MappingToken.at(tokenAccount);
};

async function getRC20TokenBalance(tokenAccount, userAccount) {
    let tokenInstance = await getRC20TokenInstance(tokenAccount);
    let balance = await tokenInstance.balanceOf(userAccount);
    console.log("typeof(balance)", balance);
    return balance.toString();
};

async function getBalance(userAccount) {
    let balance = await web3.eth.getBalance(userAccount);
    return Number(balance);
}

function toNonExponential(num) {
    let m = num.toExponential().match(/\d(?:\.(\d*))?e([+-]\d+)/);
    return num.toFixed(Math.max(0, (m[1] || '').length - m[2]));
}

function buildMpcSign (schnorr, sk, typesArray, ...args) {
    let result = {
      R: schnorr.getR(),
      s: schnorr.getS(sk, typesArray, args)
    };
    return result;
}

function importMochaTest(title, path) {
    describe(title, function () {
        require(path);
    });
}

function setGlobal(key, value) {
    global[key] = value;
}


function stringTobytes32(name){
    let b = Buffer.alloc(32)
    b.write(name, 32-name.length,'utf8')
    let id = '0x'+b.toString('hex')
    return id
  }
//   function stringTobytes(name){
//     let b = Buffer.from(name,'utf8')
//     let id = '0x'+b.toString('hex')
//     return id
//   }
  function getAddressFromInt(i){
    let b = Buffer.alloc(32)
    b.writeUInt32BE(i,28)
    let pkb = ethutil.privateToPublic(b)
    //console.log("priv:", '0x'+b.toString('hex')) 
    let addr = '0x'+ethutil.pubToAddress(pkb).toString('hex')
    let pk = '0x'+pkb.toString('hex')
    //console.log("got address: ",addr)
    return {addr, pk, priv:b}
  }
  
  function sleep(ms) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve();
        }, ms);
    })
  }
  
  async function sleepUntil(time) {
    let cur = Date.now()
    if(cur >= time) {
        return
    } else {
      console.log(" =================================sleep until ",time-cur)
        return sleep(time-cur)
    }
  }
  async function waitReceipt(web3, txhash) {
    let lastBlock = await web3.eth.getBlockNumber();
    let newBlock = lastBlock
    while(newBlock - lastBlock < 10) {
        await sleep(1000)
        newBlock = await web3.eth.getBlockNumber();
        if( newBlock != lastBlock) {
            let rec = web3.eth.getTransactionReceipt(txhash);
            if ( rec ) {
                return rec
            }
        }
    }
    assert(false,"no receipt goted in 10 blocks")
    return null
  }

  


module.exports = {
    getWeb3,
    newContract,
    getQuotaContracts,
    clone,
    getTestBasicStorage,
    resAssert,
    stringToBytes,
    bytesToString,
    getSchnorrVerifierContracts,
    sleep,
    getRC20TokenInstance,
    getRC20TokenBalance,
    getBalance,
    toNonExponential,
    buildMpcSign,
    importMochaTest,
    setGlobal,
    stringTobytes32:stringTobytes32,
    getAddressFromInt:getAddressFromInt,
    waitReceipt:waitReceipt,
    sleepUntil,sleep,
};
