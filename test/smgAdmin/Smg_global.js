const utils = require("../utils");


const StoremanGroupDelegate = artifacts.require('StoremanGroupDelegate')
const StoremanGroupProxy = artifacts.require('StoremanGroupProxy');
const assert = require('chai').assert;
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');
const Web3 = require('web3')


const { registerStart,stakeInPre, setupNetwork, g } = require('../base.js');



contract('TestSmg', async () => {

    let  smg
		let groupId
		let contValue = 123456;
		let web3 = new Web3(new Web3.providers.HttpProvider(g.web3url));
    let wk = utils.getAddressFromInt(10000)

    before("init contracts", async() => {
        let smgProxy = await StoremanGroupProxy.deployed();
        smg = await StoremanGroupDelegate.at(smgProxy.address)
        await setupNetwork();
    })


    it('registerStart_1 ', async ()=>{
        groupId = await registerStart(smg);
    })

    it('stakeInPre ', async ()=>{
        await stakeInPre(smg, groupId)
    })

		it('T1 contribute', async ()=>{
			let tx = await smg.contribute({value:contValue, from: g.owner})
			expectEvent(tx, 'storemanGroupContributeEvent', {sender: web3.utils.toChecksumAddress(g.owner), value: contValue})
		})
    it('T2 getGlobalIncentive', async ()=>{
				let tx = await smg.getGlobalIncentive();
				assert(contValue, tx, "getGlobalIncentive failed");
        console.log("tx:", tx);
    })



})
