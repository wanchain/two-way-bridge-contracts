const Proxy = artifacts.require('Proxy');
const MetricProxy = artifacts.require('MetricProxy');
const MetricDelegate = artifacts.require('MetricDelegate');
const FakeSmg = artifacts.require('FakeSmg');
const PosLib = artifacts.require('PosLib');

const MaxEpochNumber = Number(100);

const BN = web3.utils.BN;
const schnorr = require('../utils/schnorr/tools');

let metricInstProxy;
let metricInst;
let posLib;

const grpId = '0x0000000000000000000000000000000000000031353839393533323738313235';

// x and xhash
const xHashInct = '0xec4916dd28fc4c10d78e287ca5d9cc51ee1ae73cbfde08c6b37324cbfaac8bc5';
const xHashRNW = '0x9267d3dbed802941483f1afa2a6bc68de5f653128aca9bf1461c5d0a3ad36ed2';
const xHashSNW = '0xd9147961436944f43cd99d28b2bbddbf452ef872b30c8279e255e7daafc7f946';
const xHashSSlsh = '0xe38990d0c7fc009880a9c07c23842e886c6bbdc964ce6bdd5817ad357335ee6f';
const xHashRSlsh = '0x96de8fc8c256fa1e1556d41af431cace7dca68707c78dd88c3acab8b17164c47';

