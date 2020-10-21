const utils = require("./utils");
const assert = require('chai').assert;
const Web3 = require('web3');
const optimist = require("optimist");
const config = require("../truffle-config");
const ListGroup = artifacts.require('ListGroup');
 
//const timeMachine = require('ganache-time-traveler');
const wanutil = require('wanchain-util');
const Tx = wanutil.wanchainTx
const EthTx = require('ethereumjs-tx').Transaction

let web3url, owner, leader, admin, leaderPk, web3;

const args = optimist.argv;
const whiteCountAll = 4;
const whiteBackup = 3;
const whiteCount = whiteCountAll - whiteBackup;
const memberCountDesign = 4;
const threshold  = 3;
const stakerCount = memberCountDesign + whiteBackup;
const registerDuration = 5; // open staking for 10 days.
const gpkDuration = 3;
const htlcDuration = 10; // work 90 day.
const timeBase = 1;
const wanChainId = 2153201998;
const ethChainId = 2147483708;
const curve1 = 0, curve2 = 1;
const minStakeIn = 50000;
const minDelegateIn = 100;
const minPartIn = 10000;
const delegateFee = 1000;
const whiteAddrStartIdx = 0;
const whiteAddrOffset = 2000;
const otherAddrOffset = whiteAddrOffset * 20;
const gGasPrice = 1000000000
const gGasLimit = 10000000

const storemanGroupStatus  = {
    none                      : 0,
    initial                   : 1,
    curveSeted                : 2,
    failed                    : 3,
    selected                  : 4,
    ready                     : 5,
    unregistered              : 6,
    dismissed                 : 7
};

const g = {
    leader,owner,admin,whiteCount,whiteBackup,whiteCountAll,memberCountDesign,threshold,leaderPk,web3url,stakerCount,
    gpkDuration,registerDuration,htlcDuration,timeBase,wanChainId,ethChainId,curve1,curve2,storemanGroupStatus,
    minStakeIn,minDelegateIn,minPartIn,delegateFee,whiteAddrStartIdx,whiteAddrOffset,otherAddrOffset
}

