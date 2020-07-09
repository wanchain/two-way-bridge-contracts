const config = require('../../cfg/config');
const wanchain = require('../utils/wanchain');
const Round = require('./Round');

class Group {
  constructor(id, round) {
    // contract
    this.smgSc = null;
    this.createGpkSc = null;

    // group info
    this.id = id;
    this.round = round;
    this.selfSk = ''; // hex string with 0x
    this.selfPk = ''; // hex string with 0x
    this.selfAddress = ''; // hex string with 0x

    // round
    this.curves = [];
    this.rounds = [];
  }

  async start() {
    console.log("start gpk group %s round %d", this.id, this.round);
    this.initSc();
    this.initSelfKey();
    await this.initCurve();
    await wanchain.updateNounce();
    await this.nextRound(this.round);
  }

  initSc() {
    this.smgSc = wanchain.getContract('smg', config.contractAddress.smg);
    this.createGpkSc = wanchain.getContract('CreateGpk', config.contractAddress.createGpk);
  }
  
  initSelfKey() {
    this.selfSk = '0x' + wanchain.selfSk.toString('hex');
    this.selfPk = '0x' + wanchain.selfPk.toString('hex');
    this.selfAddress = wanchain.selfAddress;
  }

  async initCurve() {
    let info = await this.smgSc.methods.getStoremanGroupConfig(this.id).call();
    this.curves[0] = parseInt(info[4]);
    this.curves[1] = parseInt(info[5]);
    console.log("initCurve: %O", this.curves)
  }  

  async getSmList() {
    let smNumber = await this.smgSc.methods.getSelectedSmNumber(this.id).call();
    let smList = new Array(smNumber);
    let ps = new Array(smNumber);
    for (let i = 0; i < smNumber; i++) {
      ps[i] = new Promise(async (resolve, reject) => {
        try {
          let sm = await this.smgSc.methods.getSelectedSmInfo(this.id, i).call();
          let address = sm[0].toLowerCase();
          let pk = sm[1];
          smList[i] = { address, pk};
          resolve();
        } catch (err) {
          reject(err);
        }
      })
    }
    await Promise.all(ps);
    console.log('get smList: %O', smList);    
    return smList;
  }

  initRound(smList, threshold) {
    // curve1 round
    this.rounds[0] = new Round(this, 0, smList, threshold);
    this.rounds[0].start();
    // curve2 round
    if (this.curves[1] != this.curves[0]) {
      this.rounds[1] = new Round(this, 1, smList, threshold)
      this.rounds[1].start();
    }
  }

  async nextRound(round) {
    this.round = round;
    console.log("start gpk group %s round %d", this.id, this.round);
    let smList = await this.getSmList();
    let threshold = await this.smgSc.methods.getThresholdByGrpId(this.id).call();
    this.initRound(smList, threshold);
  }  
}

module.exports = Group;
