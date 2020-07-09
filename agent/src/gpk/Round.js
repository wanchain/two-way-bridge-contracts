const config = require('../../cfg/config');
const BigInteger = require('bigi');
const encrypt = require('../utils/encrypt');
const wanchain = require('../utils/wanchain');
const {GpkStatus, CheckStatus} = require('./Types');
const Send = require('./Send');
const Receive = require('./Receive');
const tool = require('../utils/tools');

class Round {
  constructor(group, curveIndex, smList, threshold) {
    // group
    this.group = group;
    this.ployCommitPeriod = 0;
    this.defaultPeriod = 0;
    this.negotiatePeriod = 0;

    // round
    this.round = group.round;
    this.curveIndex = curveIndex;
    this.curve = group.curves[curveIndex];
    this.smList = smList.concat().map(sm => sm.address);
    this.threshold = threshold;
    this.status = GpkStatus.Init;
    this.statusTime = 0;

    // self data
    this.poly = []; // defalt 17 order, hex string with 0x
    this.polyCommit = []; // poly * G, hex string with 0x
    this.polyCommitTxHash = '';
    this.polyCommitDone = false;
    this.skShare = ''; // hex string with 0x
    this.pkShare = ''; // hex string with 0x
    this.gpk = ''; // hex string with 0x
 
    // global interactive data
    this.polyCommitTimeoutTxHash = '';

    // p2p interactive data
    this.send = []; // array of Send object
    this.receive = []; // array of Receive object
    for (let i = 0; i < smList.length; i++) {
      this.send.push(new Send(smList[i].pk));
      this.receive.push(new Receive());
    }

    // schedule
    this.standby = false;
    this.toStop = false;
  }

  start() {
    console.log("start gpk group %s round %d curve %d", this.group.id, this.round, this.curveIndex);
    this.initPoly();
    this.next(3000);
  }

  resume() {
    console.log("resume gpk group %s round %d curve %d", this.group.id, this.round, this.curveIndex);
    this.next(3000);
  }  

  initPoly() {
    for (let i = 0; i < this.threshold; i++) {
      let poly = encrypt.genRandomCoef(this.curve, 32);
      this.poly[i] = '0x' + poly.toBuffer().toString('hex');
      this.polyCommit[i] = '0x' + encrypt.mulG(this.curve, poly).getEncoded(false).toString('hex').substr(2);
      // console.log("init polyCommit %i: %s", i, this.polyCommit[i]);
    }
  }

  next(interval = 60000) {
    if (this.toStop) {
      // this.removeProgress()
      return;
    }
    // this.saveProgress();
    setTimeout(() => {
      this.mainLoop();
    }, interval);
  }

  saveProgress() {
    let copy = Object.assign({}, this);
    copy.smgSc = null;
    copy.createGpkSc = null;
    copy.selfSk = '';
    tool.writeContextFile(this.group.id + '.cxt', copy);
  }

  removeProgress() {
    tool.clearContextFile(this.group.id + '.cxt');
  }

  stop() {
    this.toStop = true;
  }

