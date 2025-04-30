import {Address} from "@ton/core";

import {configTestnet,configMainnet} from "../config/config-ex";

import {getClient, wanTonSdkInit} from "../client/client";
import {TonClientConfig} from "../client/client";
async function main(){
    await wanTonSdkInit(configMainnet);
    let client = await getClient();
    let ret = await client.getContractState(Address.parse(process.argv[2]));
    console.log("ret1=>",ret);
    client = null;
}

main();

// ts-node getContractState-ex.ts kQDlYDH0PmST2okwTluXJ2mUDMDCzPzXF1gGz24U6H2tE9Wr

/*
{
  balance: 11039234662n,
  state: 'active',
  code: <Buffer b5 ee 9c 72 41 02 9a 01 00 14 3b 00 01 14 ff 00 f4 a4 13 f4 bc f2 c8 0b 01 02 01 62 02 03 02 02 ca 04 05 02 01 20 61 62 02 01 20 06 07 02 01 20 19 1a ... 5145 more bytes>,
  data: <Buffer b5 ee 9c 72 41 02 31 01 00 03 af 00 04 43 80 12 7d d6 63 9d f6 53 87 b9 11 d2 e2 af ce bf 0b 0b 15 da 31 58 0f 72 88 03 a3 66 f6 cf e9 f5 ea 01 01 02 ... 909 more bytes>,
  lastTransaction: {
    lt: '33021438000001',
    hash: 'n7pRQiKqBXblTnbHefLExeBCnV6/TgJzqeqsBeJq4t4='
  },
  blockId: { workchain: -1, shard: '-9223372036854775808', seqno: 29691088 },
  timestampt: 1743493123
}
 */