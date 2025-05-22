const fs= require('fs');
const path= require('path');

const abiPrefix = "abi.";
const dirpath = `../artifacts/contracts`
const abiFiles = [
    [
        `${dirpath}/storemanGroupAdmin/StoremanGroupDelegate.sol/StoremanGroupDelegate.json`,
        `${dirpath}/storemanGroupAdmin/StoremanLib.sol/StoremanLib.json`,
        `${dirpath}/storemanGroupAdmin/IncentiveLib.sol/IncentiveLib.json`,
    ],
    [
        `${dirpath}/metric/MetricDelegate.sol/MetricDelegate.json`,
        `${dirpath}/metric/MetricStorage.sol/MetricStorage.json`,
    ],
    [
        `${dirpath}/gpk/GpkDelegate.sol/GpkDelegate.json`,
        `${dirpath}/gpk/lib/GpkLib.sol/GpkLib.json`,
    ],
    [
        `${dirpath}/schnorr/EcSchnorrVerifier.sol/EcSchnorrVerifier.json`,
    ],
    [
        `${dirpath}/schnorr/Bn128SchnorrVerifier.sol/Bn128SchnorrVerifier.json`,
    ],
    [
        `${dirpath}/schnorr/SignatureVerifier.sol/SignatureVerifier.json`,
    ],
    [
        `${dirpath}/tokenManager/TokenManagerDelegate.sol/TokenManagerDelegate.json`,
    ],
    [
        `${dirpath}/oracle/OracleDelegate.sol/OracleDelegate.json`,
    ],
    [
        `${dirpath}/tokenManager/WrappedToken.sol/WrappedToken.json`,
    ],
    [
        `${dirpath}/lib/PosLib.sol/PosLib.json`,
    ],
    [
        `${dirpath}/storemanGroupAdmin/ListGroup.sol/ListGroup.json`,
    ],
    [
        `${dirpath}/tokenManager/TokenManagerDelegateV2.sol/TokenManagerDelegateV2.json`,
        `${dirpath}/tokenManager/TokenManagerDelegate.sol/TokenManagerDelegate.json`,
    ],
    [
        `${dirpath}/crossApproach/CrossDelegateV4.sol/CrossDelegateV4.json`,
        `${dirpath}/crossApproach/lib/RapidityLibV4.sol/RapidityLibV4.json`,
        `${dirpath}/crossApproach/lib/NFTLibV1.sol/NFTLibV1.json`,
    ],
    [
        `${dirpath}/crossApproach/CrossDelegateV5.sol/CrossDelegateV5.json`,
        `${dirpath}/crossApproach/CrossDelegateV4.sol/CrossDelegateV4.json`,
        `${dirpath}/crossApproach/lib/RapidityLibV4.sol/RapidityLibV4.json`,
        `${dirpath}/crossApproach/lib/NFTLibV1.sol/NFTLibV1.json`,
    ],
    [
        `${dirpath}/crossApproach/CrossDelegateXinFin.sol/CrossDelegateXinFin.json`,
        `${dirpath}/crossApproach/lib/RapidityLibV4.sol/RapidityLibV4.json`,
        `${dirpath}/crossApproach/lib/NFTLibV1.sol/NFTLibV1.json`,
    ]
];

function generateAbi(abiFile) {
    let total = [];
    let filename;
    for(let i = 0; i < abiFile.length; ++i) {
        if (!filename) {
            let parsed = path.parse(abiFile[i]);
            filename = path.format({
                dir: __dirname,
                name: abiPrefix.concat(parsed.name),
                ext: parsed.ext
            });
        }

        let content = fs.readFileSync(__dirname+'/'+abiFile[i], 'utf8');
        let json = JSON.parse(content);
        for(let k= 0; k< json.abi.length; ++k) {
            if(0 === i || json.abi[k].type == 'event') {
            total.push(json.abi[k])
        }
    }
    }
    console.log("abi path:",filename);
    fs.writeFileSync(filename, JSON.stringify(total));
}

function main () {
    abiFiles.forEach(abiFile => {
        generateAbi(abiFile);
    });
}

main();
