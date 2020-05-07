const MetricProxy     = artifacts.require('MetricProxy');
const MetricDelegate  = artifacts.require('MetricDelegate');
const Proxy                 = artifacts.require('Proxy');
const MetricProxy     = artifacts.require('MetricProxy');
const MetricDelegate  = artifacts.require('MetricDelegate');

const BN                    = web3.utils.BN;
const schnorr               = require('../utils/schnorr/tools');

let metricInstProxy;
let metricInst;

const grpId            = "groupID1";

// x and xhash
const x1                    = '0x0000000000000000000000000000000000000000000000000000000000000001';
const xHash1                = '0xec4916dd28fc4c10d78e287ca5d9cc51ee1ae73cbfde08c6b37324cbfaac8bc5';

const x2                    = '0x0000000000000000000000000000000000000000000000000000000000000002';
const xHash2                = '0x9267d3dbed802941483f1afa2a6bc68de5f653128aca9bf1461c5d0a3ad36ed2';

const x3                    = '0x0000000000000000000000000000000000000000000000000000000000000003';
const xHash3                = '0xd9147961436944f43cd99d28b2bbddbf452ef872b30c8279e255e7daafc7f946';


const x4                    = '0x0000000000000000000000000000000000000000000000000000000000000004';
const xHash4                = '0xe38990d0c7fc009880a9c07c23842e886c6bbdc964ce6bdd5817ad357335ee6f';

const x5                    = '0x0000000000000000000000000000000000000000000000000000000000000005';
const xHash5                = '0x96de8fc8c256fa1e1556d41af431cace7dca68707c78dd88c3acab8b17164c47';


const R                     = schnorr.getR();
const s                     = '0x0c595b48605562a1a6492540b875da4ff203946a9dd0e451cd33d06ef568626b';

const ADDRESS_0                   = '0x0000000000000000000000000000000000000000';
const ADDRESS_TM                  = '0x0000000000000000000000000000000000000001';



contract('Test Metric', async (accounts) => {
    before("init...   -> success", async () => {
        try {
            await testInit();
            // get the instance
            let deploy;
            deploy = await MetricProxy.deployed();
            metricInstProxy = await MetricDelegate.at(deploy.address);

            metricInst = await MetricDelegate.deployed();


        } catch (err) {
            assert.fail(err);
        }
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