async function setupNetwork() {
    let network = args.network ? args.network : "development";
    g.admin = config.networks[network].admin;
    g.web3url = "http://" + config.networks[network].host + ":" + config.networks[network].port;
    console.log("setup network %s", network);
    if (network == 'local' || network == 'coverage') {
        g.owner = "0xEf73Eaa714dC9a58B0990c40a01F4C0573599959";
        g.leader = ("0xdF0A667F00cCfc7c49219e81b458819587068141").toLowerCase();

        web3 = new Web3(new Web3.providers.HttpProvider(g.web3url));
        g.web3 = web3;
        let accounts = await web3.eth.getAccounts();
        g.leaderPk = "0x6bd7c410f7c760cca63a3dfabeeeed08f371b080f1c0d37e5cfda1c7f48d8234af06766ff7aa007a574449bce2c54469a675228876094f2c97438027f5070cbd";
        g.sfs = accounts.slice(1,10);
        g.timeBase = 1;

        g.wks = accounts.slice(30,40);
        //console.log("wks:", g.wks)
        g.pks = [ '0x6bd7c410f7c760cca63a3dfabeeeed08f371b080f1c0d37e5cfda1c7f48d8234af06766ff7aa007a574449bce2c54469a675228876094f2c97438027f5070cbd',
        '0x7ca2927d8343de9ae70638249beca7e42b86a71036081c36552c2f0a55d44cf11b3ba9c2d2fb47ae4f0d533e66f1e9e2dbc2d1788400f7dfb1b5ebc562bc9d56',
        '0xb5c60f28d5750cdfe82d99973896a14413873f23fe8481378ac4f6f4541b87d144a2512ba4e6328098a8799836ac0b0a7f44c9a9468b559c56186231c64bb695',
        '0x44802b56605d43cbd459e785419a92c3b6955c09e78cd7fa15b93d03f648312188bdba0def696a4a08f24b4594019bb2782babb4043158e113a94fcc2d17614b',
        '0xc5de31d9e261eddd7b8040d680e1be3dfa0a59b604e8a0b31998a5333feed9ebeb63a071e2ad06994b100f9cabbcd0ea9468b610f140bf622881eadc6e08279e',
        '0x8bff08642ec1b95ae9098987601fe4128f5673b76c098bc73ef1db68bfb02e3deb6f921553dc87939286e8a8d5abaa51cf7b8aff8a13bfa809ba66361a3c6e32',
        '0x68e3bd3fa348a594ce5512852194bebe884533873dce9c04bc4b0c22dd9cab3c3588f3a87a0d2ab230b410752f70433d30e6e3826b4fdb5741641b612bfc550d',
        '0x54862eacc67e46dd7b254b0547e05b87fcbbfeae00a656f88ccb3faf3fd32bf1dea38fa497e105d4c74c7ba8cdc873ead73d35309b04cf0e3d9539d6c8c97ba8',
        '0x69c7976d2b4c172290bdb5290fdfb0e979125be0573e9315e900ea70c0cd21e21d10db5d02c207d82ac0d4999de300e973b9bd090a7c36ea2ffb864f1c6ca0bf',
        '0xc2ebfd865b83f87d94ed89559029cf1c08b4a965ae13084b4bcae2743b928d17892e0003b6e25513d1f0354a07cf1fb4a3b7a3cd1ea480946e92db9ecbe3ade2',
        '0xb05235fda9b61f4d35f4f1278bcf42df2fe9e0c6c0bb8674269c879cc8431f99613e851772c51549a66169640492986793f633576b7b2240b53bddf05e393443' ]
    } else {
        g.owner = "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e";
        g.leader = "0x5793e629c061e7fd642ab6a1b4d552cec0e2d606";
        g.leaderPk = "0x25fa6a4190ddc87d9f9dd986726cafb901e15c21aafd2ed729efed1200c73de89f1657726631d29733f4565a97dc00200b772b4bc2f123a01e582e7e56b80cf8";
        g.sfs = [
            "0x5793e629c061e7fd642ab6a1b4d552cec0e2d606",
            "0xe89476b7cc8fa1e503f2ae4a43e53eda4bfbac07",
            "0x8c36830398659c303e4aedb691af8c526290452a",
            "0x431039e7b144d6e46c8e98497e87a5da441c7abe",
            "0x82ef7751a5460bc10f731558f0741705ba972f4e",
            "0xffb044cd928c1b7ef6cc15932d06a9ce3351c2dc",
            "0x23dcbe0323605a7a00ce554babcff197baf99b10",
            "0xf45aedd5299d16440f67efe3fb1e1d1dcf358222",
            "0x63ee75865b30f13b614a144023c133bd683e8134",
            "0x9ac0e946d9dc8fa6d4731cc51f538936aac968b8",
            "0xe7215f2786e18a0b0553aeb51421f0aa1615ae6e",
        ]
        g.wks = [
            "0x5793e629c061e7fd642ab6a1b4d552cec0e2d606",
            "0xe89476b7cc8fa1e503f2ae4a43e53eda4bfbac07",
            "0x8c36830398659c303e4aedb691af8c526290452a",
            "0x431039e7b144d6e46c8e98497e87a5da441c7abe",
            "0x82ef7751a5460bc10f731558f0741705ba972f4e",
            "0xffb044cd928c1b7ef6cc15932d06a9ce3351c2dc",
            "0x23dcbe0323605a7a00ce554babcff197baf99b10",
            "0xf45aedd5299d16440f67efe3fb1e1d1dcf358222",
            "0x63ee75865b30f13b614a144023c133bd683e8134",
            "0x9ac0e946d9dc8fa6d4731cc51f538936aac968b8",
            "0xe7215f2786e18a0b0553aeb51421f0aa1615ae6e",
        ];
        g.pks = [
            "0x25fa6a4190ddc87d9f9dd986726cafb901e15c21aafd2ed729efed1200c73de89f1657726631d29733f4565a97dc00200b772b4bc2f123a01e582e7e56b80cf8",
            "0x8d3f06b158ddd609f83b0531466fc2a3da6aa80b433a92ddeeb20435cf33ddae2d554a99efde513bb8b6e5f4dbd2e942f1d0a64198c3df2c4c74705d4b37af63",
            "0x9cbf013d04ca50ba852816c2802b06ca5ed37b44be9597fc0f95360e209afa97fd92b02bfb9da099b5954b706baa27f08b009636f8450888125e70418893846c",
            "0xf814a79cf258f553255c1cb3a054fcc0d0c71d74742b6627210ea846915967290119fc95be48b4b223c80c42fd1f3d450271ce8aedeb82dc31813f75a32d867d",
            "0xccd16e96a70a5b496ff1cec869902b6a8ffa00715897937518f1c9299726f7090bc36cc23c1d028087eb0988c779663e996391f290631317fc22f84fa9bf2467",
            "0x95e8fd461c37f1db5da62bfbee2ad305d77e57fbef917ec8109e6425e942fb60ddc28b1edfdbcda1aa5ace3160b458b9d3d5b1fe306b4d09a030302a08e2db93",
            "0xbe3b7fd88613dc272a36f4de570297f5f33b87c26de3060ad04e2ea697e13125a2454acd296e1879a7ddd0084d9e4e724fca9ef610b21420978476e2632a1782",
            "0xc06543fc47e18816bc720604cfc208266f4e5cc0f436e149e2dab0e8a7981e7722070465f3a4a7c21134819ac194cc9d2818543117ec634ee663483197021441",
            "0xbdea83a8a6bd7ad6ddcb43abd9ad947287521e6d9e634275a106c1e92fef94a000684f05fb48346c787ba497b9318cf772c2f093a760fe363758ff10f13ac7bb",
            "0x4983d95b3716aefa4a14d116bded84e10fd5b050bd6001caa2b97086b4d5c68e1373426da2efcd14333d47bcebd3befcf5e609a66fac1b0280cdae2c07f0a279",
            "0x5a7cef17a69a44cfd04e8a3696420b863e266dfaad35766c33e6d9d2e48c2e917ec73dcf9fef9b9d9a4fc915757102a0776de17904376bae87493a5cbba2d33a",
        ]
        g.timeBase = 120;
        web3 = new Web3(new Web3.providers.HttpProvider(g.web3url));
        g.web3 = web3;
    }
}

