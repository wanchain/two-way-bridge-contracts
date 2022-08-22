



const WrappedErc1155Json = require("./WrappedErc1155.json");

const tokenID = 15;
const minerFee = 5;
const erc1155TokenCrossType = 2;
const mintValue = 12345;

async function getErc1155Token(owner, tokenName, tokenSymbol) {
    let WrappedErc1155Token = new web3.eth.Contract(WrappedErc1155Json.abi);
    let deployRet = await WrappedErc1155Token.deploy({ data: WrappedErc1155Json.bytecode, arguments: [tokenName, tokenSymbol, "baseUr", owner, owner, owner] })
        .send({
            from: owner,
            gasPrice: '20000000000',// ganacle-cli default value
            gas: 6721975            // ganache-cli default value
        }, function (error, transactionHash) {
            // console.log("error:", error, ",transactionHash:", transactionHash);
        })
        .on('error', function (error) {
            // console.log("error:", error);
        })
        .on('transactionHash', function (transactionHash) {
            // console.log("transactionHash:", transactionHash);
        })
        .on('receipt', function (receipt) {
            //console.log("receipt.contractAddress:", receipt.contractAddress) // 合约地址内容
            //return receipt.contractAddress;
            // let erc1155 = new web3.eth.Contract(WrappedErc1155Json.abi, receipt.contractAddress);
            // console.log("erc1155:", erc1155);
            return receipt.contractAddress;
        });
    // console.log("deployRet:", deployRet);
    return deployRet;
}

async function deployErc1155OrigToken(owner, tokens) {
    for (let token of tokens) {
        if (token.chainID !== token.ancestorChainID) {
            // mapping token
            console.log("deployOrigToken skip mapping token", token.symbol);
            continue;
        }
        let ercToken = await getErc1155Token(owner, token.name, token.symbol);
        token.tokenAccount = ercToken._address;
    }
    return tokens;
}

async function transferErc1155Token(owner, tokens, alice) {
    for (let erc1155Token of tokens) {
        if (erc1155Token.chainID !== erc1155Token.ancestorChainID) {
            // mapping erc1155Token
            console.log("deployOrigToken skip mapping erc1155Token", erc1155Token.symbol);
            continue;
        }
        
        let erc1155Inst = new web3.eth.Contract(WrappedErc1155Json.abi, erc1155Token.tokenAccount);
        let mintReceipt = await erc1155Inst.methods.mint(alice, tokenID, mintValue, '0x').send({
            from: owner,
            gasPrice: '20000000000',// ganacle-cli default value
            gas: 6721975            // ganache-cli default value 
        });

        let balanceOf = await erc1155Inst.methods.balanceOf(alice, tokenID).call();
        console.log("erc1155 balanceOf:", balanceOf);
        if (balanceOf !== String(mintValue)) {
            console.log("check failed about transfer Erc1155 token");
        }
    }
}

module.exports = {
    getErc1155Token,
    deployErc1155OrigToken,
    transferErc1155Token,
    tokenID,
    minerFee,
    erc1155TokenCrossType,
    mintValue
};
