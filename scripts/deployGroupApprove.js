// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const fs = require('fs');
const { sleep } = require("@nomiclabs/hardhat-ethers");

const waitForReceipt = true;

const TMP_ADMIN = '0x4Cf0A877E906DEaD748A41aE7DA8c220E4247D9e';
const REAL_ADMIN = '0x4cEd9c0EA79Ee6181600777D5B6badE7F3D301bF';
const REAL_ADMIN_WAN = '0x0F4f833F031fFF7e76AA783212f786432a14FB90';
// goerli
// const SIGNATUREER = '0x08bad1a48b0b08bf769f83ba30c1dad0f8bb8b6b';
// const ORACLE = '0x0f0bf93bf16fd28294c637d855fc73b917ef5fcc';
// const CROSS_SC = '0xb8460eeaa06bc6668dad9fd42b661c0b96b3be57';

// fuji
// const SIGNATUREER = '0x0a5b5ea60930cca901bce3e3ad1772ebdd5065b8';
// const ORACLE = '0x302554d20c92461f4c57bad481797b6d5f422c45';
// const CROSS_SC = '0x4c200a0867753454db78af84d147bd03e567f234';

const depends = {
  horizenMainnet: {
    SIGNATUREER: '0xFFB876Bd5Bee99e992cAc826A04396002f5f4a65',
    ORACLE: '0x290108879b633557cb35e8baa57eA9216278A61b',
    CROSS_SC: '0x97E0883493e8bB7A119A1E36E53ee9E7A2D3CA7b',
  },
  gatherMainnet: {
    SIGNATUREER: '0x09cDfc56439643d151585B77899d0dC0f982BcD2',
    ORACLE: '0xBe5187C2A7eb776c1CaEeD2C37E7599fb05000D3',
    CROSS_SC: '0xC6Ae1Db6C66d909F7bFEeEb24F9adb8620bf9dbf',
  },
  fxMainnet: {
    SIGNATUREER: '0x47be7cc7c13315fdd1bbf3dbab512af23961ba53',
    ORACLE: '0x86b830023a8593a6a98f30783029506290558d0e',
    CROSS_SC: '0xdf935552fac687123c642f589296762b632a9aaf',
  },
  astar: {
    SIGNATUREER: '0xb2C6979890FbAd83A6A5266D41B7d50dBE24a87a',
    ORACLE: '0x372d0695E75563D9180F8CE31c9924D7e8aaac47',
    CROSS_SC: '0x592dE30Bebff484B5a43A6E8E3ec1a814902E0b6',
  },
  telos_mainnet: {
    SIGNATUREER: '0xFDa7a6d11fDd32F18e8d8d9ce1e97A9575141875',
    ORACLE: '0x482E6206aEA6B44143E1973e027381d47E029a99',
    CROSS_SC: '0x201E5dE97DFc46aAce142B2009332c524c9D8D82',
  },
  metisMainnet: {
    SIGNATUREER: '0x09cDfc56439643d151585B77899d0dC0f982BcD2',
    ORACLE: '0xBe5187C2A7eb776c1CaEeD2C37E7599fb05000D3',
    CROSS_SC: '0xC6Ae1Db6C66d909F7bFEeEb24F9adb8620bf9dbf',
  },
  optimisticEthereum: {
    SIGNATUREER: '0x09cDfc56439643d151585B77899d0dC0f982BcD2',
    ORACLE: '0xBe5187C2A7eb776c1CaEeD2C37E7599fb05000D3',
    CROSS_SC: '0xC6Ae1Db6C66d909F7bFEeEb24F9adb8620bf9dbf',
  },
  arbitrum: {
    SIGNATUREER: '0x8818c74956ae90c6c7b317439373052073e62999',
    ORACLE: '0xbf9076b4ea99c1fce5e2b0fc7ac5955333f47d18',
    CROSS_SC: '0xf7ba155556e2cd4dfe3fe26e506a14d2f4b97613',
  },
  ethereum: {
    SIGNATUREER: '0x9276ee38a5250e2f7fbe00a12ec17d09b5d28f3d',
    ORACLE: '0xbb38d10033b26f3836a8c1e41788206868b9f228',
    CROSS_SC: '0xfceaaaeb8d564a9d0e71ef36f027b9d162bc334e',
  },
  bsc: {
    SIGNATUREER: '0x5ff81da1574bc8e19fb6aa78ea2ad97eb57c7f3e',
    ORACLE: '0xd948675a4da40cd7aa6f1ec1f10db5a4ffb6b990',
    CROSS_SC: '0xc3711bdbe7e3063bf6c22e7fed42f782ac82baee',
  },
  avax: {
    SIGNATUREER: '0x4f1d3d9ce4bb7646c35dcd05d3296f106f12345c',
    ORACLE: '0x716f88d32b52342af040b2e775871dff56ebd035',
    CROSS_SC: '0x74e121a34a66d54c33f3291f2cdf26b1cd037c3a',
  },
  moonriver: {
    SIGNATUREER: '0xc565ed1e12ce78f3a1df9f8c3e0a1b7e8577702c',
    ORACLE: '0xffd3e7dabcdec920eed13b19a81b205aa0dd6e05',
    CROSS_SC: '0xde1ae3c465354f01189150f3836c7c15a1d6671d',
  },
  moonbeam: {
    SIGNATUREER: '0xe727e81ea730ea216ca3720c2597fd14bf2b825a',
    ORACLE: '0xcaa36de573f8203f880a1c0bbdcea996bf3b1748',
    CROSS_SC: '0x6372aec6263aa93eacedc994d38aa9117b6b95b5',
  },
  polygon: {
    SIGNATUREER: '0x8818c74956ae90c6c7b317439373052073e62999',
    ORACLE: '0xbf9076b4ea99c1fce5e2b0fc7ac5955333f47d18',
    CROSS_SC: '0x2216072a246a84f7b9ce0f1415dd239c9bf201ab',
  },
  fantom: {
    SIGNATUREER: '0xe2b7c17cdf92ebea0d03db8ced4416539095c9ad',
    ORACLE: '0x78f811a431d248c1edcf6d95ec8551879b2897c3',
    CROSS_SC: '0xccffe9d337f3c1b16bd271d109e691246fd69ee3',
  },
  xinfin: {
    SIGNATUREER: '0x8818c74956ae90c6c7b317439373052073e62999',
    ORACLE: '0xbf9076b4ea99c1fce5e2b0fc7ac5955333f47d18',
    CROSS_SC: '0xf7ba155556e2cd4dfe3fe26e506a14d2f4b97613',
  },
  okt: {
    SIGNATUREER: '0x8818c74956ae90c6c7b317439373052073e62999',
    ORACLE: '0xbf9076b4ea99c1fce5e2b0fc7ac5955333f47d18',
    CROSS_SC: '0xf7ba155556e2cd4dfe3fe26e506a14d2f4b97613',
  },
  clover: {
    SIGNATUREER: '0x8818c74956ae90c6c7b317439373052073e62999',
    ORACLE: '0xbf9076b4ea99c1fce5e2b0fc7ac5955333f47d18',
    CROSS_SC: '0xf7ba155556e2cd4dfe3fe26e506a14d2f4b97613',
  },
  wanchainMainnet: {
    SIGNATUREER: '0x58c0116cac5e6448a8e04de50f75cb8ea9664055',
    ORACLE: '0x1E7450D5d17338a348C5438546f0b4D0A5fbeaB6', // smgAdmin
    CROSS_SC: '0xe85b0d89cbc670733d6a40a9450d8788be13da47',
  },
}