function initTestValue(key, value) {
    g[key] = value;
}

async function registerStart(smg, wlStartIndex = g.whiteAddrStartIdx, option = {}){
    //await smg.updateStoremanConf(3,15000,10)
    let now = parseInt(Date.now()/1000);
    let ws = []
    let srs= []
    for(let i = 0; i < g.whiteCountAll; ++i){
        ws.push(g.wks[i+wlStartIndex])
        srs.push(g.sfs[i % g.sfs.length])
    }
    let groupId = option.groupId ? option.groupId : utils.stringTobytes32(Date.now().toString());
    let registerDuration = option.registerDuration ? option.registerDuration : g.registerDuration;
    let gpkDuration =  option.gpkDuration ? option.gpkDuration : g.gpkDuration;
    let htlcDuration =  option.htlcDuration ? option.htlcDuration : g.htlcDuration;
    let memberCountDesign = option.memberCountDesign ? option.memberCountDesign : g.memberCountDesign;
    let threshold = option.threshold ? option.threshold : g.threshold;
    let preGroupId =  option.preGroupId ? option.preGroupId : utils.stringTobytes32("");
    let delegateFee1 =  option.delegateFee!=undefined ? option.delegateFee : delegateFee;

    let smgIn = {
        groupId: groupId,
        preGroupId: preGroupId,
        workTime:now+(registerDuration+gpkDuration)*g.timeBase,
        totalTime:htlcDuration*g.timeBase,
        registerDuration: registerDuration*g.timeBase,
        memberCountDesign:memberCountDesign,
        threshold:threshold,
        chain1:ethChainId,
        chain2:wanChainId,
        curve1:curve1,
        curve2:curve2,
        minStakeIn:minStakeIn,
        minDelegateIn:minDelegateIn,
        minPartIn:minPartIn,
        delegateFee:delegateFee1,
    }
    //console.log("wks: %O, ws: %O, srs: %O", g.wks, ws, srs)
    let tx = await smg.storemanGroupRegisterStart(smgIn, ws, srs, {from: g.admin})
    console.log("registerStart txhash:", tx.tx)
    let group = await smg.getStoremanGroupInfo(groupId)
    assert.equal(group.status, storemanGroupStatus.curveSeted)
    assert.equal(group.groupId, groupId)
    if(!preGroupId) {
        assert.equal(group.deposit, 0)
        assert.equal(group.memberCount, 1)
    }

    //console.log("group:", group)
    return group.groupId
}

