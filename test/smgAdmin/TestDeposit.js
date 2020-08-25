
const TestDeposit = artifacts.require('TestDeposit');
const assert = require('assert');


contract('TestDeposit',async()=>{
    let td;
    before("init", async()=>{
			td = await TestDeposit.deployed();
			console.log("TestDeposit address:", td.address);
    })
    it("T1 add 1", async()=>{
			await td.add(1, 100);
			let v = await td.get(1);
			console.log("v is ", v);
			assert.equal(v,100, "add 1 failed");
		})
		it("T2 add 1 again", async()=>{
			await td.add(1, 200);
			let v = await td.get(1);
			console.log("v is ", v);
			assert.equal(v,300, "add 1 failed");
			let total = await td.getTotal();
			assert.equal(total, 1, "total is wrong")
		})
		it("T3 add 2", async()=>{
			await td.add(2, 200);
			let v = await td.get(2);
			console.log("v is ", v);
			assert.equal(v,500, "add 1 failed");
			let total = await td.getTotal();
			assert.equal(total, 2, "total is wrong")
		})
		it("T4 add 2 again", async()=>{
			await td.add(2, 200);
			let v = await td.get(2);
			console.log("v is ", v);
			assert.equal(v,700, "add 1 failed");
			let total = await td.getTotal();
			assert.equal(total, 2, "total is wrong")
		})
		it("T5, clean", async ()=>{
			await td.clean();
			let total = await td.getTotal();
			assert.equal(total, 0, "total is wrong")

			let v = await td.get(1);
			console.log("v is ", v);
			assert.equal(v,0, "clean failed");
			v = await td.get(2);
			console.log("v is ", v);
			assert.equal(v,0, "clean failed");
		})
})
