
const Proxy                 = artifacts.require('Proxy');
const MetricProxy     = artifacts.require('MetricProxy');
const MetricDelegate  = artifacts.require('MetricDelegate');
const FakeSmg  = artifacts.require('FakeSmg');
const PosLib  = artifacts.require('PosLib');

const MaxEpochNumber = Number(10000);

const BN                    = web3.utils.BN;
const schnorr               = require('../utils/schnorr/tools');

let metricInstProxy;
let metricInst;
let posLib;

const grpId            = '0x0000000000000000000000000000000000000031353839393533323738313235';

// stage R slash
let polyCM             = stringToBytes("polyCM");
let polyCMR             = stringToBytes("polyCMR");
let polyCMS             = stringToBytes("polyCMS");

let polyData             = stringToBytes("polyData");
let polyDataR             = stringToBytes("polyDataR");
let polyDataS             = stringToBytes("polyDataS");

// stage S slash
let gpkShare             = stringToBytes("gpkShare");
let rpkShare             = stringToBytes("rpkShare");
let m                    = stringToBytes("m");

let spolyData             = stringToBytes("spolyData");
let spolyDataR             = stringToBytes("spolyDataR");
let spolyDataS             = stringToBytes("spolyDataS");


// x and xhash
const xHashInct                = '0xec4916dd28fc4c10d78e287ca5d9cc51ee1ae73cbfde08c6b37324cbfaac8bc5';
const xHashRNW                = '0x9267d3dbed802941483f1afa2a6bc68de5f653128aca9bf1461c5d0a3ad36ed2';
const xHashSNW                = '0xd9147961436944f43cd99d28b2bbddbf452ef872b30c8279e255e7daafc7f946';
const xHashSSlsh                = '0xe38990d0c7fc009880a9c07c23842e886c6bbdc964ce6bdd5817ad357335ee6f';
const xHashRSlsh                = '0x96de8fc8c256fa1e1556d41af431cace7dca68707c78dd88c3acab8b17164c47';

const R                     = schnorr.getR();
const s                     = '0x0c595b48605562a1a6492540b875da4ff203946a9dd0e451cd33d06ef568626b';

