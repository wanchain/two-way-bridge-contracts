const assert = require('assert');
const { getSchnorrVerifierContracts, getWeb3, stringToBytes } = require('./utils');
const BigNumber = require('bignumber.js');
let web3 = getWeb3();

contract('Verifier', accounts => {
  before(async () => {
  });

  it.only("verifier check", async () => {
      let verifier = await getSchnorrVerifierContracts().verifier;
      console.log('verifier addr:', verifier._address);
      let bn128 = await verifier.methods.verifierMap(0).call();
      console.log('bn128 addr:', bn128);
      let secp256 = await verifier.methods.verifierMap(1).call();
      console.log('secp256 addr:', secp256);
  });

});