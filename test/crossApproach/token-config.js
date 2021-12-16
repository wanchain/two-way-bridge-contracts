const {
  ADDRESS_0,
  defaultChainIDs,
  defaultChainID2Types
} = require("./common");

// const erc721 = artifacts.require("ERC721.sol")
const MappingNftToken = artifacts.require("MappingNftToken");
const erc721 = MappingNftToken;
const MappingToken = artifacts.require("MappingToken");
let crossTypes          = {
  coin                    : 1 << 0,
  token                   : 1 << 1,
};
crossTypes.all = crossTypes.coin | crossTypes.token;

let coins                = {
  WAN: {
    crossType            : crossTypes.all,
    chainID               : defaultChainIDs.WAN,
    tokenAccount          : ADDRESS_0,
    decimals              : 18,
    name                  : 'WAN',
    symbol                : 'WAN',
    price                 : 10e-16
  },
  ETH: {
    crossType            : crossTypes.all,
    chainID               : defaultChainIDs.ETH,
    tokenAccount          : ADDRESS_0,
    decimals              : 18,
    name                  : 'ETH',
    symbol                : 'ETH',
    price                 : 300e-15
  },
  ETC: {
    crossType            : crossTypes.all,
    chainID                 : defaultChainIDs.ETC,
    tokenAccount          : ADDRESS_0,
    decimals              : 18,
    name                  : 'ETC',
    symbol                : 'ETC',
    price                 : 200e-15
  },
  BTC: {
    crossType            : crossTypes.coin,
    chainID               : defaultChainIDs.BTC,
    tokenAccount          : ADDRESS_0,
    decimals              : 8,
    name                  : 'BTC',
    symbol                : 'BTC',
    price                 : 1000e-15,
  }
}

let tokens               = {
  WAN: [
    {
      chainID               : defaultChainIDs.WAN,
      tokenCreator          : null,
      tokenAccount          : "",
      decimals              : coins.BTC.decimals,
      name                  : `wan${coins.BTC.name}`,
      symbol                : `wan${coins.BTC.symbol}`,
      price                 : coins.BTC.price,
      ancestorChainID       : defaultChainIDs.BTC
    },
    {
      chainID               : defaultChainIDs.WAN,
      tokenCreator          : null,
      tokenAccount          : "",
      decimals              : 18,
      name                  : 'FNX',
      symbol                : 'FNX',
      price                 : 1e-17,
      ancestorChainID       : defaultChainIDs.WAN
    }
  ],
  ETH: [
    {
      chainID               : defaultChainIDs.ETH,
      tokenCreator          : null,
      tokenAccount          : "",
      decimals              : coins.BTC.decimals,
      name                  : `wan${coins.BTC.name}`,
      symbol                : `wan${coins.BTC.symbol}`,
      price                 : coins.BTC.price,
      ancestorChainID       : defaultChainIDs.BTC
    },
    {
      chainID               : defaultChainIDs.ETH,
      tokenCreator          : null,
      tokenAccount          : "",
      decimals              : 16,
      name                  : 'LINK',
      symbol                : 'LINK',
      price                 : 2e-17,
      ancestorChainID       : defaultChainIDs.ETH
    }
  ],
  ETC: [
    {
      chainID               : defaultChainIDs.ETC,
      tokenCreator          : null,
      tokenAccount          : "",
      decimals              : coins.BTC.decimals,
      name                  : `wan${coins.BTC.name}`,
      symbol                : `wan${coins.BTC.symbol}`,
      price                 : coins.BTC.price,
      ancestorChainID       : defaultChainIDs.BTC
    },
    {
      chainID               : defaultChainIDs.ETC,
      tokenCreator          : null,
      tokenAccount          : "",
      decimals              : 16,
      name                  : 'UVC',
      symbol                : 'UVC',
      // price                 : 7
      price                 : 7e-17,
      ancestorChainID       : defaultChainIDs.ETC
    }
  ]
};
let nftTokens = {
    WAN: [
    ],
    ETH: [
        {
            chainID: defaultChainIDs.ETH,
            tokenCreator: null,
            tokenAccount: "",
            decimals: 0,
            name: 'NFT',
            symbol: 'NFT',
            price: 1,
            ancestorChainID: defaultChainIDs.ETH
        }
    ],
    ETC: [
    ]
};