async function stakeInPre(smg, groupId, nodeStartIndex = g.whiteAddrStartIdx, nodeCount = g.stakerCount){
    console.log("smg.contract:", smg.contract._address);
    for(let i=0; i<nodeCount; i++){
        let stakingValue = g.minStakeIn ;
        let sw, tx;
        sw = {addr:g.wks[i+nodeStartIndex], pk:g.pks[i+nodeStartIndex]};
        //console.log("send============================:", g.sfs[i % g.sfs.length]);
        tx = await smg.stakeIn(groupId, sw.pk, sw.pk,{from:g.sfs[i % g.sfs.length], value:stakingValue});

        //console.log("preE:", i, tx.tx);
        let candidate  = await smg.getStoremanInfo(sw.addr)
        //console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), g.sfs[i % g.sfs.length].toLowerCase());
        assert.equal(candidate.wkAddr.toLowerCase(), sw.addr.toLowerCase());
        assert.equal(candidate.deposit, stakingValue);
    }
}

async function stakeWhiteList(smg, groupId, nodeStartIndex = g.whiteAddrStartIdx){
    console.log("smg.contract:", smg.contract._address);
    console.log("groupId:", groupId, "nodeStartIndex", nodeStartIndex);
    for(let i = 0; i < g.whiteCountAll; ++i){
        let stakingValue = g.minStakeIn;
        let sw, tx;
        console.log("stakeWhiteList", i, nodeStartIndex, g.wks[i+nodeStartIndex]);
        sw = {addr:g.wks[i+nodeStartIndex], pk:g.pks[i+nodeStartIndex]};
        //console.log("send============================ws: %O, srs: %O:", sw.addr, g.sfs[i % g.sfs.length]);
        tx = await smg.stakeIn(groupId, sw.pk, sw.pk,{from:g.sfs[i % g.sfs.length], value:stakingValue});

        console.log("preE:", i, tx.tx);
        let candidate  = await smg.getStoremanInfo(sw.addr);
        //console.log("candidate:", candidate)
        assert.equal(candidate.sender.toLowerCase(), g.sfs[i % g.sfs.length].toLowerCase());
        assert.equal(candidate.wkAddr.toLowerCase(), sw.addr.toLowerCase());
        assert.equal(candidate.deposit, stakingValue);
    }
    return g.whiteCountAll;
}

