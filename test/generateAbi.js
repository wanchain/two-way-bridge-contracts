const fs= require('fs');
const path= require('path');

const abiFile = [
    '../build/contracts/StoremanGroupDelegate.json',
    '../build/contracts/StoremanLib.json',
    '../build/contracts/IncentiveLib.json',
]
function main() {
    let total = [];
    for(let i=0; i<abiFile.length; i++) {
	let content = fs.readFileSync(__dirname+'/'+abiFile[i], 'utf8');
	let json = JSON.parse(content);
	for(let k=0; k<json.abi.length; k++) {
	    if(i==0 || json.abi[k].type == 'event') {
		total.push(json.abi[k])
	    }
	}
	//total = total.concat(json.abi);
    }
    //console.log("Total:",total);
    fs.writeFileSync('./osmAbi.json', JSON.stringify(total));
}

main();
