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
    event StoremanGroupRegistrationLogger(bytes tokenOrigAccount, bytes storemanGroup, uint wanDeposit, uint quota, uint txFeeRatio);

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
    /// @param groupId                    the building storeman group index.
    /// @param chain                      the chain that the group will work for.
    /// @param wkAddrs                    white list work address.
    /// @param senders                    senders address of the white list enode.
    /// @param minStake                   minimum value when join the group.
    /// @param memberCountDesign          designed member count in this group. normally it is 21.
    /// @param workStart                  When the group start to work.
    /// @param workDuration               how many days the group will work for
    /// @param registerDuration           how many days the duration that allow transfer staking.
    /// @param crossFee                   the fee for cross transaction.
    /// @param preGroupId                 the preview group index.
    function registerStart(bytes32 groupId, uint minStake, uint memberCountDesign,
        uint workStart,uint workDuration, uint registerDuration, uint crossFee, bytes32 preGroupId, bytes chain, address[] wkAddrs, address[] senders)
        public
    { 
        require(wkAddrs.length == senders.length);
        require(wkAddrs.length > backupCount);
        StoremanGroup memory group = StoremanGroup(groupId,crossFee,memberCountDesign,GroupStatus.initial,0,0,0,0,0,chain);
        group.whiteCount = wkAddrs.length - backupCount;

        groups[groupId] = group;
        for(uint i = 0; i < wkAddrs.length; i++){
            groups[groupId].whiteMap[i] = wkAddrs[i];
            groups[groupId].whiteWk[wkAddrs[i]] = senders[i];
        }
    }




    event stakeInEvent(bytes32 indexed index,address indexed pkAddr, bytes enodeID);

    function stakeIn(bytes32 index, bytes PK, bytes enodeID, uint delegateFee)
        public payable
    {
        StoremanGroup group = groups[index];
        address pkAddr = address(keccak256(PK));
        Candidate memory sk = Candidate(msg.sender, enodeID, PK,pkAddr,false,false,false,delegateFee,msg.value,calSkWeight(msg.value),0,0);
        group.addrMap[group.memberCount] = pkAddr;
        group.memberCount++;

        group.candidates[pkAddr] = sk;

        //check if it is white
        if(group.whiteWk[pkAddr] != address(0x00)){
            if(group.whiteWk[pkAddr] != msg.sender){
                revert();
            }
        }
        emit stakeInEvent(index, pkAddr, enodeID);
    }
    function getStaker(bytes32 index, address pkAddr) public view returns (bytes,uint,uint) {
        Candidate sk = groups[index].candidates[pkAddr];
        return (sk.PK, sk.delegateFee, sk.delegatorCount);
    }

    function calIncentive(uint p, uint deposit, bool isDelegator) public returns (uint) {
        return deposit*p/10000;
    }
    function calSkWeight(uint deposit) public  returns(uint) {
        return deposit*15/10;
    }
    event incentive(bytes32 indexed index, address indexed to, uint indexed delegatorCount);
    function testIncentiveAll(bytes32 index) public  {
        StoremanGroup group = groups[index];
        for(uint i = 0; i<group.memberCountDesign; i++) { //todo change to working.
            address skAddr = group.selectedNode[i];
            Candidate sk = group.candidates[skAddr];
            sk.incentive += calIncentive(1000, sk.deposit,false);
            emit incentive(index, sk.sender, sk.delegatorCount);

            for(uint j = 0; j < sk.delegatorCount; j++){
                address deAddr = sk.addrMap[j];
                Delegator de = sk.delegators[deAddr];
                de.incentive += calIncentive(1000, de.deposit, true);
            }
        }
    }
    function addDelegator(bytes32 index, address skPkAddr)
        public
        payable
    {
        Delegator memory dk = Delegator(msg.sender,skPkAddr,false,msg.value,1);
        Candidate sk = groups[index].candidates[skPkAddr];
        sk.addrMap[sk.delegatorCount] = msg.sender;
        sk.delegatorCount++;
        sk.depositWeight += msg.value;
        sk.delegators[msg.sender] = dk;
    }

    function getSelectedSmNumber(bytes32 groupId) public view returns(uint) {
        StoremanGroup group = groups[groupId];
        if(group.status == GroupStatus.initial ||  group.status == GroupStatus.failed){
            return 0;
        }
        return group.memberCountDesign;
    }
    function toSelect(bytes32 groupId) public {
        StoremanGroup group = groups[groupId];
        if(group.memberCount < group.memberCountDesign){
            group.status = GroupStatus.failed;
            return;
        }
        // first, select the sm from white list. 
        // TODO: check all white list should stakein.
        for(uint m=0; m<group.whiteCount;m++){
            group.selectedNode[m] = group.whiteMap[m];
        }

        for(uint i = 0; i<group.memberCount; i++){
            uint j;
            for(j = group.memberCountDesign-1; j>group.whiteCount; j--) {
                if(group.candidates[group.addrMap[i]].depositWeight > group.candidates[group.addrMap[j]].depositWeight){
                    continue;
                }
            }
            if(j<group.memberCountDesign-1){
                for(uint k = group.memberCountDesign-2; k>=j; k--){
                    group.selectedNode[k+1] = group.selectedNode[k];
                }
                group.selectedNode[j] = group.addrMap[i];
            }
        }
        group.status = GroupStatus.selected;
        return;
    }
    function getSelectedSmAddress(bytes32 groupId, uint index) public view   returns(address, bytes){
        StoremanGroup group = groups[groupId];
        address addr = group.selectedNode[index];
        Candidate sk = group.candidates[addr];
        return (addr, sk.PK);
    }


    function getSmInfo(bytes32 groupId, address wkAddress) public view  returns(address sender,bytes PK,
        bool quited, bool  isWorking,uint  delegateFee,uint  deposit,uint  depositWeight,
        uint incentive, uint delegatorCount
        ){
            StoremanGroup group = groups[groupId];
            Candidate sk = group.candidates[wkAddress];

            return (sk.sender,   sk.PK, sk.quited,
                sk.isWorking,  sk.delegateFee, sk.deposit,
                sk.depositWeight, sk.incentive,  sk.delegatorCount
            );
    }
    function setGpk(bytes32 groupId, bytes gpk) public {
    }
    function testArray(uint[] types, address[] addrs) public {
        for(uint i = 0; i<types.length; i++) {
            badAddrs.push(addrs[i]);
            badTypes.push(types[i]);
        }
    }
    function setInvalidSm(bytes32 groupId, uint[] slashType,  address[] badAddrs) public returns(bool isContinue){
        return true;
    }


    /// @notice                           function for storeman group register, this method should be
    ///                                   invoked by a storeman group registration delegate or wanchain foundation
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    /// @param txFeeRatio                 transaction fee ratio required by storeman group
    function storemanGroupRegister(bytes tokenOrigAccount, bytes storemanGroup, uint txFeeRatio)
        external
        payable
        notHalted
    {
        require(tokenOrigAccount.length != 0, "Invalid tokenOrigAccount");
        require(storemanGroup.length != 0, "Invalid storemanGroup");
        require(storemanGroupMap[tokenOrigAccount][storemanGroup].deposit == 0, "Duplicate register");

        uint8 decimals;
        uint token2WanRatio;
        uint minDeposit;
        uint defaultPrecise;
        (,,decimals,,token2WanRatio,minDeposit,,defaultPrecise) = tokenManager.getTokenInfo(tokenOrigAccount);
        require(minDeposit > 0, "Token doesn't exist");
        require(msg.value >= minDeposit, "At lease minDeposit");
        require(txFeeRatio < defaultPrecise, "Invalid txFeeRatio");
        // if (isWhiteListEnabled) {
        //     require(whiteListMap[tokenOrigAccount][storemanGroup], "Not in white list");
        //     delete whiteListMap[tokenOrigAccount][storemanGroup];
        // }

        uint quota = (msg.value).mul(defaultPrecise).div(token2WanRatio).mul(10**uint(decimals)).div(1 ether);
        htlc.addStoremanGroup(tokenOrigAccount, storemanGroup, quota, txFeeRatio);
        //storemanGroupMap[tokenOrigAccount][storemanGroup] = StoremanGroup(msg.sender, msg.value, txFeeRatio, 0);

        emit StoremanGroupRegistrationLogger(tokenOrigAccount, storemanGroup, msg.value, quota, txFeeRatio);
    }

    /// @notice                           function for storeman group apply unregistration through the delegate
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    function storemanGroupUnregister(bytes tokenOrigAccount, bytes storemanGroup)
        external
        notHalted
    {
        StoremanGroup storage smg = storemanGroupMap[tokenOrigAccount][storemanGroup];
        //require(msg.sender == smg.delegate, "Sender must be delegate");
        require(smg.unregisterApplyTime == 0, "Duplicate unregister");
        smg.unregisterApplyTime = now;
        htlc.deactivateStoremanGroup(tokenOrigAccount, storemanGroup);

        emit StoremanGroupApplyUnRegistrationLogger(tokenOrigAccount, storemanGroup, now);
    }

    /// @notice                           function for storeman group withdraw deposit through the delegate
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    function storemanGroupWithdrawDeposit(bytes tokenOrigAccount, bytes storemanGroup)
        external
        notHalted
    {
        StoremanGroup storage smg = storemanGroupMap[tokenOrigAccount][storemanGroup];
        //require(msg.sender == smg.delegate, "Sender must be delegate");
        uint withdrawDelayTime;
        (,,,,,,withdrawDelayTime,) = tokenManager.getTokenInfo(tokenOrigAccount);
        require(now > smg.unregisterApplyTime.add(withdrawDelayTime), "Must wait until delay time");
        htlc.delStoremanGroup(tokenOrigAccount, storemanGroup);
        //smg.delegate.transfer(smg.deposit);

        emit StoremanGroupWithdrawLogger(tokenOrigAccount, storemanGroup, smg.deposit, smg.deposit);

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
        StoremanGroup storage smg = storemanGroupMap[tokenOrigAccount][storemanGroup];
        //require(msg.sender == smg.delegate, "Sender must be delegate");
        require(smg.unregisterApplyTime == 0, "Inactive");

        uint8 decimals;
        uint token2WanRatio;
        uint defaultPrecise;
        (,,decimals,,token2WanRatio,,,defaultPrecise) = tokenManager.getTokenInfo(tokenOrigAccount);
        uint deposit = smg.deposit.add(msg.value);
        uint quota = deposit.mul(defaultPrecise).div(token2WanRatio).mul(10**uint(decimals)).div(1 ether);
        htlc.updateStoremanGroup(tokenOrigAccount, storemanGroup, quota);
        // TODO: notify bonus contract
        smg.deposit = deposit;
        emit StoremanGroupUpdateLogger(tokenOrigAccount, storemanGroup, deposit, quota, smg.txFeeRatio);
    }

    /// @notice                           function for getting storeman group information
    /// @param tokenOrigAccount           token account of original chain
    /// @param storemanGroup              storeman group PK
    function getStoremanGroupInfo(bytes tokenOrigAccount, bytes storemanGroup)
        external
        view
        returns(address, uint, uint, uint)
    {
        StoremanGroup storage smg = storemanGroupMap[tokenOrigAccount][storemanGroup];
        return (address(0x00), smg.deposit, smg.txFeeRatio, smg.unregisterApplyTime);
    }

    /// @notice fallback function
    function () public payable {
        revert("Not support");
    }

    function contribute() public payable {
        return;
    }

}