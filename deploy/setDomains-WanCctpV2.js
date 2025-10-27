const hre = require("hardhat");
const path = require("path");


const CCTP_DOMAIN = {
  ethereum: 0, avalanche: 1, optimism: 2, arbitrum: 3, base: 6, polygon: 7, linea: 11, worldChain: 14, unichain: 10, sonic: 13, sei: 16, xdc: 18
  // ,solana: 5,  codex: 12, 
};
const CCTP_BIP44 = {
  ethereum: 2147483708, avalanche: 2147492648, optimism: 2147484262, arbitrum: 1073741826, base: 1073741841, polygon: 2147484614, linea: 1073741842, worldChain: 1073741857, unichain: 1073741858, sonic: 2147493655, sei: 2166483766, xdc: 2147484198
  // ,solana: 2147484149,  codex: xxx, 
};

const BIP44_DOMAIN_SET_PARAMS = Object.values(Object.keys(CCTP_BIP44).reduce((reduced, chain) => {
  const bip44ChainId = CCTP_BIP44[chain];
  const domain = CCTP_DOMAIN[chain];
  if (bip44ChainId && domain != undefined) {
    reduced[chain] = [bip44ChainId, domain];
  }
  return reduced;
}, {}));

async function main() {
  const scAddr = require(path.join(path.dirname(__dirname), `deployed/${hre.network.name}-WanCctpV2.json`))

  const deployer = (await hre.ethers.getSigner()).address;
  console.log("Deploying contracts with the account:", deployer);

  const sc = await hre.ethers.getContractAt("WanCctpV2", scAddr.CommonProxy);

  let tx, gasLimit;
  console.log('WanCctpV2 setCirclePathToBip44...');
  gasLimit = await sc.estimateGas.setCirclePathToBip44(BIP44_DOMAIN_SET_PARAMS);
  tx = await sc.setCirclePathToBip44(BIP44_DOMAIN_SET_PARAMS, { gasLimit });
  await tx.wait();
  console.log('WanCctpV2 config finished.');

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
