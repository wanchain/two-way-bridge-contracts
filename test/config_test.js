const { assert } = require('chai');

contract('Test Config', async (accounts) => {
    let cnf, delegate;
    before("init...   -> success", async () => {
        let ConfigDelegate = await ethers.getContractFactory("ConfigDelegate");
        delegate = await ConfigDelegate.deploy();
        await delegate.deployed();

        let ConfigProxy = await ethers.getContractFactory("ConfigProxy");
        let configProxy = await ConfigProxy.deploy();
        await configProxy.deployed();
        await configProxy.upgradeTo(delegate.address);
        assert.equal(await configProxy.implementation(), delegate.address)

        cnf = await ethers.getContractAt("ConfigDelegate", configProxy.address);
    });

    it("[upgradeTo] should failed -> Not owner", async () => {
        try {
            let signers = await hre.ethers.getSigners();
            let configProxy = await ethers.getContractAt("ConfigProxy", cnf.address);
            await configProxy.connect(signers[5]).upgradeTo(delegate.address);
            assert.fail(ERROR_INFO);
        } catch (err) {
            console.log(err)
            assert.include(
                err.toString(),
                "Not owner"
            );
        }
    });

    it('[upgradeTo] should failed -> Cannot upgrade to the same implementation', async () => {
        try {
            let configProxy = await ethers.getContractAt("ConfigProxy", cnf.address);
            await configProxy.upgradeTo(delegate.address);
            assert.fail("should be failed");
        } catch (err) {
            assert.include(err.toString(), "Cannot upgrade to the same implementation");
        }
    });

    it('[upgradeTo] should failed -> Cannot upgrade to invalid address', async () => {
        try {
            let configProxy = await ethers.getContractAt("ConfigProxy", cnf.address);
            await configProxy.upgradeTo("0x0000000000000000000000000000000000000000");
            assert.fail("should be failed");
        } catch (err) {
            assert.include(err.toString(), "Cannot upgrade to invalid address");
        }
    });

    it('[addAdmin] should success -> ', async () => {
        await cnf.addAdmin(accounts[0]);
        assert.equal(await cnf.mapAdmin(accounts[0]), true);
        assert.equal(await cnf.mapAdmin(accounts[1]), false);
    });

    // halted
    it('[setHalt] should success ->', async () => {
        await cnf.setHalt(true);
        assert.equal(await cnf.halted(), true);
        await cnf.setHalt(false);
    });

    it('[setCurve] should failed -> not admin', async () => {
        try {
            let signers = await hre.ethers.getSigners();
            await cnf.connect(signers[1]).setCurve([0], [accounts[0]]);
            assert.fail("should be failed");
        } catch (err) {
            assert.include(err.toString(), "not admin");
        }
    });

    it('[setCurve] should failed -> Mismatched length', async () => {
        try {
            await cnf.setCurve([0, 1], [accounts[0]]);
            assert.fail("should be failed");
        } catch (err) {
            assert.include(err.toString(), "Mismatched length");
        }
    });

    it('[setCurve] should success ->', async () => {
        await cnf.setCurve([0], [accounts[0]]);
        assert.equal(await cnf.getCurve(0), accounts[0]);
    });

    it('[getCurve] should failed -> No curve', async () => {
        try {
            await cnf.getCurve(1);
            assert.fail("should be failed");
        } catch (err) {
            assert.include(err.toString(), "No curve");
        }
    });

    it('revert...   -> Not support', async () => {
        try {
            await web3.eth.sendTransaction({from:accounts[0], to: cnf.address, value: web3.utils.toWei("1")})
            assert.fail("should be failed");
        } catch (err) {
            assert.include(err.message, "Not support", err);
        }
    });


});
