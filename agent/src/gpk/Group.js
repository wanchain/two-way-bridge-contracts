const config = require('../../cfg/config');
const encrypt = require('../utils/encrypt');
const wanchain = require('../utils/wanchain');
const {GroupStatus, CheckStatus} = require('./Types');
const Send = require('./Send');
const Receive = require('./Receive');

class GpkGroup {
  constructor(groupId) {
    // contract
    this.createGpkSc = null;
    this.mortgageSc = null;

    // group info
    this.groupId = groupId;
    this.status = GroupStatus.Init;
    this.statusTime = 0;
    this.round = 0;
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
    this.gpk = "";
    this.pkShare = "";
    this.gpkTxHash = '';
 
    // interactive data
    this.receive = new Map();
    this.send = new Map();

    // process
    this.timerId = 0;
    this.interrupted = false;
  }

  async init() {
    this.initSelfKey();
    this.initPoly();
    this.createGpkSc = wanchain.getContract('CreateGpk', config.contractAddress.createGpk);
    this.mortgageSc = wanchain.getContract('Mortgage', config.contractAddress.mortgage);
    await this.initSmList();
    this.timerId = setInterval(() => this.mainLoop, 6000);
    console.log("init gpk group %s", this.groupId);
  }

  initSelfKey() {
    this.selfSk = wanchain.selfSk;
    this.selfPk = '0x' + wanchain.selfPk.toString('hex');
    this.selfAddress = wanchain.selfAddress;
  } 

