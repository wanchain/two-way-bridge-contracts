const Proxy = artifacts.require('Proxy');
const MetricProxy = artifacts.require('MetricProxy');
const MetricDelegate = artifacts.require('MetricDelegate');

const FakeSmg = artifacts.require('FakeSmg');
const FakeSkCurve = artifacts.require('FakeSkCurve');
const FakeBnCurve = artifacts.require('FakeBnCurve');
const FakePosLib = artifacts.require('FakePosLib');

//const PosLib = artifacts.require('PosLib');
const PosLib = artifacts.require('test/PosLib');

const ConfigProxy = artifacts.require('ConfigProxy');
const ConfigDelegate = artifacts.require('ConfigDelegate');

const MaxEpochNumber = Number(100);
const BN = web3.utils.BN;
const grpId = '0x0000000000000000000000000000000000000031353839393533323738313235';

const ADDRZERO = '0x0000000000000000000000000000000000000000';
const ADDRONE = '0x0000000000000000000000000000000000000001';

let metricInstProxy;
let metricInst;
let posLib;


const lib = require('./lib.js');

const TFCfg = require('./config');
const optimist = require('optimist');
let argv = optimist.argv;


function getXHash() {
    return web3.utils.randomHex(32);
};


contract('Test Metric', async (accounts) => {
    before("init...   -> success", async () => {
        try {
            await testInit();
            // get the instance
            let deploy, configProxy, fakeSmg, fakeSkCurve, fakeBnCurve, fakePosLib;
            deploy = await MetricProxy.deployed();
            metricInstProxy = await MetricDelegate.at(deploy.address);

            metricInst = await MetricDelegate.deployed();


            fakeSmg = await FakeSmg.deployed();
            fakeSkCurve = await FakeSkCurve.deployed();
            fakeBnCurve = await FakeBnCurve.deployed();
            fakePosLib = await FakePosLib.deployed();

            configProxy = await ConfigProxy.deployed();
            let confDlg = await ConfigDelegate.at(configProxy.address);
            // await confDlg.setCurve([0x00], [fakeSkCurve.address]);
            // await confDlg.setCurve([0x01], [fakeBnCurve.address]);

            metricInstProxy.setDependence(configProxy.address, fakeSmg.address,fakePosLib.address);

            await fakeSmg.setLeader(accounts[0]);

            posLib = await PosLib.deployed();
            //let epochId = await posLib.getEpochId(Math.floor(Date.now() / 1000));
            let epochId = await getEpIDByNow(posLib);
            //console.log("epochId " + epochId);

            let leaderAdd;
            let networkName;
            //console.log("argv", argv);
            //console.log("network", argv["network"]);
            if (!argv["network"]) {
                networkName = "development";
            } else {
                networkName = argv["network"];
            }
            //console.log("networkname:", networkName);
            //console.log("TFCfg networks", TFCfg.networks);
            //console.log("TFCfg networks[networkname]", TFCfg.networks[networkName]);
            //console.log("TFCfg networks[networkname]", TFCfg.networks['' + networkName + '']);
            //console.log("TFCfg networks[networkname][from]", TFCfg.networks['' + networkName + ''].from);

            leaderAdd = TFCfg.networks[networkName].from;
            //console.log("leaderAddr:", leaderAdd);
            if (leaderAdd) {
                //console.log("begin set leader leaderAddr:");
                await fakeSmg.setLeader(leaderAdd);
            }

        } catch (err) {
            assert.fail(err);
        }
    });

    it('getEpochId...   -> ', async () => {
        try {
            let epochId = await posLib.getEpochId(Math.floor(Date.now() / 1000));
            //console.log("Test Metric: getEpochId", epochId);
        } catch (err) {
            assert.fail(err.toString());
        }
    });
    // ===========================================================Incentive======================================
    // halted
    it('write proof...   -> wrInct[halted]', async () => {
        try {
            let incntData = new BN(0x0F);
            await metricInstProxy.setHalt(true);
            await metricInstProxy.wrInct(grpId, getXHash(), incntData, {from: accounts[1]});
        } catch (err) {
            lib.assertInclude(err.message, "Smart contract is halted", err);
        }

        await metricInstProxy.setHalt(false);
    });

    // Not Leader
    it('write proof...   -> wrInct[Not leader]', async () => {
        try {
            let incntData = new BN(0x0F);
            await metricInstProxy.wrInct(grpId, getXHash(), incntData, {from: accounts[1]});
        } catch (err) {
            lib.assertInclude(err.message, "Not leader", err);
        }
    });

    // Duplicate Incentive
    it('write proof...   -> wrInct[Duplicate Incentive]', async () => {
        let xHash = getXHash();

        try {
            let incntData = new BN(0x0F);
            await metricInstProxy.wrInct(grpId, xHash, incntData);
        } catch (err) {
            assert.fail(err.toString());
        }

        try {
            let incntData = new BN(0x0F);
            await metricInstProxy.wrInct(grpId, xHash, incntData);
        } catch (err) {
            lib.assertInclude(err.message, "Duplicate Incentive", err);
        }

    });
    // success  all hamming
    it('write proof...   -> wrInct[success]', async () => {
        try {
            let incntData = new BN(0x0F);
            await metricInstProxy.wrInct(grpId, getXHash(), incntData);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // success  part hamming
    it('write proof...   -> wrInct[success]', async () => {
        try {
            let incntData = new BN(0x07);
            await metricInstProxy.wrInct(grpId, getXHash(), incntData);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('get statics...   -> getPrdInctMetric', async () => {
        try {
            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow) + 1;

            let ret = await metricInstProxy.getPrdInctMetric(grpId, new BN(startEpID), new BN(endEpID));

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

            let ret = await metricInstProxy.getPrdSlshMetric(grpId, new BN(startEpID), new BN(endEpID));

            for (let i = 0; i < ret.length; i++) {
                process.stdout.write(ret[i].toString(10) + " ");
            }

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // ===========================================================R proof ======================================
    // -----------------------------------------------------------sk256 --------------------------------------
    //halted
    it('write proof...   -> wrRSlsh[halted]', async () => {
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
                rcvrIndex: 0x10,
                becauseSndr: 0x01,
                curveType: 0x00,
            };
            await metricInstProxy.setHalt(true);
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            //assert.fail(err.toString());
            lib.assertInclude(err.message, "Smart contract is halted", err);
        }

        await metricInstProxy.setHalt(false);
    });
    // requrie error
    // "invalid receiver index"
    it('write proof...   -> wrRSlsh(sk256-R-[invalid receiver index].)', async () => {
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
                rcvrIndex: 0x10,
                becauseSndr: 0x01,
                curveType: 0x00,
            };
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            //assert.fail(err.toString());
            lib.assertInclude(err.message, "invalid receiver index", "No invalid receiver index")
        }
    });

    // "invalid send index"
    it('write proof...   -> wrRSlsh(sk256-R-[invalid send index].)', async () => {
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
                sndrIndex: 0x10,
                rcvrIndex: 0x02,
                becauseSndr: 0x01,
                curveType: 0x00,
            };
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            //assert.fail(err.toString());
            lib.assertInclude(err.message, "invalid send index", "No invalid send index")
        }
    });

    //"polyCM is empty"
    it('write proof...   -> wrRSlsh(sk256-R-[No polyCM is empty].)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: "0x",
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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            //assert.fail(err.toString());
            lib.assertInclude(err.message, "polyCM is empty", "No polyCM is empty")
        }
    });

    //"polyData is empty"
    it('write proof...   -> wrRSlsh(sk256-R-[polyData is empty].)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: "0x954bb8ad1570066f3493ca925a6554eb7729ab08f15bb273ed85fbe60d0e624cb55ec9e3f34e19dde7113730bd80e14c265d4a1b831f0fe9f4f8813c04480caf5327d31d6c248cb087f9a0c2916f5b0ce1a04a4823fbc69435fbec169a3d7605f34c64346a7c2956ec128d5646c1ddc1037fc09cc95317b7e91a1a3d44bb9d823e0ce8c7f5892db6a963da03379efb4f4c4f9d3371ba421db6f2cdb37c4efbad7908362a1835a7db5180e81572a8a54a4ff0c53d59dac50515ddd1c6959d9b96",
                    polyCMR: "0x73015869cfd7d88cfb03313dd61023f0142d51f084619025ed25abe405ff70f5",
                    polyCMS: "0x8a9e2240cf1ece2e622aa9921198680c61fec256fefeef25b7f2ac6f8876c118"
                },
                polyDataPln: {
                    polyData: "0x",
                    polyDataR: "0x050d5a7de8fceb70797c9ff20bf8cfbcc64c62766bdf29f856a7ecd12a584e03",
                    polyDataS: "0x01"
                },
                sndrIndex: 0x00,
                rcvrIndex: 0x02,
                becauseSndr: 0x01,
                curveType: 0x00,
            };
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            //assert.fail(err.toString());
            lib.assertInclude(err.message, "polyData is empty", "No polyData is empty")
        }
    });

    // "R because sender is not true"
    it('write proof...   -> wrRSlsh(sk256-R-[R because sender is not true])', async () => {
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
                becauseSndr: 0x00,
                curveType: 0x00,
            };
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            //assert.fail(err.toString());
            lib.assertInclude(err.message, "R because sender is not true", "No R because sender is not true")
        }
    });

    // Duplicate RSlsh
    it('write proof...   -> wrRSlsh(sk256-R-sig-[success to write R slsh.  duplicate RSlsh])', async () => {

        let xHash = getXHash();
        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(false);
        await fakeSkCurve.setMulGResult(true);
        await fakeSkCurve.setCalPolyCommitResult(true);
        await fakeSkCurve.setMulPkResult(true);
        await fakeSkCurve.setAddResult(true);
        await fakeSkCurve.setEqualPtRes(true);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, xHash, rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }

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
            let ret = await metricInstProxy.wrRSlsh(grpId, xHash, rslshData);

        } catch (err) {
            lib.assertInclude(err.message, "Duplicate RSlsh", err);
        }
    });

    // Fail to write R slsh.  checkSig=ture checkContent=true
    // true true
    it('write proof...   -> wrRSlsh(sk256-R-sig-[fail to write R slsh.  checkSig=ture checkContent=true equal])', async () => {
        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(true);
        await fakeSkCurve.setMulGResult(true);
        await fakeSkCurve.setCalPolyCommitResult(true);
        await fakeSkCurve.setMulPkResult(true);
        await fakeSkCurve.setAddResult(true);
        await fakeSkCurve.setEqualPtRes(true);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            lib.assertInclude(err.message, "Fail to write R slsh", err);
        }
    });
    // true false
    // success to write R slsh.  checkSig=ture checkContent=false 0
    it('write proof...   -> wrRSlsh(sk256-R-sig-[success to write R slsh.  checkSig=ture checkContent=true not equal])', async () => {
        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(true);

        await fakeSkCurve.setMulGResult(true);
        await fakeSkCurve.setCalPolyCommitResult(true);
        await fakeSkCurve.setMulPkResult(true);
        await fakeSkCurve.setAddResult(true);
        await fakeSkCurve.setEqualPtRes(false);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // true false
    // fail to write R slsh.  checkSig=true checkContent=false 1
    it('write proof...   -> wrRSlsh(sk256-R-sig-[fail to write R slsh.  checkSig=true checkContent=false 1])', async () => {

        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(true);

        await fakeSkCurve.setCalPolyCommitResult(false);
        await fakeSkCurve.setMulGResult(false);
        await fakeSkCurve.setMulPkResult(false);
        await fakeSkCurve.setAddResult(false);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            lib.assertInclude(err.message, "calPolyCommit fail", err);
        }
    });

    // fail to write R slsh.  checkSig=true checkContent=false 2
    it('write proof...   -> wrRSlsh(sk256-R-sig-[success to write R slsh.  checkSig=true checkContent=false 2])', async () => {

        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(true);

        await fakeSkCurve.setCalPolyCommitResult(true);
        await fakeSkCurve.setMulGResult(false);
        await fakeSkCurve.setMulPkResult(false);
        await fakeSkCurve.setAddResult(false);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            lib.assertInclude(err.message, "mulG fail", err);
        }
    });

    // success to write R slsh.  checkSig=true checkContent=false 3
    it('write proof...   -> wrRSlsh(sk256-R-sig-[success to write R slsh.  checkSig=true checkContent=false 3])', async () => {

        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(true);

        await fakeSkCurve.setCalPolyCommitResult(true);
        await fakeSkCurve.setMulGResult(true);
        await fakeSkCurve.setMulPkResult(false);
        await fakeSkCurve.setAddResult(false);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            lib.assertInclude(err.message, "mulG fail", err);
        }
    });

    // Fail to write R slsh.  checkSig=true checkContent=false 4
    it('write proof...   -> wrRSlsh(sk256-R-sig-[Fail to write R slsh.  checkSig=true checkContent=false 4])', async () => {

        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(true);

        await fakeSkCurve.setCalPolyCommitResult(true);
        await fakeSkCurve.setMulGResult(true);
        await fakeSkCurve.setMulPkResult(true);
        await fakeSkCurve.setAddResult(false);
        await fakeSkCurve.setEqualPtRes(true);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            lib.assertInclude(err.message, "Fail to write R slsh", err);
        }
    });
    // false true
    // success to write R slsh.  checkSig=false checkContent=true
    it('write proof...   -> wrRSlsh(sk256-R-sig-[success to write R slsh.  checkSig=false checkContent=true])', async () => {

        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(false);
        await fakeSkCurve.setMulGResult(true);
        await fakeSkCurve.setCalPolyCommitResult(true);
        await fakeSkCurve.setMulPkResult(true);
        await fakeSkCurve.setAddResult(true);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // false false
    // success to write R slsh.  checkSig=false checkContent=false
    it('write proof...   -> wrRSlsh(sk256-R-sig-[success to write R slsh.  checkSig=false checkContent=false])', async () => {

        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(false);

        await fakeSkCurve.setCalPolyCommitResult(true);
        await fakeSkCurve.setMulGResult(true);
        await fakeSkCurve.setMulPkResult(true);
        await fakeSkCurve.setAddResult(true);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // "Not leader"
    it('write proof...   -> wrRSlsh(sk256-R-sig-[Not leader])', async () => {
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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData, {from: accounts[1]});

        } catch (err) {
            lib.assertInclude(err.message, "Not leader", "should error not leader");
        }
    });
    // -----------------------------------------------------------bn256 --------------------------------------
    // bn true true
    it('write proof...   -> wrRSlsh(bn256-R-Sig-error)[fail to write slsh]', async () => {
        let fakeBnCurve = await FakeBnCurve.deployed();

        await fakeBnCurve.setCheckSig(true);

        await fakeBnCurve.setMulGResult(true);
        await fakeBnCurve.setCalPolyCommitResult(true);
        await fakeBnCurve.setMulPkResult(true);
        await fakeBnCurve.setAddResult(true);
        await fakeBnCurve.setEqualPtRes(true);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            lib.assertInclude(err.message, "Fail to write R slsh", err);
        }
    });

    //bn sig=true content=false
    it('write proof...   -> wrRSlsh(bn256-R-Content-error)', async () => {
        let fakeBnCurve = await FakeBnCurve.deployed();

        await fakeBnCurve.setCheckSig(true);

        await fakeBnCurve.setMulGResult(true);
        await fakeBnCurve.setCalPolyCommitResult(true);
        await fakeBnCurve.setMulPkResult(true);
        await fakeBnCurve.setAddResult(true);
        await fakeBnCurve.setEqualPtRes(false);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });
    // false true
    // bn sig=false content=true
    it('write proof...   -> wrRSlsh(bn256-R-Sig-error)', async () => {
        let fakeBnCurve = await FakeBnCurve.deployed();

        await fakeBnCurve.setCheckSig(false);

        await fakeBnCurve.setMulGResult(true);
        await fakeBnCurve.setCalPolyCommitResult(true);
        await fakeBnCurve.setMulPkResult(true);
        await fakeBnCurve.setAddResult(true);
        await fakeBnCurve.setEqualPtRes(true);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // false false
    it('write proof...   -> wrRSlsh(bn256-R-Sig-error)', async () => {
        let fakeBnCurve = await FakeBnCurve.deployed();

        await fakeBnCurve.setCheckSig(false);

        await fakeBnCurve.setMulGResult(true);
        await fakeBnCurve.setCalPolyCommitResult(true);
        await fakeBnCurve.setMulPkResult(true);
        await fakeBnCurve.setAddResult(true);
        await fakeBnCurve.setEqualPtRes(false);

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
            let ret = await metricInstProxy.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // getRSlshProof
    it('getRSlshProof proof...   [have proof]', async () => {
        let xhash = getXHash();
        let sndrIndex = 0x00;
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
                sndrIndex: sndrIndex,
                rcvrIndex: 0x02,
                becauseSndr: 0x01,
                curveType: 0x00,
            };
            let ret = await metricInstProxy.wrRSlsh(grpId, xhash, rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }

        try {
            let ret = await metricInstProxy.getRSlshProof(grpId, xhash, sndrIndex);
            //console.log("ret of getRSlshProof", ret);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // getRSlshProof
    it('getRSlshProof proof...   [No proof]', async () => {
        let xhash = getXHash();
        let sndrIndex = 0x00;
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
                sndrIndex: sndrIndex,
                rcvrIndex: 0x02,
                becauseSndr: 0x01,
                curveType: 0x00,
            };
            let ret = await metricInstProxy.wrRSlsh(grpId, xhash, rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }

        try {
            let ret = await metricInstProxy.getRSlshProof(grpId, getXHash(), sndrIndex);
            //console.log("ret of getRSlshProof", ret);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // ===========================================================S proof====================================
    // -----------------------------------------------------------bn256 --------------------------------------
    // halted
    it('write proof...   -> wrSSlsh(bn256-S-sig-error)[invalid receiver index]', async () => {
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
                rcvrIndex: 0x10,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            await metricInstProxy.setHalt(true);
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "Smart contract is halted", err);
        }

        await metricInstProxy.setHalt(false);
    });

    // requrie error
    // "invalid receiver index"
    it('write proof...   -> wrSSlsh(bn256-S-sig-error)[invalid receiver index]', async () => {
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
                rcvrIndex: 0x10,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "invalid receiver index", err);
        }
    });
    //"invalid send index"
    it('write proof...   -> wrSSlsh(bn256-S-sig-error)[invalid send index]', async () => {
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

                sndrIndex: 0x20,
                rcvrIndex: 0x01,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "invalid send index", "No invalid send index")
        }
    });

    // m is empty
    it('write proof...   -> wrSSlsh(bn256-S-sig-error)[m is empty]', async () => {
        try {
            let sslshData = {
                polyDataPln: {
                    polyData: "0x01",
                    polyDataR: "0x313cdbead0ae918ac0349b4241701e6fa0045f696cb4efbdcf4fb9a291bde9ce",
                    polyDataS: "0x01",
                },

                gpkShare: "0x240c656894bde7bf02434551fa6265304cab80c7c6b18ff6914a58f4cbc5206d0f224b6b642ca5deddda703645d6938832a75d7fc8ece1ad2aca8855c704ccf0",
                m: "0x",
                rpkShare: "0x0c3076f110b2192d8e1b8a9251940a21c5bdfdaa4c05d6ae05c644169bc2e5752a5c530e6b859515085604ace122f6fe2f5c52d1276735c234b494a99f3fed51",

                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "m is empty", err);
        }
    });

    // rpkShare is empty
    it('write proof...   -> wrSSlsh(bn256-S-sig-error)[rpkShare is empty]', async () => {
        try {
            let sslshData = {
                polyDataPln: {
                    polyData: "0x01",
                    polyDataR: "0x313cdbead0ae918ac0349b4241701e6fa0045f696cb4efbdcf4fb9a291bde9ce",
                    polyDataS: "0x01",
                },

                gpkShare: "0x240c656894bde7bf02434551fa6265304cab80c7c6b18ff6914a58f4cbc5206d0f224b6b642ca5deddda703645d6938832a75d7fc8ece1ad2aca8855c704ccf0",
                m: "0x2156dc03968c545ad79c31bd6dc1dac27473d6c520ad67d7fab1219540a05463",
                rpkShare: "0x",

                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "rpkShare is empty", err);
        }
    });

    //gpkShare is empty
    it('write proof...   -> wrSSlsh(bn256-S-sig-error)[gpkShare is empty]', async () => {
        try {
            let sslshData = {
                polyDataPln: {
                    polyData: "0x01",
                    polyDataR: "0x313cdbead0ae918ac0349b4241701e6fa0045f696cb4efbdcf4fb9a291bde9ce",
                    polyDataS: "0x01",
                },

                gpkShare: "0x",
                m: "0x2156dc03968c545ad79c31bd6dc1dac27473d6c520ad67d7fab1219540a05463",
                rpkShare: "0x0c3076f110b2192d8e1b8a9251940a21c5bdfdaa4c05d6ae05c644169bc2e5752a5c530e6b859515085604ace122f6fe2f5c52d1276735c234b494a99f3fed51",

                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "gpkShare is empty", err);
        }
    });

    it('write proof...   -> wrSSlsh(bn256-S-sig-error)[polyData is empty]', async () => {
        try {
            let sslshData = {
                polyDataPln: {
                    polyData: "0x",
                    polyDataR: "0x313cdbead0ae918ac0349b4241701e6fa0045f696cb4efbdcf4fb9a291bde9ce",
                    polyDataS: "0x01",
                },

                gpkShare: "0x240c656894bde7bf02434551fa6265304cab80c7c6b18ff6914a58f4cbc5206d0f224b6b642ca5deddda703645d6938832a75d7fc8ece1ad2aca8855c704ccf0",
                m: "0x2156dc03968c545ad79c31bd6dc1dac27473d6c520ad67d7fab1219540a05463",
                rpkShare: "0x0c3076f110b2192d8e1b8a9251940a21c5bdfdaa4c05d6ae05c644169bc2e5752a5c530e6b859515085604ace122f6fe2f5c52d1276735c234b494a99f3fed51",

                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "", err);
        }
    });

    // S because sender is not true
    it('write proof...   -> wrSSlsh(bn256-S-sig-error)[S because sender is not true]', async () => {
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

                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x00,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "S because sender is not true", err);
        }
    });

    // no leader
    it('write proof...   -> wrSSlsh(bn256-S-sig-error)[Not leader]', async () => {
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

                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData, {from: accounts[1]});

        } catch (err) {
            lib.assertInclude(err.message, "Not leader", err);
        }
    });

    // Duplicate SSlsh
    it('write proof...   -> wrSSlsh(bn256-S-sig-[success to write S slsh.  Duplicate SSlsh)', async () => {

        let fakeBnCurve = await FakeBnCurve.deployed();
        let xHash = getXHash();
        await fakeBnCurve.setCheckSig(false);

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

                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, xHash, sslshData);

        } catch (err) {
            assert.fail(err.toString());
        }

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

                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, xHash, sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "Duplicate SSlsh", err);
        }
    });

    // true true
    it('write proof...   -> wrSSlsh(bn256-S-sig-error)[fail to write S slsh checkSig=ture checkContent=true equal]', async () => {

        let fakeBnCurve = await FakeBnCurve.deployed();
        await fakeBnCurve.setCheckSig(true);

        await fakeBnCurve.setMulGResult(true);
        await fakeBnCurve.setMulPkResult(true);
        await fakeBnCurve.setAddResult(true);
        await fakeBnCurve.setEqualPtRes(true);

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

                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "Fail to write S Slsh", err);
        }
    });

    // true true
    it('write proof...   -> wrSSlsh(bn256-S-sig-[success to write S slsh.  checkSig=ture checkContent=true not equal])', async () => {

        let fakeBnCurve = await FakeBnCurve.deployed();
        await fakeBnCurve.setCheckSig(true);

        await fakeBnCurve.setMulGResult(true);
        await fakeBnCurve.setMulPkResult(true);
        await fakeBnCurve.setAddResult(true);
        await fakeBnCurve.setEqualPtRes(true);

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

                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x01,
                curveType: 0x01,
            };
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "Fail to write S Slsh", err);
        }
    });

    // true false
    // success to write S slsh.  checkSig=true checkContent=false 1
    it('write proof...   -> wrSSlsh(bn256-R-sig-[fail to write S slsh.  checkSig=true checkContent=false 1])', async () => {

        let fakeBnCurve = await FakeBnCurve.deployed();
        await fakeBnCurve.setCheckSig(true);

        await fakeBnCurve.setMulGResult(false);
        await fakeBnCurve.setMulPkResult(false);
        await fakeBnCurve.setAddResult(false);
        await fakeBnCurve.setEqualPtRes(false);

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
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "mulG fail", err);
        }
    });

    // fail to write S slsh.  checkSig=true checkContent=false 2
    it('write proof...   -> wrSSlsh(bn256-R-sig-[fail to write S slsh.  checkSig=true checkContent=false 2])', async () => {

        let fakeBnCurve = await FakeBnCurve.deployed();
        await fakeBnCurve.setCheckSig(true);

        await fakeBnCurve.setMulGResult(true);
        await fakeBnCurve.setMulPkResult(false);
        await fakeBnCurve.setAddResult(false);
        await fakeBnCurve.setEqualPtRes(false);

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
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "mulPk fail", err);
        }
    });


    // fail to write S slsh.  checkSig=true checkContent=false 3
    it('write proof...   -> wrSSlsh(bn256-R-sig-[fail to write S slsh.  checkSig=true checkContent=false 3])', async () => {

        let fakeBnCurve = await FakeBnCurve.deployed();
        await fakeBnCurve.setCheckSig(true);

        await fakeBnCurve.setMulGResult(true);
        await fakeBnCurve.setMulPkResult(true);
        await fakeBnCurve.setAddResult(false);
        await fakeBnCurve.setEqualPtRes(false);

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
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            lib.assertInclude(err.message, "add fail", err);
        }
    });


    // fail to write S slsh.  checkSig=true checkContent=false 4
    it('write proof...   -> wrSSlsh(bn256-R-sig-[fail to write S slsh.  checkSig=true checkContent=false 4])', async () => {

        let fakeBnCurve = await FakeBnCurve.deployed();
        await fakeBnCurve.setCheckSig(true);

        await fakeBnCurve.setMulGResult(true);
        await fakeBnCurve.setMulPkResult(true);
        await fakeBnCurve.setAddResult(true);
        await fakeBnCurve.setEqualPtRes(false);

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
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });


    // false true
    it('write proof...   -> wrSSlsh(bn256-R-sig-[success to write S slsh.  checkSig=false checkContent=true])', async () => {

        let fakeBnCurve = await FakeBnCurve.deployed();
        await fakeBnCurve.setCheckSig(false);

        await fakeBnCurve.setMulGResult(true);
        await fakeBnCurve.setMulPkResult(true);
        await fakeBnCurve.setAddResult(true);
        await fakeBnCurve.setEqualPtRes(true);

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
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // false false
    it('write proof...   -> wrSSlsh(bn256-R-sig-[success to write S slsh.  checkSig=false checkContent=true])', async () => {

        let fakeBnCurve = await FakeBnCurve.deployed();
        await fakeBnCurve.setCheckSig(false);

        await fakeBnCurve.setMulGResult(true);
        await fakeBnCurve.setMulPkResult(true);
        await fakeBnCurve.setAddResult(true);
        await fakeBnCurve.setEqualPtRes(false);

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
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // -----------------------------------------------------------sk256 --------------------------------------
    // true true
    it('write proof...   -> wrSSlsh(sk256-S-sig-error)', async () => {
        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(true);

        await fakeSkCurve.setMulGResult(true);
        await fakeSkCurve.setMulPkResult(true);
        await fakeSkCurve.setAddResult(true);
        await fakeSkCurve.setEqualPtRes(true);
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
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            //assert.fail(err.toString());
            lib.assertInclude(err.message, "Fail to write S Slsh", err);
        }
    });

    // true false
    it('write proof...   -> wrSSlsh(sk256-S-sig-error)', async () => {
        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(true);

        await fakeSkCurve.setMulGResult(true);
        await fakeSkCurve.setMulPkResult(true);
        await fakeSkCurve.setAddResult(true);
        await fakeSkCurve.setEqualPtRes(false);
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
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            assert.fail(err.toString());
            //lib.assertInclude(err.message,"Fail to write S slsh",err);
        }
    });

    // false true
    it('write proof...   -> wrSSlsh(sk256-S-sig-error)', async () => {
        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(false);

        await fakeSkCurve.setMulGResult(true);
        await fakeSkCurve.setMulPkResult(true);
        await fakeSkCurve.setAddResult(true);
        await fakeSkCurve.setEqualPtRes(true);
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
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            assert.fail(err.toString());
            //lib.assertInclude(err.message,"Fail to write S slsh",err);
        }
    });

    // false false
    it('write proof...   -> wrSSlsh(sk256-S-sig-error)', async () => {
        let fakeSkCurve = await FakeSkCurve.deployed();
        await fakeSkCurve.setCheckSig(false);

        await fakeSkCurve.setMulGResult(true);
        await fakeSkCurve.setMulPkResult(true);
        await fakeSkCurve.setAddResult(true);
        await fakeSkCurve.setEqualPtRes(false);
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
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            assert.fail(err.toString());
            //lib.assertInclude(err.message,"Fail to write S slsh",err);
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
            let ret = await metricInstProxy.wrSSlsh(grpId, getXHash(), sslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });


    // getSSlshProof
    it('getSSlshProof ...   -> (have sslshproof)', async () => {
        let xHash = getXHash();
        let sndrIndex = 0x02;

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
            let ret = await metricInstProxy.wrSSlsh(grpId, xHash, sslshData);

        } catch (err) {
            assert.fail(err.toString());
        }

        try {
            let ret = await metricInstProxy.getSSlshProof(grpId, xHash, sndrIndex);
            //console.log("ret of getSSlshProof ", ret);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('get statics...   -> getPrdInctMetric[endEpId<startEpId]', async () => {
        try {
            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow);
            let endEpID = Number(epochIdNow) - 1;

            let ret = await metricInstProxy.getPrdInctMetric(grpId, new BN(startEpID), new BN(endEpID));

        } catch (err) {
            lib.assertInclude(err.message, "endEpId<startEpId", err);
        }
    });

    it('get statics...   -> getPrdInctMetric', async () => {
        try {
            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow) + 1;

            let ret = await metricInstProxy.getPrdInctMetric(grpId, new BN(startEpID), new BN(endEpID));
            for (let i = 0; i < ret.length; i++) {
                process.stdout.write(ret[i].toString(10) + " ");
            }

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // get sm succCntByepId
    it('get getSmSuccCntByEpId...   -> ', async () => {
        try {
            let epochIdNow = await getEpIDByNow(posLib);
            let ret = await metricInstProxy.getSmSuccCntByEpId(grpId, new BN(epochIdNow), 0x00);
            //console.log("ret of getSmSuccCntByEpId ", ret);

        } catch (err) {
            assert.fail(err.toString());
        }
    });
    //getSlshCntByEpId
    it('get getSlshCntByEpId...   -> ', async () => {
        try {
            let epochIdNow = await getEpIDByNow(posLib);
            let ret = await metricInstProxy.getSlshCntByEpId(grpId, new BN(epochIdNow), 0x02);
            //console.log("ret of getSmSuccCntByEpId ", ret);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('get statics...   -> getPrdSlshMetric[endEpId<startEpId]', async () => {
        try {

            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow);
            let endEpID = Number(epochIdNow) - 1;
            let ret = await metricInstProxy.getPrdSlshMetric(grpId, new BN(startEpID), new BN(endEpID));
        } catch (err) {
            lib.assertInclude(err.message, "endEpId<startEpId", err);
        }
    });

    it('get statics...   -> getPrdSlshMetric', async () => {
        try {

            let epochIdNow = await getEpIDByNow(posLib);
            let startEpID = Number(epochIdNow) - MaxEpochNumber;
            let endEpID = Number(epochIdNow) + 1;

            let ret = await metricInstProxy.getPrdSlshMetric(grpId, new BN(startEpID), new BN(endEpID));

            for (let i = 0; i < ret.length; i++) {
                process.stdout.write(ret[i].toString(10) + " ");
            }

        } catch (err) {
            assert.fail(err.toString());
        }
    });


    // ===========================================================others====================================//
    // revert

    it('revert...   -> callUnKnownFuc', async () => {
        try {
            let fakeSc = await ConfigDelegate.at(metricInstProxy.address);
            await fakeSc.getCurve(0);
        } catch (err) {
            lib.assertInclude(err.message, "Not support", err);
        }
    });

    // getDependence()
    it('getDependence...   ->   ', async () => {
        try {

            let ret = await metricInstProxy.getDependence();
            //console.log("ret of getDependence ", ret);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    // setDependence()
    it('setDependence...   ->"Invalid config address"', async () => {

        let oldConfigAddr, oldSmgAddr,oldPosAddr;
        try {

            let ret = await metricInstProxy.getDependence();
            //console.log("ret of metricInstProxy.getDependence:", ret);
            oldConfigAddr = ret[0];
            oldSmgAddr = ret[1];
            oldPosAddr = ret[2];

        } catch (err) {
            assert.fail(err.toString());
        }

        try {
            let ret = await metricInstProxy.setDependence(ADDRZERO, ADDRZERO,ADDRZERO);
        } catch (err) {
            lib.assertInclude(err.message, "Invalid config address", err);
        }

        try {
            let ret = await metricInstProxy.setDependence(oldConfigAddr, oldSmgAddr,oldPosAddr);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('setDependence...   ->"Not owner"', async () => {

        try {
            let ret = await metricInstProxy.setDependence(ADDRZERO, ADDRZERO, ADDRZERO,{from: accounts[2]});
        } catch (err) {
            lib.assertInclude(err.message, "Not owner", err)
        }
    });

    it('setDependence...   ->"Invalid smg address"', async () => {

        let oldConfigAddr, oldSmgAddr,oldPosAddr;
        try {

            let ret = await metricInstProxy.getDependence();
            //console.log("ret of metricInstProxy.getDependence:", ret);
            oldConfigAddr = ret[0];
            oldSmgAddr = ret[1];
            oldPosAddr = ret[2];

        } catch (err) {
            assert.fail(err.toString());
        }

        try {
            let ret = await metricInstProxy.setDependence(oldConfigAddr, ADDRZERO, ADDRZERO);
        } catch (err) {
            lib.assertInclude(err.message, "Invalid smg address", err);
        }

        try {
            let ret = await metricInstProxy.setDependence(oldConfigAddr, oldSmgAddr, ADDRZERO);
        } catch (err) {
            lib.assertInclude(err.message, "Invalid posLib address", err);
        }

        try {
            let ret = await metricInstProxy.setDependence(oldConfigAddr, oldSmgAddr, oldPosAddr);
        } catch (err) {
            assert.fail(err.toString());
        }
    });


    // upgradeTo
    it('upgrade...   ->[not owner]', async () => {
        try {
            let proxy = await MetricProxy.at(metricInstProxy.address);
            await proxy.upgradeTo(metricInst.address, {from: accounts[2]});
        } catch (e) {
            lib.assertInclude(e.message, "Not owner", e)
        }
    });

    it('upgrade...   ->[invalid implementation address]', async () => {
        try {
            let proxy = await MetricProxy.at(metricInstProxy.address);
            await proxy.upgradeTo(ADDRZERO);
        } catch (e) {
            lib.assertInclude(e.message, "Cannot upgrade to invalid address", e)
        }
    });

    it('upgrade...   ->[Cannot upgrade to the same implementation]', async () => {
        let result = {};
        try {
            let proxy = await MetricProxy.at(metricInstProxy.address);
            await proxy.upgradeTo(metricInst.address); // set self address temporarily
            await proxy.upgradeTo(metricInst.address);
        } catch (e) {
            lib.assertInclude(e.message, "Cannot upgrade to the same implementation", e)
        }
    });

    it('upgrade...   ->[success]', async () => {
        let result = {};
        try {
            let proxy = await MetricProxy.at(metricInstProxy.address);
            await proxy.upgradeTo(ADDRONE);
            await proxy.upgradeTo(metricInst.address);
        } catch (e) {
            result = e;
        }
        assert.equal(result.reason, undefined);
    })

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
    //let epochId = await pos.getEpochId(Math.floor(Date.now() / 1000));
    let epochId = Math.floor(Date.now() / 1000 / 120);
    return epochId;
}

async function getPrdSlshMetricByNow() {
    let ret = [];
    try {

        let epochIdNow = await getEpIDByNow(posLib);
        let startEpID = Number(epochIdNow) - MaxEpochNumber;
        let endEpID = Number(epochIdNow) + 1;

        let retMetric = await metricInstProxy.getPrdSlshMetric(grpId, new BN(startEpID), new BN(endEpID));

        for (let i = 0; i < retMetric.length; i++) {
            ret.push(Number(retMetric[i].toString(10)));
        }

    } catch (err) {
        console.log(err);
    }

    return ret;
}

async function getPrdInctMetricByNow() {
    let ret = [];
    try {

        let epochIdNow = await getEpIDByNow(posLib);
        let startEpID = Number(epochIdNow) - MaxEpochNumber;
        let endEpID = Number(epochIdNow) + 1;

        let retMetric = await metricInstProxy.getPrdInctMetric(grpId, new BN(startEpID), new BN(endEpID));

        for (let i = 0; i < retMetric.length; i++) {
            ret.push(Number(retMetric[i].toString(10)));
        }

    } catch (err) {
        console.log(err);
    }

    return ret;
}