let startTokenPairID     = 1;

async function deployOrigToken(tokenCreator, tokens) {
  for (let token of tokens) {
    if (token.chainID !== token.ancestorChainID) {
      // mapping token
      console.log("deployOrigToken skip mapping token", token.symbol);
      continue;
    }
    await tokenCreator.createToken(token.name, token.symbol, token.decimals);
    token.tokenCreator = tokenCreator;
    token.tokenAccount = await tokenCreator.getTokenAddr.call(token.name, token.symbol);
  }
  return tokens
}

async function transferOrigToken(tokenCreator, tokens, alice) {
  for (let token of tokens) {
    if (token.chainID !== token.ancestorChainID) {
      // mapping token
      console.log("deployOrigToken skip mapping token", token.symbol);
      continue;
    }
    let mintValue = "1000000000"
    //console.log(`mintToken(${token.name}, ${token.symbol}, ${alice}, ${mintValue})`)
    await tokenCreator.mintToken(token.name, token.symbol, alice, mintValue);
    let value = await tokenCreator.tokenBalance.call(token.name, token.symbol, alice);
    if (String(value) !== mintValue) {
      console.log("check failed about transfer original token", name, symbol, alice);
    }
  }
}

async function transferNftToken(tokenCreator, nftTokens, alice) {
    for (let nftToken of nftTokens) {
        if (nftToken.chainID !== nftToken.ancestorChainID) {
            // mapping nftToken
            console.log("deployOrigToken skip mapping nftToken", nftToken.symbol);
            continue;
        }
        let mintValue = 12345

        await tokenCreator.mintToken(nftToken.name, nftToken.symbol, alice, mintValue);
        let value = await tokenCreator.tokenBalance.call(nftToken.name, nftToken.symbol, alice);
        if (value.toString() !== "1") {
            console.log("check failed about transfer original nftToken", nftToken.name, nftToken.symbol, alice);
        }
        //console.log("transferNftToken nftToken.tokenAccount:", nftToken.tokenAccount);
        let nftInst = await erc721.at(nftToken.tokenAccount);
        let ownerOf = await nftInst.ownerOf(mintValue);
        console.log("nftToken.tokenAccount :", nftToken.tokenAccount, ",nft:", mintValue, ",ownerOf:", ownerOf);
        if (ownerOf !== alice) {
            console.log("check failed about ownerOf:", ownerOf);
        }
    }

}

function getWeb3Log(receipt, expectedEvent) {
  let entries = receipt.logs.filter(log => log.event === expectedEvent.event);
  if(!entries.length){
      throw Error("Not get the expected event: event is null");
  }
  return entries[0];
};

async function addToken(tokenManager, name, symbol, decimals) {
  let receipt = await tokenManager.addToken(name, symbol, decimals);
  let mappingTokenLogger = getWeb3Log(receipt, {
      event: 'AddToken'
  });
  return mappingTokenLogger.args.tokenAddress;
}

async function addNftMappingToken(tokenManager, name, symbol, owner) {
  let nftInst = await MappingNftToken.new(name, symbol, { from: owner });
  await nftInst.transferOwnership(tokenManager.address);
  return nftInst.address;
}

