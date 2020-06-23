const Web3 = require('web3');
const assert = require('assert');
// const JacksPotDelegate = artifacts.require('./JacksPotDelegate.sol');
// const JacksPotProxy = artifacts.require('./JacksPotProxy.sol');
// const TestHelper = artifacts.require('./test/TestHelper.sol');
const TestBasicStorage = artifacts.require('./test/TestBasicStorage.sol');
const QuotaDelegate = artifacts.require('./quota/QuotaDelegate.sol');
const QuotaProxy = artifacts.require('./quota/QuotaProxy.sol');
const TestQuotaHelper = artifacts.require('./test/TestQuotaHelper.sol');


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

const getContracts = async (accounts) => {
    const quotaDelegate = await newContract(QuotaDelegate);
    
    const quotaProxy = await newContract(QuotaProxy);

    const helper = await newContract(TestQuotaHelper);

    await quotaProxy.methods.upgradeTo(quotaDelegate._address).send({ from: accounts[0], gas: 10000000 });

    // const quota = await getContractAt(QuotaDelegate, quotaProxy._address);
    const quota = await getContractAt(QuotaDelegate, quotaDelegate._address);

    await quota.methods.config(
        helper._address,
        accounts[1],
        helper._address,
        1500,
        stringToBytes("WAN"),
        helper._address
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

module.exports = {
    getWeb3,
    newContract,
    getContracts,
    clone,
    getTestBasicStorage,
    resAssert,
    stringToBytes,
    bytesToString,
};
