// Step 1: manually compile follow contract in remix
// - TokenManagerDelegate + Proxy
// - OracleDelegate + Proxy
// - SignatureVerifier
// - Bn128SchnorrVerifier
// - CrossDelegate + Proxy

// signatureVerifier.methods.register
// crossApproach.methods.setPartners
// tokenManager.methods.addAdmin
//

// You should deploy the 8 sc in remix first and then fill the address below
// -----------Fill sc addresses ---------------
const tokenManagerDelegateAddr = '';
const tokenManagerProxyAddr = '';
const oracleDelegateAddr = '';
const oracleProxyAddr = '';
const signatureVerifierAddr = '';
const bn128SchnorrVerifierAddr = '';
const crossDelegateAddr = '';
const crossProxyAddr = '';
const isMainnet = false;
const smgFeeProxy = "0x0000000000000000000000000000000000000000";
const quotaProxy = '0x0000000000000000000000000000000000000000';
// --------------------------------------------

const getContract = async (pathName, contractName, contractAddr) => {
  const artifactsPath = `browser/contracts/${pathName}/artifacts/${contractName}.json`; // Change this for different path
  const metadata = JSON.parse(
    await remix.call("fileManager", "getFile", artifactsPath)
  );
  // const accounts = await web3.eth.getAccounts();
  let contract = new web3.eth.Contract(metadata.abi, contractAddr);
  return contract;
};

const checkResult = async (ret, id) => {
  if (ret.status) {
    console.log(id, 'success');
  } else {
    console.log(id, 'failed');
    throw Error(`${id} tx failed`);
  }
}

(async () => {
  try {
    const accounts = await web3.eth.getAccounts();
    const from = accounts[0];
    
    // TokenManager config
    const tokenMangerProxy = await getContract('tokenManager', 'TokenManagerProxy', tokenManagerProxyAddr);
    checkResult(await tokenMangerProxy.methods.upgradeTo(tokenManagerDelegateAddr).send({from}), 1);
    const tokenManager = await getContract('tokenManager', 'TokenManagerDelegateV2', tokenManagerProxyAddr);
    checkResult(await tokenManager.methods.addAdmin(crossProxyAddr).send({from}), 2);

    // Oracle config
    const oracleProxy = await getContract('oracle', 'OracleProxy', oracleProxyAddr);
    checkResult(await oracleProxy.methods.upgradeTo(oracleDelegateAddr).send({from}), 3);

    // SignatureVerifier config
    const signatureVerifier = await getContract('schnorr', 'SignatureVerifier', signatureVerifierAddr);
    checkResult(await signatureVerifier.methods.register(1, bn128SchnorrVerifierAddr).send({from}), 4); // secp256k1: 0, bn256: 1

    // Cross config
    const crossProxy = await getContract('crossApproach', 'CrossProxy', crossProxyAddr);
    checkResult(await crossProxy.methods.upgradeTo(crossDelegateAddr).send({from}), 5);
    const cross = await getContract('crossApproach', 'CrossDelegateV3', crossProxyAddr);
    

    checkResult(await cross.methods.setPartners(tokenManagerProxyAddr, oracleProxyAddr, smgFeeProxy, quotaProxy, signatureVerifierAddr).send({from}), 6);

    console.log("Configuration Done!");
  } catch (error) {
    console.log(error);
  }
})();