async function addMappingToken(tokenManager, tokenPairs, currChainType, testNftTokenCreator, owner) {
    // config mapping to token account in current chain first
    for (let origChainType in tokenPairs) {
        for (let mappingChainType in tokenPairs[origChainType]) {
            if (mappingChainType !== currChainType) {
                continue;
            }
            let mappingPairs = tokenPairs[origChainType][mappingChainType];

            // config other chain to current chain mapping token pair
            for (let token of mappingPairs) {
                if (token.origChainToken.chainID === token.ancestorChainToken.chainID) {
                    if (!token.shadowChainToken.tokenAccount) {
                        if (token.shadowChainToken.name === "wanNFT") {
                            token.shadowChainToken.tokenAccount = await addNftMappingToken(tokenManager, token.shadowChainToken.name, token.shadowChainToken.symbol, owner);
                        }
                        else {
                            token.shadowChainToken.tokenAccount = await addToken(tokenManager, token.shadowChainToken.name, token.shadowChainToken.symbol, token.ancestorChainToken.decimals);

                            let mapInst = await MappingToken.at(token.shadowChainToken.tokenAccount);
                            let ownerAddr = await mapInst.owner();
                            //console.log("token.shadowChainToken.name:", token.shadowChainToken.name);
                            //console.log("MappingToken.owner:", ownerAddr);
                            //console.log("tokenManager.address:", tokenManager.address);
                        }
                    }
                } else {
                    if (!token.shadowChainToken.tokenAccount) {
                        let ancestorChainType = defaultChainID2Types[token.ancestorChainToken.chainID];
                        let ancestorMappingTokenPair = tokenPairs[ancestorChainType][currChainType].filter(ancestorTokenPair => ancestorTokenPair.shadowChainToken.symbol === token.shadowChainToken.symbol)[0];
                        if (!ancestorMappingTokenPair.shadowChainToken.tokenAccount) {
                            // add the mapping token from ancestor chain to current chain
                            //console.log("add ancestor chain mapping token", token.origChainToken.symbol);
                            ancestorMappingTokenPair.shadowChainToken.tokenAccount = await addToken(tokenManager, token.origChainToken.name, token.origChainToken.symbol, token.ancestorChainToken.decimals);
                        }
                        token.shadowChainToken.tokenAccount = ancestorMappingTokenPair.shadowChainToken.tokenAccount;
                    }
                }
            }
        }
    }

    // config mapping from token account in current chain second
    for (let origChainType in tokenPairs) {
        if (origChainType !== currChainType) {
            continue;
        }
        for (let mappingChainType in tokenPairs[origChainType]) {
            for (let token of tokenPairs[origChainType][mappingChainType]) {
                // each token {currChainType:{mappingChainType:[{token}]}}
                if (token.origChainToken.chainID !== token.ancestorChainToken.chainID) {
                    if (!token.origChainToken.tokenAccount) {
                        // token pair is not original token pair, it is consist of mapping token pair
                        // get ancestor chain
                        let ancestorChainType = defaultChainID2Types[token.ancestorChainToken.chainID];
                        let ancestorTokenPair = tokenPairs[ancestorChainType][currChainType].filter(ancestorTokenPair => ancestorTokenPair.shadowChainToken.symbol === token.origChainToken.symbol)[0];
                        if (!ancestorTokenPair.shadowChainToken.tokenAccount) {
                            // add the mapping token from ancestor chain to current chain
                            //console.log("add ancestor chain mapping token", token.origChainToken.symbol);
                            console.log("addMappingToken 2 token:", token);
                            ancestorTokenPair.shadowChainToken.tokenAccount = await addToken(tokenManager, token.origChainToken.name, token.origChainToken.symbol, token.ancestorChainToken.decimals);
                        }
                        token.origChainToken.tokenAccount = ancestorTokenPair.shadowChainToken.tokenAccount;
                    }
                }
            }
        }
    }

    return tokenPairs;
}