async function stakeInOne(smg, groupId, nodeIndex, value){
    console.log("smg.contract:", smg.contract._address)
    let sf = utils.getAddressFromInt(nodeIndex+1000)
    let sw = utils.getAddressFromInt(nodeIndex+g.whiteAddrOffset)
    let en = utils.getAddressFromInt(nodeIndex+3000)
    let sdata =  smg.contract.methods.stakeIn(groupId, sw.pk,en.pk).encodeABI()
    //console.log("sdata:",sdata)
    let rawTx = {
        Txtype: 0x01,
        nonce:  await pu.promisefy(web3.eth.getTransactionCount,[sf.addr,"pending"], web3.eth),
        gasPrice: gGasPrice,
        gas: gGasLimit,
        to: smg.contract._address,
        chainId: 6,
        value: value,
        data: sdata,
    }
    //console.log("rawTx:", rawTx)
    let tx = new Tx(rawTx)
    tx.sign(sf.priv)
    const serializedTx = '0x'+tx.serialize().toString('hex');
    //console.log("serializedTx:",serializedTx)
    console.log("sm %d %s stakein %d", nodeIndex, sw.addr, value)
    await web3.eth.sendSignedTransaction(serializedTx)
    let candidate  = await smg.getStoremanInfo(sw.addr)
    //console.log("candidate:", candidate)
    assert.equal(candidate.sender.toLowerCase(), sf.addr)
    assert.equal(candidate.wkAddr.toLowerCase(), sw.addr)
    assert.equal(candidate.deposit, value)
    return sw.addr
}
async function sendTransaction(sf, value, sdata, to){

    let rawTx = {
        nonce:  await web3.eth.getTransactionCount(sf.addr,"pending"),
        gasPrice: gGasPrice,
        gas: gGasLimit,
        to: to,
        chainId: 3,
        value: value,
        data: sdata,
    }
    let tx = new EthTx(rawTx)
    let pri = sf.priv
    
    if(typeof(pri) == 'string'){
        pri = Buffer.from(sf.priv.slice(2), 'hex')
    }
    tx.sign(pri)
    const serializedTx = '0x'+tx.serialize().toString('hex');

    let receipt = await web3.eth.sendSignedTransaction(serializedTx)
    return receipt
}

async function toSelect(smg, groupId){
    let groupInfo = await smg.getStoremanGroupInfo(groupId);
    let second = 1+parseInt(groupInfo.registerTime)+parseInt(groupInfo.registerDuration)
    await utils.sleepUntil(second*1000)
    let tx = await smg.select(groupId,{from: g.leader})
    console.log("group %s select tx:", groupId, tx.tx)
    let count = await smg.getSelectedSmNumber(groupId)
    console.log("slected sm number: %d", count);  
    for (let i = 0; i<count; i++) {
        let ski = await smg.getSelectedSmInfo(groupId, i)
        //console.log("selected node %d: %O", i, skAddr);
        let sk = await smg.getStoremanInfo(ski.wkAddr);
        //console.log("storeman %d info: %O", i, sk);
    }    
}
async function toStakeIn(smg, groupId, wk, value=50000, from=g.admin){
    let tx = await smg.stakeIn(groupId,wk.pk, wk.pk, {from: from, value:value})
    //await timeMachine.advanceBlock();
    let block = await g.web3.eth.getBlock(tx.receipt.blockNumber);
    console.log("toStakeIn sk %s at %d:", wk.addr, block.timestamp)  
    return block.timestamp
}

async function toDelegateIn(smg, wkAddr, index=30000,count=11, value=100){
    for(let i=index; i<index+count;i++){
        let d = utils.getAddressFromInt(i)
        let sdata =  smg.contract.methods.delegateIn(wkAddr).encodeABI()
        
        await web3.eth.sendTransaction({from:g.owner, to:d.addr, value:web3.utils.toWei('1')})
        await sendTransaction(d, value, sdata,smg.contract._address);
    }
}
async function toPartIn(smg, wkAddr, index=40000,count=3, value=10000){
    for(let i=0; i<count;i++){
        let d = utils.getAddressFromInt(i+index)
        let sdata =  smg.contract.methods.partIn(wkAddr).encodeABI()
        
        await web3.eth.sendTransaction({from:g.owner, to:d.addr, value:web3.utils.toWei('1')})
        await sendTransaction(d, value, sdata,smg.contract._address);
        let addr = await smg.getSmPartnerAddr(wkAddr, i);
        assert.equal(addr, web3.utils.toChecksumAddress(d.addr))
    }
}

