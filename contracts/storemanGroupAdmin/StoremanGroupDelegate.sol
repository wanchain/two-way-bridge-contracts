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

contract StoremanGroupDelegate is StoremanGroupStorage, Halt {
    using SafeMath for uint;

    /**
     *
     * EVENTS
     *
     */

    /// @notice                           event for storeman register
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    /// @param wanDeposit                 deposit wancoin number
    /// @param quota                      corresponding token quota
    /// @param txFeeRatio                 storeman fee ratio
    event StoremanGroupRegistrationLogger(bytes  tokenOrigAccount, bytes32 indexed groupId,  bytes storemanGroup, uint wanDeposit, uint quota, uint txFeeRatio);

    /// @notice                           event for storeman register
    /// @param storemanGroup              storeman group PK
    /// @param isEnable                   is enable or disable
    event SetWhiteListLogger(bytes tokenOrigAccount, bytes storemanGroup, bool isEnable);

    /// @notice                           event for applying storeman group unregister
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group address
    /// @param applyTime                  the time for storeman applying unregister
    event StoremanGroupApplyUnRegistrationLogger(bytes tokenOrigAccount, bytes storemanGroup, uint applyTime);

    /// @notice                           event for storeman group withdraw deposit
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    /// @param actualReturn               actual amount wan coin received, for penalty extension
    /// @param deposit                    deposit in the first place
    event StoremanGroupWithdrawLogger(bytes tokenOrigAccount, bytes storemanGroup, uint actualReturn, uint deposit);

    /// @notice                           event for storeman group update deposit
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    /// @param wanDeposit                 deposit wancoin number
    /// @param quota                      corresponding token quota
    /// @param txFeeRatio                 storeman fee ratio
    event StoremanGroupUpdateLogger(bytes tokenOrigAccount, bytes storemanGroup, uint wanDeposit, uint quota, uint txFeeRatio);

    /**
    *
    * MANIPULATIONS
    *
    */
    /// @notice                           function for owner set token manager and htlc contract address
    /// @param tmAddr                     token manager contract address
    /// @param htlcAddr                   htlc contract address
    function setDependence(address tmAddr, address htlcAddr)
        external
        onlyOwner
    {
        require(tmAddr != address(0), "Invalid tokenManager address");
        require(htlcAddr != address(0), "Invalid htlc address");
        tokenManager = ITokenManager(tmAddr);
        htlc = IHTLC(htlcAddr);
    }


    function setBackupCount(uint backup) public{
        backupCount = backup;
    }
    function getBackupCount() public view returns (uint) {
        return backupCount;
    }


    /// @notice                           function for owner set token manager and htlc contract address
    /// @param id                    the building storeman group index.
    /// @param chain                      the chain that the group will work for.
    /// @param wkAddrs                    white list work address.
    /// @param senders                    senders address of the white list enode.
    /// @param workStart                  When the group start to work. the day ID;
    /// @param workDuration               how many days the group will work for
    /// @param registerDuration           how many days the duration that allow transfer staking.
    /// @param crossFee                   the fee for cross transaction.
    /// @param preGroupId                 the preview group index.
    function registerStart(bytes32 id, 
        uint workStart,uint workDuration, uint registerDuration, uint crossFee, bytes32 preGroupId, bytes chain, address[] wkAddrs, address[] senders)
        public
    {
        require(wkAddrs.length == senders.length);
        require(wkAddrs.length > backupCount);

        Deposit.Records memory deposits =  Deposit.Records(0);
        Deposit.Records memory depositWeights =  Deposit.Records(0);

        StoremanGroup memory group = StoremanGroup({
            groupId:id,
            txFeeRatio:crossFee,              /// the fee ratio required by storeman group
            status:GroupStatus.initial,
            deposit:deposits,                  /// the storeman group deposit in wan coins, change when selecting
            depositWeight:depositWeights,            /// caculate this value when selecting
            unregisterApplyTime:0,      /// the time point for storeman group applied unregistration
            memberCount:0,
            whiteCount:0,
            workDay:workStart,
            totalDays:workDuration,
            chain:chain,
            config: configDefault
        });
        group.whiteCount = wkAddrs.length - backupCount;

        groups[id] = group;
        for(uint i = 0; i < wkAddrs.length; i++){
            groups[id].whiteMap[i] = wkAddrs[i];
            groups[id].whiteWk[wkAddrs[i]] = senders[i];
        }
    }

    function updateGroupConfig(bytes32 groupId, uint memberCountdesign, uint threshold) public {
        StoremanGroup storage group = groups[groupId];
        group.config.memberCountDesign = memberCountdesign;
        group.config.threshold = threshold;
    }



    event stakeInEvent(bytes32 indexed index,address indexed pkAddr, bytes enodeID);

    function stakeIn(bytes32 index, bytes PK, bytes enodeID, uint delegateFee)
        public payable
    {
        StoremanGroup storage group = groups[index];
        address pkAddr = address(keccak256(PK));
        Deposit.Records memory records = Deposit.Records(0);
        Candidate memory sk = Candidate({
            sender:msg.sender,
            enodeID:enodeID,
            PK:PK,
            pkAddress:pkAddr, // 合约计算一下.
            quited:false,
            selected:false,
            isWorking:false,
            delegateFee:delegateFee,
            delegatorCount:0,
            delegateDeposit:0,
            incentive:0,       // without delegation.. set to 0 after incentive.
            incentivedDelegator:0, // 计算了多少个delegator的奖励, == delegatorCount 表示奖励都计算完成了.
            deposits:records  
            });
        group.addrMap[group.memberCount] = pkAddr;
        group.memberCount++;

        group.candidates[pkAddr] = sk;

        uint day = getDaybyTime(now);
        if(day < groups[index].workDay) {
            day = groups[index].workDay;
        }
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        Deposit.addRecord(group.candidates[pkAddr].deposits, r);

        //check if it is white
        if(group.whiteWk[pkAddr] != address(0x00)){
            if(group.whiteWk[pkAddr] != msg.sender){
                revert("invalid sender");
            }
        } else {
            realInsert(index, pkAddr, calSkWeight(msg.value), group.config.memberCountDesign-1);
        }

        emit stakeInEvent(index, pkAddr, enodeID);
    }
    function getStaker(bytes32 index, address pkAddr) public view returns (bytes,uint,uint) {
        Candidate storage sk = groups[index].candidates[pkAddr];
        return (sk.PK, sk.delegateFee, sk.delegatorCount);
    }

    function calIncentive(uint groupIncentive, uint groupWeight, uint weight) public returns (uint) {
        return groupIncentive*weight/groupWeight;
    }
    function calSkWeight(uint deposit) public  returns(uint) {
        return deposit*15/10;
    }
    function getGroupIncentive(bytes32 groupId, uint time) public view returns (uint)  {
        StoremanGroup storage group = groups[groupId];
        //return PosLib.getMinIncentive(Deposit.getLastValue(group.deposit), time, 10000, 10000);
        return 30000000;
    }

    /*
    The logic of incentive
    1) get the incentive by day and groupID.
    If the incentive array by day haven't geted from low level, the tx will try to get it.
    so the one who first incentive will spend more gas.

    2) calculate the sk incentive all days.
    3) calculate the delegator all days one by one.
     */
    event incentive(bytes32 indexed groupId, address indexed pkAddr, bool indexed finished);
    function testIncentiveAll(bytes32 groupId, address wkAddr) public  {
        StoremanGroup storage group = groups[groupId];
        Candidate storage sk = group.candidates[wkAddr];
        uint day = 0;
        if(group.groupIncentive[group.workDay] == 0){
            for(day = group.workDay; day < group.workDay+group.totalDays; day++) {
                group.groupIncentive[day] = getGroupIncentive(groupId, day); // TODO: change to the correct time
            }
        }

        if(sk.incentivedDelegator == 0){
            for(day = group.workDay; day < group.workDay+group.totalDays; day++) {
                sk.incentive += calIncentive(group.groupIncentive[day], Deposit.getValueById(group.depositWeight,day),  calSkWeight(Deposit.getValueById(sk.deposits,day)));
            }
        }

        while(sk.incentivedDelegator != sk.delegatorCount) {
            for(day = group.workDay; day < group.workDay+group.totalDays; day++) {
                address deAddr = sk.addrMap[sk.incentivedDelegator];
                Delegator storage de = sk.delegators[deAddr];
                de.incentive += calIncentive(group.groupIncentive[day], Deposit.getValueById(group.depositWeight,day), Deposit.getValueById(de.deposits,day));
            }
            sk.incentivedDelegator++;
            if(msg.gas < 5000000 ){ // check the gas. because calculate delegator incentive need more gas left.
                emit incentive(groupId, wkAddr, false);
                return;
            }
        }

        emit incentive(groupId, wkAddr, true);

    }

    function getDaybyTime(uint time) returns (uint) {
        return time; // TODO; get the day. not minute.
    }
    function addDelegator(bytes32 groupId, address skPkAddr)
        public
        payable
    {
        uint FIX_INCENTIVE = 1;
        StoremanGroup storage  group = groups[groupId];
        Candidate storage sk =group.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "sk doesn't exist");

        uint day = getDaybyTime(now);
        if(day < group.workDay) {
            day = group.workDay;
        }
        Delegator storage dk = sk.delegators[msg.sender];
        if(dk.sender == address(0x00)) {
            sk.addrMap[sk.delegatorCount] = msg.sender;
            sk.delegatorCount++;
            dk.sender = msg.sender;
            dk.staker = skPkAddr;
        }
        sk.delegateDeposit  += msg.value;
        
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        Deposit.addRecord(dk.deposits,r);
        //如果还没选择, 不需要更新group的值, 在选择的时候一起更新.
        // 如果已经选择过了, 需要更新group的值. 
        if(group.status >= GroupStatus.selected){
            Deposit.addRecord(group.deposit,r);
            Deposit.addRecord(group.depositWeight,r);
        }

        //TODO: resort
        if(group.status < GroupStatus.selected && group.whiteWk[skPkAddr] == address(0x00)){
            uint seleIndex = group.config.memberCountDesign;
            for(uint selectedIndex = group.whiteCount; selectedIndex<group.config.memberCountDesign; selectedIndex++){
                if(group.selectedNode[selectedIndex] == skPkAddr) {
                    break;
                }
            }
            realInsert(groupId, skPkAddr, calSkWeight(Deposit.getLastValue(sk.deposits))+sk.delegateDeposit, selectedIndex);
        }
    }

    function getSelectedSmNumber(bytes32 groupId) public view returns(uint) {
        StoremanGroup storage group = groups[groupId];
        if(group.status == GroupStatus.initial || group.status == GroupStatus.failed){
            return 0;
        }
        return group.config.memberCountDesign;
    }
    function realInsert(bytes32 groupId, address addr, uint weight, uint last) internal{
        StoremanGroup storage  group = groups[groupId];
        for(uint j = last; j>=group.whiteCount; j--) {
            if(weight > group.candidates[group.selectedNode[j]].delegateDeposit + calSkWeight(Deposit.getLastValue(group.candidates[group.selectedNode[j]].deposits))){
                continue;
            }
            break;
        }
        if(j<last){
            for(uint k = last-1; k>j; k--){
                group.selectedNode[k+1] = group.selectedNode[k];
            }
            group.selectedNode[j+1] = addr;
        }
    }
    event selectedEvent(bytes32 indexed groupId, uint indexed count, address[] members);
    function toSelect(bytes32 groupId) public {
        StoremanGroup storage group = groups[groupId];
        if(group.memberCount < group.config.memberCountDesign){
            group.status = GroupStatus.failed;
            return;
        }
        // first, select the sm from white list. 
        // TODO: check all white list should stakein.
        for(uint m=0; m<group.whiteCount;m++){
            group.selectedNode[m] = group.whiteMap[m];
        }
        address[] memory members = new address[](group.config.memberCountDesign);
        uint groupDeposit = 0;
        uint groupDepositWeight = 0;
        uint day = group.workDay;
        for(uint i=0; i<group.config.memberCountDesign; i++){
            members[i] = group.selectedNode[i];
            Candidate storage sk = group.candidates[group.selectedNode[i]];
            groupDeposit += (Deposit.getLastValue(sk.deposits)+sk.delegateDeposit);
            groupDepositWeight += (calSkWeight(Deposit.getLastValue(sk.deposits))+sk.delegateDeposit);
        }
        Deposit.Record memory deposit = Deposit.Record(day, groupDeposit);
        Deposit.Record memory depositWeight = Deposit.Record(day, groupDepositWeight);
        emit selectedEvent(groupId, group.config.memberCountDesign, members);
        group.status = GroupStatus.selected;
        Deposit.addRecord(group.deposit,deposit);
        Deposit.addRecord(group.depositWeight,depositWeight);
        return;
    }
    function getSelectedSmInfo(bytes32 groupId, uint index) public view   returns(address, bytes, bytes){
        StoremanGroup storage group = groups[groupId];
        address addr = group.selectedNode[index];
        Candidate storage sk = group.candidates[addr];
        return (addr, sk.PK,sk.enodeID);
    }


    function getSmInfo(bytes32 groupId, address wkAddress) public view  returns(address sender,bytes PK, address pkAddress,
        bool quited, bool  isWorking,uint  delegateFee,uint  deposit, uint delegateDeposit,
        uint incentive, uint delegatorCount
        ){
            StoremanGroup storage group = groups[groupId];
            Candidate storage sk = group.candidates[wkAddress];

            return (sk.sender,   sk.PK, sk.pkAddress, sk.quited,
                sk.isWorking,  sk.delegateFee, Deposit.getLastValue(sk.deposits), sk.delegateDeposit,
                sk.incentive,  sk.delegatorCount
            );
    }


    function getSmDelegatorAddr(bytes32 groupId, address wkAddr, uint deIndex) public view  returns (address){
        StoremanGroup storage group = groups[groupId];
        Candidate storage sk = group.candidates[wkAddr];
        return sk.addrMap[deIndex];
    }
    function getSmDelegatorInfo(bytes32 groupId, address wkAddr, address deAddr) public view returns (uint, uint,uint) {
        StoremanGroup storage group = groups[groupId];
        Candidate storage sk = group.candidates[wkAddr];
        Delegator storage de = sk.delegators[deAddr];
        return (Deposit.getLastValue(de.deposits), de.deposits.total, de.incentive);
    }
    function getSmDelegatorInfoRecord(bytes32 groupId, address wkAddr, address deAddr, uint index) public view returns (uint, uint) {
        StoremanGroup storage group = groups[groupId];
        Candidate storage sk = group.candidates[wkAddr];
        Delegator storage de = sk.delegators[deAddr];
        return (de.deposits.records[index].id, de.deposits.records[index].value);
    }
    function setGpk(bytes32 groupId, bytes gpk) public {
        StoremanGroup storage group = groups[groupId];
        storemanGroupRegister(group.chain,groupId, gpk, group.txFeeRatio);
    }

    function setInvalidSm(bytes32 groupId, uint[] slashType,  address[] badAddrs) public returns(bool isContinue){
        return true;
    }

    function getThresholdByGrpId(bytes32 groupId) external view returns (uint){
        StoremanGroup storage group = groups[groupId];
        return group.config.threshold;
    }


    /// @notice                           function for storeman group register, this method should be
    ///                                   invoked by a storeman group registration delegate or wanchain foundation
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    /// @param txFeeRatio                 transaction fee ratio required by storeman group
    function storemanGroupRegister(bytes tokenOrigAccount, bytes32 groupId, bytes storemanGroup, uint txFeeRatio)
        //internal
        public
        //notHalted
    {
        require(tokenOrigAccount.length != 0, "Invalid tokenOrigAccount");
        require(storemanGroup.length != 0, "Invalid storemanGroup");

        require(storemanGroupMap[tokenOrigAccount][storemanGroup] == 0, "Duplicate register");

        uint8 decimals;
        uint token2WanRatio;
        uint minDeposit;
        uint defaultPrecise;
        StoremanGroup storage group = groups[groupId];

        (,,decimals,,token2WanRatio,minDeposit,,defaultPrecise) = tokenManager.getTokenInfo(tokenOrigAccount);
        require(minDeposit > 0, "Token doesn't exist");
        //require(msg.value >= minDeposit, "At lease minDeposit");
        //require(group.deposit >= minDeposit, "At lease minDeposit");
        require(txFeeRatio < defaultPrecise, "Invalid txFeeRatio");


        //uint quota = (msg.value).mul(defaultPrecise).div(token2WanRatio).mul(10**uint(decimals)).div(1 ether);
        uint quota = Deposit.getLastValue(group.deposit);
        htlc.addStoremanGroup(tokenOrigAccount, storemanGroup, quota, txFeeRatio);
        storemanGroupMap[tokenOrigAccount][storemanGroup] = groupId;

        emit StoremanGroupRegistrationLogger(tokenOrigAccount, groupId,  storemanGroup, 0, quota, txFeeRatio);
    }

    /// @notice                           function for storeman group apply unregistration through the delegate
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    function storemanGroupUnregister(bytes tokenOrigAccount, bytes storemanGroup)
        external
        notHalted
    {
        bytes32 groupId = storemanGroupMap[tokenOrigAccount][storemanGroup];
        StoremanGroup storage smg = groups[groupId];
        //require(msg.sender == smg.delegate, "Sender must be delegate");
        require(smg.unregisterApplyTime == 0, "Duplicate unregister");
        smg.unregisterApplyTime = now;
        //htlc.deactivateStoremanGroup(tokenOrigAccount, storemanGroup);

        emit StoremanGroupApplyUnRegistrationLogger(tokenOrigAccount, storemanGroup, now);
    }

    /// @notice                           function for storeman group withdraw deposit through the delegate
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    function storemanGroupWithdrawDeposit(bytes tokenOrigAccount, bytes storemanGroup)
        external
        notHalted
    {
        bytes32 groupId = storemanGroupMap[tokenOrigAccount][storemanGroup];
        StoremanGroup storage smg = groups[groupId];
        //require(msg.sender == smg.delegate, "Sender must be delegate");
        uint withdrawDelayTime;
        (,,,,,,withdrawDelayTime,) = tokenManager.getTokenInfo(tokenOrigAccount);
        require(now > smg.unregisterApplyTime.add(withdrawDelayTime), "Must wait until delay time");
        //htlc.delStoremanGroup(tokenOrigAccount, storemanGroup);
        //smg.delegate.transfer(smg.deposit);

        //emit StoremanGroupWithdrawLogger(tokenOrigAccount, storemanGroup, smg.deposit, smg.deposit);

        delete storemanGroupMap[tokenOrigAccount][storemanGroup];
    }

    /// @notice                           function for storeman group append deposit through the delegate
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    function storemanGroupAppendDeposit(bytes tokenOrigAccount, bytes storemanGroup)
        external
        payable
        notHalted
    {
        require(msg.value > 0, "Value too small");
        bytes32 groupId = storemanGroupMap[tokenOrigAccount][storemanGroup];
        StoremanGroup storage smg = groups[groupId];        
        //require(msg.sender == smg.delegate, "Sender must be delegate");
        require(smg.unregisterApplyTime == 0, "Inactive");

        uint8 decimals;
        uint token2WanRatio;
        uint defaultPrecise;
        (,,decimals,,token2WanRatio,,,defaultPrecise) = tokenManager.getTokenInfo(tokenOrigAccount);
        // uint deposit = smg.deposit.add(msg.value);
        // uint quota = deposit.mul(defaultPrecise).div(token2WanRatio).mul(10**uint(decimals)).div(1 ether);
        //htlc.updateStoremanGroup(tokenOrigAccount, storemanGroup, quota);
        // TODO: notify bonus contract
        // smg.deposit = deposit;
        // emit StoremanGroupUpdateLogger(tokenOrigAccount, storemanGroup, deposit, quota, smg.txFeeRatio);
    }

    /// @notice                           function for getting storeman group information
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    function getStoremanGroupInfo(bytes tokenOrigAccount, bytes storemanGroup)
        external
        view
        returns(address, uint, uint, uint)
    {
        bytes32 groupId = storemanGroupMap[tokenOrigAccount][storemanGroup];
        StoremanGroup storage smg = groups[groupId];        
        return (address(0x00), Deposit.getLastValue(smg.deposit), smg.txFeeRatio, smg.unregisterApplyTime);
    }
    function getGroupInfo(bytes32 id)
        external
        view
        returns(bytes32 groupId, GroupStatus status, uint deposit,  uint depositWeight, uint memberCount,bytes chain,uint workDay)
    {
        StoremanGroup storage smg = groups[id];       
        return (smg.groupId, smg.status, Deposit.getLastValue(smg.deposit), Deposit.getLastValue(smg.depositWeight),smg.memberCount, smg.chain, smg.workDay);
    }
    function checkGroupIncentive(bytes32 id, uint day) public view returns ( uint) {
        StoremanGroup storage group = groups[id];       
        return group.groupIncentive[day];
    }
    /// @notice fallback function
    function () public payable {
        revert("Not support");
    }

    function contribute() public payable {
        return;
    }

}