function initOrigTokenPairs(coins, tokens, chainTypes, defaultChainIDs, startTokenPairID) {
  let tokenPairs = {
    WAN: { ETH: [], BTC: [] },
    ETH: { WAN: [], BTC: [] },
    BTC: { WAN: [], ETH: [] },
    };
  //  let tokenPairs = {
  //      WAN: { ETH: []},
  //      ETH: { WAN: [] },
  //  };
  // [["WAN", "ETH"], ["WAN", "BTC"], ["ETH", "WAN"], ["ETH", "BTC"], ["BTC", "WAN"], ["BTC", "ETH"]]
    let chainTypeBounds = Object.keys(tokenPairs).map(origChainType => Object.keys(tokenPairs[origChainType]).map(otherChainType => [origChainType, otherChainType])).reduce((acc, val) => acc.concat(val), []);
    //console.log("initOrigTokenPairs chainTypeBounds:", chainTypeBounds);
  // add coin pair first second
    chainTypeBounds.forEach(([origChainType, shadowChainType]) => {
    // add coin pair
    if ((coins[shadowChainType].crossType & crossTypes.token)) {
      tokenPairs[origChainType][shadowChainType].push({
        tokenPairID           : startTokenPairID++,
        ancestorChainToken    : coins[origChainType],
        origChainToken        : {name:coins[origChainType].name,symbol:coins[origChainType].symbol,chainID:coins[origChainType].chainID,tokenAccount:coins[origChainType].tokenAccount},
        shadowChainToken      : {
          name:(coins[origChainType].symbol===chainTypes.WAN)?coins[origChainType].name:`wan${coins[origChainType].name}`,
          symbol:(coins[origChainType].symbol===chainTypes.WAN)?coins[origChainType].symbol:`wan${coins[origChainType].symbol}`,
          chainID:defaultChainIDs[shadowChainType],
          tokenAccount:""},
      });
    }
  });
    //console.log("before add token tokenPairs:", tokenPairs);
  // add token pair
    chainTypeBounds.forEach(([origChainType, shadowChainType]) => {
      tokens[origChainType] && tokens[origChainType].forEach(token => {
      let a = token.symbol.split("wan");
          ancestorSymbol = a[a.length - 1];
          //console.log("ancestorSymbol:", ancestorSymbol);
      if (!(coins[shadowChainType].crossType & crossTypes.token)) {
        return;
      }

      let shadowTokenName = token.symbol.startsWith('wan') ? token.name : `wan${token.name}`;
      let shadowTokenSymbol = token.symbol.startsWith('wan') ? token.symbol : `wan${token.symbol}`;

      let foundArray = tokenPairs[origChainType][shadowChainType].filter(tokenPair => {
        let check1 = tokenPair.origChainToken.name === token.name && tokenPair.origChainToken.symbol === token.symbol
          && tokenPair.shadowChainToken.name === shadowTokenName && tokenPair.shadowChainToken.symbol === shadowTokenSymbol
        let check2 = tokenPair.origChainToken.name === shadowTokenName && tokenPair.origChainToken.symbol === shadowTokenSymbol
          && tokenPair.shadowChainToken.name === token.name && tokenPair.shadowChainToken.symbol === token.symbol
        return check1 || check2;
      });
      if (!foundArray.length) {
        foundArray = tokenPairs[shadowChainType][origChainType].filter(tokenPair => {
          let check1 = tokenPair.origChainToken.name === token.name && tokenPair.origChainToken.symbol === token.symbol
            && tokenPair.shadowChainToken.name === shadowTokenName && tokenPair.shadowChainToken.symbol === shadowTokenSymbol
          let check2 = tokenPair.origChainToken.name === shadowTokenName && tokenPair.origChainToken.symbol === shadowTokenSymbol
            && tokenPair.shadowChainToken.name === token.name && tokenPair.shadowChainToken.symbol === token.symbol
          return check1 || check2;
        });
      }
      if (foundArray.length) {
        return;
      }

      tokenPairs[origChainType][shadowChainType].push({
        tokenPairID           : startTokenPairID++,
        ancestorChainToken    : (token.symbol===`wan${coins.BTC.symbol}`) ? coins.BTC : token,
        origChainToken        : {name:token.name,symbol:token.symbol,chainID:token.chainID,tokenAccount:token.tokenAccount},
        shadowChainToken      : {
          name:token.symbol.startsWith('wan') ? token.name : `wan${token.name}`,
          symbol:token.symbol.startsWith('wan') ? token.symbol : `wan${token.symbol}`,
          chainID:defaultChainIDs[shadowChainType],
          tokenAccount:""},
      });
    });
    });
    //console.log("after add token tokenPairs:", tokenPairs);

    // add NFT token pair
    chainTypeBounds.forEach(([origChainType, shadowChainType]) => {
        nftTokens[origChainType] && nftTokens[origChainType].forEach(token => {
            let a = token.symbol.split("wan");
            ancestorSymbol = a[a.length - 1];
            //console.log("ancestorSymbol:", ancestorSymbol);
            if (!(coins[shadowChainType].crossType & crossTypes.token)) {
                return;
            }

            let shadowTokenName = token.symbol.startsWith('wan') ? token.name : `wan${token.name}`;
            let shadowTokenSymbol = token.symbol.startsWith('wan') ? token.symbol : `wan${token.symbol}`;

            let foundArray = tokenPairs[origChainType][shadowChainType].filter(tokenPair => {
                let check1 = tokenPair.origChainToken.name === token.name && tokenPair.origChainToken.symbol === token.symbol
                    && tokenPair.shadowChainToken.name === shadowTokenName && tokenPair.shadowChainToken.symbol === shadowTokenSymbol
                let check2 = tokenPair.origChainToken.name === shadowTokenName && tokenPair.origChainToken.symbol === shadowTokenSymbol
                    && tokenPair.shadowChainToken.name === token.name && tokenPair.shadowChainToken.symbol === token.symbol
                return check1 || check2;
            });
            if (!foundArray.length) {
                foundArray = tokenPairs[shadowChainType][origChainType].filter(tokenPair => {
                    let check1 = tokenPair.origChainToken.name === token.name && tokenPair.origChainToken.symbol === token.symbol
                        && tokenPair.shadowChainToken.name === shadowTokenName && tokenPair.shadowChainToken.symbol === shadowTokenSymbol
                    let check2 = tokenPair.origChainToken.name === shadowTokenName && tokenPair.origChainToken.symbol === shadowTokenSymbol
                        && tokenPair.shadowChainToken.name === token.name && tokenPair.shadowChainToken.symbol === token.symbol
                    return check1 || check2;
                });
            }
            if (foundArray.length) {
                return;
            }

            tokenPairs[origChainType][shadowChainType].push({
                tokenPairID: startTokenPairID++,
                ancestorChainToken: (token.symbol === `wan${coins.BTC.symbol}`) ? coins.BTC : token,
                origChainToken: { name: token.name, symbol: token.symbol, chainID: token.chainID, tokenAccount: token.tokenAccount },
                shadowChainToken: {
                    name: token.symbol.startsWith('wan') ? token.name : `wan${token.name}`,
                    symbol: token.symbol.startsWith('wan') ? token.symbol : `wan${token.symbol}`,
                    chainID: defaultChainIDs[shadowChainType],
                    tokenAccount: ""
                },
            });
        });
    });
    //console.log("after add nft tokenPairs:", tokenPairs);
  return tokenPairs;
}