async function toDelegateClaim(smg, wkAddr, index=30000,count=11){
    for(let i=index; i<index+count;i++){
        let d = utils.getAddressFromInt(i)
        let sdata =  smg.contract.methods.delegateClaim(wkAddr).encodeABI()
        
        await web3.eth.sendTransaction({from:g.owner, to:d.addr, value:web3.utils.toWei('1')})
        await sendTransaction(d, 0, sdata,smg.contract._address);
    }
}
async function toPartClaim(smg, wkAddr, index=40000,count=3){
    for(let i=index; i<index+count;i++){
        let d = utils.getAddressFromInt(i)
        let sdata =  smg.contract.methods.partClaim(wkAddr).encodeABI()
        
        await web3.eth.sendTransaction({from:g.owner, to:d.addr, value:web3.utils.toWei('1')})
        await sendTransaction(d, 0, sdata,smg.contract._address);
    }
}


// async function endIncentive(smg, groupId,wkAddr, cb) {
//     let snapshot = await timeMachine.takeSnapshot();
//     let snapshotId = snapshot['result'];
    
//     await _endIncentive(smg, groupId, wkAddr);
//     await cb();
//     await timeMachine.revertToSnapshot(snapshotId);
// }
// async function _endIncentive(smg, groupId,wkAddr) {  // only be the last case
//     let groupInfo = await smg.getStoremanGroupInfo(groupId)
//     if(groupInfo.status < g.storemanGroupStatus.selected){
//         let second = 1+parseInt(groupInfo.registerTime)+parseInt(groupInfo.registerDuration)
//         await timeSet(second)
//         await toSelect(smg, groupId);
//     }
//     await smg.updateGroupStatus(groupId, g.storemanGroupStatus.ready, {from:g.admin})
//     await timeSet(parseInt(groupInfo.endTime)+1)
//     await smg.contribute({from: g.owner, value: web3.utils.toWei('1000')})
//     while(true){
//         let tx = await smg.incentiveCandidator(wkAddr, {from:g.leader})
//         let incLog = tx.logs[0].args;
//         console.log("incLog:", incLog)
//         if(incLog.finished) break;
//     }
//     Info = await smg.getStoremanInfo(wkAddr)
//     console.log("Info after endIncentive:", Info)

//     let ins = await smg.getStoremanIncentive(wkAddr, 0);
//     console.log("incentive day %d, amount %d:", 0, ins)

//     groupInfo = await smg.getStoremanGroupInfo(groupId)
//     console.log("groupInfo after endIncentive:", groupInfo)

//     for(let i=parseInt(groupInfo.startTime)/g.timeBase; i<parseInt(groupInfo.endTime)/g.timeBase; i++){
//         let a = await smg.checkGroupIncentive(groupId, i)
//         console.log("group %s day %d incentive %s.", groupId, i, a.toString(10))
//     }

//     for(let i=parseInt(groupInfo.startTime)/g.timeBase; i<parseInt(groupInfo.endTime)/g.timeBase; i++){
//         let a = await smg.getStoremanIncentive(wkAddr, i)
//         console.log("sk %s day %d incentive %s.", wkAddr, i, a.toString(10))
//     }
  
// }

// async function timeAfter(second,cb) {
//     let snapshot = await timeMachine.takeSnapshot();
//     let snapshotId = snapshot['result'];
    

//     await timeMachine.advanceBlockAndSetTime(second)
//     await cb();