async function main() {
  console.log('hre', (await hre.ethers.getSigner()).address);  
  let GroupApprove = await hre.ethers.getContractFactory("GroupApprove");
  let groupApprove = await GroupApprove.deploy(TMP_ADMIN, depends[hre.network.name].SIGNATUREER, depends[hre.network.name].ORACLE, depends[hre.network.name].CROSS_SC);
  await groupApprove.deployed();
  console.log("groupApprove deployed to:", groupApprove.address);
  console.log("proposaling...");
  let chainId = await groupApprove.chainId();
  console.log('chainId', chainId);
  const data = encodeWithSignature("transferFoundation(address)", hre.network.name !== 'wanchainMainnet' ? REAL_ADMIN : REAL_ADMIN_WAN);
  console.log(data);

  let tx = await groupApprove.proposal(chainId, groupApprove.address, data);
  console.log("tx", tx.hash);
  await tx.wait();
  console.log("proposal done");

  fs.appendFileSync('deployed/groupApprove.txt', `${hre.network.name} ${groupApprove.address}\n`, 'utf-8');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function encodeWithSignature(signature, ...args) {
  const functionName = signature.match(/^(\w+)\(/)[1];
  
  const functionSig = ethers.utils.id(signature).slice(0, 10);

  const iface = new ethers.utils.Interface([`function ${signature}`]);
  const encodedParameters = iface.encodeFunctionData(functionName, args);

  return functionSig + encodedParameters.slice(10);
}