function cleanTokenPairs(tokenPairs) {
  for (let origChainType in tokenPairs) {
    for (let mappingChainType in tokenPairs[origChainType]) {
      for (let tokenPair of tokenPairs[origChainType][mappingChainType]) {
        if (tokenPair.ancestorChainToken.hasOwnProperty("tokenCreator")) {
          delete tokenPair.ancestorChainToken.tokenCreator;
        }
      }
    }
  }
  return tokenPairs;
}

function getTokenPairFileName(isMainnet) {
  return `${isMainnet ? 'mainnet' : 'testnet'}-token.json`;
}

function updateTokenPairs(fileName, tokenPairs) {
  const fs = require("fs");
  const path = require("path");

  let oldTokenPairs;
  let absoluteFileName = path.join(__dirname, fileName);

  if (fs.existsSync(absoluteFileName)) {
    oldTokenPairs = JSON.parse(fs.readFileSync(absoluteFileName, {encoding: 'utf8'}));
  }

  tokenPairs = cleanTokenPairs(tokenPairs);
  tokenPairs = mergeTokenPairs(tokenPairs, oldTokenPairs);

  fs.writeFileSync(absoluteFileName, JSON.stringify(tokenPairs, null, 2), {flag: 'w', encoding: 'utf8', mode: '0666'});
  return absoluteFileName;
}

