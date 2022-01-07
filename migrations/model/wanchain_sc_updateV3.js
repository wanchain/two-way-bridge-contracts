const deployer = require('wanchain-sc-sdk');
const scDict = require('./contract');
const {
  curveMap,
  ADDRESS_0
} = require('../utils/config');

async function deploy(cfg, isMainnet, options = {}) {
    let contract = {};
    let abi = {};
    let txData;

    console.log(`Ready to deploy ${cfg.name}`);

    const wanNetworkNames = ["mainnet", "testnet"];
    await deployer.config(cfg);

    let foundation = cfg.foundation || ADDRESS_0;
    let crossAdmin = cfg.adminCross;
    if (cfg.adminCrossPrivateKey) {
      crossAdmin = deployer.getAddressString(cfg.adminCrossPrivateKey);
    }
    let oracleAdmin = cfg.adminOracle;
    if (cfg.adminOraclePrivateKey) {
      oracleAdmin = deployer.getAddressString(cfg.adminOraclePrivateKey);
    }
    let smgAdmin = cfg.adminSmg;
    if (cfg.adminSmgPrivateKey) {
      smgAdmin = deployer.getAddressString(cfg.adminSmgPrivateKey);
    }
    console.log("crossAdmin", crossAdmin, "oracleAdmin", oracleAdmin, "smgAdmin", smgAdmin, "foundation", foundation);
    const {bipChainID, chainType} = options;
    if (!bipChainID) {
      throw new Error(`bipChainID is null`);
    }

    const proxyScAddresses = getProxyScInfo(chainType);
    if (!proxyScAddresses) {
      throw new Error(`invalid chainType`);
    }
    // ***********two-way-bridge*****************

    // oracle
    await deployer.deploy(scDict.OracleDelegate);
    let oracleDelegate = await deployer.deployed(scDict.OracleDelegate);
    await deployer.deploy(scDict.OracleProxy);
    let oracleProxy = await deployer.deployed(scDict.OracleProxy);
    txData = await oracleProxy.methods.upgradeTo(oracleDelegate.address).encodeABI();
    await deployer.sendTx(oracleProxy.address, txData);
    let oracle = await deployer.at(scDict.OracleDelegate, oracleProxy.address);

    // config oracle admin
    if (oracleAdmin) {
      txData = await oracle.methods.setAdmin(oracleAdmin).encodeABI();
      await deployer.sendTx(oracle.address, txData);
      console.log(`admin ${scDict.OracleProxy}: ${oracleAdmin}`);
    } else {
      console.log(`no admin about ${scDict.OracleProxy}`);
    }

    contract[scDict.OracleProxy] = oracleProxy.address;
    contract[scDict.OracleDelegate] = oracleDelegate.address;
    // abi[scDict.OracleProxy] = oracleDelegate.abi;
    abi[scDict.OracleDelegate] = oracleDelegate.abi;

    // signature verifier
    await deployer.deploy(scDict.SignatureVerifier);
    let signatureVerifier = await deployer.deployed(scDict.SignatureVerifier);
    await deployer.deploy(scDict.Bn128SchnorrVerifier);
    let bn128 = await deployer.deployed(scDict.Bn128SchnorrVerifier);

    // config SignatureVerifier
    txData = await signatureVerifier.methods.register(curveMap.get('bn256'), bn128.address).encodeABI();
    await deployer.sendTx(signatureVerifier.address, txData);

    contract[scDict.SignatureVerifier] = signatureVerifier.address;
    contract[scDict.Bn128SchnorrVerifier] = bn128.address;
    abi[scDict.SignatureVerifier] = signatureVerifier.abi;

    // secp256K1
    if (wanNetworkNames.includes(cfg.name)) {
      await deployer.deploy(scDict.Secp256k1SchnorrVerifier);
      let secp256K1 = await deployer.deployed(scDict.Secp256k1SchnorrVerifier);
      txData = await signatureVerifier.methods.register(curveMap.get('secp256k1'), secp256K1.address).encodeABI();
      await deployer.sendTx(signatureVerifier.address, txData);

      contract[scDict.Secp256k1SchnorrVerifier] = secp256K1.address;
    }

    // cross approach smart contracts
    await deployer.deploy(scDict.HTLCTxLib);
    let htlcTxLib = await deployer.deployed(scDict.HTLCTxLib);
    contract[scDict.HTLCTxLib] = htlcTxLib.address;

    await deployer.deploy(scDict.RapidityLibV3);
    let rapidityLib = await deployer.deployed(scDict.RapidityLibV3);
    contract[scDict.RapidityLib] = rapidityLib.address;

    await deployer.link(scDict.CrossDelegateV3, scDict.HTLCTxLib);
    await deployer.link(scDict.CrossDelegateV3, scDict.RapidityLibV3);

    await deployer.deploy(scDict.CrossDelegateV3);
    let crossDelegate = await deployer.deployed(scDict.CrossDelegateV3);

    await deployer.deploy(scDict.CrossProxy);
    let crossProxy = await deployer.deployed(scDict.CrossProxy);

    txData = await crossProxy.methods.upgradeTo(crossDelegate.address).encodeABI();
    await deployer.sendTx(crossProxy.address, txData);
    let crossApproach = await deployer.at(scDict.CrossDelegateV3, crossProxy.address);
    try {
      if (crossAdmin) {
        txData = await crossApproach.methods.setAdmin(crossAdmin).encodeABI();
        await deployer.sendTx(crossApproach.address, txData);
        console.log(`admin ${scDict.CrossProxy}: ${crossAdmin}`);
      } else {
        console.log(`no admin about ${scDict.CrossProxy}`);
      }

      if (cfg.adminCrossPrivateKey) {
        txData = await crossApproach.methods.setChainID(bipChainID).encodeABI();
        await deployer.sendTx(crossApproach.address, txData, {privateKey: cfg.adminCrossPrivateKey});
        console.log(`set chainID about ${scDict.CrossProxy}: ${bipChainID}`);
      } else {
        console.log(`not set chainID about ${scDict.CrossProxy}`);
      }
    } catch (err) {
      console.log("setAdmin or setChainID error", err, bipChainID);
    }
    contract[scDict.CrossProxy] = crossProxy.address;
    contract[scDict.CrossDelegate] = crossDelegate.address;
    abi[scDict.CrossDelegate] = crossDelegate.abi;

    // token manager
    await deployer.deploy(scDict.TokenManagerDelegateV2);
    let tokenManagerDelegate = await deployer.deployed(scDict.TokenManagerDelegateV2);
    await deployer.deploy(scDict.TokenManagerProxy);
    let tokenManagerProxy = await deployer.deployed(scDict.TokenManagerProxy);
    txData = await tokenManagerProxy.methods.upgradeTo(tokenManagerDelegate.address).encodeABI();
    await deployer.sendTx(tokenManagerProxy.address, txData);
    let tokenManager = await deployer.at(scDict.TokenManagerDelegateV2, tokenManagerProxy.address);

    // config tokenManager admin
    txData = await tokenManager.methods.addAdmin(crossApproach.address).encodeABI();
    await deployer.sendTx(tokenManager.address, txData);

    contract[scDict.TokenManagerProxy] = tokenManagerProxy.address;
    contract[scDict.TokenManagerDelegate] = tokenManagerDelegate.address;
    // abi[scDict.TokenManagerProxy] = tokenManagerDelegate.abi;
    abi[scDict.TokenManagerDelegate] = tokenManagerDelegate.abi;

    let smgAdminProxy = oracle;
    if (wanNetworkNames.includes(cfg.name)) {
      // ***********osm*****************
      // storeman group admin sc
      let posLib = await deployer.deploy(scDict.PosLib);
      contract[scDict.PosLib] = posLib.address;

      let commonTool = await deployer.deploy(scDict.CommonTool);
      contract[scDict.CommonTool] = commonTool.address;

      await deployer.link(scDict.StoremanUtil, scDict.CommonTool);
      let storemanUtil = await deployer.deploy(scDict.StoremanUtil);
      contract[scDict.StoremanUtil] = storemanUtil.address;

      await deployer.link(scDict.StoremanLib, scDict.StoremanUtil);
      let storemanLib = await deployer.deploy(scDict.StoremanLib);
      contract[scDict.StoremanLib] = storemanLib.address;

      //await deployer.link(scDict.IncentiveLib, scDict.PosLib);
      await deployer.link(scDict.IncentiveLib, scDict.StoremanUtil);
      let incentiveLib = await deployer.deploy(scDict.IncentiveLib);
      contract[scDict.IncentiveLib] = incentiveLib.address;

      let deposit = await deployer.deploy(scDict.Deposit);
      contract[scDict.Deposit] = deposit.address;

      //await deployer.link(scDict.StoremanGroupDelegate, scDict.PosLib);
      await deployer.link(scDict.StoremanGroupDelegate, scDict.StoremanUtil);
      await deployer.link(scDict.StoremanGroupDelegate, scDict.StoremanLib);
      await deployer.link(scDict.StoremanGroupDelegate, scDict.IncentiveLib);
      await deployer.link(scDict.StoremanGroupDelegate, scDict.Deposit);
      await deployer.deploy(scDict.StoremanGroupDelegate);
      let smgDelegate = await deployer.deployed(scDict.StoremanGroupDelegate);
      await deployer.deploy(scDict.StoremanGroupProxy);
      let smgProxy = await deployer.deployed(scDict.StoremanGroupProxy);
      // let smgProxy = await deployer.deploy(scDict.StoremanGroupProxy);

      contract[scDict.StoremanGroupProxy] = smgProxy.address;
      contract[scDict.StoremanGroupDelegate] = smgDelegate.address;
      abi[scDict.StoremanGroupDelegate] = smgDelegate.abi;

      txData = await smgProxy.methods.upgradeTo(smgDelegate.address).encodeABI();
      await deployer.sendTx(smgProxy.address, txData);
      console.log("smg address:", smgProxy.address);

      // storm group admin dependence
      let smg = await deployer.at(scDict.StoremanGroupDelegate, smgProxy.address);
      if (smgAdmin) {
        txData = await smg.methods.addAdmin(smgAdmin).encodeABI();
        await deployer.sendTx(smg.address, txData);
        console.log(`admin ${scDict.StoremanGroupProxy}: ${smgAdmin}`);
      } else {
        console.log(`no admin about ${scDict.StoremanGroupProxy}`);
      }

      // ListGroup
      await deployer.link(scDict.ListGroup, scDict.StoremanUtil);
      let listGroup = await deployer.deploy(scDict.ListGroup, smgProxy.address, posLib.address);
      contract[scDict.ListGroup] = listGroup.address;
      abi[scDict.ListGroup] = listGroup.abi;

      // storm group global dependence
      txData = await smg.methods.setGlobalGroupScAddr(listGroup.address).encodeABI();
      await deployer.sendTx(smg.address, txData);

      //deploy metric
      await deployer.link(scDict.MetricLib, scDict.CommonTool);
      //await deployer.link(scDict.MetricLib, scDict.PosLib);
      let metricLib = await deployer.deploy(scDict.MetricLib);
      contract[scDict.MetricLib] = metricLib.address;

      await deployer.link(scDict.MetricDelegate, scDict.CommonTool);
      await deployer.link(scDict.MetricDelegate, scDict.MetricLib);
      //await deployer.link(scDict.MetricDelegate, scDict.PosLib);
      await deployer.deploy(scDict.MetricDelegate);

      await deployer.deploy(scDict.MetricProxy);
      let metricProxy = await deployer.deployed(scDict.MetricProxy);
      let metricDlg = await deployer.deployed(scDict.MetricDelegate);

      contract[scDict.MetricProxy] = metricProxy.address;
      contract[scDict.MetricDelegate] = metricDlg.address;
      abi[scDict.MetricDelegate] = metricDlg.abi;

      txData = await metricProxy.methods.upgradeTo(metricDlg.address).encodeABI();
      await deployer.sendTx(metricProxy.address, txData);
      console.log("metric address:", metricProxy.address);

      let metric = await deployer.at(scDict.MetricDelegate, metricProxy.address);

      // create gpk sc
      await deployer.link(scDict.GpkLib, scDict.CommonTool);
      let gpkLib = await deployer.deploy(scDict.GpkLib);
      contract[scDict.GpkLib] = gpkLib.address;

      await deployer.link(scDict.GpkDelegate, scDict.GpkLib);
      await deployer.deploy(scDict.GpkDelegate);

      await deployer.deploy(scDict.GpkProxy);
      let gpkProxy = await deployer.deployed(scDict.GpkProxy);
      let gpkDelegate = await deployer.deployed(scDict.GpkDelegate);

      contract[scDict.GpkProxy] = gpkProxy.address;
      contract[scDict.GpkDelegate] = gpkDelegate.address;
      abi[scDict.GpkDelegate] = gpkDelegate.abi;

      txData = await gpkProxy.methods.upgradeTo(gpkDelegate.address).encodeABI();
      await deployer.sendTx(gpkProxy.address, txData);
      console.log("gpk address:", gpkProxy.address);

      let gpk = await deployer.at(scDict.GpkDelegate, gpkProxy.address);
      if (smgAdmin) {
        txData = await gpk.methods.addAdmin(smgAdmin).encodeABI();
        await deployer.sendTx(gpk.address, txData);
        console.log(`admin ${scDict.GpkProxy}: ${smgAdmin}`);
      } else {
        console.log(`no admin about ${scDict.GpkProxy}`);
      }

      // config
      await deployer.deploy(scDict.ConfigProxy);
      let cnfProxy = await deployer.deployed(scDict.ConfigProxy);
      await deployer.deploy(scDict.ConfigDelegate);
      let cnfDelegate = await deployer.deployed(scDict.ConfigDelegate);

      contract[scDict.ConfigProxy] = cnfProxy.address;
      contract[scDict.ConfigDelegate] = cnfDelegate.address;
      abi[scDict.ConfigDelegate] = cnfDelegate.abi;

      txData = await cnfProxy.methods.upgradeTo(cnfDelegate.address).encodeABI();
      await deployer.sendTx(cnfProxy.address, txData);
      let cnf = await deployer.at(scDict.ConfigDelegate, cnfProxy.address);
      if (smgAdmin) {
        txData = await cnf.methods.addAdmin(smgAdmin).encodeABI();
        await deployer.sendTx(cnf.address, txData);
        console.log(`admin ${scDict.ConfigProxy}: ${smgAdmin}`);
      } else {
        console.log(`no admin about ${scDict.ConfigProxy}`);
      }

      await deployer.deploy(scDict.Secp256k1Curve);
      let secp256k1 = await deployer.deployed(scDict.Secp256k1Curve);
      await deployer.deploy(scDict.Bn256Curve);
      let bn256 = await deployer.deployed(scDict.Bn256Curve);
      if (cfg.adminSmgPrivateKey) {
        txData = await cnf.methods.setCurve([curveMap.get('secp256k1'), curveMap.get('bn256')], [secp256k1.address, bn256.address]).encodeABI();
        await deployer.sendTx(cnf.address, txData, {privateKey: cfg.adminSmgPrivateKey});
      }

      contract[scDict.Secp256k1Curve] = secp256k1.address;
      contract[scDict.Bn256Curve] = bn256.address;

      // dependence
      txData = await smg.methods.setDependence(metricProxy.address, gpkProxy.address, oracle.address,posLib.address).encodeABI();
      await deployer.sendTx(smg.address, txData);

      txData = await gpk.methods.setDependence(cnfProxy.address, smgProxy.address).encodeABI();
      await deployer.sendTx(gpk.address, txData);
      txData = await metric.methods.setDependence(cnfProxy.address, smgProxy.address, posLib.address).encodeABI();
      await deployer.sendTx(metric.address, txData);

      smgAdminProxy = smg;
    }

    // config crossApproach
    txData = await crossApproach.methods.setPartners(
        tokenManager.address, // tokenManager
        smgAdminProxy.address, // smgAdminProxy
        foundation, // smgFeeProxy
        ADDRESS_0, // quota
        signatureVerifier.address // sigVerifier
    ).encodeABI();
    await deployer.sendTx(crossApproach.address, txData);

    return {address:contract, abi:abi};
}