  initPoly() {
    for (let i = 0; i < 17; i++) {
      this.poly[i] = encrypt.genRandom();
      this.PolyCommit[i] = encrypt.mulG(this.poly[i]);
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

  async mainLoop() {
    try {
      let status = await contract.methods.getGroupInfo(this.groupId, -1).call();
      this.status = status[0];
      this.statusTime = status[1];
      this.round = status[2];
      console.log('%s gpk group %s round %d status %d main loop', new Date(), this.groupId, this.round, this.status);

      switch (status[0]) {
        case GroupStatus.Init:
          this.procInit();
          break;
        case GroupStatus.PolyCommit:
          this.procPolyCommit();
          break;
        case GroupStatus.Gpk:
          this.procGpk();
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
  }

  async procInit() { // TODO: only trustable node send?
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
    if (!this.polyCommitTxHash) {
      this.polyCommitTxHash = await wanchain.sendPloyCommit(this.groupId, this.PolyCommit);
    }
  }

  async procPolyCommit() {
    // continue to send polyCommit
    this.procInit();

    // group info periods is available now
    let status = await createGpkSc.methods.getGroupInfo(this.groupId, -1).call();
    this.ployCommitPeriod = status[3];
    this.defaultPeriod = status[4];
    this.negotiatePeriod = status[5];
    
    // receive polyCommit and check timeout
    let isTimeout = (wanchain.getElapsed(this.statusTime) > this.ployCommitPeriod);
    for (let i = 0; i < smList.lenght; i++) {
      let sm = this.smList[i];
      let receive = this.receive.get[sm];
      let send = this.send.get[sm];
      if (send.polyCommitTimeoutTxHash) {
        receipt = await wanchain.getTxReceipt(send.polyCommitTimeoutTxHash);
        if (receipt && receipt.status == '0x0') {
          send.polyCommitTimeoutTxHash = '';
        }        
      }
      if (!receive.PolyCommit.lenght) {
        let pc = await createGpkSc.getPolyCommit(this.groupId, sm, -1).call();
        if (pc) {
          receive.PolyCommit = pc;
        } else if (isTimeout) {
          if (!send.polyCommitTimeoutTxHash) {
            send.polyCommitTimeoutTxHash = await createGpkSc.polyCommitTimeout(this.groupId, sm);
          }
        }
      }
    }
  }
  
  async procGpk() {
    if (this.gpkTxHash) {
      receipt = await wanchain.getTxReceipt(this.gpkTxHash);
      if (receipt && receipt.status == '0x0') {
        this.gpkTxHash = '';
      }
    }
    // if ((!this.gpkTxHash) && (this.))    
  }

  async procNegotiate() {
    try {
      for (let i = 0; i < smList.lenght; i++) {
        let sm = this.smList[i];
        let receive = this.receive.get[sm];
        let send = this.send.get[sm];
        await negotiateReceive(receive, send);
        await negotiateCheckTx(send, sm);
        await negotiateTimeout(receive, send, sm);
        await negotiateSend(receive, send, sm);
      }
    } catch (err) {
      console.error('%s gpk group %s round %d process negotiate err: %O', new Date(), this.groupId, this.round, err);
    }
  }

  async negotiateReceive(receive, send, partner) {
    let dest;
    // encSij
    if (!receive.encSij) {
      dest = await createGpkSc.methods.getEncSijInfo(this.groupId, partner, selfAddress, -1).call();
      if (dest[0]) {
        receive.encSij = dest[0];
        receive.sij = encrypt.decryptSij(receive.encSij, this.selfSk);
        if (encrypt.verifySij(receive.sij, receive.PolyCommit, this.selfPk)) {
          send.checkStatus = CheckStatus.Valid;
        } else {
          send.checkStatus = CheckStatus.Invalid;
          this.interrupted = true;
          console.error('%s gpk group %s round %d pk %s sij invalid', new Date(), this.groupId, this.round, partner);
        }
      }
    }
    // checkStatus
    if ((receive.checkStatus == CheckStatus.Init) && send.encSijTxHash) { // already send encSij, do not wait chain confirm
      dest = await createGpkSc.methods.getEncSijInfo(this.groupId, selfAddress, partner, -1).call();
      if (dest[1]) {
        receive.checkStatus = dest[1];
        if (receive.checkStatus == CheckStatus.Invalid) {
          this.interrupted = true;
          console.error('%s gpk group %s round %d pk %s check invalid', new Date(), this.groupId, this.round, partner);
        }
      }
    }
    // sij
    if ((send.checkStatus == CheckStatus.Invalid) && send.checkTxHash) { // already send checkStatus, do not wait chain confirm
      dest = await createGpkSc.methods.getEncSijInfo(this.groupId, partner, selfAddress, -1).call();
      if (dest[4]) {
        receive.sij = dest[4];
      }
    }
  }

  async negotiateCheckTx(send, partner) {
    let receipt, dest;
    // encSij
    if (send.encSijTxHash && !send.chainEncSijTime) {
      receipt = await wanchain.getTxReceipt(send.encSijTxHash);
      if (receipt) {
        if (receipt.status == '0x1') {
          dest = await createGpkSc.methods.getEncSijInfo(this.groupId, partner, selfAddress, -1).call();
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
          dest = await createGpkSc.methods.getEncSijInfo(this.groupId, partner, selfAddress, -1).call();
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

  async negotiateTimeout(receive, send, partner) {
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

  async negotiateSend(receive, send, partner) {
    // checkStatus
    if ((send.checkStatus != CheckStatus.Init) && (!send.checkTxHash)) {
      let isValid = (send.checkStatus == CheckStatus.Valid);
      send.checkTxHash = await wanchain.sendCheckStatus(this.groupId, partner, isValid);
    }
    // sij
    if ((receive.checkStatus == CheckStatus.Invalid) && (!send.sijTxHash)) {
      send.sijTxHash = await wanchain.sendSij(this.groupId, partner, send.sij, send.r);
    }
    if (this.interrupted) {
      return;
    }
    // encSij
    let destPk = this.send.get(partner).pk;
    if (!send.encSij) {
      send.sij = encrypt.genSij(this.poly, destPk);
      let result = await encrypt.encryptSij(send.sij, destPk);
      if (result) {
        send.r = result.iv;
        send.encSij = result.ciphertext;
      }
    }
    if (!send.encSijTxHash) {
      send.encSijTxHash = await wanchain.sendEncSij(this.groupId, partner, send.encSij);
    }
  }
  
  async procComplete() {
    console.log('%s gpk group %s round %d is complete', new Date(), this.groupId, this.round);
    clearInterval(this.timerId);
  }
  
  async procClose() {
    console.log('%s gpk group %s round %d is closed', new Date(), this.groupId, this.round);
    clearInterval(this.timerId);
  }
}

module.exports = GpkGroup;
