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
import "../interfaces/IListGroup.sol";
import "./StoremanLib.sol";
import "./StoremanType.sol";
import "./IncentiveLib.sol";
import "../interfaces/IQuota.sol";
import "../gpk/lib/GpkTypes.sol";
import "../components/ReentrancyGuard.sol";

contract StoremanGroupDelegate is StoremanGroupStorage, Halt, Admin,ReentrancyGuard {
    using SafeMath for uint;
    using Deposit for Deposit.Records;
    bytes key = "openStoreman";
    bytes innerKey = "totalDeposit";

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
   function setDependence(address metricAddr, address gpkAddr,address quotaAddr, address posAddr)
        external
        onlyOwner
    {
        require(metricAddr != address(0), "Invalid metricAddr address");
        require(gpkAddr != address(0), "Invalid gpkAddr address");
        require(quotaAddr != address(0), "Invalid quotaAddr address");

        metric = metricAddr;
        data.posLib = posAddr;
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
        require(wkAddrs.length <= smg.memberCountDesign+data.conf.backupCount, "Too many whitelist node");
        // check preGroupId 是否存在.
        if(preGroupId != bytes32(0x00)){
            StoremanType.StoremanGroup storage preGroup = data.groups[preGroupId];
            require(preGroup.status == StoremanType.GroupStatus.ready || preGroup.status == StoremanType.GroupStatus.failed,"invalid preGroup");
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
        group.minPartIn = smg.minPartIn;
        group.delegateFee = smg.delegateFee;
        group.chain1 = smg.chain1;
        group.chain2 = smg.chain2;
        group.curve1 = smg.curve1;
        group.curve2 = smg.curve2;
    }

    function incentiveCandidator( address wkAddr) external   {
        IncentiveLib.incentiveCandidator(data, wkAddr,metric, getGlobalGroupScAddr());
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
    function stakeClaim(address wkAddr) external notHalted nonReentrant {
        return StoremanLib.stakeClaim(data,wkAddr);
    }
    function stakeIncentiveClaim(address wkAddr) external notHalted nonReentrant{
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
    function delegateClaim(address wkAddr) external notHalted nonReentrant{

        return StoremanLib.delegateClaim(data, wkAddr);
    }
    function delegateIncentiveClaim(address wkAddr) external notHalted nonReentrant{

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
    function partClaim(address wkAddr) external notHalted nonReentrant{
        return StoremanLib.partClaim(data,wkAddr);
    }

    function getSelectedSmNumber(bytes32 groupId) external view returns(uint) {
        return StoremanUtil.getSelectedSmNumber(data, groupId);
    }
    function getSelectedStoreman(bytes32 groupId) external view returns(address[]) {
        return StoremanUtil.getSelectedStoreman(data, groupId);
    }
    function select(bytes32 groupId)
        external
        notHalted
    {
        return IncentiveLib.toSelect(data, groupId);
    }

    function getSelectedSmInfo(bytes32 groupId, uint index) external view returns(address wkAddr, bytes PK, bytes enodeId) {
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

    function getStoremanIncentive(address wkAddr, uint day) external view returns(uint incentive) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        return sk.incentive[day];
    }

    function getSmDelegatorInfoIncentive(address wkAddr, address deAddr, uint day) external view returns ( uint) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage de = sk.delegators[deAddr];
        return (de.incentive[day]);
    }

    function getSmDelegatorInfo(address wkAddr, address deAddr) external view returns (address sender, uint deposit, uint incentive, bool quited) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage de = sk.delegators[deAddr];
        return (deAddr, de.deposit.getLastValue(),  de.incentive[0], de.quited);
    }
    function getSmPartnerInfo(address wkAddr, address pnAddr) external view returns (address sender, uint deposit, bool quited) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage pn = sk.partners[pnAddr];
        return (pnAddr, pn.deposit.getLastValue(), pn.quited);
    }
    function getSmPartnerAddr(address wkAddr, uint index) external view returns(address pkAddr) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        return sk.partMap[index];
    }
    function getSmDelegatorAddr(address wkAddr, uint index) external view returns(address deAddr) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        return sk.delegatorMap[index];
    }

    function setGpk(bytes32 groupId, bytes gpk1, bytes gpk2)
        external
    {
        require(msg.sender == createGpkAddr, "Sender is not allowed");
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(group.status == StoremanType.GroupStatus.selected,"invalid status");
        group.gpk1 = gpk1;
        group.gpk2 = gpk2;
        group.status = StoremanType.GroupStatus.ready;
        addActiveGroup(groupId, group.workTime, group.workTime+group.totalTime);
    }
    function addActiveGroupId(bytes32 groupId) external onlyAdmin{
        address addr = getGlobalGroupScAddr();
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        IListGroup(addr).addActiveGroup(groupId, group.workTime, group.workTime+group.totalTime);
    }
    function getDependence() public view  returns(address metricAddr, address gpkAddr,address quotaAddr, address posAddr, address listGroupAddr) {
        return (metric, createGpkAddr,address(quotaInst), data.posLib, getGlobalGroupScAddr());
    }

    function setGlobalGroupScAddr(address _addr) external onlyOwner {
        addressData.setStorage(key, innerKey, _addr);
    }
    function getGlobalGroupScAddr() public view returns(address) {
        return addressData.getStorage(key, innerKey);
    }
    function addActiveGroup(bytes32 groupId, uint startTime, uint endTime) private {
        address addr = getGlobalGroupScAddr();
        IListGroup(addr).addActiveGroup(groupId, startTime, endTime);
    }
    function cleanExpiredGroup() private {
        address addr = getGlobalGroupScAddr();
        IListGroup(addr).cleanExpiredGroup();
    }
    function getActiveGroupIds(uint epochId) external view returns(bytes32[]){
        address addr = getGlobalGroupScAddr();
        return IListGroup(addr).getActiveGroupIds(epochId);
    }


    function setInvalidSm(bytes32 groupId, uint[] indexs, GpkTypes.SlashType[] slashTypes)
        external
        returns(bool isContinue)
    {
        require(msg.sender == createGpkAddr, "Sender is not allowed");
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        if (group.status != StoremanType.GroupStatus.selected) {
            return false;
        }
        for (uint i = 0; i < indexs.length; i++) {
            StoremanType.Candidate storage skt = data.candidates[0][group.selectedNode[indexs[i]]];
            if (slashTypes[i] == GpkTypes.SlashType.SijInvalid || slashTypes[i] == GpkTypes.SlashType.CheckInvalid || slashTypes[i] == GpkTypes.SlashType.SijTimeout) {
                recordSmSlash(group.selectedNode[indexs[i]]);
            }
            IncentiveLib.cleanSmNode(skt, groupId);
            if (group.tickedCount + group.whiteCount >= group.whiteCountAll) {
                group.status = StoremanType.GroupStatus.failed;
                return false;
            }
            group.tickedNode[group.tickedCount] = group.selectedNode[indexs[i]];
            group.selectedNode[indexs[i]] = group.whiteMap[group.whiteCount + group.tickedCount];
            group.tickedCount++;
            StoremanType.Candidate storage skn = data.candidates[0][group.selectedNode[indexs[i]]];
            if(skn.groupId == 0) {
                skn.groupId = groupId;
            }else {
                skn.nextGroupId = groupId;
            }

        }
        IncentiveLib.setGroupDeposit(data, group);
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
        StoremanLib.storemanGroupUnregister(data, groupId);
        return cleanExpiredGroup();
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
            if(sk.incentivedDay+1 == StoremanUtil.getDaybyTime(data.posLib, group.workTime+group.totalTime)) {
                if(bytes32(0x00) != sk.nextGroupId) {
                    sk.groupId = sk.nextGroupId;
                    sk.nextGroupId = bytes32(0x00);
                }
            }
        }
    }

    function checkGroupDismissable(bytes32 groupId) external view returns(bool) {
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
        si.incentive = sk.incentive[0];
        si.nextGroupId = sk.nextGroupId;
        si.deposit = sk.deposit.getLastValue();
    }
    function getStoremanGroupInfo(bytes32 id) external view returns(StoremanType.StoremanGroupInfo info){
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
        info.minPartIn = smg.minPartIn;
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

    function getStoremanGroupStatus(bytes32 id)
        public
        view
        returns(StoremanType.GroupStatus status, uint startTime, uint endTime)
    {
        StoremanType.StoremanGroup storage smg = data.groups[id];
        return (smg.status, smg.workTime, smg.workTime+smg.totalTime);
    }

    function getDeposit(bytes32 id) 
        external
        view
        returns (uint)
    {
        return data.groups[id].deposit.getLastValue();
    }
    
    // function getStoremanGroupTime(bytes32 id)
    //     external
    //     view
    //     returns(bytes32 groupId,  uint registerTime, uint registerDuration,  uint startTime, uint endTime)
    // {
    //     StoremanType.StoremanGroup storage smg = data.groups[id];
    //     return (smg.groupId, smg.registerTime, smg.registerDuration, smg.workTime, smg.workTime+smg.totalTime);
    // }


    function checkGroupIncentive(bytes32 id, uint day) external view returns ( uint) {
        StoremanType.StoremanGroup storage group = data.groups[id];
        return group.groupIncentive[day];
    }

    function contribute() external payable {
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

    function setChainTypeCo(uint chain1, uint chain2, uint co) external  onlyAdmin {
        if(chain1 < chain2) {
            data.chainTypeCo[chain1][chain2] = co;
        } else {
            data.chainTypeCo[chain2][chain1] = co;
        }
    }
    function getChainTypeCo(uint chain1, uint chain2) external view returns (uint co) {
        return IncentiveLib.getChainTypeCo(data, chain1, chain2);
    }

    function getStoremanConf() external view returns(uint backupCount, uint standaloneWeight, uint delegationMulti) {
        return (data.conf.backupCount, data.conf.standaloneWeight, data.conf.DelegationMulti);
    }
    function updateStoremanConf(uint backupCount, uint standaloneWeight, uint DelegationMulti) external onlyAdmin {
        data.conf.backupCount = backupCount;
        data.conf.standaloneWeight = standaloneWeight;
        data.conf.DelegationMulti = DelegationMulti;
    }
    function getGlobalIncentive() external view returns(uint contribution, uint totalReward) {
        return (data.contribution, data.totalReward);
    }
}

