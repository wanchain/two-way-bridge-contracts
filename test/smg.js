let smgAdminAddr =  '0xa028B393aAEC3CC8AFC0D3f29B53a11F2F8a76f3';
const  smgAdminAbi =  require('../osmAbi.json')
const Web3 = require('web3')

const web3url = "http://192.168.1.58:7654"


async function main() {
  let web3 = new Web3(new Web3.providers.HttpProvider(web3url))
  let smg = new web3.eth.Contract(smgAdminAbi,smgAdminAddr)
    let wk = "0x5793e629c061e7fd642ab6a1b4d552cec0e2d606"
  
    let sk = await smg.methods.getStoremanInfo(wk).call()
    console.log("storeman info:", sk )
    let leader = await smg.methods.getSelectedSmInfo(sk.groupId, 0).call();
    console.log("leader:", leader.wkAddr);

    console.log("storeman info:", await smg.methods.getStoremanGroupInfo(wk).call())
    let tx = await smg.methods.incentiveCandidator(wk).send({gasLimit:1000000, value:0,from:"0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e"});
    console.log("tx:", tx);
    

}
main();