function mergeExistTokenPairs(oldTokenPair, tokenPair) {
    // origChainToken
    if (oldTokenPair.origChainToken.tokenAccount !== tokenPair.origChainToken.tokenAccount) {
      if (tokenPair.origChainToken.tokenAccount) {
        oldTokenPair.origChainToken.tokenAccount = tokenPair.origChainToken.tokenAccount
      }
    }
    if (oldTokenPair.origChainToken.chainID !== tokenPair.origChainToken.chainID) {
      oldTokenPair.origChainToken.chainID = tokenPair.origChainToken.chainID
    }
    if (oldTokenPair.origChainToken.name !== tokenPair.origChainToken.name) {
      oldTokenPair.origChainToken.name = tokenPair.origChainToken.name
    }
    if (oldTokenPair.origChainToken.symbol !== tokenPair.origChainToken.symbol) {
      oldTokenPair.origChainToken.symbol = tokenPair.origChainToken.symbol
    }
    // shadowChainToken
    if (oldTokenPair.shadowChainToken.tokenAccount !== tokenPair.shadowChainToken.tokenAccount) {
      if (tokenPair.shadowChainToken.tokenAccount) {
        oldTokenPair.shadowChainToken.tokenAccount = tokenPair.shadowChainToken.tokenAccount
      }
    }
    if (oldTokenPair.shadowChainToken.chainID !== tokenPair.shadowChainToken.chainID) {
      oldTokenPair.shadowChainToken.chainID = tokenPair.shadowChainToken.chainID
    }
    if (oldTokenPair.shadowChainToken.name !== tokenPair.shadowChainToken.name) {
      oldTokenPair.shadowChainToken.name = tokenPair.shadowChainToken.name
    }
    if (oldTokenPair.shadowChainToken.symbol !== tokenPair.shadowChainToken.symbol) {
      oldTokenPair.shadowChainToken.symbol = tokenPair.shadowChainToken.symbol
    }
    // ancestorChainToken
    if (oldTokenPair.ancestorChainToken.tokenAccount !== tokenPair.ancestorChainToken.tokenAccount) {
      if (tokenPair.ancestorChainToken.tokenAccount) {
        oldTokenPair.ancestorChainToken.tokenAccount = tokenPair.ancestorChainToken.tokenAccount
      }
    }
    if (oldTokenPair.ancestorChainToken.chainID !== tokenPair.ancestorChainToken.chainID) {
      oldTokenPair.ancestorChainToken.chainID = tokenPair.ancestorChainToken.chainID
    }
    if (oldTokenPair.ancestorChainToken.name !== tokenPair.ancestorChainToken.name) {
      oldTokenPair.ancestorChainToken.name = tokenPair.ancestorChainToken.name
    }
    if (oldTokenPair.ancestorChainToken.symbol !== tokenPair.ancestorChainToken.symbol) {
      oldTokenPair.ancestorChainToken.symbol = tokenPair.ancestorChainToken.symbol
    }
    if (oldTokenPair.ancestorChainToken.decimals !== tokenPair.ancestorChainToken.decimals) {
      oldTokenPair.ancestorChainToken.decimals = tokenPair.ancestorChainToken.decimals
    }
    if (oldTokenPair.ancestorChainToken.price !== tokenPair.ancestorChainToken.price) {
      oldTokenPair.ancestorChainToken.price = tokenPair.ancestorChainToken.price
    }
}

function mergeTokenPairs(oldTokenPairs, tokenPairs, eqFunc) {
  if (oldTokenPairs) {
    // merge to tokenPairs
    for (let origChainType in tokenPairs) {
      for (let mappingChainType in tokenPairs[origChainType]) {
        for (let tokenPair of tokenPairs[origChainType][mappingChainType]) {
          let oldTokenPair = oldTokenPairs[origChainType][mappingChainType].filter(old => tokenPair.tokenPairID === old.tokenPairID)[0];
          if (!oldTokenPair) {
            oldTokenPair = tokenPair;
          } else {
            mergeExistTokenPairs(oldTokenPair, tokenPair)
          }
        }
      }
    }
  }
  return oldTokenPairs;
}

