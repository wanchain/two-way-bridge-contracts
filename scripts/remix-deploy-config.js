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
const tokenManagerDelegateAddr = '0x50133f6836CB91237E17177E2985cBDAD51f0cf2';
const tokenManagerProxyAddr = '0xc95a4bc5C14CC6a23AF46BA50D3785d5fd55446d';
const oracleDelegateAddr = '0xC6Ae1Db6C66d909F7bFEeEb24F9adb8620bf9dbf';
const oracleProxyAddr = '0xc21E5553c8dDDf2E4a93E5bEDBaE436d4291F603';
const signatureVerifierAddr = '0xBe5187C2A7eb776c1CaEeD2C37E7599fb05000D3';
const bn128SchnorrVerifierAddr = '0x8D42d317B2bd6B60183461ed41bd00F17C3f3fE8';
const crossDelegateAddr = '0x5B0B9D1A58cacb8E3f7Cb72225996fc535530f6B';
const crossProxyAddr = '0x4f1aB74c2a9E8f591e8A80768e115C9f75935bAD';
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
