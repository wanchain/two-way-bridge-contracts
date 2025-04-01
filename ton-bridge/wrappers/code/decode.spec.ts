import {Cell, toNano} from "@ton/core";
import {codeTable} from "./encode-decode";
import {OP_FEE_SetTokenPairFee, OP_TOKENPAIR_Upsert} from "../opcodes"
import {BIP44_CHAINID, TON_COIN_ACCOUT} from "../const/const-value";
import {getQueryID} from "../utils/utils";
import {TON_FEE} from "../fee/fee";

let rawCellStr = "b5ee9c7201010101005000009c50000003000000000000000100000003000012340000456714833589fcd6edb6e08f4c7c32d4f71b54bda02913200000000000000000000000000000000000000000000000000000000000000000"
let rawCellStr1 = 'b5ee9c7241010301006c0002345000000300000000000000010000000300001234000045672a200102005430783833333538396663643665646236653038663463376333326434663731623534626461303239313300400000000000000000000000000000000000000000000000000000000000000000e249552b'

let tokenInfo = {
    tokenOrg:{tokenPairId:0x01,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',},
    tokenWrapped:{tokenPairId:0x02,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:'',},
    coin:{tokenPairId:0x03,srcChainId:0x1234,dstChainId:BIP44_CHAINID,srcTokenAcc:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",dstTokenAcc:''},
}
let queryID;
let tokenPairId3 = tokenInfo.coin.tokenPairId;
let srcChainId3 = tokenInfo.coin.srcChainId;
let dstChainId3 = tokenInfo.coin.dstChainId;
let srcTokenAcc3 = tokenInfo.coin.srcTokenAcc;
let dstTokenAcc3 = tokenInfo.coin.dstTokenAcc;
tokenInfo.coin.dstTokenAcc = TON_COIN_ACCOUT;

describe('decode', () => {

    beforeAll(async () => {
        queryID = await getQueryID();
    });

   it('decode AddTokenPair', async () => {
        let cell= Cell.fromBoc(Buffer.from(rawCellStr1,'hex'))[0];
        let opCode = 0x50000003;
        let decode = codeTable[opCode]["deCode"](cell);
        console.log(decode);
    });

    it('decode should be equal code', async () => {
        let opt = {
            value: TON_FEE.TRANS_FEE_NORMAL,
            queryID,
            tokenPairId: tokenPairId3,
            fromChainID: srcChainId3,
            fromAccount: srcTokenAcc3,
            toChainID: dstChainId3,
            toAccount: dstTokenAcc3,
        }

        let encodedCell = codeTable[OP_TOKENPAIR_Upsert].enCode(opt);
        let bodyCellHex = encodedCell.toBoc().toString('hex');
        console.log(bodyCellHex);
        let decoded = codeTable[OP_TOKENPAIR_Upsert].deCode(encodedCell);
        console.log(decoded);
        let event = codeTable[OP_TOKENPAIR_Upsert].emitEvent(decoded);
        console.log(event);
    });

    it('cell under flow (tonview)',async () =>{
        let bodyCelStr = "b5ee9c72010103010056000234500000030000000000000001000000030000123400004567142001020028833589fcd6edb6e08f4c7c32d4f71b54bda0291300400000000000000000000000000000000000000000000000000000000000000000";
        let bodyCell = Cell.fromBoc(Buffer.from(bodyCelStr,'hex'))[0];
        let opCode = 0x50000003;
        let decode = codeTable[opCode]["deCode"](bodyCell);
        console.log(decode);
    })

    it('cell under flow (sdk)',async () =>{
        let bodyCelStr = "b5ee9c72410103010056000234500000030000000000000001000000030000123400004567142001020028833589fcd6edb6e08f4c7c32d4f71b54bda02913004000000000000000000000000000000000000000000000000000000000000000008b8d7029";
        let bodyCell = Cell.fromBoc(Buffer.from(bodyCelStr,'hex'))[0];
        let opCode = 0x50000003;
        let decode = codeTable[opCode]["deCode"](bodyCell);
        console.log(decode);
    })

    it('decode userlock',async () =>{
        let bodyCelStr = "b5ee9c720101020100bb0001a2400000010000000043c5bea9000000000000000000000000000000000000000000746573746e65745f303638000003ac0000000000000000000000000000000000000000000000000000000005f5e100000100c98019e2d1908a3b757dc1eb9a4e6cfe5632fa789bcea365ee7ed452693d108b3f97f000a21b8da3f35c1ac4d8745f5d43077e25b2b482a5dbba52b532dd52cad9dda5f600070829dbe0c1c08edaf5f5ba2689cb0a722561e17864183ddc4f8087692ee517c0";
        let bodyCell = Cell.fromBoc(Buffer.from(bodyCelStr,'hex'))[0];
        let opCode = 0x40000001;
        let decode = codeTable[opCode]["deCode"](bodyCell);
        console.log(decode);
    })

});