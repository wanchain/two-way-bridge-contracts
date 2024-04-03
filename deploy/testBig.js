let ethers = require('ethers')

async function sleep(time) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () {
			resolve();
		}, time);
	});
}

let Qstr='0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'
let HalfQstr='0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0'


let gpk_x_mainnet='0xaceaa17ffb7bfafe15e2c026801400564854c9839a1665b65f18b228dd55ebcd'
let gpk_x_testnet='0x764cf4df0b78f7d15433d927981c7467aae494bb4946d996890024a5ea8d0df6'

const mainnet_e_file='./ec-data/mainnet_e'
const testnet_e_file='./ec-data/testnet_e'


async function main() {

	let bQ= ethers.BigNumber.from(Qstr)
	console.log("Q",bQ.toHexString())

	let bHalfQ = ethers.BigNumber.from(HalfQstr)
	console.log("HalfQ",bHalfQ.toHexString())

	//let esMain = await readEsFromFile(mainnet_e_file)
	//let esTest = await readEsFromFile(testnet_e_file)

	let esMain = await processLineByLine(mainnet_e_file)
	console.log("esMain",esMain)

	let esTest = await processLineByLine(testnet_e_file)
	console.log("esTest",esTest)

	let esAll = esMain.concat(esTest) 
	console.log("esAll",esAll)
	let i = 0
	for(let e of esMain){
		let bE = ethers.BigNumber.from(e)
		console.log("bE",bE.toHexString())

		let bPx
		if(i<esMain.length){

			bPx = ethers.BigNumber.from(gpk_x_mainnet)
			console.log("bPx",bPx.toHexString())
		}else{

			bPx = ethers.BigNumber.from(gpk_x_testnet)
			console.log("bPx",bPx.toHexString())
		}


		// bytes32 ep = bytes32(Q - mulmod(uint256(e), uint256(px), Q));

		let bEpx = bE.mul(bPx).mod(bQ)
		console.log("bEpx",bEpx.toHexString())

		let bQMinusBEpx = bQ.sub(bEpx)
		console.log("bQMinusBepx",bQMinusBEpx.toHexString())

		if(bQMinusBEpx.gt(bHalfQ)){
			console.log(">bHalfQ","success")
		}else{

			console.log("not >bHalfQ","failure")
		}

	}

}


const fs = require('fs');
async function readEsFromFile(fileName){
	let ret=[]
	const fs = require('fs');

	const readFileLineByLine = (filename) => {
		const reader = fs.createReadStream(filename);

		reader.on('line', (line) => {
			console.log(line.toString()); // Process each line here
			ret.push(line.toString())
		});
	};

	readFileLineByLine(fileName);
	return ret
}


const readline = require('readline');
async function processLineByLine(fileName) {
    return new Promise((resolve, reject) => {

        try {
            let lines = [];
            const rl = readline.createInterface({
                input: fs.createReadStream(fileName),
                crlfDelay: Infinity
            });

            rl.on('line', (line) => {
                lines.push(line)
            });
            rl.on('close', () => {
                resolve(lines);
            });
        } catch (err) {
            reject(err);
        }
    });
}

main()
