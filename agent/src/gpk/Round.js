const config = require('../../cfg/config');
const BigInteger = require('bigi');
const encrypt = require('../utils/encrypt');
const wanchain = require('../utils/wanchain');
const {GroupStatus, CheckStatus} = require('./Types');
const Send = require('./Send');
const Receive = require('./Receive');

const POC = true;

class Round {
  constructor(groupId, round) {
    // contract
    this.smgSc = null;
    this.createGpkSc = null;

    // group info
    this.groupId = groupId;
    this.round = round;
    this.status = GroupStatus.Init;
    this.statusTime = 0;
    this.smList = []; // 21, address
    this.ployCommitPeriod = 0;
    this.defaultPeriod = 0;
    this.negotiatePeriod = 0;

    // self data
    this.selfSk = null; // Buffer
    this.selfPk = ''; // hex string with 0x
    this.poly = []; // defalt 17 order, BigInteger
    this.polyCommit = []; // poly * G, Point
    this.polyCommitTxHash = '';
    this.polyCommitDone = false;
    this.skShare = ''; // hex string with 0x
    this.pkShare = ''; // hex string with 0x
    this.gpk = ''; // hex string with 0x
    this.gpkTxHash = '';
    this.gpkDone = false;
 
    // global interactive data
    this.polyCommitTimeoutTxHash = '';

    // p2p interactive data
    this.receive = new Map();
    this.send = new Map();

    // schedule
    this.standby = false;
    this.toStop = false;
  }

  async start() {
    this.smgSc = wanchain.getContract('smg', config.contractAddress.smg);
    this.createGpkSc = wanchain.getContract('CreateGpk', config.contractAddress.createGpk);
    this.initSelfKey();
    await this.initSmList();
    this.initPoly();
    console.log("init gpk group %s", this.groupId);
    this.next(3000);
  }

  initSelfKey() {
    this.selfSk = wanchain.selfSk;
    this.selfPk = '0x04' + wanchain.selfPk.toString('hex');
    this.selfAddress = wanchain.selfAddress;
  } 

  initPoly() {
    let threshold = this.smgSc.methods.getThresholdByGrpId(this.groupId).call();
    for (let i = 0; i < threshold; i++) {
      this.poly[i] = encrypt.genRandom(32);
      this.polyCommit[i] = encrypt.mulG(this.poly[i]);
      // console.log("init polyCommit %i: %s", i, this.polyCommit[i].getEncoded(false).toString('hex'));
    }
  }

  async initSmList() {
    let smNumber = await this.smgSc.methods.getSelectedSmNumber(this.groupId).call();
    let smList = new Array(smNumber);
    let ps = new Array(smNumber);
    for (let i = 0; i < smNumber; i++) {
      ps[i] = new Promise(async (resolve, reject) => {
        try {
          let sm = await this.smgSc.methods.getSelectedSmInfo(this.groupId, i).call();
          smList[i] = sm[0];
          this.send.set(sm[0], new Send(sm[1]));
          this.receive.set(sm[0], new Receive());
          resolve();
        } catch (err) {
          reject(err);
        }
      })
    }
    await Promise.all(ps);
    this.smList = smList;
    console.log('%s gpk group %s init smList: %O', new Date(), this.groupId, smList);
    console.log('send map: %O', this.send);
    console.log('receive map: %O', this.receive);
  }

  next(interval = 60000) {
    if (this.toStop) {
      return;
    }
    setTimeout(() => {
      this.mainLoop();
    }, interval);
  }

  stop() {
    this.toStop = true;
  }

  async mainLoop() {
    try {
      let info = await this.createGpkSc.methods.getGroupInfo(this.groupId, this.round).call();
      this.status = parseInt(info[1]);
      this.statusTime = parseInt(info[2]);
      this.ployCommitPeriod = parseInt(info[3]);
      this.defaultPeriod = parseInt(info[4]);
      this.negotiatePeriod = parseInt(info[5]);
      console.log('%s gpk group %s round %d status %d from %d main loop', new Date(), this.groupId, this.round, this.status, this.statusTime);
      console.log("mainLoop group info: %O", info);

      switch (this.status) {
        case GroupStatus.PolyCommit:
          await this.procPolyCommit();
          break;
        case GroupStatus.Negotiate:
          await this.procNegotiate();
          break;
        case GroupStatus.Complete:
          await this.procComplete();
          break;          
        default: // Close
          await this.procClose();
          break;
      }
    } catch (err) {
      console.error('%s gpk group %s round %d proc status %d err: %O', new Date(), this.groupId, this.round, this.status, err);
    }
    this.next();
  }

  async procPolyCommit() {
    await this.polyCommitCheckTx();
    await this.polyCommitSend();
    await this.polyCommitReceive();
    await this.polyCommitTimeout();
  }

