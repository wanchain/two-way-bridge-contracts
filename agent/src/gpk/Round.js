const config = require('../../cfg/config');
const encrypt = require('../utils/encrypt');
const wanchain = require('../utils/wanchain');
const {GroupStatus, CheckStatus} = require('./Types');
const Send = require('./Send');
const Receive = require('./Receive');

const POC = true;

class Round {
  constructor(groupId, round) {
    // contract
    this.mortgageSc = null;
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
    this.poly = []; // 17 order, BigInteger
    this.PolyCommit = []; // poly * G, Point
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
    this.initSelfKey();
    this.initPoly();
    this.mortgageSc = wanchain.getContract('Mortgage', config.contractAddress.mortgage);
    this.createGpkSc = wanchain.getContract('CreateGpk', config.contractAddress.createGpk);
    await this.initSmList();
    console.log("init gpk group %s", this.groupId);
    this.next(3000);
  }

  initSelfKey() {
    this.selfSk = wanchain.selfSk;
    this.selfPk = '0x04' + wanchain.selfPk.toString('hex');
    this.selfAddress = wanchain.selfAddress;
  } 

  initPoly() {
    for (let i = 0; i < 17; i++) {
      this.poly[i] = encrypt.genRandom(32);
      this.PolyCommit[i] = encrypt.mulG(this.poly[i]);
      // console.log("init PolyCommit %i: %s", i, this.PolyCommit[i].getEncoded(false).toString('hex'));
    }
  }