//     await timeMachine.revertToSnapshot(snapshotId);
// }
// async function timeSet(second) {
//     if (args.network == 'local' || args.network == 'coverage')  {
//         console.log("advanceBlockAndSetTime: ", second)
//         await timeMachine.advanceBlockAndSetTime(second)
//     } else {
//         console.log("sleepUntil: ", second)
//         await utils.sleepUntil(second*1000)
//     }
// }
async function timeWaitSelect(groupInfo) {
    let second = 1+parseInt(groupInfo.registerTime)+parseInt(groupInfo.registerDuration)
    await utils.sleepUntil(second*1000)
}
async function timeWaitEnd(groupInfo) {
    console.log("timeWaitEnd groupInfo.endTime: ", parseInt(groupInfo.endTime))
    let second = 1+parseInt(groupInfo.endTime)
    await utils.sleepUntil(second*1000)
}
async function toSetGpk(smg, groupId){
    let groupInfo = await smg.getStoremanGroupInfo(groupId)
    if(groupInfo.status < g.storemanGroupStatus.selected){
        await timeWaitSelect(groupInfo)
        await toSelect(smg, groupId);
    }
    if(groupInfo.status < g.storemanGroupStatus.ready){
        let dep = await smg.getDependence();
        await smg.setDependence(g.admin, g.admin, g.admin,g.admin);
        await smg.setGpk(groupId, g.leaderPk, g.leaderPk, {from:g.admin})
        await smg.setDependence(dep[0], dep[1], dep[2], dep[3]);
    }
}
async function timeWaitIncentive(smg, groupId, wkAddr) {
    let groupInfo = await smg.getStoremanGroupInfo(groupId)
    let listGroup = await ListGroup.deployed();
    if(groupInfo.status < g.storemanGroupStatus.selected){
        await timeWaitSelect(groupInfo)
        await toSelect(smg, groupId);
    }
    if(groupInfo.status < g.storemanGroupStatus.ready){
        groupInfo = await smg.getStoremanGroupInfo(groupId)
        console.log("selected groupInfo:", groupInfo)
        let dep = await smg.getDependence();
        await smg.setDependence(g.admin, g.admin, g.admin,g.admin);
        await smg.setGpk(groupId, g.leaderPk, g.leaderPk, {from:g.admin})
        await smg.setDependence(dep[0], dep[1], dep[2], dep[3]);
    }

    //await smg.updateGroupStatus(groupId, g.storemanGroupStatus.ready, {from:g.admin})
    let second = 2+parseInt(groupInfo.endTime)
    await utils.sleepUntil(second*1000)
    await smg.contribute({from: g.owner, value: web3.utils.toWei('1000')})
    while(true){
        let cur = parseInt(Date.now()/1000);
        try {
            let tx = await smg.incentiveCandidator(wkAddr, {from:g.leader, gas:"0x6691b7"})
            let incLog = tx.logs[0].args;
            console.log("====================================================incLog:", incLog, tx)
            if(incLog.finished) break;
        } catch(err){
            let gs = await listGroup.getGroups();
            console.log("cur gs:", cur, gs, err)
            throw(err);
        }
    }
    Info = await smg.getStoremanInfo(wkAddr)
    console.log("Info after endIncentive:", Info)

    let ins = await smg.getStoremanIncentive(wkAddr, 0);
    console.log("incentive day %d, amount %d:", 0, ins)

    groupInfo = await smg.getStoremanGroupInfo(groupId)
    //console.log("groupInfo after endIncentive:", groupInfo)

    for(let i=parseInt(groupInfo.startTime)/g.timeBase; i<parseInt(groupInfo.endTime)/g.timeBase; i++){
        let a = await smg.checkGroupIncentive(groupId, i)
        console.log("group %s day %d incentive %s.", groupId, i, a.toString(10))
    }

    for(let i=parseInt(groupInfo.startTime)/g.timeBase; i<parseInt(groupInfo.endTime)/g.timeBase; i++){
        let a = await smg.getStoremanIncentive(wkAddr, i)
        console.log("sk %s day %d incentive %s.", wkAddr, i, a.toString(10))
    }





}


module.exports = {
    g,setupNetwork,toDelegateClaim, toPartClaim,
    registerStart,stakeInOne,toStakeIn,timeWaitIncentive,toDelegateIn,toPartIn,toSetGpk,
    stakeInPre,stakeWhiteList,toSelect,timeWaitSelect,timeWaitEnd,sendTransaction,
    initTestValue
}
