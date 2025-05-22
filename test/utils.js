const Web3 = require('web3');
const assert = require('assert');
const MappingToken = artifacts.require("MappingToken");
const MappingNftToken = artifacts.require("MappingNftToken");
const ethutil = require("ethereumjs-util");
const hre = require('hardhat')

// const JacksPotDelegate = artifacts.require('./JacksPotDelegate.sol');
// const JacksPotProxy = artifacts.require('./JacksPotProxy.sol');
// const TestHelper = artifacts.require('./test/TestHelper.sol');
const TestBasicStorage = artifacts.require('./test/TestBasicStorage.sol');
const Bn128SchnorrVerifier = artifacts.require('./schnorr/Bn128SchnorrVerifier.sol');
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
    const verifier = await newContract(SignatureVerifier);
    // console.log('bn128', bn128._address);
    // console.log('verifier', verifier._address);

    await verifier.methods.register(1, bn128._address).send({from: accounts[0], gas: 1e7});

    return {
        bn128,
        verifier
    };
}


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
    // console.log("typeof(balance)", balance);
    return balance.toString();
};

async function getNftTokenInstance(tokenAccount) {
    return await MappingNftToken.at(tokenAccount);
};

async function getNftTokenBalance(tokenAccount, userAccount) {
    let tokenInstance = await getNftTokenInstance(tokenAccount);
    let balance = await tokenInstance.balanceOf(userAccount);
    // console.log("typeof(balance)", balance);
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
    let result;
    const signature = schnorr.getS(sk, typesArray, args);
    if (typeof(signature) === "object" && signature.e != undefined && signature.s != undefined && signature.parity != undefined) {
        result = {
            R: web3.utils.bytesToHex(web3.utils.hexToBytes(signature.e).concat( web3.utils.hexToBytes(signature.parity))),
            s: signature.s,
            parity: signature.parity,
            e: signature.e,
            m: signature.m,
        };
    } else {
        result = {
            R: schnorr.getR(),
            s: signature,
        };
    }
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

function clearGlobal(key) {
    delete global[key];
}

const pu = require('promisefy-util')

function sha256(message) {
    const crypto=require('crypto');
    return crypto.createHash('SHA256').update(message, "utf8").digest('hex');
}

function soliditySha256(types, params) {
    if (types.length != params.length) {
        throw new Error("soliditySha256 invalid length");
    }
    const message =  Buffer.from(web3.utils.hexToBytes(web3.utils.encodePacked(...types.map((type, index) => ({
        type:type, value: web3.eth.abi.formatParam(type, params[index])
    })))));
    const hash = sha256(message);
    return hash.startsWith("0x") ? hash : `0x${hash}`;
}

function keccak256(message) {
    const keccak = require('keccak');
    return keccak('keccak256').update(message).digest('hex');
}

function solidityKeccak256(types, params) {
    if (types.length != params.length) {
        throw new Error("solidityKeccak256 invalid length");
    }
    const message =  Buffer.from(web3.utils.hexToBytes(web3.utils.encodePacked(...types.map((type, index) => ({
        type:type, value: web3.eth.abi.formatParam(type, (Array.isArray(params[index]) || params[index] instanceof Uint8Array) ? Buffer.from(params[index]) : params[index])
    })))));
    // const message =  Buffer.from(web3.utils.hexToBytes(web3.utils.encodePacked(...types.map((type, index) => ({type:type, value: params[index]})))));
    // == const hash = keccak256(message);
    const hash = web3.utils.keccak256(message);
    return hash.startsWith("0x") ? hash : `0x${hash}`;
}

function newContractAt(contract, address) {
    return new web3.eth.Contract(contract.abi, address);
}

function contractAt(contract, address) {
    return contract.at(address);
}

async function deployContract(contract, ...args) {
    const deployment = await contract.new(...args);
    return contract.at(deployment.address);
}

function linkLibrary(contract, ...args) {
    let isInstance = (args.length === 1);
    if (isInstance) {
        // 0: libInstance
        return contract.link(args[0]);
    }
    // 0: libName, 1: libAddress
    return contract.link(args[0], args[1]);
}

/**
 * {
 *   "libName": libAddress
 * }
 */
function linkMultiLibrary(contract, libs) {
    return contract.link(libs);
}
function stringTobytes32(name){
    let b = Buffer.alloc(32)
    b.write(name, 32-name.length,'utf8')
    let id = '0x'+b.toString('hex')
    return id
}
function stringTobytes(name){
    let b = Buffer.from(name,'utf8')
    let id = '0x'+b.toString('hex')
    return id
}
function getAddressFromInt(i){
    let b = Buffer.alloc(32)
    b.writeUInt32BE(i,28)
    let pkb = ethutil.privateToPublic(b)
    //console.log("priv:", '0x'+b.toString('hex'))
    let addr = '0x'+ethutil.pubToAddress(pkb).toString('hex')
    let pk = '0x'+pkb.toString('hex')
    //console.log("got address: ",addr)
    return {addr: hre.ethers.utils.getAddress(addr), pk, priv:b}
}

function sleep(ms) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve();
        }, ms);
    })
}

function sleepUntil(time) {
    let cur = Date.now()
    if(cur >= time) {
        return
    } else {
        console.log(" =================================sleep %d ms ",time-cur)
        return sleep(time-cur)
    }
}
async function waitReceipt(web3, txhash) {
    let lastBlock = await web3.eth.getBlockNumber();
    let newBlock = lastBlock
    while(newBlock - lastBlock < 10) {
        await pu.sleep(1000)
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
    sha256,
    keccak256,
    soliditySha256,
    solidityKeccak256,
    newContract,
    newContractAt,
    contractAt,
    deployContract,
    linkLibrary,
    linkMultiLibrary,
    stringTobytes32,
    getAddressFromInt,
    waitReceipt,
    sleepUntil,
    sleep,      
    getWeb3,  
    clone,
    getTestBasicStorage,
    resAssert,
    stringToBytes,
    bytesToString,
    getSchnorrVerifierContracts,
    getRC20TokenInstance,
    getRC20TokenBalance,
    getNftTokenInstance,
    getNftTokenBalance,
    getBalance,
    toNonExponential,
    buildMpcSign,
    importMochaTest,
    setGlobal,
    clearGlobal
};