contract('Test Metric', async (accounts) => {
    before("init...   -> success", async () => {
        try {
            await testInit();
            // get the instance
            let deploy;
            deploy = await MetricProxy.deployed();
            metricInstProxy = await MetricDelegate.at(deploy.address);

            metricInst = await MetricDelegate.deployed();

            deploy = await FakeSmg.deployed();

            metricInst.setDependence(deploy.address,deploy.address);

            posLib = await PosLib.deployed();
            let epochId = await posLib.getEpochId(Math.floor(Date.now()/1000));
            console.log(".....................epochId "+ epochId);

        } catch (err) {
            assert.fail(err);
        }
    });

    it('write proof...   -> wrInct', async () => {
        try {
            let incntData = new BN(0x0F);
            await metricInst.wrInct(grpId,xHashInct,incntData);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRNW', async () => {
        try {
            let Data = new BN(0xF0);
            await metricInst.wrRNW(grpId,xHashRNW,Data);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrSNW', async () => {
        try {
            let Data = new BN(0xF0);
            await metricInst.wrSNW(grpId,xHashSNW,Data);
        } catch (err) {
            assert.fail(err.toString());
        }
    });


    it('get statics...   -> getPrdInctMetric', async () => {
        try {
            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow)-MaxEpochNumber;
            let endEpID = Number(epochIdNow)+1;

            console.log("type of epochIdNow ", typeof(epochIdNow));
            console.log(startEpID);
            console.log(endEpID);

            let ret = await metricInst.getPrdInctMetric(grpId,new BN(startEpID),new BN(endEpID));
            console.log("ret of getPrdInctMetric");
            console.log(ret);

            for(let i=0;i<ret.length;i++){
                process.stdout.write(ret[i].toString(10)+" ");
            }

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('get statics...   -> getPrdSlshMetric', async () => {
        try {

            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow)+1;

            console.log(startEpID);
            console.log(endEpID);

            let ret = await metricInst.getPrdSlshMetric(grpId,new BN(startEpID),new BN(endEpID));

            for(let i=0;i<ret.length;i++){
                process.stdout.write(ret[i].toString(10)+" ");
            }

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // ===========================================================R proof==============
    it('write proof...   -> wrRSlshPolyCM', async () => {
        try {

            let ret = await metricInst.wrRSlshPolyCM(grpId,
                xHashRSlsh,
                [8,9],
                true,
                polyCM,
                polyCMR,
                polyCMS);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRSlshPolyData', async () => {
        try {

            let ret = await metricInst.wrRSlshPolyData(grpId,
                xHashRSlsh,
                [8,9],
                true,
                polyData,
                polyDataR,
                polyDataS);

        } catch (err) {
            assert.fail(err.toString());
        }
    });
// ===========================================================S proof==============
    it('write proof...   -> wrSSlshShare', async () => {
        try {

            let ret = await metricInst.wrSSlshShare(grpId,
                xHashSSlsh,
                [10,11],
                true,
                gpkShare,
                rpkShare,
                m);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrSSlshPolyPln', async () => {
        try {

            let ret = await metricInst.wrSSlshPolyPln(grpId,
                xHashSSlsh,
                [10,11],
                true,
                spolyData,
                spolyDataR,
                spolyDataS);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('get statics...   -> getPrdInctMetric', async () => {
        try {
            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow)+1;

            console.log(startEpID);
            console.log(endEpID);

            let ret = await metricInst.getPrdInctMetric(grpId,new BN(startEpID),new BN(endEpID));
            for(let i=0;i<ret.length;i++){
                process.stdout.write(ret[i].toString(10)+" ");
            }

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('get statics...   -> getPrdSlshMetric', async () => {
        try {

            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow)+1;

            console.log(startEpID);
            console.log(endEpID);

            let ret = await metricInst.getPrdSlshMetric(grpId,new BN(startEpID),new BN(endEpID));

            for(let i=0;i<ret.length;i++){
                process.stdout.write(ret[i].toString(10)+" ");
            }

        } catch (err) {
            assert.fail(err.toString());
        }
    });

});
async function sleep(time) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, time);
    });
};


function buildObservedEventsForComparison(observedTransactionResult, expectedEvents, filterByName) {
    let observedEvents = new Array();

    observedTransactionResult.logs.forEach(function(logEntry) {
        let expectedEntry = expectedEvents.find(function(evt) {
            return (evt.event === logEntry.event)
        });

        // When filtering, ignore events that are not expected
        if ((! filterByName) || expectedEntry) {
            // Event name
            let event = {
                event: logEntry.event
            };

            // Event arguments
            // Ignore the arguments when they are not tested
            // (ie. expectedEntry.args is undefined)
            if ((! expectedEntry) || (expectedEntry && expectedEntry.args)) {
                event.args = Object.keys(logEntry.args).reduce(function(previous, current) {
                    previous[current] =
                        (typeof logEntry.args[current].toNumber === 'function')
                            ? logEntry.args[current].toString()
                            : logEntry.args[current];
                    return previous;
                }, {});
            }

            observedEvents.push(event);
        }
    });

    return observedEvents;
}

async function testInit(){
    if (typeof assert !== 'undefined') {

        assert.web3Event = function(observedTransactionResult, expectedEvent, message) {
            let entries = buildObservedEventsForComparison(observedTransactionResult, [expectedEvent], true);
            let entry = entries[0];
            if(entry == null){
                assert.fail("Not get the expected event");
            }
            assert.equal(entry.event, expectedEvent.event);
            let expectArgs = expectedEvent.args;
            let entryArgs = entry.args;
            for(let key of Object.keys(expectArgs)){
                if(expectArgs[key] != entryArgs[key]){
                    assert.fail("Not get the expected event");
                    break;
                }
            }
        };
    }
}


function stringToBytes ( str ) {
    var ch, st, re = [];
    for (var i = 0; i < str.length; i++ ) {
        ch = str.charCodeAt(i);  // get char
        st = [];                 // set up "stack"
        do {
            st.push( ch & 0xFF );  // push byte to stack
            ch = ch >> 8;          // shift value down by 1 byte
        }
        while ( ch );
        // add stack contents to result
        // done because chars have "wrong" endianness
        re = re.concat( st.reverse() );
    }
    // return an array of bytes
    return re;
}

async function getEpIDByNow(pos){
    let epochId = await pos.getEpochId(Math.floor(Date.now()/1000));
    return epochId;
}