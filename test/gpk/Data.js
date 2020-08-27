const encrypt = require('./utils/encrypt');

const GpkStatus = {
  PolyCommit: 0, Negotiate: 1, Complete: 2, Close: 3
}

const CheckStatus = {
  Init: 0, Valid: 1, Invalid: 2
}

class Data {
  constructor(smgSc, gpkSc, groupId) {
    this.smgSc = smgSc;
    this.gpkSc = gpkSc;
    this.groupId = groupId;
    this.smList = [];
    this.threshold = 0;
    this.curves = [];
    this.rounds = [];
  }

  async init() {
    await this.getSmList();
    await this.initCurve();
    await this.initRounds();
  }

  async getSmList() {
    let smNumber = await this.smgSc.getSelectedSmNumber(this.groupId);
    let ps = new Array(smNumber);
    for (let i = 0; i < smNumber; i++) {
      ps[i] = new Promise(async (resolve, reject) => {
        try {
          let sm = await this.smgSc.getSelectedSmInfo(this.groupId, i);
          let address = sm.wkAddr.toLowerCase();
          let pk = sm.PK;
          resolve({address, pk});
        } catch (err) {
          reject(err);
        }
      })
    }
    this.smList = await Promise.all(ps);
    this.threshold = await this.smgSc.getThresholdByGrpId(this.groupId);
    // console.log('gpk ut get smList: %O', this.smList);
    // console.log('gpk ut get threshold: %d', this.threshold);
  }

  async initCurve() {
    let info = await this.smgSc.getStoremanGroupConfig(this.groupId);
    this.curves[0] = parseInt(info.curve1);
    this.curves[1] = parseInt(info.curve2);
    // console.log('gpk ut get curves: %O', this.curves);
  }

  async initRounds() {
    for (let i = 0; i < 2; i++) {
      console.log("gpk ut init curve %d(%d) round", i, this.curves[i]);
      let round = new Round();
      await round.init(this.smList, this.threshold, this.curves[i]);
      this.rounds[i] = round;
    }
  }

  async setPolyCommit(curve, src, round = 0, opt = null) {
    let polyCommit = this.rounds[curve % 2].src[src].polyCommit;
    let order = polyCommit.length;
    let buf = Buffer.alloc(order * 64);
    let offset = 0;
    for (let i = 0; i < order; i++) {
      let temp = Buffer.from(polyCommit[i].substr(2), 'hex');
      temp.copy(buf, offset);
      offset += 64;
    }
    let pcStr = '0x' + buf.toString('hex');
    if (opt) {
      await this.gpkSc.setPolyCommit(this.groupId, round, curve, pcStr, opt);
    } else {
      await this.gpkSc.setPolyCommit(this.groupId, round, curve, pcStr);
    }
  }

  async setEncSij(curve, src, dest, round = 0, opt = null) {
    let destAddr = this.smList[dest].address;
    let encSij = this.rounds[curve].src[src].send[dest].encSij;
    if (opt) {
      await this.gpkSc.setEncSij(this.groupId, round, curve, destAddr, encSij, opt);
    } else {
      await this.gpkSc.setEncSij(this.groupId, round, curve, destAddr, encSij);
    }
  }
}

class Round {
  constructor() {
    this.src = [];
  }

  async init(smList, threshold, curve) {
    for (let i = 0; i < smList.length; i++) {
      // console.log("gpk ut init src %d", i);
      let src = new Src();
      await src.init(smList, threshold, curve);
      this.src[i] = src;
    }
  }
}

class Src {
  constructor() {
    // self data
    this.poly = []; // defalt 17 order, hex string with 0x
    this.polyCommit = []; // poly * G, hex string with 0x
    this.skShare = ''; // hex string with 0x
    this.pkShare = ''; // hex string with 0x
    this.gpk = ''; // hex string with 0x
    // send data
    this.send = [];
  }

  async init(smList, threshold, curve) {
    // poly commit
    for (let i = 0; i < threshold; i++) {
      let poly = encrypt.genRandomCoef(curve, 32);
      this.poly[i] = '0x' + poly.toBuffer().toString('hex');
      this.polyCommit[i] = '0x' + encrypt.mulG(curve, poly).getEncoded(false).toString('hex').substr(2);
      // console.log("gpk ut init polyCommit %i: %s", i, this.polyCommit[i]);
    }
    // send
    for (let i = 0; i < smList.length; i++) {
      let send = new Send();
      await send.init(this.poly, curve, smList[i].address, smList[i].pk);
      this.send[i] = send;
      // console.log("gpk ut init send data %i: %O", i, send);
    }
  }
}

class Send {
  constructor() {
    this.sij = ''; // hex string with 0x, 32 bytes
    this.encSij = ''; // hex string with 0x
    this.ephemPrivateKey = ''; // hex string with 0x, 32 bytes
  }

  async init(poly, curve, partner, pk) {
    // console.log("gpk ut init genEncSij for partner %s pk %s", partner, pk);
    let sij = '0x' + encrypt.genSij(curve, poly, pk).toBuffer(32).toString('hex');
    // console.log("sij=%s", sij);
    let enc = await encrypt.encryptSij(pk, sij);
    this.sij = sij;
    this.encSij = '0x' + enc.ciphertext;
    // console.log("encSij=%s", this.encSij);
    this.ephemPrivateKey = '0x' + enc.ephemPrivateKey;
    // console.log("ephemPrivateKey=%s", this.ephemPrivateKey);
  }
}

module.exports = {
  GpkStatus,
  CheckStatus,
  Data
};