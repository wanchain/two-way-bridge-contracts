const {assert} = require('chai');
const { getSchnorrVerifierContracts, getWeb3, stringToBytes } = require('./utils');
const BigNumber = require('bignumber.js');
let web3 = getWeb3();
const hash = require('js-sha256');

contract('Verifier', accounts => {
  before(async () => {
  });

  it("verifier check Not owner", async () => {
    let verifier = (await getSchnorrVerifierContracts(accounts)).verifier;

    try {
      console.log("verifier:", verifier)
      await verifier.methods.register(web3.utils.toBN(10), accounts[5]).send({from: accounts[6]});
      assert.fail("should be failed");
    } catch (err) {
      assert.include(err.toString(), "Not owner");
    }
  });

  it("verifier check bn128 signature 1", async () => {
    let verifier = (await getSchnorrVerifierContracts(accounts)).verifier;
    let bn128 = (await getSchnorrVerifierContracts(accounts)).bn128;


    let message = [0x43, 0x21];
    let gpkX = '0x2ab2e3655ebd58b188f9ed3ba466e3ae39f4f6e9bcbe80e355be8f1ccd222f97';
    let gpkY = '0x175ebb6b000cb43a3aa6e69dd05d1710719559b17983a0067420de99f3c3cd9f';
    let rX = '0x2d76fc3c6a5496b50b2e44d0ee3fdcf91943d2246823e89b06e6f99c7b4fce9b';
    let rY = '0x02bb3893aa8304b671235ffb02fee052d45a62f9527248e95da441f22fed0a0e';
    let signature = '0x1fe44cc08265229ab0e28ff75f14b1ef306f518e612803c7fc461676cdab8fa6';

    let hashM = '0x' + hash.sha256(message);

    let ret = await verifier.methods.verify(
      1,
      signature,
      gpkX,
      gpkY,
      rX,
      rY,
      hashM,
    ).call();

    assert.equal(ret, true);

    signature = '0x1fe44cc08265229ab0e28ff75f14b1ef306f518e612803c7fc461676cdab8fa5';
    ret = await verifier.methods.verify(
      1,
      signature,
      gpkX,
      gpkY,
      rX,
      rY,
      hashM,
    ).call();

    assert.equal(ret, false);

    ret = await verifier.methods.verify(
      1,
      signature,
      gpkX,
      gpkY,
      rX,
      rY,
      hashM,
    ).send({from: accounts[0], gas:1e7});
    console.log('gas used', ret.gasUsed);

    ret = await bn128.methods.verify(
      signature,
      gpkX,
      gpkY,
      rX,
      rY,
      hashM,
    ).send({from: accounts[0], gas:1e7});
    console.log('gas used', ret.gasUsed);
  });

  it("verifier check bn128 signature 2", async () => {
    let verifier = (await getSchnorrVerifierContracts(accounts)).verifier;
    let bn128 = (await getSchnorrVerifierContracts(accounts)).bn128;


    let message = [0x43, 0x21];
    let gpkX = '0x0038c8e52318773522675cd2f3536b105c556ff788281d3439b6c048c05c9dfe';
    let gpkY = '0x1f807d0617f926f0c11a4d2e785ac2f0c48dc50b687a3918cf860aef303bae87';
    let rX = '0x176ea0b925448604be3fc30a5fb648b49847a58340c9a142caeeefcae2177f99';
    let rY = '0x11f0853e42e5fa5f9c81ed6c0095b30394177acdb2ba55fad309eed6638dea93';
    let signature = '0x0c02f3c44929c2f598a29da5d789e0ae8ea2ec763c209ef88d94e5a58a2b5ceb';

    let hashM = '0x' + '50173254f9780541f758b9a5c9e4266ced10fda660074c1f72e7d8565057e1ad';

    let ret = await verifier.methods.verify(
      1,
      signature,
      gpkX,
      gpkY,
      rX,
      rY,
      hashM,
    ).call();

    assert.equal(ret, true);

    signature = '0x1fe44cc08265229ab0e28ff75f14b1ef306f518e612803c7fc461676cdab8fa5';
    ret = await verifier.methods.verify(
      1,
      signature,
      gpkX,
      gpkY,
      rX,
      rY,
      hashM,
    ).call();

    assert.equal(ret, false);

    ret = await verifier.methods.verify(
      1,
      signature,
      gpkX,
      gpkY,
      rX,
      rY,
      hashM,
    ).send({from: accounts[0], gas:1e7});
    console.log('gas used', ret.gasUsed);

    ret = await bn128.methods.verify(
      signature,
      gpkX,
      gpkY,
      rX,
      rY,
      hashM,
    ).send({from: accounts[0], gas:1e7});
    console.log('gas used', ret.gasUsed);
  });

  it.skip("verifier check secp256k1 signature", async () => {
    let verifier = (await getSchnorrVerifierContracts(accounts)).verifier;

    let message = [0x12, 0x34];
    let gpkX = '0xee8797b2d53915708fb24cee7dbdddfa43eb2cbfa19cd427cdfd02d2169bb028';
    let gpkY = '0xe5dfa3514a92fa2eb4da42085bbc7807c1acb08f132c13b2951759d4281ece8b';
    let rX = '0xfbd41967d0a3cda9f0d67ed430d90c10c84fdca028c544f942ee7e18c10e3881';
    let rY = '0x8728270784cc9b5b9454b7281df9731681fdb68f384bb6f1e60acdb5d34be4e8';
    let signature = '0x6de09f9d1887b203a2c6510f08b8241c36d3dd84234a18a58189c9c79e50a3e5';

    let hashM = '0x' + hash.sha256(message);
    // console.log('hashM', hashM);

    let ret = await verifier.methods.verify(
      0,
      signature,
      gpkX,
      gpkY,
      rX,
      rY,
      hashM,
    ).call();

    // console.log('ret', ret);
    assert.equal(ret, true);

    signature = '0x39731aadfd82e34ffd00065da67acb3dd4281b214025695da6934738863b33be';
    ret = await verifier.methods.verify(
      0,
      signature,
      gpkX,
      gpkY,
      rX,
      rY,
      hashM,
    ).call();

    // console.log('ret', ret);
    assert.equal(ret, false);

    ret = await verifier.methods.verify(
      0,
      signature,
      gpkX,
      gpkY,
      rX,
      rY,
      hashM,
    ).send({from: accounts[0], gas:1e7});
    console.log('gas used', ret.gasUsed);
  });
});