async function addTokenPairs(tokenManager, tokenPairs) {
  for (let origChainToken in tokenPairs) {
    for (let mappingChainType in tokenPairs[origChainToken]) {
        for (let tokenPair of tokenPairs[origChainToken][mappingChainType]) {
            if (tokenPair.ancestorChainToken.name === "NFT") {
                //console.log("addTokenPairs tokenPair:", tokenPair);
            }
            let tokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
            if (tokenPair.ancestorChainToken.name === "NFT") {
                // console.log("addTokenPairs tokenPairInfo:", tokenPairInfo);
            }

        if (!tokenPairInfo.fromAccount) {
          await tokenManager.addTokenPair(tokenPair.tokenPairID,
            [tokenPair.ancestorChainToken.tokenAccount, tokenPair.ancestorChainToken.name, tokenPair.ancestorChainToken.symbol, tokenPair.ancestorChainToken.decimals, tokenPair.ancestorChainToken.chainID],
            tokenPair.origChainToken.chainID, tokenPair.origChainToken.tokenAccount, tokenPair.shadowChainToken.chainID, tokenPair.shadowChainToken.tokenAccount
          );
        } else if (tokenPairInfo.fromAccount.toLowerCase() !== tokenPair.origChainToken.tokenAccount.toLowerCase()
          || Number(tokenPairInfo.fromChainID) !== tokenPair.origChainToken.chainID
          || tokenPairInfo.toAccount.toLowerCase() !== tokenPair.shadowChainToken.tokenAccount.toLowerCase()
          || Number(tokenPairInfo.toChainID) !== tokenPair.shadowChainToken.chainID
        ) {
          await tokenManager.updateTokenPair(tokenPair.tokenPairID,
            [tokenPair.ancestorChainToken.tokenAccount, tokenPair.ancestorChainToken.name, tokenPair.ancestorChainToken.symbol, tokenPair.ancestorChainToken.decimals, tokenPair.ancestorChainToken.chainID],
            tokenPair.origChainToken.chainID, tokenPair.origChainToken.tokenAccount, tokenPair.shadowChainToken.chainID, tokenPair.shadowChainToken.tokenAccount
          );
          }

          // console.log("addTokenPairs tokenPairInfo:", tokenPairInfo);

        let newTokenPairInfo = await tokenManager.getTokenPairInfo(tokenPair.tokenPairID);
        if (newTokenPairInfo.fromAccount.toLowerCase() !== tokenPair.origChainToken.tokenAccount.toLowerCase()
        || Number(newTokenPairInfo.fromChainID) !== tokenPair.origChainToken.chainID
        || newTokenPairInfo.toAccount.toLowerCase() !== tokenPair.shadowChainToken.tokenAccount.toLowerCase()
        || Number(newTokenPairInfo.toChainID) !== tokenPair.shadowChainToken.chainID) {
          console.log("===check token pairs failed", tokenPair, newTokenPairInfo)
          throw new Error("add token pair failed");
        }
      }
    }
  }
}

function filterTokenPair(tokenPairs, fromChainType, toChainType, symbol) {
  let tokenPair = tokenPairs[fromChainType][toChainType].filter(tokenPair => {
    let symbolCheck = tokenPair.origChainToken.symbol === symbol || tokenPair.shadowChainToken.symbol === symbol;
    let chainCheck = defaultChainIDs[fromChainType] === tokenPair.origChainToken.chainID && defaultChainIDs[toChainType] === tokenPair.shadowChainToken.chainID;
    return symbolCheck && chainCheck;
  })[0];
  if (!tokenPair) {
    tokenPair = tokenPairs[toChainType][fromChainType].filter(tokenPair => {
      let symbolCheck = tokenPair.origChainToken.symbol === symbol || tokenPair.shadowChainToken.symbol === symbol;
      let chainCheckFrom = defaultChainIDs[fromChainType] === tokenPair.origChainToken.chainID && defaultChainIDs[toChainType] === tokenPair.shadowChainToken.chainID;
      let chainCheckTo = defaultChainIDs[toChainType] === tokenPair.origChainToken.chainID && defaultChainIDs[fromChainType] === tokenPair.shadowChainToken.chainID;
      return symbolCheck && (chainCheckFrom || chainCheckTo);
    })[0];
  }
  if (!tokenPair) {
    throw new Error(`Not found token pair about chains [${fromChainType}, ${toChainType}] and symbol ${symbol}}`)
  }
  return tokenPair
}

function getTokenAccount(tokenPairInfo, chainType) {
  let tokenAccount;
  let chainID = Number(defaultChainIDs[chainType]);
  let fromChainID = Number(tokenPairInfo.fromChainID);
  let toChainID = Number(tokenPairInfo.toChainID);

  if (fromChainID !== chainID && toChainID !== chainID) {
    throw new Error(`Invalid token pair about chainType ${chainType}`);
  } else if (fromChainID === chainID) {
    tokenAccount = tokenPairInfo.fromAccount;
  } else {
    tokenAccount = tokenPairInfo.toAccount;
  }
  return tokenAccount;
}

module.exports = {
  coins,
  tokens,
  startTokenPairID,
  deployOrigToken,
  transferOrigToken,
  transferNftToken,
  addMappingToken,
  getTokenPairFileName,
  cleanTokenPairs,
  mergeTokenPairs,
  updateTokenPairs,
  initOrigTokenPairs,
  addTokenPairs,
  filterTokenPair,
  getTokenAccount,
  nftTokens
}