const BigInteger = require('bigi');
const config = require('../cfg/config');
const encrypt = require('./utils/encrypt');
const wanchain = require('./utils/wanchain');

const createGpkSc = wanchain.getContract('CreateGpk', config.contractAddress.createGpk);
const preCompileSc = wanchain.getContract('PreCompile', config.contractAddress.preCompile);

// test precompile contract

async function testPolyCommitRaw() {
  let pc = '0x045015ebaded0071832f807a967828cea197eafd49ace33832a4d29eb045d3ce37c8d6d79fab63fd14f6f73c632d04c7d1309ac06dbe09f7a3d184f514794fb79804e47849af6bed7dd45e2eb73b013f8c8a23c91dce7634a6d941535bbc7592faa82b3bcf0a1a9a8ef60c6bc12637d85d8383d4c3ef96aaea242500433ebc400eda0484fac4c192c53567e5df2ce50b074141c74690ae63fce36391e8c16467485202893ff30fdfca0e8e7c3e6ae0192d73a847f991a41e77546a1f89a5de64e35621';
  let pk = '0x04ccd16e96a70a5b496ff1cec869902b6a8ffa00715897937518f1c9299726f7090bc36cc23c1d028087eb0988c779663e996391f290631317fc22f84fa9bf2467'
  let result = await preCompileSc.methods.calPolyCommit(pc, pk).call();
  console.log("testPolyCommitRaw output %O", result);
  // console.log("testAddPointRaw output %s: x=%s, y=%s", result[2], result[0], result[1]);
}

testPolyCommitRaw();

// wanchain.getTxReceipt('0xf0f748c124f781a0c8b9d9d93ea76011ced1f411a5128dbcfbfccd7ee69464b8', 'polyCommit');