  async initSmList() {
    let smList = [];
    try {
      let smNumber = await this.mortgageSc.methods.getSelectedSmNumber(this.groupId).call();
      for (let i = 0; i < smNumber; i++) {
        let sm = await this.mortgageSc.methods.getSelectedSmInfo(this.groupId, i).call();
        smList.push(sm[1]);
        this.send.set(sm[1], new Send(sm[0]));
        this.send.receive.set(sm[1], new Receive());
      }
      this.smList = smList;
      console.log('%s gpk group %s init smList: %O', new Date(), this.groupId, smList);
    } catch (err) {
      console.error('%s gpk group %s init smList err: %O', new Date(), this.groupId, err);
    }
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
      this.status = info[1];
      this.statusTime = info[2];
      this.ployCommitPeriod = status[3];
      this.defaultPeriod = status[4];
      this.negotiatePeriod = status[5];
      console.log('%s gpk group %s round %d status %d main loop', new Date(), this.groupId, this.round, this.status);

      switch (this.status) {
        case GroupStatus.PolyCommit:
          this.procPolyCommit();
          break;
        case GroupStatus.Negotiate:
          this.procNegotiate();
          break;
        case GroupStatus.Complete:
          this.procComplete();
          break;          
        default: // Close
          this.procClose();
          break;
      }
    } catch (err) {
      console.error('%s gpk group %s proc err: %O', new Date(), this.groupId, err);
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
    await Promise.all(smList.map(sm => {
      return new Promise(async (resolve, reject) => {
        try {
          let receive = this.receive.get[sm];
          if (!receive.PolyCommit) {
            receive.PolyCommit = await createGpkSc.getPolyCommit(this.groupId, this.round, sm).call();
            if (checkAllPolyCommitReceived()) {
              this.genPkShare();
            }
          }
          resolve();
        } catch {
          reject();
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
        if (receipt.status == '0x1') {
          this.polyCommitDone = true;
        } else {
          this.polyCommitTxHash = '';
        }
      }
    }
    // polyCommitTimeout
    if (this.polyCommitTimeoutTxHash) {
      receipt = await wanchain.getTxReceipt(this.polyCommitTimeoutTxHash);
      if (receipt && receipt.status == '0x0') {
        this.polyCommitTimeoutTxHash = '';
      }
    }
  }

  async polyCommitTimeout() {
    for (let i = 0; i < smList.length; i++) {
      let receive = this.receive.get[this.smList[i]];
      if (!receive.PolyCommit) {
        break;
      }
    }
    if (i < smList.length) {
      if (wanchain.getElapsed(this.statusTime) > this.ployCommitPeriod) {
        if (!this.polyCommitTimeoutTxHash) {
          this.polyCommitTimeoutTxHash = await wanchain.sendPolyCommitTimeout(this.groupId);
        }
      }
    }
  }

  async polyCommitSend() {
    if (!this.polyCommitTxHash) {
      this.polyCommitTxHash = await wanchain.sendPloyCommit(this.groupId, this.PolyCommit);
    }
  }

  async procNegotiate() {
    await this.polyCommitReceive();
    let gpkDone = await this.setGpk();
    if (!gpkDone) {
      return;
    }
    await Promise.all(smList.map(sm => {
      return new Promise(async (resolve, reject) => {
        try {
          await this.negotiateReceive(sm);
          await this.negotiateCheckTx(send, sm);
          await this.negotiateTimeout(receive, send, sm);
          await this.negotiateSend(receive, send, sm);
          resolve();
        } catch {
          reject();
        }
      });
    }));
  }

  async negotiateReceive(partner) {
    let receive = this.receive.get[partner];
    let send = this.send.get[partner];
    let dest;
    // encSij
    if (!receive.encSij) {
      dest = await createGpkSc.methods.getEncSijInfo(this.groupId, this.round, partner, selfAddress).call();
      if (dest[0]) {
        receive.encSij = dest[0];
        receive.sij = encrypt.decryptSij(receive.encSij, this.selfSk);
        if (encrypt.verifySij(receive.sij, receive.PolyCommit, this.selfPk)) {
          send.checkStatus = CheckStatus.Valid;
          // check all received
          if (this.checkAllSijReceived()) {
            this.genKeyShare();
          }
        } else {
          send.checkStatus = CheckStatus.Invalid;
          this.standby = true;
          console.error('%s gpk group %s round %d pk %s sij invalid', new Date(), this.groupId, this.round, partner);
        }
      }
    }
    // checkStatus
    if ((receive.checkStatus == CheckStatus.Init) && send.encSijTxHash) { // already send encSij, do not wait chain confirm
      dest = await createGpkSc.methods.getEncSijInfo(this.groupId, this.round, selfAddress, partner).call();
      if (dest[1]) {
        receive.checkStatus = dest[1];
        if (receive.checkStatus == CheckStatus.Invalid) {
          this.standby = true;
          console.error('%s gpk group %s round %d pk %s check invalid', new Date(), this.groupId, this.round, partner);
        }
      }
    }
    // sij
    if ((send.checkStatus == CheckStatus.Invalid) && send.checkTxHash) { // already send checkStatus, do not wait chain confirm
      dest = await createGpkSc.methods.getEncSijInfo(this.groupId, this.round, partner, selfAddress).call();
      if (dest[4]) {
        receive.sij = dest[4];
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
    let gpk = null;
    for (let i = 0; i < this.smList.length; i++) {
      let sij = this.receive.get(this.smList[i]).sij;
      if (skShare == null) {
        skShare = sij;
      } else {
        skShare = skShare.add(sij);
      }
    }
    this.skShare = '0x' + skShare.toRadix(16);
    this.pkShare = mulG(skShare).getEncoded(false).toString('hex');
  }

  async negotiateCheckTx(partner) {
    let send = this.send.get[partner];
    let receipt, dest;
    // encSij
    if (send.encSijTxHash && !send.chainEncSijTime) {
      receipt = await wanchain.getTxReceipt(send.encSijTxHash);
      if (receipt) {
        if (receipt.status == '0x1') {
          dest = await createGpkSc.methods.getEncSijInfo(this.groupId, this.round, partner, selfAddress).call();
          send.chainEncSijTime = dest[2];
        } else if (receipt.status == '0x0') {
          send.encSijTxHash = '';
        }
      }
    }
    // checkStatus
    if (send.checkTxHash && !chainCheckTime) {
      receipt = await wanchain.getTxReceipt(send.checkTxHash);
      if (receipt) {
        if (receipt.status == '0x1') {
          dest = await createGpkSc.methods.getEncSijInfo(this.groupId, this.round, partner, selfAddress).call();
          send.chainCheckTime = dest[3];
        } else if (receipt.status == '0x0') {
          send.checkTxHash = '';
        }
      }
    }
    // sij
    if (send.sijTxHash) {
      receipt = await wanchain.getTxReceipt(send.sijTxHash);
      if (receipt && receipt.status == '0x0') {
        send.sijTxHash = '';
      }
    }
    // encSij timeout
    if (send.encSijTimeoutTxHash) {
      receipt = await wanchain.getTxReceipt(send.encSijTimeoutTxHash);
      if (receipt && receipt.status == '0x0') {
        send.encSijTimeoutTxHash = '';
      }
    }
    // checkStatus timeout
    if (send.checkTimeoutTxHash) {
      receipt = await wanchain.getTxReceipt(send.checkTimeoutTxHash);
      if (receipt && receipt.status == '0x0') {
        send.checkTimeoutTxHash = '';
      }
    }
    // sij timeout
    if (send.sijTimeoutTxHash) {
      receipt = await wanchain.getTxReceipt(send.sijTimeoutTxHash);
      if (receipt && receipt.status == '0x0') {
        send.sijTimeoutTxHash = '';
      }
    }    
  }

  async negotiateTimeout(partner) {
    let receive = this.receive.get[partner];
    let send = this.send.get[partner];
    // encSij timeout
    if (!receive.encSij) {
      if (wanchain.getElapsed(this.statusTime) > this.defaultPeriod) {
        send.encSijTimeoutTxHash = await wanchain.sendEncSijTimeout(this.groupId, partner);
      }
    }    
    // check timeout
    if ((receive.checkStatus == CheckStatus.Init) && send.chainEncSijTime) {
      if (wanchain.getElapsed(send.chainEncSijTime) > this.defaultPeriod) {
        send.checkTimeoutTxHash = await wanchain.sendCheckTimeout(this.groupId, partner);
      }
    }
    // sij timeout
    if ((send.checkStatus == CheckStatus.Invalid) && send.chainCheckTime && !receive.sij) {
      if (wanchain.getElapsed(send.chainCheckTime) > this.defaultPeriod) {
        send.sijTimeoutTxHash = await wanchain.sendSijTimeout(this.groupId, partner);
      }
    }    
  }

  async negotiateSend(partner) {
    let receive = this.receive.get[partner];
    let send = this.send.get[partner];
    // checkStatus
    if ((send.checkStatus != CheckStatus.Init) && (!send.checkTxHash)) {
      let isValid = (send.checkStatus == CheckStatus.Valid);
      send.checkTxHash = await wanchain.sendCheckStatus(this.groupId, partner, isValid);
    }
    // sij
    if ((receive.checkStatus == CheckStatus.Invalid) && (!send.sijTxHash)) {
      send.sijTxHash = await wanchain.sendSij(this.groupId, partner, send.sij, send.ephemPrivateKey);
    }
    if (this.standby) {
      return;
    }
    // encSij
    if (!send.encSij) {
      await genEncSij(partner);
    }
    if (!send.encSijTxHash) {
      send.encSijTxHash = await wanchain.sendEncSij(this.groupId, partner, send.encSij);
    }
  }

  async genEncSij(partner) {
    let send = this.send.get[partner];
    let destPk = send.pk;
    let opts = {
      iv: Buffer.from(encrypt.genRandom(16).toRadix(16), 'hex'),
      ephemPrivateKey: Buffer.from(encrypt.genRandom(32).toRadix(16), 'hex')
    };
    send.sij = '0x' + encrypt.genSij(this.poly, destPk).toRadix(16);
    try {
      send.encSij = await encrypt.encryptSij(send.sij, destPk, opts);
      send.ephemPrivateKey = '0x' + opts.ephemPrivateKey.toString('hex');
    } catch {
      send.sij = '';
    }
  }
  
  async procComplete() {
    console.log('%s gpk group %s round %d is complete', new Date(), this.groupId, this.round);
    this.stop();
  }
  
  async procClose() {
    console.log('%s gpk group %s round %d is closed', new Date(), this.groupId, this.round);
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
      let siG = encrypt.recoverSiG(this.smList[i].polyCommit);
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
      receipt = await wanchain.getTxReceipt(this.gpkTxHash);
      if (receipt) {
        if (receipt && receipt.status == '0x1') {
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
    return false;
  }

  async test() {
    /* encryptSij */
    this.initSelfKey();
    console.log("pk: %s", this.selfPk);
    let opts = {
      iv: Buffer.from(encrypt.genRandom(16).toRadix(16), 'hex'),
      ephemPrivateKey: Buffer.from(encrypt.genRandom(32).toRadix(16), 'hex')
    };
    console.log("iv: %s", opts.iv.toString('hex'));
    console.log("ephemPrivateKey: %s", opts.ephemPrivateKey.toString('hex'));
    this.initPoly();
    let sij = encrypt.genSij(this.poly, this.selfPk).toRadix(16);
    let encrypted = await encrypt.encryptSij(sij, this.selfPk, opts);
    console.log("M: %s", sij);
    console.log("encrypted: %O", encrypted);
    let input = {};
    input.ciphertext = encrypted.ciphertext;
    input.iv = encrypted.iv;
    input.ephemPublicKey = encrypted.ephemPublicKey;
    input.mac = encrypted.mac;
    let MR = await encrypt.decryptSij(input, this.selfSk);
    console.log("MR: %O", MR.toRadix(16));
    console.log("iv1: %s", encrypted.iv.toString('hex'));
  }
}

module.exports = Round;