const R = schnorr.getR();
const s = '0x0c595b48605562a1a6492540b875da4ff203946a9dd0e451cd33d06ef568626b';

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

            metricInst.setDependence(deploy.address, deploy.address);

            posLib = await PosLib.deployed();
            let epochId = await posLib.getEpochId(Math.floor(Date.now() / 1000));
            console.log(".....................epochId " + epochId);

        } catch (err) {
            assert.fail(err);
        }
    });

    it('write proof...   -> wrInct', async () => {
        try {
            let incntData = new BN(0x0F);
            await metricInst.wrInct(grpId, xHashInct, incntData);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRNW', async () => {
        try {
            let Data = new BN(0x0E);
            await metricInst.wrRNW(grpId, xHashRNW, Data);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrSNW', async () => {
        try {
            let Data = new BN(0x08);
            await metricInst.wrSNW(grpId, xHashSNW, Data);
        } catch (err) {
            assert.fail(err.toString());
        }
    });


    it('get statics...   -> getPrdInctMetric', async () => {
        try {
            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow) + 1;

            console.log("type of epochIdNow ", typeof(epochIdNow));
            console.log(startEpID);
            console.log(endEpID);

            let ret = await metricInst.getPrdInctMetric(grpId, new BN(startEpID), new BN(endEpID));
            console.log("ret of getPrdInctMetric");
            console.log(ret);

            for (let i = 0; i < ret.length; i++) {
                process.stdout.write(ret[i].toString(10) + " ");
            }

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('get statics...   -> getPrdSlshMetric', async () => {
        try {

            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow) + 1;

            console.log(startEpID);
            console.log(endEpID);
            let ret = await metricInst.getPrdSlshMetric(grpId, new BN(startEpID), new BN(endEpID));

            for (let i = 0; i < ret.length; i++) {
                process.stdout.write(ret[i].toString(10) + " ");
            }

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // ===========================================================R proof==============


    it('write proof...   -> wrRSlsh(sk256-R-sig-error)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: stringToBytes("0xfb6552ef8773e80d1be2a4131b8c1119bbea6f65046df59d8697eb0e94a3989f29cb16ff9670d5988c0b0106a0601327e6ec83c7e069daa69fd9593fbcb450748d0907958894dab757b3ec862fffdd1af4b1e6bcfa309ee469e7ba2ab0a37fe63f4107016b291c6ed7bed7c365b7ab2fc4fd36cd7464250cbecbabb0d2d2fa0eef95c094eaa52ad24e9ef4fcdf66ae7ade323746b063c6a6a"),
                    polyCMR: stringToBytes("0xaa5e7d351b277e6b22da6e66fa240e07e9465ca6057d4f704d092dcf9accc755"),
                    polyCMS: stringToBytes("0x02e350006c8198dd9860e7ae2588b281dbc06ce38cd6b6ca86a76dd7601c2af5")
                },
                polyDataPln: {
                    polyData: stringToBytes("0x01"),
                    polyDataR: stringToBytes("0x87f23da8f0ed2b1d9166b51e871a259fe5340d5b69999021144634964333ee8a"),
                    polyDataS: stringToBytes("0x01")
                },
                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x00,
                curveType: 0x00,
            };


            await debug( metricInst.wrRSlsh(grpId,xHashRSlsh,rslshData) );
            //await metricInst.wrRSlsh(grpId,xHashRSlsh,rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });


    /*
    it('write proof...   -> wrRSlsh(sk256-R-content-error)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: stringToBytes("0x0450398721262f3bc3b83f7c19e71ef159ce754dbe75ac36399f41f236427ab2c0277c334de6a5756c8b862e513c6ee8d3a70f468f271d0705b68326b4470ade2104121967b3a0c6656f7a85118be88009ebc049daa7bb290e35066cbee747537af0896e940a1893e720a5ea80d2f3480fcc58ede58654a33ddd95781b56aa379d2004c24ac859eceb8af1c02f3db53e3c4978f3ddaf4b499cd01612e456c18aba38fbd475a64a7e04f4698489694a4f2511472e30ea86a50b815e329808c9ddce73b6",),
                    polyCMR: stringToBytes("0x089f8eb616f596a10b62be1a161295e7bb82fca13e9a54cbfffabdfd6517fdbb"),
                    polyCMS: stringToBytes("0x2ff8ae2306cfdfcccf7128121a033dae02c582250cc3ca6b91e38503371d95b8")
                },
                polyDataPln: {
                    polyData: stringToBytes("0x155ab4c28f86434b0cb01b9b1b1e0a99f055eecc69db56cfd07e085f941a4e92"),
                    polyDataR: stringToBytes("0x7aca0ceb0319e7b3ed9b0614a4f823adf8d41585d9f65c8b867fd9a46629f54f"),
                    polyDataS: stringToBytes("0x2ff8ae2306cfdfcccf7128121a033dae02c582250cc3ca6b91e38503371d95b8")
                },
                sndrIndex: 0x08,
                rcvrIndex: 0x09,
                becauseSndr: 0x01,
                curveType: 0x00,
            };


            let ret = await metricInst.wrRSlsh(grpId,
                xHashRSlsh,
                rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRSlsh(bn256-R-sig-error)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: stringToBytes("0x0450398721262f3bc3b83f7c19e71ef159ce754dbe75ac36399f41f236427ab2c0277c334de6a5756c8b862e513c6ee8d3a70f468f271d0705b68326b4470ade2104121967b3a0c6656f7a85118be88009ebc049daa7bb290e35066cbee747537af0896e940a1893e720a5ea80d2f3480fcc58ede58654a33ddd95781b56aa379d2004c24ac859eceb8af1c02f3db53e3c4978f3ddaf4b499cd01612e456c18aba38fbd475a64a7e04f4698489694a4f2511472e30ea86a50b815e329808c9ddce73b6",),
                    polyCMR: stringToBytes("0x089f8eb616f596a10b62be1a161295e7bb82fca13e9a54cbfffabdfd6517fdbb"),
                    polyCMS: stringToBytes("0x2ff8ae2306cfdfcccf7128121a033dae02c582250cc3ca6b91e38503371d95b8")
                },
                polyDataPln: {
                    polyData: stringToBytes("0x155ab4c28f86434b0cb01b9b1b1e0a99f055eecc69db56cfd07e085f941a4e92"),
                    polyDataR: stringToBytes("0x7aca0ceb0319e7b3ed9b0614a4f823adf8d41585d9f65c8b867fd9a46629f54f"),
                    polyDataS: stringToBytes("0x2ff8ae2306cfdfcccf7128121a033dae02c582250cc3ca6b91e38503371d95b8")
                },
                sndrIndex: 0x08,
                rcvrIndex: 0x09,
                becauseSndr: 0x01,
                curveType: 0x00,
            };


            let ret = await metricInst.wrRSlsh(grpId,
                xHashRSlsh,
                rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRSlsh(bn256-R-content-error)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: stringToBytes("0x0450398721262f3bc3b83f7c19e71ef159ce754dbe75ac36399f41f236427ab2c0277c334de6a5756c8b862e513c6ee8d3a70f468f271d0705b68326b4470ade2104121967b3a0c6656f7a85118be88009ebc049daa7bb290e35066cbee747537af0896e940a1893e720a5ea80d2f3480fcc58ede58654a33ddd95781b56aa379d2004c24ac859eceb8af1c02f3db53e3c4978f3ddaf4b499cd01612e456c18aba38fbd475a64a7e04f4698489694a4f2511472e30ea86a50b815e329808c9ddce73b6",),
                    polyCMR: stringToBytes("0x089f8eb616f596a10b62be1a161295e7bb82fca13e9a54cbfffabdfd6517fdbb"),
                    polyCMS: stringToBytes("0x2ff8ae2306cfdfcccf7128121a033dae02c582250cc3ca6b91e38503371d95b8")
                },
                polyDataPln: {
                    polyData: stringToBytes("0x155ab4c28f86434b0cb01b9b1b1e0a99f055eecc69db56cfd07e085f941a4e92"),
                    polyDataR: stringToBytes("0x7aca0ceb0319e7b3ed9b0614a4f823adf8d41585d9f65c8b867fd9a46629f54f"),
                    polyDataS: stringToBytes("0x2ff8ae2306cfdfcccf7128121a033dae02c582250cc3ca6b91e38503371d95b8")
                },
                sndrIndex: 0x08,
                rcvrIndex: 0x09,
                becauseSndr: 0x01,
                curveType: 0x00,
            };


            let ret = await metricInst.wrRSlsh(grpId,
                xHashRSlsh,
                rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

// ===========================================================S proof==============
    it('write proof...   -> wrSSlsh(sk256-S-sig-error)', async () => {
        try {

            let ret = await metricInst.wrSSlshShare(grpId,
                xHashSSlsh,
                [10, 11],
                true,
                gpkShare,
                rpkShare,
                m);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrSSlsh(sk256-S-content-error)', async () => {
        try {

            let ret = await metricInst.wrSSlshShare(grpId,
                xHashSSlsh,
                [10, 11],
                true,
                gpkShare,
                rpkShare,
                m);

        } catch (err) {
            assert.fail(err.toString());
        }
    });


    it('write proof...   -> wrSSlsh(bn256-S-sig-error)', async () => {
        try {

            let ret = await metricInst.wrSSlshShare(grpId,
                xHashSSlsh,
                [10, 11],
                true,
                gpkShare,
                rpkShare,
                m);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrSSlsh(bn256-S-content-error)', async () => {
        try {

            let ret = await metricInst.wrSSlshShare(grpId,
                xHashSSlsh,
                [10, 11],
                true,
                gpkShare,
                rpkShare,
                m);

        } catch (err) {
            assert.fail(err.toString());
        }
    });
    */

    /*
    it('get statics...   -> getPrdInctMetric', async () => {
        try {
            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow) + 1;

            console.log(startEpID);
            console.log(endEpID);

            let ret = await metricInst.getPrdInctMetric(grpId, new BN(startEpID), new BN(endEpID));
            for (let i = 0; i < ret.length; i++) {
                process.stdout.write(ret[i].toString(10) + " ");
            }

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('get statics...   -> getPrdSlshMetric', async () => {
        try {

            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow) + 1;

            console.log(startEpID);
            console.log(endEpID);

            let ret = await metricInst.getPrdSlshMetric(grpId, new BN(startEpID), new BN(endEpID));

            for (let i = 0; i < ret.length; i++) {
                process.stdout.write(ret[i].toString(10) + " ");
            }

        } catch (err) {
            assert.fail(err.toString());
        }
    });
    */
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

    observedTransactionResult.logs.forEach(function (logEntry) {
        let expectedEntry = expectedEvents.find(function (evt) {
            return (evt.event === logEntry.event)
        });

        // When filtering, ignore events that are not expected
        if ((!filterByName) || expectedEntry) {
            // Event name
            let event = {
                event: logEntry.event
            };

            // Event arguments
            // Ignore the arguments when they are not tested
            // (ie. expectedEntry.args is undefined)
            if ((!expectedEntry) || (expectedEntry && expectedEntry.args)) {
                event.args = Object.keys(logEntry.args).reduce(function (previous, current) {
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

async function testInit() {
    if (typeof assert !== 'undefined') {

        assert.web3Event = function (observedTransactionResult, expectedEvent, message) {
            let entries = buildObservedEventsForComparison(observedTransactionResult, [expectedEvent], true);
            let entry = entries[0];
            if (entry == null) {
                assert.fail("Not get the expected event");
            }
            assert.equal(entry.event, expectedEvent.event);
            let expectArgs = expectedEvent.args;
            let entryArgs = entry.args;
            for (let key of Object.keys(expectArgs)) {
                if (expectArgs[key] != entryArgs[key]) {
                    assert.fail("Not get the expected event");
                    break;
                }
            }
        };
    }
}


function stringToBytes(str) {
    var ch, st, re = [];
    for (var i = 0; i < str.length; i++) {
        ch = str.charCodeAt(i);  // get char
        st = [];                 // set up "stack"
        do {
            st.push(ch & 0xFF);  // push byte to stack
            ch = ch >> 8;          // shift value down by 1 byte
        }
        while (ch);
        // add stack contents to result
        // done because chars have "wrong" endianness
        re = re.concat(st.reverse());
    }
    // return an array of bytes
    return re;
}

async function getEpIDByNow(pos) {
    let epochId = await pos.getEpochId(Math.floor(Date.now() / 1000));
    return epochId;
}