// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const fs = require("fs");

async function sleep() {
  if (needSleep) {
    console.log("Sleep 15 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
}

if (!process.env.PK)
  throw "⛔️ Private key not detected! Add it to the .env file!";
// mainnet
// const ORACLE_ADMIN = '0x390CC3173EE7F425Fe7659df215B13959FD468E1';
// const CROSS_ADMIN = '0xa35B3C55626188015aC79F396D0B593947231976';
// const TOKEN_MANAGER_OPERATOR = '0xa35B3C55626188015aC79F396D0B593947231976';
// const SMG_FEE_PROXY = "0x82bf94d159b15a587c45c9d70e0fab7fd87889eb";
// const QUOTA_PROXY = '0x0000000000000000000000000000000000000000';
// const BIP44_CHAIN_ID = 0x8000032a; // ASTAR

// testnet
const ORACLE_ADMIN = "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9";
const CROSS_ADMIN = "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9";
const TOKEN_MANAGER_OPERATOR = "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9";
const SMG_FEE_PROXY = "0xF6eB3CB4b187d3201AfBF96A38e62367325b29F9";
const QUOTA_PROXY = "0x0000000000000000000000000000000000000000";
// const BIP44_CHAIN_ID = 0x800003d1; // TELOS EVM
// const BIP44_CHAIN_ID = 1073741830; // Function X EVM
// const BIP44_CHAIN_ID = 1073741833; // GATHER CHAIN
// const BIP44_CHAIN_ID = 1073741834; // METIS CHAIN
//const BIP44_CHAIN_ID = 1073741835; // OKB CHAIN
// const BIP44_CHAIN_ID = 1073741838; // polyZkEvm CHAIN
const BIP44_CHAIN_ID = hre.network.config.bip44ChainId;
if (!BIP44_CHAIN_ID) {
  console.log("please set BIP44_CHAIN_ID");
  process.exit();
}

const readline = require("readline");

let count = 0;
let times = 0;
const asyncRetryOrExit = async (func, params) => {
  times = 0;
  count++;
  while (true) {
    try {
      console.log("try", count, times);
      if (params) {
        return await func(...params);
      } else {
        return await func();
      }
    } catch (error) {
      console.error("Error occurred:", error);

      const question = (query) =>
        new Promise((resolve) => rl.question(query, resolve));
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const answer = await question("Press any key to retry, 'c' to ignore, or 'q' to exit: ");
      console.log("answer", answer);
      rl.close();

      if (answer.trim().toLowerCase() === "q") {
        throw error;
      }

      if (answer.trim().toLowerCase() === "c") {
        return;
      }

      times++;
    }
  }
};

async function main() {
  let deployer = (await hre.ethers.getSigner()).address;

  let multicall2,
    tokenManagerDelegate,
    crossDelegate,
    oracleDelegate,
    tokenManagerProxy,
    crossProxy,
    oracleProxy,
    nftLib,
    rapidityLib,
    signatureVerifier,
    bn128SchnorrVerifier,
    ecSchnorrVerifier,
    groupApprove;

  await asyncRetryOrExit(async () => {
    let Multicall2 = await hre.ethers.getContractFactory("Multicall2");
    multicall2 = await Multicall2.deploy();
    await multicall2.deployed();
  });

  console.log("Multicall2 deployed to:", multicall2.address);

  await asyncRetryOrExit(async () => {
    let TokenManagerDelegateV2 = await hre.ethers.getContractFactory(
      "TokenManagerDelegateV2"
    );
    tokenManagerDelegate = await TokenManagerDelegateV2.deploy();
    await tokenManagerDelegate.deployed();
  });

  console.log(
    "TokenManagerDelegateV2 deployed to:",
    tokenManagerDelegate.address
  );

  await asyncRetryOrExit(async () => {
    let TokenManagerProxy = await hre.ethers.getContractFactory(
      "TokenManagerProxy"
    );
    tokenManagerProxy = await TokenManagerProxy.deploy();
    await tokenManagerProxy.deployed();
  });

  console.log("TokenManagerProxy deployed to:", tokenManagerProxy.address);

  await asyncRetryOrExit(async () => {
    let NFTLibV1 = await hre.ethers.getContractFactory("NFTLibV1");
    nftLib = await NFTLibV1.deploy();
    await nftLib.deployed();
  });

  console.log("NFTLibV1 deployed to:", nftLib.address);
  await asyncRetryOrExit(async () => {
    let RapidityLibV4 = await hre.ethers.getContractFactory("RapidityLibV4");
    rapidityLib = await RapidityLibV4.deploy();
    await rapidityLib.deployed();
  });

  console.log("RapidityLibV4 deployed to:", rapidityLib.address);
  await asyncRetryOrExit(async () => {
    let CrossDelegateV4 = await hre.ethers.getContractFactory(
      "CrossDelegateV4",
      {
        libraries: {
          NFTLibV1: nftLib.address,
          RapidityLibV4: rapidityLib.address,
        },
      }
    );

    crossDelegate = await CrossDelegateV4.deploy();
    await crossDelegate.deployed();
  });
  console.log("CrossDelegateV4 deployed to:", crossDelegate.address);
  await asyncRetryOrExit(async () => {
    let CrossProxy = await hre.ethers.getContractFactory("CrossProxy");
    crossProxy = await CrossProxy.deploy();
    await crossProxy.deployed();
  });
  console.log("CrossProxy deployed to:", crossProxy.address);
  await asyncRetryOrExit(async () => {
    let OracleDelegate = await hre.ethers.getContractFactory("OracleDelegate");
    oracleDelegate = await OracleDelegate.deploy();
    await oracleDelegate.deployed();
  });

  await asyncRetryOrExit(async () => {
    console.log("OracleDelegate deployed to:", oracleDelegate.address);
    let OracleProxy = await hre.ethers.getContractFactory("OracleProxy");
    oracleProxy = await OracleProxy.deploy();
    await oracleProxy.deployed();
  });

  console.log("OracleProxy deployed to:", oracleProxy.address);
  await asyncRetryOrExit(async () => {
    let SignatureVerifier = await hre.ethers.getContractFactory(
      "SignatureVerifier"
    );
    signatureVerifier = await SignatureVerifier.deploy();
    await signatureVerifier.deployed();
  });

  console.log("verifier register...");
  // 1: common EVM, bn128, 0: ZK, ECDSA
  //tx = await signatureVerifier.register(1, bn128SchnorrVerifier.address);
  let signCurveId = 1;
  let tx;
  if (hre.network.config.signCurveId != undefined) {
    signCurveId = hre.network.config.signCurveId;
  }
  bn128SchnorrVerifier = {};
  ecSchnorrVerifier = {};
  await asyncRetryOrExit(async () => {
    if (signCurveId == 1) {
      let Bn128SchnorrVerifier = await hre.ethers.getContractFactory(
        "Bn128SchnorrVerifier"
      );
      bn128SchnorrVerifier = await Bn128SchnorrVerifier.deploy();
      await bn128SchnorrVerifier.deployed();

      console.log(
        "bn128SchnorrVerifier deployed to:",
        bn128SchnorrVerifier.address
      );
      tx = await signatureVerifier.register(1, bn128SchnorrVerifier.address);
    } else {
      let EcSchnorrVerifier = await hre.ethers.getContractFactory(
        "EcSchnorrVerifier"
      );
      ecSchnorrVerifier = await EcSchnorrVerifier.deploy();
      await ecSchnorrVerifier.deployed();

      console.log("EcSchnorrVerifier deployed to:", ecSchnorrVerifier.address);
      tx = await signatureVerifier.register(0, ecSchnorrVerifier.address);
    }
    await tx.wait();
  });
  console.log("verifier register finished.");
  console.log("SignatureVerifier deployed to:", signatureVerifier.address);
  // config

  console.log("config...");
  await asyncRetryOrExit(async () => {
    tx = await tokenManagerProxy.upgradeTo(tokenManagerDelegate.address);
    await tx.wait();
    console.log("tokenManagerProxy upgradeTo finished.");
  });
  await asyncRetryOrExit(async () => {
    tx = await crossProxy.upgradeTo(crossDelegate.address);
    await tx.wait();
    console.log("crossProxy upgradeTo finished.");
  });
  await asyncRetryOrExit(async () => {
    tx = await oracleProxy.upgradeTo(oracleDelegate.address);
    await tx.wait();
    console.log("oracleProxy upgradeTo finished.");
  });

  console.log("deploy finished start to config...");
  let tokenManager = await hre.ethers.getContractAt(
    "TokenManagerDelegateV2",
    tokenManagerProxy.address
  );
  let cross = await hre.ethers.getContractAt(
    "CrossDelegateV4",
    crossProxy.address
  );
  let oracle = await hre.ethers.getContractAt(
    "OracleDelegate",
    oracleProxy.address
  );
  await asyncRetryOrExit(async () => {
    console.log("oracle set admin...");
    tx = await oracle.setAdmin(ORACLE_ADMIN);
    await tx.wait();
  });
  console.log("oracle set admin finished.");
  console.log("tokenManager add admin...");
  await asyncRetryOrExit(async () => {
    tx = await tokenManager.addAdmin(crossProxy.address);
    await tx.wait();
    console.log("tokenManager add admin finished.");
  });
  await asyncRetryOrExit(async () => {
    console.log("tokenManager set operator...");
    tx = await tokenManager.setOperator(TOKEN_MANAGER_OPERATOR);
    await tx.wait();
    console.log("tokenManager set operator finished.");
  });
  await asyncRetryOrExit(async () => {
    console.log("cross set partner...");
    tx = await cross.setPartners(
      tokenManagerProxy.address,
      oracleProxy.address,
      SMG_FEE_PROXY,
      QUOTA_PROXY,
      signatureVerifier.address
    );
    await tx.wait();
    console.log("cross set partner finished.");
  });
  await asyncRetryOrExit(async () => {
    console.log("cross add admin...");
    tx = await cross.setAdmin(deployer);
    await tx.wait();
  });
  await asyncRetryOrExit(async () => {
    console.log("cross set chainID...");
    tx = await cross.setChainID(BIP44_CHAIN_ID);
    await tx.wait();
  });
  await asyncRetryOrExit(async () => {
    console.log("cross add admin2...");
    tx = await cross.setAdmin(CROSS_ADMIN);
    await tx.wait();
  });
  await asyncRetryOrExit(async () => {
    if (hre.network.config.hashType) {
      tx = await cross.setHashType(hre.network.config.hashType);
      await tx.wait();
      console.log("set hash type:", hre.network.config.hashType);
    }
    console.log("config finished.");
  });
  await asyncRetryOrExit(async () => {
    let GroupApprove = await hre.ethers.getContractFactory("GroupApprove");
    groupApprove = await GroupApprove.deploy(
      deployer,
      signatureVerifier.address,
      oracleProxy.address,
      crossProxy.address
    );
    await groupApprove.deployed();
    console.log("groupApprove deployed to:", groupApprove.address);
  });
  const deployed = {
    multicall2: multicall2.address,
    signatureVerifier: signatureVerifier.address,
    bn128SchnorrVerifier: bn128SchnorrVerifier.address,
    EcSchnorrVerifier: ecSchnorrVerifier.address,
    RapidityLibV4: rapidityLib.address,
    NFTLibV1: nftLib.address,
    crossDelegate: crossDelegate.address,
    crossProxy: crossProxy.address,
    tokenManagerDelegate: tokenManagerDelegate.address,
    tokenManagerProxy: tokenManagerProxy.address,
    oracleDelegate: oracleDelegate.address,
    oracleProxy: oracleProxy.address,
    groupApprove: groupApprove.address,
  };

  fs.writeFileSync(
    `deployed/${hre.network.name}.json`,
    JSON.stringify(deployed, null, 2)
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
