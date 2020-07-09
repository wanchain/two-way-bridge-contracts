const Proxy = artifacts.require('Proxy');
const MetricProxy = artifacts.require('MetricProxy');
const MetricDelegate = artifacts.require('MetricDelegate');
const FakeSmg = artifacts.require('FakeSmg');
const PosLib = artifacts.require('PosLib');

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
            await metricInst.wrInct(grpId, getXHash(), incntData);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRNW', async () => {
        try {
            let Data = new BN(0x0E);
            await metricInst.wrRNW(grpId, getXHash(), Data);
        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrSNW', async () => {
        try {
            let Data = new BN(0x08);
            await metricInst.wrSNW(grpId, getXHash(), Data);
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
            console.log(rslshData.polyCMData.polyCM);
            console.log(rslshData.polyCMData.polyCM.length);
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
            console.log(rslshData.polyCMData.polyCM);
            console.log(rslshData.polyCMData.polyCM.length);
            let ret = await metricInst.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });


    it('write proof...   -> wrRSlsh(sk256-R-Sig-error-Rcv)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: "0xd4fade74caced2e8ad1c2717cabec5f46f82b23b9db394b9a75c557be80f49d9a61d13de64fdec923cff742939f67b41a6c3d155013384248eea87b39550ab1857e9063370cdc754b667966e4747f72d9e90e3d82182878b0c0c316e5c63198744d07cf3617e8f2cd55a358267503516be7c830930ec2867bf7a7a88cc36835adf808559475b3c54d8a0343bdabf6fce28c470a907b603e88d131791c3ea0df34ddae048eacd86257cc5c8d6f423a9778ac57a800f0a69008272538d91e430e6",
                    polyCMR: "0x4751690907e991a40853e8053745edb2414664ef49935bdf62d73f00408918",
                    polyCMS: "0xb670de0f65f0d5f28c84fc3c4a33bb4e9b5939e9d4a1264213cba1962ff1a3d3"
                },
                polyDataPln: {
                    polyData: "0xd6415f6005d0f11ede7dc970ac625f3b0d9645b49a7a562df1f423d5173c71a2",
                    polyDataR: "0x2e372cbd3dec05eb652249340414f6e26ef06df67d1db22589f73685cf19f79a",
                    polyDataS: "0x86e03dc84782e7d867dd3143317691d08bd1231d61f36d7b449adac4db49caee"
                },
                sndrIndex: 0x01,
                rcvrIndex: 0x00,
                becauseSndr: 0x00,
                curveType: 0x00,
            };
            console.log(rslshData.polyCMData.polyCM);
            console.log(rslshData.polyCMData.polyCM.length);
            let ret = await metricInst.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRSlsh(sk256-R-Content-error-Rcv)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: "0x09b5c940602dc7aeee5adee7614912db89e7e4341d1d26eccd96bf92ef81247bce498bd1c69fdda7b8c0dc14bfc29900187f2a2020883663b3f00aa054ea9c34f8e5283a0b6cfd54fc48dab8c5cb8378a1bd642f46a1e62f1c76cd28b07afe4a2ce5a1a800a5f75dbf4d1d4b462dcd6d8dd313b01d80e2dace3f35b11b7ca4402928ce973a571ebb0ed1ac143d61033dcef40110d12646feb2138dc5b3d8765c02ac2b4a2d3f8d2c0b28462e250ad1d666e1f5df163f9385b4d13e6116da3d10",
                    polyCMR: "0x65248f634d3b0ecb3c3abed2f276e80b335c1bedcd4fd64838ee714c04499ab4",
                    polyCMS: "0x10e54579a0b687a669bb25837cb0a13ffce261608d4ce6f1ca2622fea3216cce",
                },
                polyDataPln: {
                    polyData: "0x6511bdaaaa4c5ca8b3f0bf92628dab542b31a24a479ce6110d0af48566a4d0f8",
                    polyDataR: "0xcc2b2962b37dd9771f98b628838cdbf83357ca320716865c242d33e55739f187",
                    polyDataS: "0x5cab2e2066a7998ce5523f3b719ad4905876c1a39a76c7d95d0f8e3fb52ff082",
                },
                sndrIndex: 0x00,
                rcvrIndex: 0x01,
                becauseSndr: 0x00,
                curveType: 0x00,
            };
            console.log(rslshData.polyCMData.polyCM);
            console.log(rslshData.polyCMData.polyCM.length);
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
            console.log(rslshData.polyCMData.polyCM);
            console.log(rslshData.polyCMData.polyCM.length);
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
            console.log(rslshData.polyCMData.polyCM);
            console.log(rslshData.polyCMData.polyCM.length);
            let ret = await metricInst.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRSlsh(bn256-R-Sig-error-Rcv)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: "0x0f5d902b84eb34de1fdf0c3dcc51b08a9c7e9acb1f9ca8f82ae11c083474aca626b48253713b55a64fe5fb30d18d4c30d1e248df8f1898cf264be0aa2e9b2fca21253540556876bd979b6261fb8c6ffb3dc23b571f143bb54e153a376f4a0a992d66dc7b26a5fb8d547a1f5a86a03771e4df35b5453babd3f462be1635d8e1c92841dc44dd207c7e6170fc3c8faa9887d91fd377632a55cb14116bc49cb14df92c285ac308dacc79936cc59c743c2d28640fa09c8fa610cf2fd21898cb8d1fc8",
                    polyCMR: "0xcd54e09f988e0c6588d21e3efd2221653b14dbe548b2db06efb3068d006b6b3e",
                    polyCMS: "0x33c845baaab86340820e7e179bea0a3ba3534b951be17cc113f10ad53934fbf0",
                },
                polyDataPln: {
                    polyData: "0x2410661a6ddf1ad2e5f36bda9860a45c844e2b19fa2190ac40527c9c90962c8d",
                    polyDataR: "0x916cbe798ed20aa1cb69ce1e995e8f48d6553b180cf357041d83c4deb08c2488",
                    polyDataS: "0xe910df59941278c0753eec325b22bdb4338651d2e9c4d626ea54db3c0db66502",
                },
                sndrIndex: 0x00,
                rcvrIndex: 0x02,
                becauseSndr: 0x00,
                curveType: 0x01,
            };
            console.log(rslshData.polyCMData.polyCM);
            console.log(rslshData.polyCMData.polyCM.length);
            let ret = await metricInst.wrRSlsh(grpId, getXHash(), rslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrRSlsh(bn256-R-Content-error-Rcv)', async () => {
        try {
            let rslshData = {
                polyCMData: {
                    polyCM: "0x1979c02942a8bff6006ed9bb8622c319146943b109e9e3a1edb4aa04a0dcf736088f3cbe3e95689a508425e1d28a64f99ce5cdf8b8f531972e2fa63fdcc2ff5326336f5cfcefd3c074c3365271fa0505ba5fb8a91ef4c204b73ab1c6f26f72d008307d861d83c1cb38d58e66dd140352ad7a737eee2b7f90e9d1e6181e1991062ba75577f21705963f4ace80eadc6a7edffb5cb76b46ee9b346900d7914a31d01440fcb4d47005c9d73c373f2a23338c5820db0a801920f15287886e2cca663d",
                    polyCMR: "0x3498e5cc5193561cfafcbd5e3403ae233cbc194a54e138e55c8d98f0f7c34d6f",
                    polyCMS: "0x237e06b17998f379134e405d340699c532b682f2e87555205c82d8affd66b734",
                },
                polyDataPln: {
                    polyData: "0x15d06f26e1065afcbefa63bc34b2e46197e8f0eefd7387ae6e388651c61c58db",
                    polyDataR: "0xdb6e105dfebd10a6645e058291e7d455f43968ee97261ac1a1d2cdf6fba7383e",
                    polyDataS: "0x3ab1ed7d5eb9f13a65310d61a2b2006f69539859b410ae61579f136d80a9e81f",
                },
                sndrIndex: 0x01,
                rcvrIndex: 0x00,
                becauseSndr: 0x00,
                curveType: 0x01,
            };
            console.log(rslshData.polyCMData.polyCM);
            console.log(rslshData.polyCMData.polyCM.length);
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

    // it('write proof...   -> wrSSlsh(sk256-S-sig-error-rcv)', async () => {
    //     try {
    //
    //         let sslshData = {
    //             polyDataPln: {
    //                 polyData: "0xd556bb8f05185103b49857b3c06cb8c1f8a84e2c3a0a15e0d5dac471dfe376dd",
    //                 polyDataR: "0x67d3078e825ddc8c78f818b179f8f931cc8ffd8059c10ff0fa3b9c13948ed4c8",
    //                 polyDataS: "0x47c274ac1740b9a6a5d6d43d972efe737898c7cfcdb032bbde8311b65a843a18",
    //             },
    //
    //             gpkShare: "0x0524fd8df2a7ebbe41c5d12a77618577997cc3cc27af411e4875cebf1d28345044ffc19e776e91141d19e8d77bc4f18d0d0b134c5af603492b9ba99c98992cd4",
    //             m: "0x880f0106945a9f5a4375b2faa40f319db8d6aab041f9c21c4685cfbc1be6f84d",
    //             rpkShare: "0x6282d01a4b92757df999c6fede96892f693d8a6e0c16acae8dfe0ea06b2be5ff632f9bd12c91f5ad407705d5a1e4af2066b52b3811eeb3cec119d34b2e7cfb30",
    //
    //             sndrIndex: 0x02,
    //             rcvrIndex: 0x01,
    //             becauseSndr: 0x00,
    //             curveType: 0x00,
    //         };
    //         let ret = await metricInst.wrSSlsh(grpId,getXHash(),sslshData);
    //
    //     } catch (err) {
    //         assert.fail(err.toString());
    //     }
    // });

    it('write proof...   -> wrSSlsh(sk256-S-sig-error-rcv)', async () => {
        try {

            let sslshData = {
                polyDataPln: {
                    polyData: "0xaca32fa923280692463d083e1952e8f67edbb1e5382a8e653c06e2744d08dd25",
                    polyDataR: "0x031f267aee4134cde24e41a58f6dccc0f107aedc95dffff307a261d78f332122",
                    polyDataS: "0xff1d8007711e0753e4a8bbdd738d641a248711b2ffc93c0fd899dbe59a0da340",
                },

                gpkShare: "0x0524fd8df2a7ebbe41c5d12a77618577997cc3cc27af411e4875cebf1d28345044ffc19e776e91141d19e8d77bc4f18d0d0b134c5af603492b9ba99c98992cd4",
                m: "0x3db03d4b567ef20fad6e8ecf0996a9bfbefde01e81212f48f005fc32a4464bac",
                rpkShare: "0xcf230949c2f503cd7fbc1a75acbc9a302fdebc2a7f188bb319f433fba1c6d79794be256922ab84d1725ef17c6fb02e75482c9fcda8e3a038b895f7e27064e816",

                sndrIndex: 0x02,
                rcvrIndex: 0x01,
                becauseSndr: 0x00,
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

    it('write proof...   -> wrSSlsh(bn256-S-sig-error-rcv)', async () => {
        try {

            let sslshData = {
                polyDataPln: {
                    polyData: "0x1fa13a6ac1445253b74774b5ec823dc4aa393606340c804e44af7b380a436228",
                    polyDataR: "0x06a799c567072d7adf79540907e36203f99e3c06cf994571f53fbcea6a64443e",
                    polyDataS: "0xfdaeb8e86235db64d027ee1859f9160dbc8c3c455beb26d4759aa0d82cba89a2",
                },

                gpkShare: "0x0f7e1b51909341beb13a7b6a3ea6162e610042b5797983ebe8671b4c526a45e20378b478b4ac1d9dd31d05cb80135622217bfa889a43f33c1057cbe5a8f1a6db",
                m: "0x1d39826e0c8a9a4cd99dc3a03d6352b1e579404e3e6c3bee5bdd3a9be5470d23",
                rpkShare: "0x2199972d128032b2d83b24fd7b9c0f59798787253619fb799d9ee034eaf82db7226adfca3b0cfbcb8ea41224045e3b94c64896b1f25a3aad0d859df6e4ac321b",

                sndrIndex: 0x00,
                rcvrIndex: 0x00,
                becauseSndr: 0x00,
                curveType: 0x01,
            };
            let ret = await metricInst.wrSSlsh(grpId,getXHash(),sslshData);

        } catch (err) {
            assert.fail(err.toString());
        }
    });

    it('write proof...   -> wrSSlsh(bn256-S-content-error-rcv)', async () => {
        try {

            let sslshData = {
                polyDataPln: {
                    polyData: "0x5fc99316151ce3de1063d5d8caace77b2d595f040887754a2feff7eeada5b8",
                    polyDataR: "0xf07e0e85478f4c993a493ab9514aebea710710b5aea25c430f035bc1c9d6ddf6",
                    polyDataS: "0xefc107787606e057d49ac63a29b99b885912d681e497cf74c49e4c52fcd81cdf",
                },

                gpkShare: "0x240c656894bde7bf02434551fa6265304cab80c7c6b18ff6914a58f4cbc5206d0f224b6b642ca5deddda703645d6938832a75d7fc8ece1ad2aca8855c704ccf0",
                m: "0x25ba3f71ac5bf779a615a4a2250030e8ea1c9ce8649b42240189314e849a3335",
                rpkShare: "0x282d646e77014e19749405d10accbebb58199342f4cdcc1b443a97825839dad92c5f097fbddf7adfef84186ae1de0597c2acd060c84bf5c2bc1a52575db92eec",

                sndrIndex: 0x01,
                rcvrIndex: 0x00,
                becauseSndr: 0x00,
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