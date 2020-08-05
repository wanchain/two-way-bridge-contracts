/*

  Copyright 2019 Wanchain Foundation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

//                            _           _           _
//  __      ____ _ _ __   ___| |__   __ _(_)_ __   __| | _____   __
//  \ \ /\ / / _` | '_ \ / __| '_ \ / _` | | '_ \@/ _` |/ _ \ \ / /
//   \ V  V / (_| | | | | (__| | | | (_| | | | | | (_| |  __/\ V /
//    \_/\_/ \__,_|_| |_|\___|_| |_|\__,_|_|_| |_|\__,_|\___| \_/
//
//  Code style according to: https://github.com/wanchain/wanchain-token/blob/master/style-guide.rst

pragma solidity ^0.4.24;

import "../lib/SafeMath.sol";
import "../components/Halt.sol";
import "./StoremanGroupStorage.sol";
import "../lib/PosLib.sol";
import "./StoremanLib.sol";
import "./StoremanType.sol";
import "./IncentiveLib.sol";
import "../interfaces/IQuota.sol";


contract StoremanGroupDelegate is StoremanGroupStorage, Halt {
    using SafeMath for uint;
    using Deposit for Deposit.Records;

    /**
     *
     * EVENTS
     *
     */
    event StoremanGroupRegisterStartEvent(bytes32 indexed groupId, uint workStart,uint workDuration, uint registerDuration, bytes32 indexed preGroupId);
    event StoremanGroupUnregisterEvent(bytes32 indexed groupId);
    event StoremanGroupDismissedEvent(bytes32 indexed groupId, uint dismissTime);
    event storemanTransferEvent(bytes32 indexed groupId, bytes32 indexed preGroupId, address[] wkAddrs);

    modifier onlyGpk {
        require(msg.sender == greateGpkAddr, "Sender is not allowed");
        _;
    }

    modifier onlyGroupLeader(bytes32 groupId) {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(msg.sender == group.selectedNode[0], "Sender is not allowed");
        _;
    }
    /**
    *
    * MANIPULATIONS
    *
    */
    /// @notice                           function for owner set token manager and htlc contract address
    /// @param metricAddr                 metricAddr contract address
    function setDependence(address metricAddr, address gpkAddr,address quotaAddr)
        external
        onlyOwner
    {
        require(metricAddr != address(0), "Invalid htlc address");
        metric = IMetric(metricAddr);
        greateGpkAddr = gpkAddr;
        quotaInst = IQuota(quotaAddr);
    }




    /// @notice                           function for owner set token manager and htlc contract address
    /// @param groupId                    the building storeman group index.
    /// @param wkAddrs                    white list work address.
    /// @param senders                    senders address of the white list enode.
    /// @param workStart                  When the group start to work. the day ID;
    /// @param workDuration               how many days the group will work for
    /// @param registerDuration           how many days the duration that allow transfer staking.
    /// @param preGroupId                 the preview group index.
    function storemanGroupRegisterStart(bytes32 groupId,
        uint workStart,uint workDuration, uint registerDuration,  bytes32 preGroupId,  address[] wkAddrs, address[] senders)
        external
        onlyOwner
    {
        require(wkAddrs.length == senders.length, "Invalid white list length");
        if(preGroupId==bytes32(0x00) || wkAddrs.length != 0){
            require(wkAddrs.length >= data.conf.backupCount, "Insufficient white list");
        }

        Deposit.Records memory deposit =  Deposit.Records(0);
        Deposit.Records memory depositWeight =  Deposit.Records(0);

        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(group.status == StoremanType.GroupStatus.none, "group has existed already");
        group.groupId = groupId;
        group.status = StoremanType.GroupStatus.initial;
        group.deposit = deposit;
        group.depositWeight = depositWeight;
        group.workTime = workStart;
        group.totalTime = workDuration;
        group.memberCountDesign = memberCountDefault;
        group.threshold = thresholdDefault;
        // group.whiteCount = wkAddrs.length - data.conf.backupCount;
        // group.whiteCountAll = wkAddrs.length;
        group.registerTime = now;
        group.registerDuration = registerDuration;
        emit StoremanGroupRegisterStartEvent(groupId, workStart, workDuration, registerDuration, preGroupId);
        return StoremanLib.inheritNode(data,group, preGroupId, wkAddrs, senders);
    }
    function updateGroupChain(bytes32 groupId,  uint chain1, uint chain2, uint curve1, uint curve2)
        external
        onlyOwner
    {

        StoremanType.StoremanGroup storage group = data.groups[groupId];
        group.chain1 = chain1;
        group.chain2 = chain2;
        group.curve1 = curve1;
        group.curve2 = curve2;
        group.status = StoremanType.GroupStatus.curveSeted;
    }
    function updateGroupConfig(bytes32 groupId, uint memberCountdesign, uint threshold, uint minStakeIn, uint delegateFee)
        external
        onlyOwner
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        group.memberCountDesign = memberCountdesign;
        group.threshold = threshold;
        group.minStakeIn = minStakeIn;
        group.delegateFee = delegateFee;
    }

    function getGroupIdbyAddress(address pkAddr) public view returns (bytes32, bytes32) {
        StoremanType.Candidate storage sk = data.candidates[pkAddr];
        return (sk.groupId, sk.nextGroupId);
    }


    /*
    The logic of incentive
    1) get the incentive by day and groupID.
    If the incentive array by day haven't geted from low level, the tx will try to get it.
    so the one who first incentive will spend more gas.

    2) calculate the sk incentive all days.
    3) calculate the delegator all days one by one.
     */
    function incentiveCandidator( address wkAddr) public  {
        IncentiveLib.incentiveCandidator(data, wkAddr,metric);
    }

    function stakeIn(bytes32 groupId, bytes PK, bytes enodeID)
        external
        notHalted
        payable
    {
        return StoremanLib.stakeIn(data,groupId, PK, enodeID);
    }

    function stakeAppend(address skPkAddr)
        external
        notHalted
        payable
    {
        return StoremanLib.stakeAppend(data, skPkAddr);
    }

    function stakeOut(address skPkAddr) external {
        return StoremanLib.stakeOut(data, skPkAddr);
    }

    function stakeClaim(address skPkAddr) external {
        return StoremanLib.stakeClaim(data,skPkAddr);
    }

    function delegateIn(address skPkAddr)
        external
        notHalted
        payable
    {
        return StoremanLib.delegateIn(data,skPkAddr);
    }
    function delegateOut(address skPkAddr) external {
        return StoremanLib.delegateOut(data,skPkAddr);

    }

    function partIn(address skPkAddr)
        external
        notHalted
        payable
    {
        return StoremanLib.partIn(data,skPkAddr);
    }
    function partOut(address skPkAddr) external {
        return StoremanLib.partOut(data,skPkAddr);

    }
    function partClaim(address skPkAddr) external {
        return StoremanLib.partClaim(data,skPkAddr);

    }
    function delegateClaim(address skPkAddr) external {

        return StoremanLib.delegateClaim(data, skPkAddr);
    }

    function getSelectedSmNumber(bytes32 groupId) public view returns(uint) {
        return StoremanUtil.getSelectedSmNumber(data, groupId);
    }

    //event selectedEvent(bytes32 indexed groupId, uint indexed count, address[] members);
    function select(bytes32 groupId)
        external
        notHalted
    {
        return IncentiveLib.toSelect(data, groupId);
    }

    function getSelectedSmInfo(bytes32 groupId, uint index) public view   returns(address wkAddr, bytes PK, bytes enodeId){
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        address addr = group.selectedNode[index];
        StoremanType.Candidate storage sk = data.candidates[addr];
        return (addr, sk.PK,sk.enodeID);
    }

    // To change  group status for unexpected reason.
    function updateGroupStatus(bytes32 groupId, StoremanType.GroupStatus status) external  onlyOwner {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        group.status = status;
    }


    function getStoremanInfo(address wkAddress)public view  returns(address sender,bytes PK, address pkAddress,
        bool quited, uint  deposit, uint delegateDeposit,
        uint incentive, uint delegatorCount, bytes32 groupId, bytes32 nextGroupId, uint incentivedDay
        ){
            StoremanType.Candidate storage sk = data.candidates[wkAddress];

            return (sk.sender,   sk.PK, sk.pkAddress, sk.quited,
                sk.deposit.getLastValue(), sk.delegateDeposit,
                sk.incentive[0],  sk.delegatorCount, sk.groupId, sk.nextGroupId, sk.incentivedDay
            );
    }
    function getStoremanIncentive(address wkAddress, uint day) public view returns(uint incentive) {
        StoremanType.Candidate storage sk = data.candidates[wkAddress];
        return sk.incentive[day];  // todo day 不减去开始时间．
    }
    function getSmDelegatorAddr(address wkAddr, uint deIndex) public view  returns (address){
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        return sk.addrMap[deIndex];
    }
    function getSmDelegatorInfoIncentive(address wkAddr, address deAddr, uint day) public view returns ( uint) {
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        StoremanType.Delegator storage de = sk.delegators[deAddr];
        return (de.incentive[day]);
    }

    function getSmDelegatorInfo(address wkAddr, address deAddr) public view returns (address sender, uint deposit, uint incentive) {
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        StoremanType.Delegator storage de = sk.delegators[deAddr];
        return (de.sender, de.deposit.getLastValue(),  de.incentive[0]); 
    }

    function setGpk(bytes32 groupId, bytes gpk1, bytes gpk2)
        public 
        // onlyGpk  // TODO: open after test
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        group.gpk1 = gpk1;
        group.gpk2 = gpk2;
        group.status = StoremanType.GroupStatus.ready;
    }

    function setInvalidSm(bytes32 groupId, uint[] slashType,  address[] badAddrs)
        external
        notHalted
        onlyGpk
        returns(bool isContinue)
    {
        return StoremanLib.setInvalidSm(data, groupId, slashType, badAddrs);
    }

    function getThresholdByGrpId(bytes32 groupId) external view returns (uint){
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        return group.threshold;
    }


    /// @notice                           function for storeman group apply unregistration through the delegate
    /// @param groupId              storeman group groupId
    function storemanGroupUnregister(bytes32 groupId)
        external
        notHalted
        onlyGroupLeader(groupId)
    {
        return StoremanLib.storemanGroupUnregister(data, groupId);
    }

    /// @notice                           function for storeman group apply unregistration through the delegate
    /// @param groupId                    storeman groupId
    function storemanGroupDismiss(bytes32 groupId)
        external
        notHalted
        onlyGroupLeader(groupId)
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        bool quitable = quotaInst.isDebtClean(groupId);
        require(quitable);

        group.status = StoremanType.GroupStatus.dismissed;
        emit StoremanGroupDismissedEvent(groupId, now);
        // TODO group状态进入dismissed, sk的当前group变成nextGroup.
        StoremanType.Candidate storage sk;
        for(uint i=0; i<group.memberCount; i++){
            sk = data.candidates[group.selectedNode[i]];
            sk.groupId = sk.nextGroupId;
            sk.nextGroupId = bytes32(0x00);
        }

    }

    function checkGroupDismissable(bytes32 groupId) public returns(bool) {
        bool dismissable = quotaInst.isDebtClean(groupId);
        return dismissable;
    }


    function getStoremanGroupInfo(bytes32 id)
        external
        view
        returns(bytes32 groupId, StoremanType.GroupStatus status, uint deposit, uint whiteCount,  uint memberCount,  uint startTime, uint endTime)
    {
        StoremanType.StoremanGroup storage smg = data.groups[id];
        return (smg.groupId, smg.status, smg.deposit.getLastValue(), smg.whiteCount, smg.selectedCount,  smg.workTime, smg.workTime+smg.totalTime);
    }

    function getStoremanGroupConfig(bytes32 id)
        external
        view
        returns(bytes32 groupId, StoremanType.GroupStatus status, uint deposit, uint chain1, uint chain2, uint curve1, uint curve2,  bytes gpk1, bytes gpk2, uint startTime, uint endTime)
    {
        StoremanType.StoremanGroup storage smg = data.groups[id];
        return (smg.groupId, smg.status,smg.deposit.getLastValue(), smg.chain1, smg.chain2,smg.curve1, smg.curve2,
         smg.gpk1, smg.gpk2, smg.workTime, smg.workTime+smg.totalTime);
    }
    function getStoremanGroupTime(bytes32 id)
        external
        view
        returns(bytes32 groupId,  uint registerTime, uint registerDuration,  uint startTime, uint endTime)
    {
        StoremanType.StoremanGroup storage smg = data.groups[id];
        return (smg.groupId, smg.registerTime, smg.registerDuration, smg.workTime, smg.workTime+smg.totalTime);
    }


    function checkGroupIncentive(bytes32 id, uint day) public view returns ( uint) {
        StoremanType.StoremanGroup storage group = data.groups[id];
        return group.groupIncentive[day];
    }

    event storemanGroupContributeEvent(address indexed sender, uint indexed value);
    function contribute() public payable {
        emit storemanGroupContributeEvent(msg.sender, msg.value);
        data.contribution += msg.value;
        return;
    }

    function smgTransfer(bytes32 smgID) external payable{
        StoremanType.StoremanGroup storage group = data.groups[smgID];
        group.crossIncoming += msg.value; // 提取时，　选中的人均分．
    }

    function setChainTypeCo(uint chain1, uint chain2, uint co) public  onlyOwner {
        if(chain1 < chain2) {
            data.chainTypeCo[chain1][chain2] = co;
        } else {
            data.chainTypeCo[chain2][chain1] = co;
        }
    }

    function getStoremanConf() public view returns(uint backupCount, uint standaloneWeight, uint DelegationMulti) {
        return (data.conf.backupCount, data.conf.standaloneWeight, data.conf.DelegationMulti);
    }
    function getGlobalIncentive() public view returns(uint contribution, uint totalReward) {
        return (data.contribution, data.totalReward);
    }
    function updateStoremanConf(uint backupCount, uint standaloneWeight, uint DelegationMulti) public onlyOwner {
        data.conf.backupCount = backupCount;
        data.conf.standaloneWeight = standaloneWeight;
        data.conf.DelegationMulti = DelegationMulti;

    }
}
