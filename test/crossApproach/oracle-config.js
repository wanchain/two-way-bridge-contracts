const web3 = require("web3")
const {
  coins,
  tokens
} = require("./token-config");

function toNonExponential(num) {
  let m = num.toExponential().match(/\d(?:\.(\d*))?e([+-]\d+)/);
  return num.toFixed(Math.max(0, (m[1] || '').length - m[2]));
}

async function updateOracle(oracle, storemanGroups, owner) {
  let count = 2;
  for (let index in storemanGroups) {
    --count;
    if (count <= 0) {
      break;
    }
    // console.log("oracle.updateDeposit(", storemanGroups[index].ID, web3.utils.toWei(storemanGroups[index].deposit), ")")
    // await oracle.updateDeposit(storemanGroups[index].ID, web3.utils.toWei(storemanGroups[index].deposit), {from: owner});
    await oracle.updateDeposit(storemanGroups[index].ID, web3.utils.toWei(storemanGroups[index].deposit));
  }

  let tokenSymbols = [];
  let tokenPrices = [];
  for (let currChainType in coins) {
    if (tokens[currChainType]) {
      for (let token of tokens[currChainType]) {
        // let symbolBytes;
        let symbolHex;
        let priceWei;
        if (token.chainID === token.ancestorChainID) {
          // symbolBytes = web3.utils.hexToBytes(web3.utils.asciiToHex(token.symbol));
          symbolHex = web3.utils.asciiToHex(token.symbol);
          priceWei = web3.utils.toWei(toNonExponential(token.price));
          tokenSymbols.push(symbolHex);
          tokenPrices.push(priceWei);
          // console.log(`${currChainType} token ${token.symbol} >>${symbolHex}[${web3.utils.hexToBytes(symbolHex)}]<< ${priceWei}`)
        }
      }
    }

    // let found = tokenSymbols.filter(symbolHex => symbolHex === web3.utils.hexToBytes(web3.utils.asciiToHex(coins[currChainType].symbol)))[0];
    // if (!found) {
    // let symbolBytes = web3.utils.hexToBytes(web3.utils.asciiToHex(coins[currChainType].symbol));
    let symbolHex = web3.utils.asciiToHex(coins[currChainType].symbol);
    let priceWei = web3.utils.toWei(toNonExponential(coins[currChainType].price));
    tokenSymbols.push(symbolHex);
    tokenPrices.push(priceWei);
    // console.log(`${currChainType} coin ${coins[currChainType].symbol} >>${symbolHex}[${web3.utils.hexToBytes(symbolHex)}]<< ${priceWei}`)
    // }
  }
  // console.log("==========tokenSymbols:", tokenSymbols, "tokenPrices:", tokenPrices)
  if (tokenSymbols.length !== tokenPrices.length) {
    throw new Error("update oracle price failed: not equal length about symbols and prices");
  }

  if (tokenPrices.length) {
    // await oracle.updatePrice(tokenSymbols, tokenPrices, {from: owner});
    await oracle.updatePrice(tokenSymbols, tokenPrices);
    // check
    // let oraclePrices = await oracle.getValues(tokenSymbols);
    // assert.equal(oraclePrices[0].eq(new BN(tokenPrices[0])), true);
    // assert.equal(oraclePrices[1].eq(new BN(tokenPrices[1])), true);
    // assert.equal(oraclePrices[2].eq(new BN(tokenPrices[2])), true);
    // assert.equal(oraclePrices[3].eq(new BN(tokenPrices[3])), true);
    // console.log(oraclePrices);
  }
}

module.exports = {
  updateOracle,
}