const fs = require('fs');
const path = require('path');
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
    this.selfSk = ''; // hex string with 0x
    this.selfPk = ''; // hex string with 0x
    this.poly = []; // defalt 17 order, hex string with 0x
    this.polyCommit = []; // poly * G, hex string with 0x04
    this.polyCommitTxHash = '';
    this.polyCommitDone = false;
    this.skShare = ''; // hex string with 0x
    this.pkShare = ''; // hex string with 0x
    this.gpk = ''; // hex string with 0x04
    this.gpkTxHash = '';
    this.gpkDone = false;
 
    // global interactive data
    this.polyCommitTimeoutTxHash = '';

    // p2p interactive data
    this.send = []; // array of Send object
    this.receive = []; // array of Receive object

    // schedule
    this.standby = false;
    this.toStop = false;
  }

  async start() {
    this.initSc();
    this.initSelfKey();
    await this.initSmList();
    this.initPoly();
    console.log("init gpk group %s", this.groupId);
    this.next(3000);
  }

  initSc() {
    this.smgSc = wanchain.getContract('smg', config.contractAddress.smg);
    this.createGpkSc = wanchain.getContract('CreateGpk', config.contractAddress.createGpk);
  }

  initSelfKey() {
    this.selfSk = '0x' + wanchain.selfSk.toString('hex');
    this.selfPk = '0x04' + wanchain.selfPk.toString('hex');
    this.selfAddress = wanchain.selfAddress;
  } 

  async initSmList() {
    let smNumber = await this.smgSc.methods.getSelectedSmNumber(this.groupId).call();
    let smList = new Array(smNumber);
    let ps = new Array(smNumber);
    for (let i = 0; i < smNumber; i++) {
      ps[i] = new Promise(async (resolve, reject) => {
        try {
          let sm = await this.smgSc.methods.getSelectedSmInfo(this.groupId, i).call();
          let address = sm[0].toLowerCase();
          smList[i] = address;
          let pk = sm[1];
          if (pk.length == 130) {
            pk = '0x04' + pk.substr(2);
          }
          this.send[i] = new Send(pk);
          this.receive[i] = new Receive();
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

  async initPoly() {
    let threshold = await this.smgSc.methods.getThresholdByGrpId(this.groupId).call();
    console.log("group %s threshold: %d", this.groupId, threshold);
    for (let i = 0; i < threshold; i++) {
      let poly = encrypt.genRandomCoef(32);
      this.poly[i] = '0x' + poly.toBuffer().toString('hex');
      this.polyCommit[i] = '0x' + encrypt.mulG(poly).getEncoded(false).toString('hex');
      console.log("init polyCommit %i: %s", i, this.polyCommit[i]);
    }
  }

  next(interval = 60000) {
    if (this.toStop) {
      this.removeProgress()
      return;
    }
    this.saveProgress();
    setTimeout(() => {
      this.mainLoop();
    }, interval);
  }

  saveProgress() {
    let copy = Object.assign({}, this);
    copy.smgSc = null;
    copy.createGpkSc = null;
    let fp = path.join(__dirname, '../../cxt/', this.groupId + '.cxt');
    fs.writeFileSync(fp, JSON.stringify(copy), 'utf8');
  }

  removeProgress() {
    let fp = path.join(__dirname, '../../cxt/', this.groupId + '.cxt');
    fs.unlinkSync(fp);
  }

  stop() {
    this.toStop = true;
  }

  async mainLoop() {
    try {
      await wanchain.updateNounce();

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
    await Promise.all(this.smList.map((sm, index) => {
      return new Promise(async (resolve, reject) => {
        try {
          let receive = this.receive[index];
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
      let receive = this.receive[i];
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
    await this.setGpk();
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
      if (!this.receive[i].sij) {
        return false;
      }
    }
    return true;
  }

  genKeyShare() {
    let skShare = null;
    for (let i = 0; i < this.smList.length; i++) {
      let sij = BigInteger.fromHex(this.receive[i].sij.substr(2));
      if (skShare == null) {
        skShare = sij;
      } else {
        skShare = encrypt.addSij(skShare, sij);
      }
    }
    this.skShare = '0x' + skShare.toBuffer(32).toString('hex');
    this.pkShare = '0x' + encrypt.mulG(skShare).getEncoded(false).toString('hex');
    wanchain.genKeystoreFile(this.gpk, this.skShare, config.keystore.pwd);
    console.log("gen skShare: %s", this.skShare);
    console.log("gen pkShare: %s", this.pkShare);
    console.log("gen keystore file: %s", this.gpk);
  }

  async negotiateCheckTx(partner, index) {
    let send = this.send[index];
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
    if (send.checkTxHash && !send.chainCheckTime) {
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

  async negotiateTimeout(partner, index) {
    let receive = this.receive[index];
    let send = this.send[index];
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

  async negotiateSend(partner, index) {
    let receive = this.receive[index];
    let send = this.send[index];
    // checkStatus
    if ((send.checkStatus != CheckStatus.Init) && (!send.checkTxHash)) {
      let isValid = (send.checkStatus == CheckStatus.Valid);
      send.checkTxHash = await wanchain.sendCheckStatus(this.groupId, partner, isValid);
      console.log("group %s round %d sendCheckStatus %d to %s hash: %s", this.groupId, this.round, isValid, partner, send.checkTxHash);
    }
    // sij
    if ((receive.checkStatus == CheckStatus.Invalid) && (!send.sijTxHash)) {
      send.sijTxHash = await wanchain.sendSij(this.groupId, partner, send.sij, send.iv, send.ephemPrivateKey);
      console.log("group %s round %d sendSij to %s hash: %s", this.groupId, this.round, partner, send.sijTxHash);
    }
    if (this.standby) {
      return;
    }
    // encSij
    if (!send.encSij) {
      await this.genEncSij(partner, index);
    }
    if (!send.encSijTxHash) {
      send.encSijTxHash = await wanchain.sendEncSij(this.groupId, partner, send.encSij);
      console.log("group %s round %d sendEncSij %s to %s hash: %s", this.groupId, this.round, send.encSij, partner, send.encSijTxHash);
    }
  }

  async genEncSij(partner, index) {
    let send = this.send[index];
    let destPk = send.pk;
    let opts = {
      iv: encrypt.genRandomBuffer(16),
      ephemPrivateKey: encrypt.genRandomBuffer(32)
    };
    console.log("genEncSij for partner %s pk %s", partner, destPk);
    send.sij = '0x' + encrypt.genSij(this.poly, destPk).toBuffer(32).toString('hex');
    try {
      send.encSij = await encrypt.encryptSij(destPk, send.sij, opts);
      send.iv = '0x' + opts.iv.toString('hex');
      send.ephemPrivateKey = '0x' + opts.ephemPrivateKey.toString('hex');
      console.log("gen sij %s encSij %s", send.sij, send.encSij);
    } catch {
      send.sij = '';
    }
  }
  
  async procComplete() {
    this.stop();
    console.log("pk group %s round %d is complete", this.groupId, this.round);

    let i;
    for (i = 0; i < this.smList.length; i++) {
      if (this.smList[i] == wanchain.selfAddress) {
        break;
      }
    }
    let pkShare = await this.createGpkSc.methods.getPkShare(this.groupId, i).call();
    let gpk = await this.createGpkSc.methods.getGpk(this.groupId).call();
    console.log("get index %d %s pkShare: %s", i, wanchain.selfAddress, pkShare);
    console.log("get gpk: %s", gpk);
  }
  
  async procClose() {
    this.stop();
    console.log("gpk group %s round %d is closed", this.groupId, this.round);
  }

  // belows are for POC only

  genPkShare() {
    let pkShare = null;
    let gpk = null;
    for (let i = 0; i < this.smList.length; i++) {
      // pkShare
      let share = encrypt.takePolyCommit(this.receive[i].polyCommit, this.selfPk);
      if (!pkShare) {
        pkShare = share;
      } else {
        pkShare = pkShare.add(share);
      }
      // gpk
      let siG = encrypt.recoverSiG(this.receive[i].polyCommit);
      if (!gpk) {
        gpk = siG;
      } else {
        gpk = gpk.add(siG);
      }
    }
    this.pkShare = '0x' + pkShare.getEncoded(false).toString('hex');
    this.gpk = '0x' + gpk.getEncoded(false).toString('hex');
    console.log("gen pkShare: %s", this.pkShare);
    console.log("gen gpk: %s", this.gpk);
  }

  async setGpk() {
    if (this.gpkDone || !this.gpk) {
      return;
    }
    if (this.gpkTxHash) {
      let receipt = await wanchain.getTxReceipt(this.gpkTxHash);
      if (receipt) {
        if (receipt.status) {
          this.gpkDone = true;
          return;
        } else {
          this.gpkTxHash = '';
        }
      } else {
        return;
      }
    }
    // first send or resend
    this.gpkTxHash = await wanchain.sendGpk(this.groupId, this.gpk, this.pkShare);
    console.log("group %s round %d sendGpk hash: %s", this.groupId, this.round, this.gpkTxHash );
  }
}

module.exports = Round;
