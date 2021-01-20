const fs= require('fs');
const path= require('path');

const abiPrefix = "abi.";
const abiFiles = [
    [
        '../build/contracts/StoremanGroupDelegate.json',
        '../build/contracts/StoremanLib.json',
        '../build/contracts/IncentiveLib.json',
    ],
    [
        '../build/contracts/MetricDelegate.json',
        '../build/contracts/MetricStorage.json',
    ],
    [
        '../build/contracts/GpkDelegate.json',
        '../build/contracts/GpkLib.json',
    ],
    [
        '../build/contracts/CrossDelegate.json',
        '../build/contracts/HTLCDebtLib.json',
        '../build/contracts/RapidityLib.json',
    ],
    [
        '../build/contracts/SignatureVerifier.json',
    ],
    [
        '../build/contracts/TokenManagerDelegate.json',

    ],
    [
        '../build/contracts/QuotaDelegate.json',
    ],
    [
        '../build/contracts/OracleDelegate.json',
    ],
    [
        '../build/contracts/MappingToken.json',
    ],
    [
        '../build/contracts/PosLib.json',
    ],
    [
        '../build/contracts/ListGroup.json',
    ],
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
