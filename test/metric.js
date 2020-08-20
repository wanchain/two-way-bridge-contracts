const Proxy = artifacts.require('Proxy');
const MetricProxy = artifacts.require('MetricProxy');
const MetricDelegate = artifacts.require('MetricDelegate');
const FakeSmg = artifacts.require('FakeSmg');
const PosLib = artifacts.require('PosLib');

const ConfigProxy = artifacts.require('ConfigProxy');
const ConfigDelegate = artifacts.require('ConfigDelegate');

const MaxEpochNumber = Number(100);
const BN = web3.utils.BN;
const grpId = '0x0000000000000000000000000000000000000031353839393533323738313235';

let metricInstProxy;
let metricInst;
let posLib;



function getXHash(){
    return web3.utils.randomHex(32);
};

contract('Test Metric', async (accounts) => {
    before("init...   -> success", async () => {
        try {
            await testInit();
            // get the instance
            let deploy,configProxy;
            deploy = await MetricProxy.deployed();
            metricInstProxy = await MetricDelegate.at(deploy.address);

            metricInst = await MetricDelegate.deployed();

            deploy = await FakeSmg.deployed();

            configProxy = await ConfigProxy.deployed();
            metricInst.setDependence(configProxy.address, deploy.address);

            posLib = await PosLib.deployed();
            let epochId = await posLib.getEpochId(Math.floor(Date.now() / 1000));
            console.log("epochId " + epochId);

        } catch (err) {
            assert.fail(err);
        }
    });

    it('write proof...   -> wrInct', async () => {
        try {
            let incntData = new BN(0x0F);
            await metricInst.wrInct(grpId, getXHash(), incntData);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('get statics...   -> getPrdInctMetric', async () => {
        try {
            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow) + 1;

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
                    polyCM: "0x954bb8ad1570066f3493ca925a6554eb7729ab08f15bb273ed85fbe60d0e624cb55ec9e3f34e19dde7113730bd80e14c265d4a1b831f0fe9f4f8813c04480caf5327d31d6c248cb087f9a0c2916f5b0ce1a04a4823fbc69435fbec169a3d7605f34c64346a7c2956ec128d5646c1ddc1037fc09cc95317b7e91a1a3d44bb9d823e0ce8c7f5892db6a963da03379efb4f4c4f9d3371ba421db6f2cdb37c4efbad7908362a1835a7db5180e81572a8a54a4ff0c53d59dac50515ddd1c6959d9b96",
                    polyCMR: "0x73015869cfd7d88cfb03313dd61023f0142d51f084619025ed25abe405ff70f5",
                    polyCMS: "0x8a9e2240cf1ece2e622aa9921198680c61fec256fefeef25b7f2ac6f8876c118"
                },
                polyDataPln: {
                    polyData: "0x01",
                    polyDataR: "0x050d5a7de8fceb70797c9ff20bf8cfbcc64c62766bdf29f856a7ecd12a584e03",
                    polyDataS: "0x01"
                },
                sndrIndex: 0x00,
                rcvrIndex: 0x02,
                becauseSndr: 0x01,
                curveType: 0x00,
            };
            let ret = await metricInst.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRSlsh(sk256-R-content-error)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: "0x954bb8ad1570066f3493ca925a6554eb7729ab08f15bb273ed85fbe60d0e624cb55ec9e3f34e19dde7113730bd80e14c265d4a1b831f0fe9f4f8813c04480caf5327d31d6c248cb087f9a0c2916f5b0ce1a04a4823fbc69435fbec169a3d7605f34c64346a7c2956ec128d5646c1ddc1037fc09cc95317b7e91a1a3d44bb9d823e0ce8c7f5892db6a963da03379efb4f4c4f9d3371ba421db6f2cdb37c4efbad7908362a1835a7db5180e81572a8a54a4ff0c53d59dac50515ddd1c6959d9b96",
                    polyCMR: "0x73015869cfd7d88cfb03313dd61023f0142d51f084619025ed25abe405ff70f5",
                    polyCMS: "0x8a9e2240cf1ece2e622aa9921198680c61fec256fefeef25b7f2ac6f8876c118"
                },
                polyDataPln: {
                    polyData: "0x01",
                    polyDataR: "0x050d5a7de8fceb70797c9ff20bf8cfbcc64c62766bdf29f856a7ecd12a584e03",
                    polyDataS: "0x30fcf0dc4ecf55304e36ae4bab43678e1f99165715ecb7bffe7fc073e71a6bce"
                },
                sndrIndex: 0x00,
                rcvrIndex: 0x02,
                becauseSndr: 0x01,
                curveType: 0x00,
            };
            let ret = await metricInst.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRSlsh(bn256-R-Sig-error)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: "0x1b0df2016d4dabbeeaf25903f42f483663fd14cfc58f41b927c1bdb90e3c8e5f18f9efb39056c5689bbd9c0432de2e091af3b525d39f81b1dc787fb9ade77a202f2abdf909dc78c0d3114c5158ed857fa909b197192b5a824c6ded04d142843218db304be27227f1577c74f89dad7df407338ad59c3888bb64106efb4a6d21442a8fb8663f8a29bdadcf587fce990cb6b67f1c65575e1ea6fef244a1ea24a33e27b0c39e5e92f7c51ef6368976a574b4cd21534ac75f3aae54fa19b7529834cf",
                    polyCMR: "0x55036895c76133ecff21d19a8b6cbec5e347e25fdf268a36b13ea7c47e1e1ad2",
                    polyCMS: "0xfbd09fb5a610eaf6abdc032d8e5ad66760cfabbe30a4cfb36d3863c06784e36f",
                },
                polyDataPln: {
                    polyData: "0x01",
                    polyDataR: "0xef70efd96267ddf9723cda19452865d69239adc8ff76b1dc6f944e7791a07a88",
                    polyDataS: "0x01",
                },
                sndrIndex: 0x02,
                rcvrIndex: 0x00,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInst.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRSlsh(bn256-R-Content-error)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: "0x0b4a75cd5ab9b0aea1cd75504797531f38134b17a6658bb52bcacb6c5a9a9bcf252d7799c95874e4e525e5647424153977a77c8824a50627db6f8b81f3fd891f0050e7fb3f430cf86b9f1befa71fb577f3970929012bb233817eb684491885eb135362ac772a861d80a9e5e787a82254d925c6201111ba1400206fad29aafd1e0bbd96f03ab2fa7454fe3b4f21245c4dfcc5bebd65bf2f91309ef9843d29f01b0ae491219423a2caad81acfaa3bff77022a0b604f0ee51091f0111b5ed6f79a4",
                    polyCMR: "0x0964b9c72a01fd6665dcd748c934f513c6c05dcc26f776696cf1e8b56e0568cd",
                    polyCMS: "0x157c3e5d42f8a1e37efbc28698cd0dcb48bc48c477e85d44de08a7318006661c",
                },
                polyDataPln: {
                    polyData: "0x01",
                    polyDataR: "0x358427312276c098c933aeb1b7f19852b1751d734a6dd17617346759633c2a59",
                    polyDataS: "0xbd6524ec97a9e045b1de8c3c64717e0be6d30bc36866cfcfcd717dc7360e03e1",
                },
                sndrIndex: 0x00,
                rcvrIndex: 0x02,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInst.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

// ===========================================================S proof==============
    it('write proof...   -> wrSSlsh(sk256-S-sig-error)', async () => {
        try {

            let sslshData = {
                polyDataPln: {
                    polyData: "0x01",
                    polyDataR: "0x26aeb5ca02ea4101e396dd04cde95b03e68ff700b142775db8743a12534865c1",
                    polyDataS: "0x01",
                },

                gpkShare: "0x0524fd8df2a7ebbe41c5d12a77618577997cc3cc27af411e4875cebf1d28345044ffc19e776e91141d19e8d77bc4f18d0d0b134c5af603492b9ba99c98992cd4",
                m: "0xf31c2b7982c0a194122e853256a8ede550f952e6bb13ea534ec617fbb995fc6f",
                rpkShare: "0x13daedf1f072bd8c6ee07459cf63597abc2696dc02dbe87f3c75fac47fbb62469a190a29635fe7b551f4f01c5da556fb28f2fd392db7d2093de53984d132e76c",

                sndrIndex: 0x01,
                rcvrIndex: 0x00,
                becauseSndr: 0x01,
                curveType: 0x00,
            };
            let ret = await metricInst.wrSSlsh(grpId,getXHash(),sslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrSSlsh(sk256-S-content-error)', async () => {
        try {

            let sslshData = {
                polyDataPln: {
                    polyData: "0x08fad6d6eaaae87c7549e2cb958a53830649deec99ded906ab22d6cbea69f3d9",
                    polyDataR: "0x5f9f00cee1ccd39a1dbf1974f0bbec2f93d3696455fb5feb73ba86242ce31e4c",
                    polyDataS: "0x01",
                },

                gpkShare: "0x0524fd8df2a7ebbe41c5d12a77618577997cc3cc27af411e4875cebf1d28345044ffc19e776e91141d19e8d77bc4f18d0d0b134c5af603492b9ba99c98992cd4",
                m: "0x03ba160b024683e5051fff3e6ca013c28193c82e89fc9e16dcfb7f1bda67ea60",
                rpkShare: "0x6be1c26d1e43b316b2297ee5d56a8f92d2a4b64d285f1a24cfdeae0467678708e4abd971e62d82f134ea9c3ce1b56334df0c17308da68062b7e69ac8c68ca868",

                sndrIndex: 0x02,
                rcvrIndex: 0x00,
                becauseSndr: 0x01,
                curveType: 0x00,
            };
            let ret = await metricInst.wrSSlsh(grpId,getXHash(),sslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrSSlsh(bn256-S-sig-error)', async () => {
        try {

            let sslshData = {
                polyDataPln: {
                    polyData: "0x01",
                    polyDataR: "0x313cdbead0ae918ac0349b4241701e6fa0045f696cb4efbdcf4fb9a291bde9ce",
                    polyDataS: "0x01",
                },

                gpkShare: "0x240c656894bde7bf02434551fa6265304cab80c7c6b18ff6914a58f4cbc5206d0f224b6b642ca5deddda703645d6938832a75d7fc8ece1ad2aca8855c704ccf0",
                m: "0x2156dc03968c545ad79c31bd6dc1dac27473d6c520ad67d7fab1219540a05463",
                rpkShare: "0x0c3076f110b2192d8e1b8a9251940a21c5bdfdaa4c05d6ae05c644169bc2e5752a5c530e6b859515085604ace122f6fe2f5c52d1276735c234b494a99f3fed51",

                sndrIndex: 0x01,
                rcvrIndex: 0x01,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInst.wrSSlsh(grpId,getXHash(),sslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrSSlsh(bn256-S-content-error)', async () => {
        try {

            let sslshData = {
                polyDataPln: {
                    polyData: "0x0a1168320c3763cde419fd109d59945a307316a8b3e4486c7e60c88b5922d9ed",
                    polyDataR: "0xa746603231ec6d349767acd427d20c61363d148e65a6ec7d90ef4297ff31e52b",
                    polyDataS: "0x01",
                },

                gpkShare: "0x0adf29eaa11da6cb58f84b0e0bcdf7501e81b115a401dffd05ccbfa3373adb7e2b0d612ed449b7194b3333b7620551ec5221334ba1a39c8df2ec604fce76ea0c",
                m: "0x0487c7b531a197c7750303239f416ca772b4085ed1a9baa4752827097afb4d7e",
                rpkShare: "0x1415a14fa0abce5e208ee777d908ef2f43e0ddfba241e81c70c27e5ec2e8f26303ec8d0d4752b64343985dd2454678d77d686e6d360dac1a208f6a398d6aa216",

                sndrIndex: 0x02,
                rcvrIndex: 0x02,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInst.wrSSlsh(grpId,getXHash(),sslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('get statics...   -> getPrdInctMetric', async () => {
        try {
            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow) + 1;

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

            let ret = await metricInst.getPrdSlshMetric(grpId, new BN(startEpID), new BN(endEpID));

            for (let i = 0; i < ret.length; i++) {
                process.stdout.write(ret[i].toString(10) + " ");
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