  async polyCommitReceive() {
    await Promise.all(this.smList.map(sm => {
      return new Promise(async (resolve, reject) => {
        try {
          let receive = this.receive.get(sm);
          if (!receive.polyCommit) {
            receive.polyCommit = await this.createGpkSc.methods.getPolyCommit(this.groupId, this.round, sm).call();
            // console.log("polyCommitReceive %s: %s", sm, receive.polyCommit);
            if (this.checkAllPolyCommitReceived()) {
              this.genPkShare();
            }
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    }));
  }

  checkAllPolyCommitReceived() {
    for (let i = 0; i < this.smList.length; i++) {
      if (!this.receive.get(this.smList[i]).polyCommit) {
        return false;
      }
    }
    return true;
  }

  async polyCommitCheckTx() {
    let receipt;
    // self polyCommit
    if (this.polyCommitTxHash && !this.polyCommitDone) {
      receipt = await wanchain.getTxReceipt(this.polyCommitTxHash);
      if (receipt) {
        if (receipt.status) {
          this.polyCommitDone = true;
          console.log("polyCommitSend done");
        } else {
          this.polyCommitTxHash = '';
        }
      }
    }
    // polyCommitTimeout
    if (this.polyCommitTimeoutTxHash) {
      receipt = await wanchain.getTxReceipt(this.polyCommitTimeoutTxHash);
      if (receipt && !receipt.status) {
        this.polyCommitTimeoutTxHash = '';
      }
    }
  }

  async polyCommitTimeout() {
    let i = 0;
    for (; i < this.smList.length; i++) {
      let receive = this.receive.get(this.smList[i]);
      if (!receive.polyCommit) {
        break;
      }
    }
    if (i < this.smList.length) {
      if (wanchain.getElapsed(this.statusTime) > this.ployCommitPeriod) {
        if (!this.polyCommitTimeoutTxHash) {
          this.polyCommitTimeoutTxHash = await wanchain.sendPolyCommitTimeout(this.groupId);
          console.log("group %s round %d sendPolyCommitTimeout hash: %s", this.groupId, this.round, this.polyCommitTimeoutTxHash);
        }
      }
    }
  }

  async polyCommitSend() {
    if (!this.polyCommitTxHash) {
      this.polyCommitTxHash = await wanchain.sendPloyCommit(this.groupId, this.polyCommit);
      console.log("group %s round %d sendPloyCommit hash: %s", this.groupId, this.round, this.polyCommitTxHash);
    }
  }

  async procNegotiate() {
    await this.polyCommitReceive();
    let gpkDone = await this.setGpk();
    if (!gpkDone) {
      return;
    }
    await Promise.all(this.smList.map(sm => {
      return new Promise(async (resolve, reject) => {
        try {
          await this.negotiateReceive(sm);
          await this.negotiateCheckTx(sm);
          await this.negotiateTimeout(sm);
          await this.negotiateSend(sm);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    }));
  }

  async negotiateReceive(partner) {
    let receive = this.receive.get(partner);
    let send = this.send.get(partner);
    let dest;
    // encSij
    if (!receive.encSij) {
      dest = await this.createGpkSc.methods.getEncSijInfo(this.groupId, this.round, partner, this.selfAddress).call();
      if (dest[0]) {
        receive.encSij = dest[0];
        receive.sij = await encrypt.decryptSij(this.selfSk, receive.encSij);
        console.log("negotiateReceive sij: %s", receive.sij);
        if (encrypt.verifySij(receive.sij, receive.polyCommit, this.selfPk)) {
          send.checkStatus = CheckStatus.Valid;
          // check all received
          if (this.checkAllSijReceived()) {
            this.genKeyShare();
          }
        } else {
          send.checkStatus = CheckStatus.Invalid;
          this.standby = true;
          console.error('gpk group %s round %d receive %s sij invalid', this.groupId, this.round, partner);
        }
      }
    }
    // checkStatus
    if ((receive.checkStatus == CheckStatus.Init) && send.encSijTxHash) { // already send encSij, do not wait chain confirm
      dest = await this.createGpkSc.methods.getEncSijInfo(this.groupId, this.round, this.selfAddress, partner).call();
      if (dest[1]) {
        receive.checkStatus = dest[1];
        if (receive.checkStatus == CheckStatus.Invalid) {
          this.standby = true;
          console.log('gpk group %s round %d receive %s check sij invalid', this.groupId, this.round, partner);
        }
      }
    }
    // sij
    if ((send.checkStatus == CheckStatus.Invalid) && send.checkTxHash) { // already send checkStatus, do not wait chain confirm
      dest = await this.createGpkSc.methods.getEncSijInfo(this.groupId, this.round, partner, this.selfAddress).call();
      if (dest[4]) {
        receive.revealed = true;
        console.log('gpk group %s round %d %s sij revealed', this.groupId, this.round, partner);
      }
    }
  }

  checkAllSijReceived() {
    for (let i = 0; i < this.smList.length; i++) {
      if (!this.receive.get(this.smList[i]).sij) {
        return false;
      }
    }
    return true;
  }

  genKeyShare() {
    let skShare = null;
    for (let i = 0; i < this.smList.length; i++) {
      let sij = BigInteger.fromHex(this.receive.get(this.smList[i]).sij.substr(2));
      if (skShare == null) {
        skShare = sij;
      } else {
        skShare = encrypt.addSij(skShare, sij);
      }
    }
    this.skShare = '0x' + skShare.toRadix(16);
    this.pkShare = '0x' + encrypt.mulG(skShare).getEncoded(false).toString('hex');
    console.log("genKeyShare skShare: %s", this.skShare);
    console.log("genKeyShare pkShare: %s", this.pkShare);
  }

  async negotiateCheckTx(partner) {
    let send = this.send.get(partner);
    let receipt, dest;
    // encSij
    if (send.encSijTxHash && !send.chainEncSijTime) {
      receipt = await wanchain.getTxReceipt(send.encSijTxHash);
      if (receipt) {
        if (receipt.status) {
          dest = await this.createGpkSc.methods.getEncSijInfo(this.groupId, this.round, partner, this.selfAddress).call();
          send.chainEncSijTime = dest[2];
        } else {
          send.encSijTxHash = '';
        }
      }
    }
    // checkStatus
    if (send.checkTxHash && !chainCheckTime) {
      receipt = await wanchain.getTxReceipt(send.checkTxHash);
      if (receipt) {
        if (receipt.status) {
          dest = await this.createGpkSc.methods.getEncSijInfo(this.groupId, this.round, partner, this.selfAddress).call();
          send.chainCheckTime = dest[3];
        } else {
          send.checkTxHash = '';
        }
      }
    }
    // sij
    if (send.sijTxHash) {
      receipt = await wanchain.getTxReceipt(send.sijTxHash);
      if (receipt && !receipt.status) {
        send.sijTxHash = '';
      }
    }
    // encSij timeout
    if (send.encSijTimeoutTxHash) {
      receipt = await wanchain.getTxReceipt(send.encSijTimeoutTxHash);
      if (receipt && !receipt.status) {
        send.encSijTimeoutTxHash = '';
      }
    }
    // checkStatus timeout
    if (send.checkTimeoutTxHash) {
      receipt = await wanchain.getTxReceipt(send.checkTimeoutTxHash);
      if (receipt && !receipt.status) {
        send.checkTimeoutTxHash = '';
      }
    }
    // sij timeout
    if (send.sijTimeoutTxHash) {
      receipt = await wanchain.getTxReceipt(send.sijTimeoutTxHash);
      if (receipt && !receipt.status) {
        send.sijTimeoutTxHash = '';
      }
    }    
  }

  async negotiateTimeout(partner) {
    let receive = this.receive.get(partner);
    let send = this.send.get(partner);
    // encSij timeout
    if (!receive.encSij) {
      if (wanchain.getElapsed(this.statusTime) > this.defaultPeriod) {
        send.encSijTimeoutTxHash = await wanchain.sendEncSijTimeout(this.groupId, partner);
        console.log("group %s round %d sendEncSijTimeout to %s hash: %s", this.groupId, this.round, partner, send.encSijTimeoutTxHash);
      }
    }    
    // check timeout
    if ((receive.checkStatus == CheckStatus.Init) && send.chainEncSijTime) {
      if (wanchain.getElapsed(send.chainEncSijTime) > this.defaultPeriod) {
        send.checkTimeoutTxHash = await wanchain.sendCheckTimeout(this.groupId, partner);
        console.log("group %s round %d sendCheckTimeout to %s hash: %s", this.groupId, this.round, partner, send.checkTimeoutTxHash);
      }
    }
    // sij timeout
    if ((send.checkStatus == CheckStatus.Invalid) && send.chainCheckTime && !receive.revealed) {
      if (wanchain.getElapsed(send.chainCheckTime) > this.defaultPeriod) {
        send.sijTimeoutTxHash = await wanchain.sendSijTimeout(this.groupId, partner);
        console.log("group %s round %d sendSijTimeout to %s hash: %s", this.groupId, this.round, partner, send.sijTimeoutTxHash);
      }
    }    
  }

  async negotiateSend(partner) {
    let receive = this.receive.get(partner);
    let send = this.send.get(partner);
    // checkStatus
    if ((send.checkStatus != CheckStatus.Init) && (!send.checkTxHash)) {
      let isValid = (send.checkStatus == CheckStatus.Valid);
      send.checkTxHash = await wanchain.sendCheckStatus(this.groupId, partner, isValid);
      console.log("group %s round %d sendCheckStatus to %s hash: %s", this.groupId, this.round, partner, send.checkTxHash);
    }
    // sij
    if ((receive.checkStatus == CheckStatus.Invalid) && (!send.sijTxHash)) {
      let iv = null; // TODO
      send.sijTxHash = await wanchain.sendSij(this.groupId, partner, send.sij, iv, send.ephemPrivateKey);
      console.log("group %s round %d sendSij to %s hash: %s", this.groupId, this.round, partner, send.sijTxHash);
    }
    if (this.standby) {
      return;
    }
    // encSij
    if (!send.encSij) {
      await this.genEncSij(partner);
    }
    if (!send.encSijTxHash) {
      send.encSijTxHash = await wanchain.sendEncSij(this.groupId, partner, send.encSij);
      console.log("group %s round %d sendEncSij to %s hash: %s", this.groupId, this.round, partner, send.encSijTxHash);
    }
  }

  async genEncSij(partner) {
    let send = this.send.get(partner);
    let destPk = send.pk;
    let opts = {
      iv: Buffer.from(encrypt.genRandom(16).toRadix(16), 'hex'),
      ephemPrivateKey: Buffer.from(encrypt.genRandom(32).toRadix(16), 'hex')
    };
    console.log("genEncSij partner: %s", partner);
    console.log("poly: %O", this.poly);
    console.log("destPk: %s", destPk);
    send.sij = '0x' + encrypt.genSij(this.poly, destPk).toRadix(16);
    console.log("sij: %s", sij);
    try {
      send.encSij = await encrypt.encryptSij(destPk, send.sij, opts);
      send.ephemPrivateKey = '0x' + opts.ephemPrivateKey.toString('hex');
    } catch {
      send.sij = '';
    }
  }
  
  async procComplete() {
    console.log('gpk group %s round %d is complete', this.groupId, this.round);
    this.stop();
  }
  
  async procClose() {
    console.log('gpk group %s round %d is closed', this.groupId, this.round);
    this.stop();
  }

  // belows are for POC only

  genPkShare() {
    let pkShare = null;
    let gpk = null;
    for (let i = 0; i < this.smList.length; i++) {
      // pkShare
      let share = encrypt.takePolyCommit(this.receive.get(this.smList[i]).polyCommit, this.selfPk);
      if (!pkShare) {
        pkShare = share;
      } else {
        pkShare = pkShare.add(share);
      }
      // gpk
      let siG = encrypt.recoverSiG(this.receive.get(this.smList[i]).polyCommit);
      if (!gpk) {
        gpk = siG;
      } else {
        gpk = gpk.add(siG);
      }
    }
    this.pkShare = '0x' + pkShare.getEncoded(false).toString('hex');
    this.gpk = '0x' + gpk.getEncoded(false).toString('hex');
  }

  async setGpk() {
    if (!this.gpk) {
      return false;
    }
    if (this.gpkDone) {
      return true;
    }
    if (this.gpkTxHash) {
      let receipt = await wanchain.getTxReceipt(this.gpkTxHash);
      if (receipt) {
        if (receipt.status) {
          this.gpkDone = true;
          return true;
        } else {
          this.gpkTxHash = '';
        }
      } else {
        return false;
      }
    }
    // first send or resend
    this.gpkTxHash = await wanchain.sendGpk(this.groupId, this.gpk, this.pkShare);
    console.log("group %s round %d sendGpk hash: %s", this.groupId, this.round, this.gpkTxHash );
    return false;
  }

  async test() {
    this.initSelfKey();
    console.log("pk: %s", this.selfPk);
    console.log("txAddress: %s", this.selfAddress);
    /* encryptSij */
    // let opts = {
    //   iv: Buffer.from(encrypt.genRandom(16).toRadix(16), 'hex'),
    //   ephemPrivateKey: Buffer.from(encrypt.genRandom(32).toRadix(16), 'hex')
    // };
    // console.log("iv: %s", opts.iv.toString('hex'));
    // console.log("ephemPrivateKey: %s", opts.ephemPrivateKey.toString('hex'));
    // this.initPoly();
    // let sij = '0x' + encrypt.genSij(this.poly, this.selfPk).toRadix(16);
    // let encrypted = await encrypt.encryptSij(this.selfPk, sij, opts);
    // console.log("M: %s", sij);
    // console.log("encrypted: %O", encrypted);
    // let MR = await encrypt.decryptSij(this.selfSk, encrypted);
    // console.log("MR: %s", MR);
  }
}

module.exports = Round;