  async mainLoop() {
    try {
      await wanchain.updateNounce();

      let info = await this.group.createGpkSc.methods.getGroupInfo(this.group.id, this.round).call();
      this.status = parseInt(info[this.curveIndex * 2 + 1]);
      this.statusTime = parseInt(info[this.curveIndex * 2 + 2]);
      this.ployCommitPeriod = parseInt(info[5]);
      this.defaultPeriod = parseInt(info[6]);
      this.negotiatePeriod = parseInt(info[7]);
      console.log('%s gpk group %s round %d curve %d status %d(%d) main loop', new Date().toISOString(), 
                  this.group.id, this.round, this.curveIndex, this.status, this.statusTime);
      // console.log("mainLoop group info: %O", info);

      switch (this.status) {
        case GpkStatus.PolyCommit:
          await this.procPolyCommit();
          break;
        case GpkStatus.Negotiate:
          await this.procNegotiate();
          break;
        case GpkStatus.Complete:
          await this.procComplete();
          break;          
        default: // Close
          await this.procClose();
          break;
      }
    } catch (err) {
      console.error('%s gpk group %s round %d curve %d proc status %d err: %O', new Date().toISOString(), 
                    this.group.id, this.round, this.curveIndex, this.status, err);
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
    await Promise.all(this.smList.map((sm, index) => {
      return new Promise(async (resolve, reject) => {
        try {
          let receive = this.receive[index];
          if (!receive.polyCommit) {
            receive.polyCommit = await this.group.createGpkSc.methods.getPolyCommit(this.group.id, this.round, this.curveIndex, sm).call();
            // console.log("polyCommitReceive %s: %s", sm, receive.polyCommit);
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
      if (!this.receive[i].polyCommit) {
        return false;
      }
    }
    return true;
  }

  async polyCommitCheckTx() {
    let receipt;
    // self polyCommit
    if (this.polyCommitTxHash && !this.polyCommitDone) {
      receipt = await wanchain.getTxReceipt(this.polyCommitTxHash, 'polyCommit');
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
      let receive = this.receive[i];
      if (!receive.polyCommit) {
        break;
      }
    }
    if (i < this.smList.length) {
      if (wanchain.getElapsed(this.statusTime) > this.ployCommitPeriod) {
        if (!this.polyCommitTimeoutTxHash) {
          this.polyCommitTimeoutTxHash = await wanchain.sendPolyCommitTimeout(this.group.id, this.curveIndex);
          console.log("group %s round %d curve %d sendPolyCommitTimeout hash: %s", this.group.id, this.round, this.curveIndex, this.polyCommitTimeoutTxHash);
        }
      }
    }
  }

  async polyCommitSend() {
    if (!this.polyCommitTxHash) {
      this.polyCommitTxHash = await wanchain.sendPloyCommit(this.group.id, this.round, this.curveIndex, this.polyCommit);
      console.log("group %s round %d curve %d sendPloyCommit hash: %s", this.group.id, this.round, this.curveIndex, this.polyCommitTxHash);
    }
  }

  async procNegotiate() {
    await this.polyCommitReceive();
    await Promise.all(this.smList.map((sm, index) => {
      return new Promise(async (resolve, reject) => {
        try {
          await this.negotiateReceive(sm, index);
          await this.negotiateCheckTx(sm, index);
          await this.negotiateTimeout(sm, index);
          await this.negotiateSend(sm, index);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    }));
  }

  async negotiateReceive(partner, index) {
    let receive = this.receive[index];
    let send = this.send[index];
    let dest;
    // encSij
    if (!receive.encSij) {
      dest = await this.group.createGpkSc.methods.getEncSijInfo(this.group.id, this.round, this.curveIndex, partner, this.group.selfAddress).call();
      if (dest[0]) {
        receive.encSij = dest[0];
        receive.sij = await encrypt.decryptSij(this.group.selfSk, receive.encSij);
        console.log("negotiateReceive %s sij: %s", partner, receive.sij);
        if (receive.sij && encrypt.verifySij(this.curve, receive.sij, receive.polyCommit, this.group.selfPk)) {
          send.checkStatus = CheckStatus.Valid;
          // check all received
          if (this.checkAllSijReceived()) {
            this.genKeyShare();
          }
        } else {
          send.checkStatus = CheckStatus.Invalid;
          this.standby = true;
          console.error('gpk group %s round %d curve %d receive %s sij invalid', this.group.id, this.round, this.curveIndex, partner);
        }
      }
    }
    // checkStatus
    if ((receive.checkStatus == CheckStatus.Init) && send.encSijTxHash) { // already send encSij, do not wait chain confirm
      dest = await this.group.createGpkSc.methods.getEncSijInfo(this.group.id, this.round, this.curveIndex, this.group.selfAddress, partner).call();
      if (dest[1]) {
        receive.checkStatus = dest[1];
        if (receive.checkStatus == CheckStatus.Invalid) {
          this.standby = true;
          console.log('gpk group %s round %d curve %d receive %s check sij invalid', this.group.id, this.round, this.curveIndex, partner);
        }
      }
    }
    // sij
    if ((send.checkStatus == CheckStatus.Invalid) && send.checkTxHash) { // already send checkStatus, do not wait chain confirm
      dest = await this.group.createGpkSc.methods.getEncSijInfo(this.group.id, this.round, this.curveIndex, partner, this.group.selfAddress).call();
      if (dest[4]) {
        receive.revealed = true;
        console.log('gpk group %s round %d curve %d %s sij revealed', this.group.id, this.round, this.curveIndex, partner);
      }
    }
  }

  checkAllSijReceived() {
    for (let i = 0; i < this.smList.length; i++) {
      if (!this.receive[i].sij) {
        return false;
      }
    }
    return true;
  }

  genKeyShare() {
    let skShare = null;
    let gpk = null;
    for (let i = 0; i < this.smList.length; i++) {
      let sij = BigInteger.fromHex(this.receive[i].sij.substr(2));
      if (skShare == null) {
        skShare = sij;
      } else {
        skShare = encrypt.addSij(this.curve, skShare, sij);
      }
      // gpk
      let siG = encrypt.recoverSiG(this.curve, this.receive[i].polyCommit);
      if (!gpk) {
        gpk = siG;
      } else {
        gpk = gpk.add(siG);
      }      
    }
    this.skShare = '0x' + skShare.toBuffer(32).toString('hex');
    this.pkShare = '0x' + encrypt.mulG(this.curve, skShare).getEncoded(false).toString('hex').substr(2);
    this.gpk = '0x' + gpk.getEncoded(false).toString('hex').substr(2);
    wanchain.genKeystoreFile(this.gpk, this.skShare, config.keystore.pwd);
    console.log("gen curve %d skShare: %s", this.curveIndex, this.skShare);
    console.log("gen curve %d pkShare: %s", this.curveIndex, this.pkShare);
    console.log("gen curve %d gpk: %s", this.curveIndex, this.gpk);
  }

  async negotiateCheckTx(partner, index) {
    let send = this.send[index];
    let receipt, dest;
    // encSij
    if (send.encSijTxHash && !send.chainEncSijTime) {
      receipt = await wanchain.getTxReceipt(send.encSijTxHash);
      if (receipt) {
        if (receipt.status) {
          dest = await this.group.createGpkSc.methods.getEncSijInfo(this.group.id, this.round, this.curveIndex, partner, this.group.selfAddress).call();
          send.chainEncSijTime = dest[2];
        } else {
          send.encSijTxHash = '';
        }
      }
    }
    // checkStatus
    if (send.checkTxHash && !send.chainCheckTime) {
      receipt = await wanchain.getTxReceipt(send.checkTxHash);
      if (receipt) {
        if (receipt.status) {
          dest = await this.group.createGpkSc.methods.getEncSijInfo(this.group.id, this.round, this.curveIndex, partner, this.group.selfAddress).call();
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

  async negotiateTimeout(partner, index) {
    let receive = this.receive[index];
    let send = this.send[index];
    // encSij timeout
    if (!receive.encSij) {
      if (wanchain.getElapsed(this.statusTime) > this.defaultPeriod) {
        send.encSijTimeoutTxHash = await wanchain.sendEncSijTimeout(this.group.id, this.curveIndex, partner);
        console.log("group %s round %d curve %d sendEncSijTimeout to %s hash: %s", this.group.id, this.round, this.curveIndex, partner, send.encSijTimeoutTxHash);
      }
    }    
    // check timeout
    if ((receive.checkStatus == CheckStatus.Init) && send.chainEncSijTime) {
      if (wanchain.getElapsed(send.chainEncSijTime) > this.defaultPeriod) {
        send.checkTimeoutTxHash = await wanchain.sendCheckTimeout(this.group.id, this.curveIndex, partner);
        console.log("group %s round %d curve %d sendCheckTimeout to %s hash: %s", this.group.id, this.round, this.curveIndex, partner, send.checkTimeoutTxHash);
      }
    }
    // sij timeout
    if ((send.checkStatus == CheckStatus.Invalid) && send.chainCheckTime && !receive.revealed) {
      if (wanchain.getElapsed(send.chainCheckTime) > this.defaultPeriod) {
        send.sijTimeoutTxHash = await wanchain.sendSijTimeout(this.group.id, this.curveIndex, partner);
        console.log("group %s round %d curve %d sendSijTimeout to %s hash: %s", this.group.id, this.round, this.curveIndex, partner, send.sijTimeoutTxHash);
      }
    }
  }

  async negotiateSend(partner, index) {
    let receive = this.receive[index];
    let send = this.send[index];
    // checkStatus
    if ((send.checkStatus != CheckStatus.Init) && (!send.checkTxHash)) {
      let isValid = (send.checkStatus == CheckStatus.Valid);
      send.checkTxHash = await wanchain.sendCheckStatus(this.group.id, this.round, this.curveIndex, partner, isValid);
      console.log("group %s round %d curve %d sendCheckStatus %d to %s hash: %s", this.group.id, this.round, this.curveIndex, isValid, partner, send.checkTxHash);
    }
    // sij
    if ((receive.checkStatus == CheckStatus.Invalid) && (!send.sijTxHash)) {
      send.sijTxHash = await wanchain.sendSij(this.group.id, this.round, this.curveIndex, partner, send.sij, send.ephemPrivateKey);
      console.log("group %s round %d curve %d sendSij %s to %s hash: %s", this.group.id, this.round, this.curveIndex, send.sij, partner, send.sijTxHash);
    }
    if (this.standby) {
      return;
    }
    // encSij
    if (!send.encSij) {
      await this.genEncSij(partner, index);
    }
    if (!send.encSijTxHash) {
      send.encSijTxHash = await wanchain.sendEncSij(this.group.id, this.round, this.curveIndex, partner, send.encSij);
      console.log("group %s round %d curve %d sendEncSij %s to %s hash: %s", this.group.id, this.round, this.curveIndex, send.encSij, partner, send.encSijTxHash);
    }
  }

  async genEncSij(partner, index) {
    let send = this.send[index];
    let destPk = send.pk;
    console.log("genEncSij for partner %s pk %s", partner, destPk);
    send.sij = '0x' + encrypt.genSij(this.curve, this.poly, destPk).toBuffer(32).toString('hex');
    let enc = await encrypt.encryptSij(destPk, send.sij);
    if (enc) {
      send.encSij = '0x' + enc.ciphertext;
      send.ephemPrivateKey = '0x' + enc.ephemPrivateKey.toString('hex');
    } else {
      send.sij = '';
    }
  }
  
  async procComplete() {
    this.stop();
    console.log("pk group %s round %d curve %d is complete", this.group.id, this.round, this.curveIndex);

    let i;
    for (i = 0; i < this.smList.length; i++) {
      if (this.smList[i] == wanchain.selfAddress) {
        break;
      }
    }
    let pkShare = await this.group.createGpkSc.methods.getPkShare(this.group.id, i).call();
    let gpk = await this.group.createGpkSc.methods.getGpk(this.group.id).call();
    if (pkShare[this.curveIndex] == this.pkShare) {
      console.log("get index %d %s pkShare: %s", i, wanchain.selfAddress, this.pkShare);
    } else {
      console.log("get index %d %s pkShare %s not match %s", i, wanchain.selfAddress, pkShare[this.curveIndex], this.pkShare);
    }
    if (gpk[this.curveIndex] == this.gpk) {
      console.log("get gpk: %s", this.gpk);
    } else {
      console.error("get gpk %s not match %s", gpk[this.curveIndex], this.gpk);
    }
  }
  
  async procClose() {
    this.stop();
    console.log("gpk group %s round %d curve %d is closed", this.group.id, this.round, this.curveIndex);
  }
}

module.exports = Round;
