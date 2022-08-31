



const WrappedErc1155Json = require("./WrappedErc1155.json");

const tokenIDs = [1, 2, 3, 4, 5];
const tokenValues = [11, 22, 33, 44, 55];
const minerFee = 5;
const erc1155TokenCrossType = 2;


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
        let mintReceipt = await erc1155Inst.methods.mintBatch(alice, tokenIDs, tokenValues, '0xabcd').send({
            from: owner,
            gasPrice: '20000000000',// ganacle-cli default value
            gas: 6721975            // ganache-cli default value 
        });
        //console.log("mintReceipt:", mintReceipt);
        let accounts = [alice, alice, alice, alice, alice];
        let balanceOf = await erc1155Inst.methods.balanceOfBatch(accounts, tokenIDs).call();
        //console.log("erc1155 balanceOf:", balanceOf);
        for (let idx = 0; idx < tokenValues.length; ++idx) {
            if (parseInt(balanceOf[idx]) !== tokenValues[idx]) {
                console.log("check failed about transfer Erc1155 token!");
                console.log("balanceOf:", balanceOf);
                console.log("tokenValues:", tokenValues);
                break;
            }
        }
    }
}



module.exports = {
    getErc1155Token,
    deployErc1155OrigToken,
    transferErc1155Token,
    tokenIDs,
    minerFee,
    erc1155TokenCrossType,
    tokenValues
};
