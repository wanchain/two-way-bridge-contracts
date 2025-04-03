// SPDX-License-Identifier: MIT

/*

  Copyright 2023 Wanchain Foundation.

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

pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
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

/**
 * @title StoremanGroupDelegate
 * @dev Implementation contract for storeman group administration
 * This contract implements the core functionality for managing storeman groups,
 * including creation, updates, and member management
 * 
 * Key features:
 * - Group creation and management
 * - Member addition and removal
 * - Status updates for groups and members
 * - Group deletion
 * - Member information updates
 * 
 * @custom:inheritance
 * - StoremanGroupAdminStorage: Provides storage layout
 * - Halt: Provides emergency stop functionality
 * - Admin: Provides administrative access control
 * - Proxy: Implements upgradeable proxy pattern
 * 
 * @custom:events
 * - Group lifecycle events (create, update, delete)
 * - Member management events (add, remove, status update)
 * - Information update events (work address, public key, enode ID)
 * 
 * @custom:security
 * - Access control through Admin contract
 * - Emergency stop capability through Halt contract
 * - Upgradeable through Proxy pattern
 */
contract StoremanGroupDelegate is StoremanGroupStorage, Halt, Admin,ReentrancyGuard {
    using SafeMath for uint;
    using Deposit for Deposit.Records;
    bytes key = "openStoreman";
    bytes innerKey = "totalDeposit";

    /**
     * @notice Event emitted when a Storeman group registration starts
     * @dev Indicates the beginning of group registration process
     * @param groupId ID of the group
     * @param preGroupId ID of the previous group
     * @param workStart Start time of work period
     * @param workDuration Duration of work period
     * @param registerDuration Duration of registration period
     */
    event StoremanGroupRegisterStartEvent(bytes32 indexed groupId, bytes32 indexed preGroupId, uint workStart, uint workDuration, uint registerDuration);

    /**
     * @notice Event emitted when a Storeman group is dismissed
     * @dev Indicates group dismissal
     * @param groupId ID of the group
     * @param dismissTime Time of dismissal
     */
    event StoremanGroupDismissedEvent(bytes32 indexed groupId, uint dismissTime);

    /**
     * @notice Event emitted when GPK is set for a group
     * @dev Indicates GPK configuration
     * @param groupId ID of the group
     */
    event StoremanGroupSetGpkEvent(bytes32 indexed groupId);

    /**
     * @notice Event emitted when group chain configuration is updated
     * @dev Indicates chain configuration update
     * @param groupId ID of the group
     * @param chain1 First chain ID
     * @param chain2 Second chain ID
     * @param curve1 First curve type
     * @param curve2 Second curve type
     */
    event updateGroupChainEvent(bytes32 indexed groupId, uint256 indexed chain1, uint256 indexed chain2, uint256 curve1, uint256 curve2);

    /**
     * @notice Event emitted when contribution is made to a group
     * @dev Indicates contribution transaction
     * @param sender Address of the contributor
     * @param value Amount contributed
     */
    event storemanGroupContributeEvent(address indexed sender, uint indexed value);

    /**
     * @dev Modifier to restrict access to group leader only
     * @param groupId ID of the group
     */
    modifier onlyGroupLeader(bytes32 groupId) {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(msg.sender == group.selectedNode[0], "Sender is not allowed");
        _;
    }

    /**
     * @notice Sets dependencies for the contract
     * @dev Configures contract addresses for metric, GPK, quota, and POS
     * @param metricAddr Address of the metric contract
     * @param gpkAddr Address of the GPK contract
     * @param quotaAddr Address of the quota contract
     * @param posAddr Address of the POS contract
     */
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

    /**
     * @notice Initiates registration of a new Storeman group
     * @dev Creates a new group with specified parameters
     * @param smg Group input parameters
     * @param wkAddrs Array of whitelist work addresses
     * @param senders Array of sender addresses for whitelist nodes
     */
    function storemanGroupRegisterStart(StoremanType.StoremanGroupInput calldata smg,
        address[] calldata wkAddrs, address[] calldata senders)
        public
        onlyAdmin
    {
        bytes32 groupId = smg.groupId;
        bytes32 preGroupId = smg.preGroupId;
        require(wkAddrs.length == senders.length, "Invalid white list length");
        require(wkAddrs.length >= data.conf.backupCount, "Insufficient white list");
        require(wkAddrs.length <= smg.memberCountDesign+data.conf.backupCount, "Too many whitelist node");
        // check preGroupId exist.
        if(preGroupId != bytes32(0x00)){
            StoremanType.StoremanGroup storage preGroup = data.groups[preGroupId];
            require(preGroup.status == StoremanType.GroupStatus.ready || preGroup.status == StoremanType.GroupStatus.failed,"invalid preGroup");
        }

        initGroup(groupId, smg);
        emit StoremanGroupRegisterStartEvent(groupId, preGroupId, smg.workTime, smg.totalTime, smg.registerDuration);
        emit updateGroupChainEvent(groupId, smg.chain1, smg.chain2, smg.curve1, smg.curve2);

        return StoremanLib.inheritNode(data, groupId, preGroupId, wkAddrs, senders);
    }

    /**
     * @notice Initializes a new Storeman group
     * @dev Sets up group parameters and status
     * @param groupId ID of the group
     * @param smg Group input parameters
     */
    function initGroup(bytes32 groupId, StoremanType.StoremanGroupInput calldata smg)
        private
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(group.status == StoremanType.GroupStatus.none, "group has existed already");

        group.registerTime = block.timestamp;
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

    /**
     * @notice Processes incentives for a candidate
     * @dev Calculates and distributes incentives
     * @param wkAddr Work address of the candidate
     */
    function incentiveCandidator(address wkAddr) external   {
        IncentiveLib.incentiveCandidator(data, wkAddr,metric, getGlobalGroupScAddr());
    }

    /**
     * @notice Allows staking into a Storeman group
     * @dev Processes staking operation
     * @param groupId ID of the target group
     * @param PK Public key of the staker
     * @param enodeID Enode ID for P2P network
     */
    function stakeIn(bytes32 groupId, bytes calldata PK, bytes calldata enodeID)
        external
        notHalted
        payable
    {
        return StoremanLib.stakeIn(data, groupId, PK, enodeID);
    }

    /**
     * @notice Allows appending stake to existing position
     * @dev Processes additional staking
     * @param wkAddr Work address of the staker
     */
    function stakeAppend(address wkAddr)
        external
        notHalted
        payable
    {
        return StoremanLib.stakeAppend(data, wkAddr);
    }

    /**
     * @notice Allows announcing intention to quit next group
     * @dev Processes stake withdrawal request
     * the next group will open in advance of the current group end. so if a node want to quit, it should call stakeOut before the new group open. 
     * If the new group has opened, the node in old group can't stake out.
     * @param wkAddr Work address of the staker
     */
    function stakeOut(address wkAddr) external notHalted {
        return StoremanLib.stakeOut(data, wkAddr);
    }

    /**
     * @notice Checks if stake can be withdrawn
     * @dev Validates stake withdrawal conditions
     * @param wkAddr Work address to check
     * @return bool indicating if withdrawal is possible
     */
    function checkCanStakeOut(address wkAddr) external view returns(bool) {
        return StoremanLib.checkCanStakeOut(data, wkAddr);
    }

    /**
     * @notice Checks if stake can be claimed
     * @dev Validates stake claim conditions
     * @param wkAddr Work address to check
     * @return bool indicating if claim is possible
     */
    function checkCanStakeClaim(address wkAddr) external view returns(bool){
        return StoremanLib.checkCanStakeClaim(data, wkAddr);
    }

    /**
     * @notice Checks if partner can claim
     * @dev Validates partner claim conditions
     * @param wkAddr Work address of the node
     * @param pnAddr Address of the partner
     * @return bool indicating if claim is possible
     */
    function checkCanPartnerClaim(address wkAddr, address pnAddr) external view returns(bool) {
        return StoremanLib.checkCanPartnerClaim(data, wkAddr, pnAddr, getGlobalGroupScAddr());
    }

    /**
     * @notice Checks if delegator can claim
     * @dev Validates delegator claim conditions
     * @param wkAddr Work address of the node
     * @param deAddr Address of the delegator
     * @return bool indicating if claim is possible
     */
    function checkCanDelegatorClaim(address wkAddr, address deAddr) external view returns(bool) {
        return StoremanLib.checkCanDelegatorClaim(data, wkAddr, deAddr, getGlobalGroupScAddr());
    }

    /**
     * @notice Processes stake claim
     * @dev Handles stake and incentive claims
     * @param wkAddr Work address of the claimant
     */
    function stakeClaim(address wkAddr) external notHalted nonReentrant {
        return StoremanLib.stakeClaim(data,wkAddr);
    }

    /**
     * @notice Processes incentive claim
     * @dev Handles incentive distribution
     * @param wkAddr Work address of the claimant
     */
    function stakeIncentiveClaim(address wkAddr) external notHalted nonReentrant{
        return StoremanLib.stakeIncentiveClaim(data,wkAddr);
    }

    /**
     * @notice Processes delegation
     * @dev Handles delegation operation
     * @param wkAddr Work address of the delegator
     */
    function delegateIn(address wkAddr)
        external
        notHalted
        payable
    {
        return StoremanLib.delegateIn(data,wkAddr);
    }

    /**
     * @notice Processes delegation withdrawal
     * @dev Handles delegation withdrawal
     * @param wkAddr Work address of the delegator
     */
    function delegateOut(address wkAddr) external {
        return StoremanLib.delegateOut(data,wkAddr, getGlobalGroupScAddr());

    }

    /**
     * @notice Processes delegation claim
     * @dev Handles delegation claims
     * @param wkAddr Work address of the delegator
     */
    function delegateClaim(address wkAddr) external notHalted nonReentrant{
        return StoremanLib.delegateClaim(data, wkAddr, getGlobalGroupScAddr());
    }

    /**
     * @notice Processes delegation incentive claim
     * @dev Handles delegation incentive distribution
     * @param wkAddr Work address of the delegator
     */
    function delegateIncentiveClaim(address wkAddr) external notHalted nonReentrant{

        return StoremanLib.delegateIncentiveClaim(data, wkAddr);

    }

    /**
     * @notice Processes partnership
     * @dev Handles partnership operation
     * @param wkAddr Work address of the partner
     */
    function partIn(address wkAddr)
        external
        notHalted
        payable
    {
        return StoremanLib.partIn(data,wkAddr);
    }

    /**
     * @notice Processes partnership withdrawal
     * @dev Handles partnership withdrawal
     * @param wkAddr Work address of the partner
     */
    function partOut(address wkAddr) external notHalted{
        return StoremanLib.partOut(data, wkAddr, getGlobalGroupScAddr());

    }

    /**
     * @notice Processes partnership claim
     * @dev Handles partnership claims
     * @param wkAddr Work address of the partner
     */
    function partClaim(address wkAddr) external notHalted nonReentrant{
        return StoremanLib.partClaim(data,wkAddr, getGlobalGroupScAddr());
    }

    /**
     * @notice Gets number of selected Storeman nodes
     * @dev Returns count of selected nodes
     * @param groupId ID of the group
     * @return uint Number of selected nodes
     */
    function getSelectedSmNumber(bytes32 groupId) external view returns(uint) {
        return StoremanUtil.getSelectedSmNumber(data, groupId);
    }

    /**
     * @notice Gets addresses of selected Storeman nodes
     * @dev Returns array of selected node addresses
     * @param groupId ID of the group
     * @return address[] Array of selected node addresses
     */
    function getSelectedStoreman(bytes32 groupId) external view returns(address[] memory) {
        return StoremanUtil.getSelectedStoreman(data, groupId);
    }

    /**
     * @notice Selects members for a group
     * @dev Processes member selection
     * @param groupId ID of the group
     */
    function select(bytes32 groupId)
        external
        notHalted
    {
        return IncentiveLib.toSelect(data, groupId);
    }

    /**
     * @notice Gets information about a selected Storeman node
     * @dev Returns node details
     * @param groupId ID of the group
     * @param index Index of the node
     * @return wkAddr Work address
     * @return PK Public key
     * @return enodeId Enode ID
     */
    function getSelectedSmInfo(bytes32 groupId, uint index) external view returns(address wkAddr, bytes memory PK, bytes memory enodeId) {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        address addr = group.selectedNode[index];
        StoremanType.Candidate storage sk = data.candidates[0][addr];
        return (sk.wkAddr, sk.PK, sk.enodeID);
    }

    /**
     * @notice Updates group status
     * @dev Changes group status for unexpected reasons
     * @param groupId ID of the group
     * @param status New status
     */
    function updateGroupStatus(bytes32 groupId, StoremanType.GroupStatus status) external  onlyAdmin {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        group.status = status;
    }

    /**
     * @notice Gets Storeman incentive for a specific day
     * @dev Returns incentive amount
     * @param wkAddr Work address
     * @param day Target day
     * @return incentive Amount of incentive
     */
    function getStoremanIncentive(address wkAddr, uint day) external view returns(uint incentive) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        return sk.incentive[day];
    }

    /**
     * @notice Gets delegator incentive information
     * @dev Returns delegator incentive details
     * @param wkAddr Work address
     * @param deAddr Delegator address
     * @param day Target day
     * @return uint Incentive amount
     */
    function getSmDelegatorInfoIncentive(address wkAddr, address deAddr, uint day) external view returns ( uint) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage de = sk.delegators[deAddr];
        return (de.incentive[day]);
    }

    /**
     * @notice Gets delegator information
     * @dev Returns delegator details
     * @param wkAddr Work address
     * @param deAddr Delegator address
     * @return sender Address of sender
     * @return deposit Amount of deposit
     * @return incentive Amount of incentive
     * @return quited Whether delegator has quit
     */
    function getSmDelegatorInfo(address wkAddr, address deAddr) external view returns (address sender, uint deposit, uint incentive, bool quited) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage de = sk.delegators[deAddr];
        return (deAddr, de.deposit.getLastValue(),  de.incentive[0], de.quited);
    }

    /**
     * @notice Gets partner information
     * @dev Returns partner details
     * @param wkAddr Work address
     * @param pnAddr Partner address
     * @return sender Address of sender
     * @return deposit Amount of deposit
     * @return quited Whether partner has quit
     */
    function getSmPartnerInfo(address wkAddr, address pnAddr) external view returns (address sender, uint deposit, bool quited) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage pn = sk.partners[pnAddr];
        return (pnAddr, pn.deposit.getLastValue(), pn.quited);
    }

    /**
     * @notice Gets partner address by index
     * @dev Returns partner address
     * @param wkAddr Work address
     * @param index Partner index
     * @return pkAddr Partner address
     */
    function getSmPartnerAddr(address wkAddr, uint index) external view returns(address pkAddr) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        return sk.partMap[index];
    }

    /**
     * @notice Gets delegator address by index
     * @dev Returns delegator address
     * @param wkAddr Work address
     * @param index Delegator index
     * @return deAddr Delegator address
     */
    function getSmDelegatorAddr(address wkAddr, uint index) external view returns(address deAddr) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        return sk.delegatorMap[index];
    } 

    /**
     * @notice Sets GPK for a group
     * @dev Configures group GPK
     * @param groupId ID of the group
     * @param gpk1 First GPK
     * @param gpk2 Second GPK
     */
    function setGpk(bytes32 groupId, bytes calldata gpk1, bytes calldata gpk2)
        external
    {
        require(msg.sender == createGpkAddr, "Sender is not allowed");
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(group.status == StoremanType.GroupStatus.selected,"invalid status");
        group.gpk1 = gpk1;
        group.gpk2 = gpk2;
        group.status = StoremanType.GroupStatus.ready;
        addActiveGroup(groupId, group.workTime, group.workTime+group.totalTime);
        emit StoremanGroupSetGpkEvent(groupId);
    }

    /**
     * @notice Adds active group ID
     * @dev Registers active group
     * @param groupId ID of the group
     */
    function addActiveGroupId(bytes32 groupId) external onlyAdmin{
        address addr = getGlobalGroupScAddr();
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        IListGroup(addr).addActiveGroup(groupId, group.workTime, group.workTime+group.totalTime);
    }

    /**
     * @notice Gets contract dependencies
     * @dev Returns addresses of dependent contracts
     * @return metricAddr Metric contract address
     * @return gpkAddr GPK contract address
     * @return quotaAddr Quota contract address
     * @return posAddr POS contract address
     * @return listGroupAddr List group contract address
     */
    function getDependence() public view  returns(address metricAddr, address gpkAddr,address quotaAddr, address posAddr, address listGroupAddr) {
        return (metric, createGpkAddr,address(quotaInst), data.posLib, getGlobalGroupScAddr());
    }

    /**
     * @notice Sets global group SC address
     * @dev Updates global group address
     * @param _addr New address
     */
    function setGlobalGroupScAddr(address _addr) external onlyOwner {
        BasicStorageLib.setStorage(addressData, key, innerKey, _addr);
    }

    /**
     * @notice Gets global group SC address
     * @dev Returns global group address
     * @return address Global group address
     */
    function getGlobalGroupScAddr() public view returns(address) {
        return BasicStorageLib.getStorage(addressData, key, innerKey);
    }

    /**
     * @notice Adds active group
     * @dev Registers active group with time range
     * @param groupId ID of the group
     * @param startTime Start time
     * @param endTime End time
     */
    function addActiveGroup(bytes32 groupId, uint startTime, uint endTime) private {
        address addr = getGlobalGroupScAddr();
        IListGroup(addr).addActiveGroup(groupId, startTime, endTime);
    }

    /**
     * @notice Cleans expired groups
     * @dev Removes expired groups from active list
     */
    function cleanExpiredGroup() private {
        address addr = getGlobalGroupScAddr();
        IListGroup(addr).cleanExpiredGroup();
    }

    /**
     * @notice Gets active group IDs
     * @dev Returns array of active group IDs
     * @param epochId Epoch ID
     * @return bytes32[] Array of active group IDs
     */
    function getActiveGroupIds(uint epochId) external view returns(bytes32[] memory){
        address addr = getGlobalGroupScAddr();
        return IListGroup(addr).getActiveGroupIds(epochId);
    }

    /**
     * @notice Sets invalid Storeman nodes
     * @dev Marks nodes as invalid based on slash types
     * @param groupId ID of the group
     * @param indexs Array of node indices
     * @param slashTypes Array of slash types
     * @return isContinue Whether operation should continue
     */
    function setInvalidSm(bytes32 groupId, uint[] calldata indexs, GpkTypes.SlashType[] calldata slashTypes)
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

    /**
     * @notice Records Storeman slash
     * @dev Updates slash count for a node
     * @param wk Work address
     */
    function recordSmSlash(address wk) 
        public
    {
        require((msg.sender == metric) || (msg.sender == createGpkAddr), "Sender is not allowed");
        StoremanType.Candidate storage sk = data.candidates[0][wk];
        sk.slashedCount++;
    }

    /**
     * @notice Gets threshold by group ID
     * @dev Returns group threshold
     * @param groupId ID of the group
     * @return uint Threshold value
     */
    function getThresholdByGrpId(bytes32 groupId) external view returns (uint){
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        return group.threshold;
    }

    /**
     * @notice Unregisters a Storeman group
     * @dev Processes group unregistration
     * @param groupId ID of the group
     */
    function storemanGroupUnregister(bytes32 groupId)
        external
        notHalted
        onlyGroupLeader(groupId)
    {
        StoremanLib.storemanGroupUnregister(data, groupId);
        return cleanExpiredGroup();
    }

    /**
     * @notice Dismisses a Storeman group
     * @dev Processes group dismissal
     * @param groupId ID of the group
     */
    function storemanGroupDismiss(bytes32 groupId)
        external
        notHalted
        onlyGroupLeader(groupId)
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        bool quitable = quotaInst.isDebtClean(groupId);
        require(quitable, "can not dismiss");

        group.status = StoremanType.GroupStatus.dismissed;
        emit StoremanGroupDismissedEvent(groupId, block.timestamp);

        StoremanType.Candidate storage sk;
        for(uint i=0; i<group.selectedCount; i++){
            sk = data.candidates[0][group.selectedNode[i]];
            IncentiveLib.rotateSkGroup(data.posLib, sk, group);
        }
    }

    /**
     * @notice Checks if group can be dismissed
     * @dev Validates dismissal conditions
     * @param groupId ID of the group
     * @return bool Whether group can be dismissed
     */
    function checkGroupDismissable(bytes32 groupId) external view returns(bool) {
        bool dismissable = quotaInst.isDebtClean(groupId);
        return dismissable;
    }

    /**
     * @notice Gets Storeman information
     * @dev Returns detailed node information
     * @param wkAddr Work address
     * @return si Storeman information
     */
    function getStoremanInfo(address wkAddr) external view returns(StoremanType.StoremanInfo memory si){
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

    /**
     * @notice Gets Storeman group information
     * @dev Returns detailed group information
     * @param id Group ID
     * @return info Group information
     */
    function getStoremanGroupInfo(bytes32 id) external view returns(StoremanType.StoremanGroupInfo memory info){
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

    /**
     * @notice Gets Storeman group configuration
     * @dev Returns group configuration details
     * @param id Group ID
     * @return groupId ID of the group
     * @return status Group status
     * @return deposit Total deposit
     * @return chain1 First chain ID
     * @return chain2 Second chain ID
     * @return curve1 First curve type
     * @return curve2 Second curve type
     * @return gpk1 First GPK
     * @return gpk2 Second GPK
     * @return startTime Start time
     * @return endTime End time
     */
    function getStoremanGroupConfig(bytes32 id)
        external
        view
        returns(bytes32 groupId, StoremanType.GroupStatus status, uint deposit, uint chain1, uint chain2, uint curve1, uint curve2,  bytes memory gpk1, bytes memory gpk2, uint startTime, uint endTime)
    {
        StoremanType.StoremanGroup storage smg = data.groups[id];
        return (id, smg.status,smg.deposit.getLastValue(), smg.chain1, smg.chain2,smg.curve1, smg.curve2,
         smg.gpk1, smg.gpk2, smg.workTime, smg.workTime+smg.totalTime);
    }

    /**
     * @notice Gets Storeman group status
     * @dev Returns group status and time information
     * @param id Group ID
     * @return status Group status
     * @return startTime Start time
     * @return endTime End time
     */
    function getStoremanGroupStatus(bytes32 id)
        public
        view
        returns(StoremanType.GroupStatus status, uint startTime, uint endTime)
    {
        StoremanType.StoremanGroup storage smg = data.groups[id];
        return (smg.status, smg.workTime, smg.workTime+smg.totalTime);
    }

    /**
     * @notice Gets group deposit
     * @dev Returns total deposit amount
     * @param id Group ID
     * @return uint Deposit amount
     */
    function getDeposit(bytes32 id) 
        external
        view
        returns (uint)
    {
        return data.groups[id].deposit.getLastValue();
    }

    /**
     * @notice Checks group incentive
     * @dev Returns incentive amount for a day
     * @param id Group ID
     * @param day Target day
     * @return uint Incentive amount
     */
    function checkGroupIncentive(bytes32 id, uint day) external view returns ( uint) {
        StoremanType.StoremanGroup storage group = data.groups[id];
        return group.groupIncentive[day];
    }

    /**
     * @notice Processes contribution
     * @dev Handles contribution transaction
     */
    function contribute() external payable {
        emit storemanGroupContributeEvent(msg.sender, msg.value);
        data.contribution = data.contribution.add(msg.value);
        return;
    }

    /**
     * @notice Processes SMG transfer
     * @dev Handles transfer operation
     * @param smgID Group ID
     */
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

    /**
     * @notice Sets chain type coefficient
     * @dev Updates coefficient for chain pair
     * @param chain1 First chain ID
     * @param chain2 Second chain ID
     * @param co Coefficient value
     */
    function setChainTypeCo(uint chain1, uint chain2, uint co) external  onlyAdmin {
        if(chain1 < chain2) {
            data.chainTypeCo[chain1][chain2] = co;
        } else {
            data.chainTypeCo[chain2][chain1] = co;
        }
    }

    /**
     * @notice Gets chain type coefficient
     * @dev Returns coefficient for chain pair
     * @param chain1 First chain ID
     * @param chain2 Second chain ID
     * @return co Coefficient value
     */
    function getChainTypeCo(uint chain1, uint chain2) external view returns (uint co) {
        return IncentiveLib.getChainTypeCo(data, chain1, chain2);
    }

    /**
     * @notice Gets Storeman configuration
     * @dev Returns configuration parameters
     * @return backupCount Number of backup nodes
     * @return standaloneWeight Standalone weight
     * @return delegationMulti Delegation multiplier
     */
    function getStoremanConf() external view returns(uint backupCount, uint standaloneWeight, uint delegationMulti) {
        return (data.conf.backupCount, data.conf.standaloneWeight, data.conf.DelegationMulti);
    }

    /**
     * @notice Updates Storeman configuration
     * @dev Modifies configuration parameters
     * @param backupCount Number of backup nodes
     * @param standaloneWeight Standalone weight
     * @param DelegationMulti Delegation multiplier
     */
    function updateStoremanConf(uint backupCount, uint standaloneWeight, uint DelegationMulti) external onlyAdmin {
        data.conf.backupCount = backupCount;
        data.conf.standaloneWeight = standaloneWeight;
        data.conf.DelegationMulti = DelegationMulti;
    }

    /**
     * @notice Gets global incentive information
     * @dev Returns contribution and reward totals
     * @return contribution Total contribution
     * @return totalReward Total reward
     */
    function getGlobalIncentive() external view returns(uint contribution, uint totalReward) {
        return (data.contribution, data.totalReward);
    }
}

