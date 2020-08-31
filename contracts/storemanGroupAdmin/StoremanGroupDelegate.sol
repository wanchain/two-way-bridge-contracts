/*

  Copyright 2020 Wanchain Foundation.

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

pragma solidity ^0.4.26;
pragma experimental ABIEncoderV2;

import "../lib/SafeMath.sol";
import "../components/Halt.sol";
import "../components/Admin.sol";
import "./StoremanGroupStorage.sol";
import "../lib/PosLib.sol";
import "./StoremanLib.sol";
import "./StoremanType.sol";
import "./IncentiveLib.sol";
import "../interfaces/IQuota.sol";
import "../gpk/lib/GpkTypes.sol";


contract StoremanGroupDelegate is StoremanGroupStorage, Halt, Admin {
    using SafeMath for uint;
    using Deposit for Deposit.Records;

    event StoremanGroupRegisterStartEvent(bytes32 indexed groupId, bytes32 indexed preGroupId, uint workStart, uint workDuration, uint registerDuration);
    event StoremanGroupDismissedEvent(bytes32 indexed groupId, uint dismissTime);
    event updateGroupChainEvent(bytes32 indexed groupId, uint256 indexed chain1, uint256 indexed chain2, uint256 curve1, uint256 curve2);
    event storemanGroupContributeEvent(address indexed sender, uint indexed value);

    modifier onlyGroupLeader(bytes32 groupId) {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(msg.sender == group.selectedNode[0], "Sender is not allowed");
        _;
    }

    /// @notice                           function for owner set token manager and htlc contract address
    /// @param metricAddr                 metricAddr contract address
    /// @param gpkAddr	                  gpkAddr contract address
    /// @param quotaAddr                  quotaAddr contract address
   function setDependence(address metricAddr, address gpkAddr,address quotaAddr)
        external
        onlyOwner
    {
        require(metricAddr != address(0), "Invalid metricAddr address");
        require(gpkAddr != address(0), "Invalid gpkAddr address");
        require(quotaAddr != address(0), "Invalid quotaAddr address");

        metric = metricAddr;
        createGpkAddr = gpkAddr;
        quotaInst = IQuota(quotaAddr);
    }


    /// @notice                           function for owner to open a storeman group.
    /// @param wkAddrs                    white list work address array.
    /// @param senders                    senders address array of the white list enode.
    function storemanGroupRegisterStart(StoremanType.StoremanGroupInput smg,
        address[] wkAddrs, address[] senders)
        public
        onlyAdmin
    {
        bytes32 groupId = smg.groupId;
        bytes32 preGroupId = smg.preGroupId;
        require(wkAddrs.length == senders.length, "Invalid white list length");
        require(wkAddrs.length >= data.conf.backupCount, "Insufficient white list");
        
        // check preGroupId 是否存在.
        if(preGroupId != bytes32(0x00)){
            StoremanType.StoremanGroup storage preGroup = data.groups[preGroupId];
            require(preGroup.status != StoremanType.GroupStatus.none, "preGroup doesn't exist");
        }

        initGroup(groupId, smg);
        emit StoremanGroupRegisterStartEvent(groupId, preGroupId, smg.workTime, smg.totalTime, smg.registerDuration);
        emit updateGroupChainEvent(groupId, smg.chain1, smg.chain2, smg.curve1, smg.curve2);

        return StoremanLib.inheritNode(data, groupId, preGroupId, wkAddrs, senders);
    }

    /// @dev	                    set the group chain and curve.
    function initGroup(bytes32 groupId, StoremanType.StoremanGroupInput smg)
        private
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(group.status == StoremanType.GroupStatus.none, "group has existed already");

        Deposit.Records memory deposit =  Deposit.Records(0);
        Deposit.Records memory depositWeight =  Deposit.Records(0);
        group.deposit = deposit;
        group.depositWeight = depositWeight;

        group.registerTime = now;
        group.status = StoremanType.GroupStatus.curveSeted;

        group.memberCountDesign = smg.memberCountDesign;
        group.workTime = smg.workTime;
        group.totalTime = smg.totalTime;
        group.registerDuration = smg.registerDuration;
        group.threshold = smg.threshold;
        group.minStakeIn = smg.minStakeIn;
        group.minDelegateIn = smg.minDelegateIn;
        group.delegateFee = smg.delegateFee;
        group.chain1 = smg.chain1;
        group.chain2 = smg.chain2;
        group.curve1 = smg.curve1;
        group.curve2 = smg.curve2;
    }

    function incentiveCandidator( address wkAddr) external   {
        IncentiveLib.incentiveCandidator(data, wkAddr,metric);
    }

    /// @notice                             Staker use this interface to stake wan to SC.
    /// @param groupId                      the storeman group index.
    /// @param PK                           the agent keystore's public key.
    /// @param enodeID                      the agent enodeID, use for p2p network.
    function stakeIn(bytes32 groupId, bytes PK, bytes enodeID)
        external
        notHalted
        payable
    {
        return StoremanLib.stakeIn(data, groupId, PK, enodeID);
    }

    /// @notice                             Staker use this interface to append wan to SC.
    /// @param wkAddr                     the agent keystore's address, which publickey is specified when stakeIn.
    function stakeAppend(address wkAddr)
        external
        notHalted
        payable
    {
        return StoremanLib.stakeAppend(data, wkAddr);
    }

    /// @notice                             Staker use this interface to anounce he will not continue in next group.
    ///  the next group will open in advance of the current group end. so if a node want to quit, it should call stakeOut before the new group open. 
    ///  If the new group has opened, the node in old group can't stake out.
    /// @param wkAddr                     the agent keystore's address, which publickey is specified when stakeIn.
    function stakeOut(address wkAddr) external notHalted {
        return StoremanLib.stakeOut(data, wkAddr);
    }
    function checkCanStakeOut(address wkAddr) external view returns(bool) {
        return StoremanLib.checkCanStakeOut(data, wkAddr);
    }

    function checkCanStakeClaim(address wkAddr) external view returns(bool){
        return StoremanLib.checkCanStakeClaim(data, wkAddr);
    }
    function stakeClaim(address wkAddr) external notHalted {
        return StoremanLib.stakeClaim(data,wkAddr);
    }
    function stakeIncentiveClaim(address wkAddr) external notHalted {
        return StoremanLib.stakeIncentiveClaim(data,wkAddr);
    }

    function delegateIn(address wkAddr)
        external
        notHalted
        payable
    {
        return StoremanLib.delegateIn(data,wkAddr);
    }
    function delegateOut(address wkAddr) external {
        return StoremanLib.delegateOut(data,wkAddr);

    }
    function delegateClaim(address wkAddr) external {

        return StoremanLib.delegateClaim(data, wkAddr);
    }
    function delegateIncentiveClaim(address wkAddr) external {

        return StoremanLib.delegateIncentiveClaim(data, wkAddr);

    }
    function partIn(address wkAddr)
        external
        notHalted
        payable
    {
        return StoremanLib.partIn(data,wkAddr);
    }
    function partOut(address wkAddr) external notHalted{
        return StoremanLib.partOut(data,wkAddr);

    }
    function partClaim(address wkAddr) external notHalted{
        return StoremanLib.partClaim(data,wkAddr);
    }

    function getSelectedSmNumber(bytes32 groupId) public view returns(uint) {
        return StoremanUtil.getSelectedSmNumber(data, groupId);
    }
    function getSelectedStoreman(bytes32 groupId) public view returns(address[]) {
        return StoremanUtil.getSelectedStoreman(data, groupId);
    }
    function select(bytes32 groupId)
        external
        notHalted
    {
        return IncentiveLib.toSelect(data, groupId);
    }

    function getSelectedSmInfo(bytes32 groupId, uint index) public view   returns(address wkAddr, bytes PK, bytes enodeId){
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        address addr = group.selectedNode[index];
        StoremanType.Candidate storage sk = data.candidates[0][addr];
        return (sk.wkAddr, sk.PK, sk.enodeID);
    }

    // To change  group status for unexpected reason.
    function updateGroupStatus(bytes32 groupId, StoremanType.GroupStatus status) external  onlyAdmin {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        group.status = status;
    }


    function getStoremanIncentive(address wkAddr, uint day) public view returns(uint incentive) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        return sk.incentive[day];
    }

    function getSmDelegatorInfoIncentive(address wkAddr, address deAddr, uint day) public view returns ( uint) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage de = sk.delegators[deAddr];
        return (de.incentive[day]);
    }

    function getSmDelegatorInfo(address wkAddr, address deAddr) public view returns (address sender, uint deposit, uint incentive) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage de = sk.delegators[deAddr];
        return (deAddr, de.deposit.getLastValue(),  de.incentive[0]);
    }

    function setGpk(bytes32 groupId, bytes gpk1, bytes gpk2)
        public
    {
        require(msg.sender == createGpkAddr, "Sender is not allowed");
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        group.gpk1 = gpk1;
        group.gpk2 = gpk2;
        group.status = StoremanType.GroupStatus.ready;
    }


    function setInvalidSm(bytes32 groupId, GpkTypes.SlashType[] slashType,  address[] badAddrs)
        public
        returns(bool isContinue)
    {
        require(msg.sender == createGpkAddr, "Sender is not allowed");
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        if(group.status != StoremanType.GroupStatus.selected) {
            return false;
        }
        for(uint k = 0; k < group.selectedCount; k++){
            if(group.tickedCount + group.whiteCount >= group.whiteCountAll){
                group.status == StoremanType.GroupStatus.failed;
                return false;
            }
            for(uint i = 0; i<badAddrs.length; i++){
                if(group.selectedNode[k] == badAddrs[i]){
                    group.tickedNode[group.tickedCount] = group.selectedNode[k];
                    group.selectedNode[k] = group.whiteMap[group.tickedCount + group.whiteCount];
                    group.tickedCount += 1;
                    if(slashType[i] == GpkTypes.SlashType.SijInvalid || slashType[i] == GpkTypes.SlashType.CheckInvalid) {
                        recordSmSlash(badAddrs[i]);
                    }
                    break;
                }
            }
        }
        return true;
    }

    function recordSmSlash(address wk) 
        public
    {
        require((msg.sender == metric) || (msg.sender == createGpkAddr), "Sender is not allowed");
        StoremanType.Candidate storage sk = data.candidates[0][wk];
        sk.slashedCount++;
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
        require(quitable, "can not dismiss");

        group.status = StoremanType.GroupStatus.dismissed;
        emit StoremanGroupDismissedEvent(groupId, now);
        // group状态进入dismissed, 并且完成了收益结算, sk的当前group变成nextGroup.
        StoremanType.Candidate storage sk;
        for(uint i=0; i<group.memberCount; i++){
            sk = data.candidates[0][group.selectedNode[i]];
            if(sk.incentivedDay+1 == StoremanUtil.getDaybyTime(group.workTime+group.totalTime)) {
                if(bytes32(0x00) != sk.nextGroupId) {
                    sk.groupId = sk.nextGroupId;
                    sk.nextGroupId = bytes32(0x00);
                }
            }
        }
    }

    function checkGroupDismissable(bytes32 groupId) public returns(bool) {
        bool dismissable = quotaInst.isDebtClean(groupId);
        return dismissable;
    }

    function getStoremanInfo(address wkAddr) external view returns(StoremanType.StoremanInfo si){
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];

        si.sender = sk.sender;
        si.enodeID = sk.enodeID;
        si.PK = sk.PK;
        si.wkAddr = sk.wkAddr;
        si.isWhite = sk.isWhite;
        si.quited = sk.quited;
        si.delegatorCount = sk.delegatorCount;
        si.delegateDeposit = sk.delegateDeposit;
        si.partnerCount = sk.partnerCount;
        si.partnerDeposit = sk.partnerDeposit;
        si.crossIncoming = sk.crossIncoming;
        si.slashedCount = sk.slashedCount;
        si.incentivedDelegator = sk.incentivedDelegator;
        si.incentivedDay = sk.incentivedDay;
        si.groupId = sk.groupId;
        si.nextGroupId = sk.nextGroupId;
        si.deposit = sk.deposit.getLastValue();
    }
    function getStoremanGroupInfo(bytes32 id) public view returns(StoremanType.StoremanGroupInfo info){
        StoremanType.StoremanGroup storage smg = data.groups[id];
        info.groupId = id;
        info.status = smg.status;
        info.deposit = smg.deposit.getLastValue();
        info.depositWeight = smg.depositWeight.getLastValue();
        info.selectedCount = smg.selectedCount;
        info.memberCount = smg.memberCount;
        info.whiteCount = smg.whiteCount;
        info.whiteCountAll = smg.whiteCountAll;
        info.startTime = smg.workTime;
        info.endTime = smg.workTime+smg.totalTime;
        info.registerTime = smg.registerTime;
        info.registerDuration = smg.registerDuration;
        info.memberCountDesign = smg.memberCountDesign;
        info.threshold = smg.threshold;
        info.chain1 = smg.chain1;
        info.chain2 = smg.chain2;
        info.curve1 = smg.curve1;
        info.curve2 = smg.curve2;
        info.tickedCount = smg.tickedCount;
        info.minStakeIn = smg.minStakeIn;
        info.minDelegateIn = smg.minDelegateIn;
        info.crossIncoming = smg.crossIncoming;
        info.gpk1 = smg.gpk1;
        info.gpk2 = smg.gpk2;
        info.delegateFee = smg.delegateFee;
    }

    function getStoremanGroupConfig(bytes32 id)
        external
        view
        returns(bytes32 groupId, StoremanType.GroupStatus status, uint deposit, uint chain1, uint chain2, uint curve1, uint curve2,  bytes gpk1, bytes gpk2, uint startTime, uint endTime)
    {
        StoremanType.StoremanGroup storage smg = data.groups[id];
        return (id, smg.status,smg.deposit.getLastValue(), smg.chain1, smg.chain2,smg.curve1, smg.curve2,
         smg.gpk1, smg.gpk2, smg.workTime, smg.workTime+smg.totalTime);
    }
    // function getStoremanGroupTime(bytes32 id)
    //     external
    //     view
    //     returns(bytes32 groupId,  uint registerTime, uint registerDuration,  uint startTime, uint endTime)
    // {
    //     StoremanType.StoremanGroup storage smg = data.groups[id];
    //     return (smg.groupId, smg.registerTime, smg.registerDuration, smg.workTime, smg.workTime+smg.totalTime);
    // }


    function checkGroupIncentive(bytes32 id, uint day) public view returns ( uint) {
        StoremanType.StoremanGroup storage group = data.groups[id];
        return group.groupIncentive[day];
    }

    function contribute() public payable {
        emit storemanGroupContributeEvent(msg.sender, msg.value);
        data.contribution = data.contribution.add(msg.value);
        return;
    }

    function smgTransfer(bytes32 smgID) external payable{
        StoremanType.StoremanGroup storage group = data.groups[smgID];
        group.crossIncoming =  group.crossIncoming.add(msg.value);
        uint i;
        StoremanType.Candidate storage sk;
        for(i=0; i<group.selectedCount; i++) {
            sk = data.candidates[0][group.selectedNode[i]];
            sk.crossIncoming = sk.crossIncoming.add(msg.value.div(group.selectedCount));
        }
    }

    function setChainTypeCo(uint chain1, uint chain2, uint co) public  onlyAdmin {
        if(chain1 < chain2) {
            data.chainTypeCo[chain1][chain2] = co;
        } else {
            data.chainTypeCo[chain2][chain1] = co;
        }
    }
    function getChainTypeCo(uint chain1, uint chain2) public view returns (uint co) {
        return IncentiveLib.getChainTypeCo(data, chain1, chain2);
    }

    function getStoremanConf() public view returns(uint backupCount, uint standaloneWeight, uint delegationMulti) {
        return (data.conf.backupCount, data.conf.standaloneWeight, data.conf.DelegationMulti);
    }
    function updateStoremanConf(uint backupCount, uint standaloneWeight, uint DelegationMulti) public onlyAdmin {
        data.conf.backupCount = backupCount;
        data.conf.standaloneWeight = standaloneWeight;
        data.conf.DelegationMulti = DelegationMulti;
    }
    function getGlobalIncentive() public view returns(uint contribution, uint totalReward) {
        return (data.contribution, data.totalReward);
    }
}