function getProxyScInfo(chainType) {
  const proxyScAddresses = isMainnet ? {
    "WAN": {
      "TokenManagerProxy": "0x9Fdf94Dff979dbECc2C1a16904bDFb41D305053A",
      "OracleProxy": "0xa2b6CFAE041371A30bED5f2092393f03D6dCDEEc",
      "CrossProxy": "0xe85b0D89CbC670733D6a40A9450D8788bE13da47",
      "SignatureVerifier": "0x58C0116caC5e6448A8E04De50f75CB8Ea9664055",
      "StoremanGroupProxy": "0x1E7450D5d17338a348C5438546f0b4D0A5fbeaB6",
      "MetricProxy": "0xd5e61e4069c013a444e962dbd489d845b9Ae2727",
      "GpkProxy": "0xFC86Ad558163C4933eBCfA217945aF6e9a3bcE06",
      "ConfigProxy": "0x2C0134788652A8C5fC6EC5c6a9B157E8481F5118",
    },
    "ETH": {
      "TokenManagerProxy": "0xbaB93311dE250B5B422c705129b3617b3cB6E9e1",
      "OracleProxy": "0xBb38d10033b26F3836A8c1E41788206868b9F228",
      "CrossProxy": "0xfCeAAaEB8D564a9D0e71Ef36f027b9D162bC334e",
      "SignatureVerifier": "0x9276ee38A5250e2F7FbE00A12EC17d09b5d28F3d",
    },
    "BSC": {
      "TokenManagerProxy": "0x39Af91cbA3aEd00E9b356EcC3675C7ef309017dD",
      "OracleProxy": "0xD948675a4da40Cd7Aa6f1eC1f10Db5a4Ffb6B990",
      "CrossProxy": "0xc3711Bdbe7E3063Bf6c22e7feD42F782Ac82bAEE",
      "SignatureVerifier": "0x5ff81dA1574bC8e19Fb6Aa78EA2AD97eb57C7F3e",
    },
    "AVAX": {
      "TokenManagerProxy": "0xF06d72375d3bF5Ab1A8222858e2098b16e5E8355",
      "OracleProxy": "0x716f88d32B52342AF040B2E775871dFF56EBd035",
      "CrossProxy": "0x74e121a34a66D54C33f3291f2cdf26B1cd037c3a",
      "SignatureVerifier": "0x4f1D3D9cE4bb7646c35DCd05d3296f106f12345c",
    },
    "MOONBEAM": {
      "TokenManagerProxy": "0x32e1504a67826960245506706E0B129dC2A53b7f",
      "OracleProxy": "0xfFD3E7DaBCdEC920Eed13B19A81b205aA0Dd6e05",
      "CrossProxy": "0xdE1Ae3c465354f01189150f3836C7C15A1d6671D",
      "SignatureVerifier": "0xc565Ed1e12CE78f3a1DF9F8C3e0A1B7E8577702c",
    },
    "MATIC": {
      "TokenManagerProxy": "0xc928c8e48647c8b0ce550C2352087B1cF5c6111e",
      "OracleProxy": "0xBf9076B4ea99C1fcE5E2B0FC7Ac5955333f47d18",
      "CrossProxy": "0x2216072A246A84f7b9CE0f1415Dd239C9bF201aB",
      "SignatureVerifier": "0x8818C74956Ae90C6C7B317439373052073E62999",
    },
    "ARB": {
      "TokenManagerProxy": "0xea0c753d391761bbdb090ac93102a4d1bdcbee2b",
      "OracleProxy": "0xBf9076B4ea99C1fcE5E2B0FC7Ac5955333f47d18",
      "CrossProxy": "0xF7Ba155556E2CD4Dfe3Fe26e506A14d2f4b97613",
      "SignatureVerifier": "0x8818C74956Ae90C6C7B317439373052073E62999",
    },
    "FTM": {
      "TokenManagerProxy": "0x4133401A05917326765427e7629bbA56C89F8bDC",
      "OracleProxy": "0x78F811A431D248c1EDcF6d95ec8551879B2897C3",
      "CrossProxy": "0xCcffE9d337f3c1b16bd271D109e691246fD69ee3",
      "SignatureVerifier": "0xe2B7C17Cdf92ebEA0d03DB8cEd4416539095C9ad",
    },
  } : {
    "WAN": {
      "TokenManagerProxy": "0x017aB6485fF91C1A0a16B90E71f92B935B7213d3",
      "OracleProxy": "0x27933A9b0A5c21B838843d7601B6e0b488122AE9",
      "CrossProxy": "0x62dE27e16f6f31d9Aa5B02F4599Fc6E21B339e79",
      "SignatureVerifier": "0x5dcAB781bD5E1e7af64EEC0686f6d618554F6340",
      "StoremanGroupProxy": "0xaA5A0f7F99FA841F410aafD97E8C435c75c22821",
      "MetricProxy": "0x869276043812B459Cc9d11E255Fb0097D51846EF",
      "GpkProxy": "0xf0bFfF373EEF7b787f5aecb808A59dF714e2a6E7",
      "ConfigProxy": "0xc59a6E80E387bdeFa89Efb032aA4EE922Ca78036",
    },
    "ETH": {
      "TokenManagerProxy": "0x9f35da7049FD6CF80c5fe77e2E94bFD969FaE16A",
      "OracleProxy": "0xF728FB2e26Be1f12496d9F68BDDFe1Eac0eBFD26",
      "CrossProxy": "0x7B985C9379A13D2AdF685AEe9cb6d2E3F1809ffB",
      "SignatureVerifier": "0xa16029A2365b4f9E9df8CF2D95f1dDb59df05D29",
    },
    "BSC": {
      "TokenManagerProxy": "0xe110fcEd02DF3b3ABB9E13145bd62491ac3A0032",
      "OracleProxy": "0xBdff39372E4BC0ceFC54b858828aaedFd5498cD1",
      "CrossProxy": "0xb12513cFCb13b7bE59Ba431C040B7206B0a211b9",
      "SignatureVerifier": "0x4A8F5Dd531e4Cd1993b79B23Dbda21fAacb9c731",
    },
    "AVAX": {
      "TokenManagerProxy": "0xaFd25d2696b94d6020037cB8942d72b012Bf0846",
      "OracleProxy": "0x302554D20C92461f4c57baD481797B6D5F422c45",
      "CrossProxy": "0x4c200A0867753454Db78AF84d147Bd03e567f234",
      "SignatureVerifier": "0x0a5b5eA60930cCa901BcE3E3AD1772EBDd5065B8",
    },
    "MOONBEAM": {
      "TokenManagerProxy": "0x59ba8f584d9293a8F2ceEEF76760Ef534afDD716",
      "OracleProxy": "0x8fb1CE0bE9416648919d26ae4894A733cb0D98f1",
      "CrossProxy": "0x9274Be9167c7dBa7F81b61d3870e0272cB8474f6",
      "SignatureVerifier": "0x900485F59F280C6BAd9E400B9De242f9837FD4D9",
    },
    "MATIC": {
      "TokenManagerProxy": "0x15Ad86ebE92EccE4347E65DA59122E2F495D6a48",
      "OracleProxy": "0xdfF6a8699031a448C4cc130F2bfDd9d2Db4E5877",
      "CrossProxy": "0xB5bf1013898a93f0BD902F6e346Ed6cBB627b791",
      "SignatureVerifier": "0x4C12E6696FE23b15F2B911DB7CA42b2d01cDE84A",
    },
    "ARB": {
      "TokenManagerProxy": "0xd2f76C4B824A9311F5979C512a47C0acA5Eb8Ad9",
      "OracleProxy": "0xA4a7d8473948728C9651841cEc9370ceEcb20bBd",
      "CrossProxy": "0xbf0deB5CD8E072018632e9646b4fE998d4047a86",
      "SignatureVerifier": "0xa8E38e437a773aD39eA99c17596fF7c4687C2c8f",
    },
    "FTM": {
      "TokenManagerProxy": "0x31F314D31B0d33E68fA9F69a269FC9187359F627",
      "OracleProxy": "0x114FA1201F82B83c5a2FF0465b4024f01f966b91",
      "CrossProxy": "0x265FC66e84939f36D90Ee38734afe4a770D2c114",
      "SignatureVerifier": "0xe11c6fbdb9B1a3EC56c34Cf401C5c3a2ddAeb9e0",
    },
  };
  return proxyScAddresses[chainType];
}

module.exports = { deploy };
