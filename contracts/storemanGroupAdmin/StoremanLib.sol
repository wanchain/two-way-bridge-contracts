// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./StoremanType.sol";
import "./StoremanUtil.sol";
import "../interfaces/IListGroup.sol";


library StoremanLib {
    using Deposit for Deposit.Records;
    using SafeMath for uint;

    uint constant MaxPartnerCount = 5;
    event stakeInEvent(bytes32 indexed groupId,address indexed wkAddr, address indexed from, uint  value);
    event stakeAppendEvent(address indexed wkAddr, address indexed from, uint indexed value);
    event stakeOutEvent(address indexed wkAddr, address indexed from);
    event stakeOutRevertEvent(address indexed wkAddr, address indexed from);
    event stakeClaimEvent(address indexed wkAddr, address indexed from,bytes32 indexed groupId, uint value);
    event stakeIncentiveClaimEvent(address indexed wkAddr,address indexed sender,uint indexed amount);
    event stakeIncentiveCrossFeeEvent(address indexed wkAddr,address indexed sender,uint indexed amount);

    event storemanTransferEvent(bytes32 indexed groupId, bytes32 indexed preGroupId, address[] wkAddrs);
    event StoremanGroupUnregisterEvent(bytes32 indexed groupId);
    event delegateInEvent(address indexed wkAddr, address indexed from, uint indexed value);
    event delegateOutEvent(address indexed wkAddr, address indexed from);
    event delegateClaimEvent(address indexed wkAddr, address indexed from, uint256 indexed amount);
    event delegateIncentiveClaimEvent(address indexed wkAddr,address indexed sender,uint indexed amount);
    event partInEvent(address indexed wkAddr, address indexed from, uint indexed value);
    event partOutEvent(address indexed wkAddr, address indexed from);
    event partClaimEvent(address indexed wkAddr, address indexed from, uint256 indexed amount);

    function storemanGroupUnregister(StoremanType.StoremanData storage data,bytes32 groupId)
        external
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(block.timestamp > group.workTime + group.totalTime, "not expired");
        require(group.status == StoremanType.GroupStatus.ready,"Invalid status");
        group.status = StoremanType.GroupStatus.unregistered;
        emit StoremanGroupUnregisterEvent(groupId);
    }

    function deleteStoremanNode(StoremanType.StoremanData storage data, address wkAddr) private {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        if(sk.deposit.getLastValue() == 0  && sk.delegatorCount == 0 && sk.partnerCount == 0) {
            delete data.candidates[0][wkAddr];
        }
    }

    function stakeIn(StoremanType.StoremanData storage data, bytes32 groupId, bytes memory PK, bytes memory enodeID) external
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(group.status == StoremanType.GroupStatus.curveSeted,"invalid group");
        require(block.timestamp <= group.registerTime+group.registerDuration,"Registration closed");
        require(msg.value >= group.minStakeIn, "Too small value in stake");
        require(StoremanUtil.onCurve(PK), "invalid PK");
        require(StoremanUtil.onCurve(enodeID), "invalid enodeID");
        address wkAddr = address(uint160(uint256(keccak256(PK))));
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        if(sk.sender != address(0x00)){
            deleteStoremanNode(data, wkAddr);
            sk = data.candidates[0][wkAddr];
        }
        require(sk.sender == address(0x00), "Candidate has existed");
        sk.sender = msg.sender;
        sk.enodeID = enodeID;
        sk.PK = PK;
        sk.wkAddr = wkAddr;
        sk.groupId = groupId;
        sk.deposit.addRecord(Deposit.Record(StoremanUtil.getDaybyTime(data.posLib, block.timestamp), msg.value));

        // only not whitelist address need add memberCount;
        if(!isWorkingNodeInGroup(group, wkAddr)) {
            group.skMap[group.memberCount] = sk.wkAddr;
            group.memberCount++;
        }

        // check if it is white
        if(group.whiteWk[wkAddr] != address(0x00)){
            if(group.whiteWk[wkAddr] != msg.sender){
                revert("invalid sender");
            }
            sk.isWhite = true;

            
            // check if it is a backup whitelist, if yes, change it's groupId to 0.
            for(uint i=group.whiteCount; i<group.whiteCountAll; i++) {
                if(group.whiteMap[i] == wkAddr){
                    sk.groupId = bytes32(0x00);
                    break;
                }
            }
        } else {
            realInsert(data,group, wkAddr, StoremanUtil.calSkWeight(data.conf.standaloneWeight, msg.value));
        }

        emit stakeInEvent(groupId, wkAddr, msg.sender, msg.value);
    }

    function stakeAppend(StoremanType.StoremanData storage data,  address wkAddr) external  {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        require(sk.sender == msg.sender, "Only the sender can stakeAppend");
        uint amount = sk.deposit.getLastValue();
        require(amount != 0, "Claimed");
        
        uint day = StoremanUtil.getDaybyTime(data.posLib, block.timestamp);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        Deposit.Record memory rw = Deposit.Record(day, StoremanUtil.calSkWeight(data.conf.standaloneWeight, msg.value));
        sk.deposit.addRecord(r);
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        updateGroup(data, sk, group, r, rw);
        updateGroup(data, sk, nextGroup, r, rw);
        emit stakeAppendEvent(wkAddr, msg.sender,msg.value);
    }

    function checkCanStakeOut(StoremanType.StoremanData storage data,  address wkAddr) public view returns(bool){
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        // if a group haven't selected, can't quit.
        // if the sk joined in the next group, and the next group haven't selected, cannot quit. 
        //else change the flag quited==true
        if(group.status < StoremanType.GroupStatus.selected) {
            return false;
        }
        if(nextGroup.status != StoremanType.GroupStatus.none) {
            if(nextGroup.status < StoremanType.GroupStatus.selected){
                return false;
            }
        }
        return true;
    }
    function stakeOut(StoremanType.StoremanData storage data,  address wkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.sender == msg.sender, "Only the sender can stakeOut");
        require(checkCanStakeOut(data, wkAddr),"selecting");
        sk.quited = true;
        emit stakeOutEvent(wkAddr, msg.sender);
    }
    function stakeOutRevert(StoremanType.StoremanData storage data,  address wkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.sender == msg.sender, "Only the sender can stakeOutRevert");
        sk.quited = false;
        emit stakeOutRevertEvent(wkAddr, msg.sender);
    }
    function isWorkingNodeInGroup(StoremanType.StoremanGroup storage group, address wkAddr) public  view returns (bool) {
        uint count = group.selectedCount;
        for(uint8 i = 0; i < count; i++) {
            if(wkAddr == group.selectedNode[i]) {
                return true;
            }
        }
        return false;
    }

    function checkCanStakeClaimFromGroup(address posLib, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group) private view returns (bool) {
        // if group haven't selected, can't claim 
        // if group failed, can claim. 
        // if group selected and the sk haven't been selected, can claim.
        // if group selected and the sk was selected, then, must 1, group is dismissed. 2. incentived.
        if(group.status == StoremanType.GroupStatus.none) {
            return true; // group does not exist.
        }
        if(group.status == StoremanType.GroupStatus.failed) {
            return true; // group failed
        }
        if(group.status < StoremanType.GroupStatus.selected) {
            return false;
        }
        if(!isWorkingNodeInGroup(group, sk.wkAddr)){
            return true;
        } else {
            if(group.status == StoremanType.GroupStatus.dismissed
            && sk.incentivedDay+1 >= StoremanUtil.getDaybyTime(posLib, group.workTime+group.totalTime) ) {
                return true;
            }
        }
        return false;
    }
    function checkCanStakeClaim(StoremanType.StoremanData storage data, address wkAddr) public view returns(bool) {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        if(sk.wkAddr != wkAddr){ // sk doesn't exist.
            return false;
        }
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        if(checkCanStakeClaimFromGroup(data.posLib, sk, group) && checkCanStakeClaimFromGroup(data.posLib, sk, nextGroup)){
            return true;
        } else {
            return false;
        }
    }

    function stakeClaim(StoremanType.StoremanData storage data, address wkAddr) external {
        require(checkCanStakeClaim(data,wkAddr),"Cannot claim");
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        uint amount = sk.deposit.getLastValue();
        require(amount != 0, "Claimed");
        sk.deposit.clean();

        // slash the node
        if(sk.slashedCount >= data.conf.maxSlashedCount) {
            amount = 0;
        } else {
            amount = amount.mul(data.conf.maxSlashedCount.sub(sk.slashedCount)).div(data.conf.maxSlashedCount);
        }
        emit stakeClaimEvent(wkAddr, sk.sender, sk.groupId, amount);

        // the cross chain fee
        emit stakeIncentiveCrossFeeEvent(wkAddr, sk.sender, sk.crossIncoming);
        amount = amount.add(sk.crossIncoming);
        sk.crossIncoming = 0;

        // the incentive
        emit stakeIncentiveClaimEvent(wkAddr,sk.sender,sk.incentive[0]);
        amount = amount.add(sk.incentive[0]);
        sk.incentive[0] = 0;
        sk.quited = true;

        if(amount != 0){
            payable(sk.sender).transfer(amount);
        }
    }

    function stakeIncentiveClaim(StoremanType.StoremanData storage data, address wkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");

        uint amount = sk.incentive[0];
        sk.incentive[0] = 0;

        if(amount != 0){
            payable(sk.sender).transfer(amount);
        }
        emit stakeIncentiveClaimEvent(wkAddr,sk.sender,amount);
    }

    function realInsert(StoremanType.StoremanData storage data, StoremanType.StoremanGroup storage  group, address skAddr, uint weight) internal{
        uint i = group.whiteCount;
        for (; i < group.selectedCount; i++) {
            StoremanType.Candidate storage cmpNode = data.candidates[0][group.selectedNode[i]];
            if (cmpNode.wkAddr == skAddr) { // keep self position, do not sort
                return;
            }
            uint cmpWeight = StoremanUtil.calSkWeight(data.conf.standaloneWeight, cmpNode.deposit.getLastValue().add(cmpNode.partnerDeposit)).add(cmpNode.delegateDeposit);
            if (weight > cmpWeight) {
                break;
            }
        }
        if (i < group.memberCountDesign) {
            address curAddr = group.selectedNode[i]; // must not be skAddr
            uint j = i;
            for (; j < group.selectedCount; j++) {
                if (j + 1 < group.memberCountDesign) {
                    address nextAddr = group.selectedNode[j + 1];
                    group.selectedNode[j + 1] = curAddr;
                    if (nextAddr != skAddr) {
                        curAddr = nextAddr;
                    } else {
                        break;
                    }
                }
            }
            // insert or move to place i
            group.selectedNode[i] = skAddr;
            if ((group.selectedCount < group.memberCountDesign) && (j == group.selectedCount)) {
                group.selectedCount++;
            }
        }
    }

    function updateGroup(StoremanType.StoremanData storage data,StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage  group, Deposit.Record memory r, Deposit.Record memory rw) internal {
        //if haven't selected, need not update group. 
        // if selected, need to update group. 
        if(group.status == StoremanType.GroupStatus.none){ // not exist group.
            return;
        }

        if(group.status == StoremanType.GroupStatus.curveSeted) {
            if(group.whiteWk[sk.wkAddr] == address(0x00)){
                realInsert(data, group, sk.wkAddr, StoremanUtil.calSkWeight(data.conf.standaloneWeight, sk.deposit.getLastValue().add(sk.partnerDeposit)).add(sk.delegateDeposit));
            }            
        } else {
            if(isWorkingNodeInGroup(group, sk.wkAddr)){
                group.deposit.addRecord(r);
                group.depositWeight.addRecord(rw);
            }
        }
    }
    function delegateIn(StoremanType.StoremanData storage data, address wkAddr)
        external
    {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        require(msg.value >= group.minDelegateIn, "Too small value");

        require(sk.delegateDeposit.add(msg.value) <= (sk.deposit.getLastValue().add(sk.partnerDeposit)).mul(data.conf.DelegationMulti), "Too many delegation");

        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        require(dk.quited == false, "Quited");
        if(dk.deposit.getLastValue() == 0) {
            sk.delegatorMap[sk.delegatorCount] = msg.sender;
            dk.index = sk.delegatorCount;
            sk.delegatorCount = sk.delegatorCount.add(1);
        }
        sk.delegateDeposit = sk.delegateDeposit.add(msg.value);
        uint day = StoremanUtil.getDaybyTime(data.posLib, block.timestamp);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        dk.deposit.addRecord(r);
        updateGroup(data, sk, group, r, r);
        updateGroup(data, sk, nextGroup, r, r);
        emit delegateInEvent(wkAddr, msg.sender,msg.value);
    }

    // must specify all the whitelist.
    function inheritNode(StoremanType.StoremanData storage data, bytes32 groupId, bytes32 preGroupId, address[] memory wkAddrs, address[] memory senders) public
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        uint len = 0;
        if(preGroupId != bytes32(0x00)) {
            StoremanType.StoremanGroup storage oldGroup = data.groups[preGroupId];
            len = oldGroup.memberCountDesign * 2;
        }else {
            len = wkAddrs.length;
        }
        address[] memory oldAddr =  new address[](len);
        uint oldCount = 0;
        uint k = 0;

        group.whiteCount = wkAddrs.length.sub(data.conf.backupCount);
        group.whiteCountAll = wkAddrs.length;
        for(k = 0; k < wkAddrs.length; k++){
            group.whiteMap[k] = wkAddrs[k];
            group.whiteWk[wkAddrs[k]] = senders[k];
            StoremanType.Candidate storage skw = data.candidates[0][wkAddrs[k]];
            if(skw.wkAddr != address(0x00)){ // this node has exist
                if(preGroupId != bytes32(0x00)) {
                    require(skw.groupId == bytes32(0x00) || skw.groupId == preGroupId, "Invalid whitelist");
                }
                require(!skw.quited, "Invalid node");
                oldAddr[oldCount] = wkAddrs[k];
                oldCount++;
            }
            if(k < group.whiteCount) {
                group.selectedNode[k] = wkAddrs[k];
                if(skw.groupId==bytes32(0x00)){
                    skw.groupId = groupId;
                } else {
                    skw.nextGroupId = groupId;
                }
            }
        }
        group.selectedCount = group.whiteCount;
        group.memberCount = group.selectedCount;

        if (preGroupId != bytes32(0x00)) {
            oldCount = inheritStaker(data, groupId, preGroupId, oldAddr, oldCount);
        }
        address[] memory oldArray = new address[](oldCount);
        for (k = 0; k < oldCount; k++) {
            oldArray[k] = oldAddr[k];
        }
        emit storemanTransferEvent(groupId, preGroupId, oldArray);
    }

    function inheritStaker(StoremanType.StoremanData storage data, bytes32 groupId, bytes32 preGroupId, address[] memory oldAddr, uint oldCount) public returns(uint) {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        StoremanType.StoremanGroup storage oldGroup = data.groups[preGroupId];
        uint[] memory stakes = new uint[](oldGroup.memberCountDesign * 2);
        uint k;

        for (k = oldGroup.whiteCount; k < oldGroup.memberCountDesign; k++) {
            address wkAddr = oldGroup.selectedNode[k];
            StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
            if (sk.groupId == preGroupId && !sk.quited && sk.slashedCount == 0 && !sk.isWhite) {
                if (oldGroup.status == StoremanType.GroupStatus.failed){
                    sk.groupId = groupId;
                } else {
                    sk.nextGroupId = groupId;
                }
                group.memberCount++;
                oldAddr[oldCount] = sk.wkAddr;
                stakes[oldCount] = StoremanUtil.calSkWeight(data.conf.standaloneWeight, sk.deposit.getLastValue().add(sk.partnerDeposit)).add(sk.delegateDeposit);
                oldCount++;
            }
        }
        inheritSortedStaker(group, oldAddr, stakes, oldCount.sub(group.memberCount.sub(group.whiteCount)), oldCount);
        return oldCount;
    }

    function inheritSortedStaker(StoremanType.StoremanGroup storage group, address[] memory addresses, uint[] memory stakes, uint start, uint end) public {
      while ((group.selectedCount < group.memberCount) && (group.selectedCount < group.memberCountDesign)) {
        uint maxIndex = start;
        for (uint i = (start + 1); i < end; i++) {
          if (stakes[i] > stakes[maxIndex]) {
            maxIndex = i;
          }
        }
        group.selectedNode[group.selectedCount] = addresses[maxIndex];
        group.selectedCount++;
        if (maxIndex == start) {
          start += 1;
        } else {
          stakes[maxIndex] = 0;
        }
      }
    }

    function delegateOut(StoremanType.StoremanData storage data, address wkAddr, address listGroupAddr) external {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        require(checkCanStakeOut(data, wkAddr),"selecting");

        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        require(dk.quited == false,"Quited");
        require(dk.deposit.getLastValue() != 0, "no deposit");
        dk.quited = true;

        uint amount = dk.deposit.getLastValue();
        sk.delegateDeposit = sk.delegateDeposit.sub(amount);
        IListGroup(listGroupAddr).setDelegateQuitGroupId(wkAddr, msg.sender, sk.groupId, sk.nextGroupId);
        emit delegateOutEvent(wkAddr, msg.sender);
    }

    function delegateClaim(StoremanType.StoremanData storage data, address wkAddr, address listGroupAddr) external {
        require(checkCanDelegatorClaim(data, wkAddr, msg.sender, listGroupAddr),"Cannot claim");

        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        uint amount = dk.deposit.getLastValue();
        require(amount != 0,"not exist");
        dk.deposit.clean();
        emit delegateClaimEvent(wkAddr, msg.sender, amount);
        if(!dk.quited) {
            sk.delegateDeposit = sk.delegateDeposit.sub(amount);
        }
        address lastDkAddr = sk.delegatorMap[sk.delegatorCount.sub(1)];
        StoremanType.Delegator storage lastDk = sk.delegators[lastDkAddr];
        sk.delegatorMap[dk.index] = lastDkAddr;
        lastDk.index = dk.index;

        emit delegateIncentiveClaimEvent(wkAddr,msg.sender,dk.incentive[0]);
        amount = amount.add(dk.incentive[0]);
        dk.incentive[0] = 0;

        sk.delegatorCount = sk.delegatorCount.sub(1);
        delete sk.delegatorMap[sk.delegatorCount];
        delete sk.delegators[msg.sender];    
        IListGroup(listGroupAddr).setDelegateQuitGroupId(wkAddr, msg.sender, bytes32(0x00), bytes32(0x00));   
        payable(msg.sender).transfer(amount);
    }
    

    function delegateIncentiveClaim(StoremanType.StoremanData storage data, address wkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        require(dk.deposit.getLastValue() != 0, "not exist");
        uint amount = dk.incentive[0];
        dk.incentive[0] = 0;

        if(amount!=0){
            payable(msg.sender).transfer(amount);
        }
        emit delegateIncentiveClaimEvent(wkAddr,msg.sender,amount);
    }


    function partIn(StoremanType.StoremanData storage data, address wkAddr)
        external
    {
        uint maxPartnerCount = 5;
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        //require(msg.value >= group.minPartIn, "Too small value");

        StoremanType.Delegator storage pn = sk.partners[msg.sender];
        require(pn.quited == false, "Quited");
        if(pn.deposit.getLastValue() == 0) {

            require(msg.value >= group.minPartIn, "Too small value");

            require(sk.partnerCount<maxPartnerCount,"Too many partners");
            sk.partMap[sk.partnerCount] = msg.sender;
            pn.index = sk.partnerCount;
            sk.partnerCount++;
        }
        sk.partnerDeposit = sk.partnerDeposit.add(msg.value);
        uint day = StoremanUtil.getDaybyTime(data.posLib, block.timestamp);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        Deposit.Record memory rw = Deposit.Record(day, StoremanUtil.calSkWeight(data.conf.standaloneWeight, msg.value));
        pn.deposit.addRecord(r);
        updateGroup(data, sk, group, r, rw);
        updateGroup(data, sk, nextGroup, r, rw);
        emit partInEvent(wkAddr, msg.sender, msg.value);
    }

    function partOut(StoremanType.StoremanData storage data, address wkAddr, address listGroupAddr) external {
        require(checkCanStakeOut(data, wkAddr),"selecting");

        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage pn = sk.partners[msg.sender];
        require(pn.quited == false,"Quited");   
        require(pn.deposit.getLastValue() != 0, "Partner doesn't exist");
        pn.quited = true;
        uint amount = pn.deposit.getLastValue();
        sk.partnerDeposit = sk.partnerDeposit.sub(amount);
        IListGroup(listGroupAddr).setPartQuitGroupId(wkAddr, msg.sender, sk.groupId, sk.nextGroupId);
        emit partOutEvent(wkAddr, msg.sender);
    }
    function checkGroupTerminated(StoremanType.StoremanData storage data, bytes32 groupId) public view returns(bool){
        if(groupId == bytes32(0x00)) {
            return true;
        }
        StoremanType.StoremanGroup storage  group = data.groups[groupId];
        if(group.status == StoremanType.GroupStatus.none || group.status == StoremanType.GroupStatus.failed || group.status == StoremanType.GroupStatus.dismissed){
            return true;
        }
        return false;
    }
    function checkCanPartnerClaim(StoremanType.StoremanData storage data, address wkAddr, address pnAddr, address listGroupAddr) public view returns(bool) {
        if(checkCanStakeClaim(data,wkAddr)){
            return true;
        }
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage pn = sk.partners[pnAddr];
        bytes32 quitGroupId;
        bytes32 quitNextGroupId;
        (quitGroupId,quitNextGroupId) = IListGroup(listGroupAddr).getPartQuitGroupId(wkAddr, pnAddr);
        if(pn.quited && checkGroupTerminated(data, quitGroupId) && checkGroupTerminated(data, quitNextGroupId)){
            return true;
        }
        return false;
    }
    function checkCanDelegatorClaim(StoremanType.StoremanData storage data, address wkAddr, address deAddr, address listGroupAddr) public view returns(bool) {
        if(checkCanStakeClaim(data,wkAddr)){
            return true;
        }
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage de = sk.delegators[deAddr];
        bytes32 quitGroupId;
        bytes32 quitNextGroupId;
        (quitGroupId,quitNextGroupId) = IListGroup(listGroupAddr).getDelegateQuitGroupId(wkAddr, deAddr);
        if(de.quited && checkGroupTerminated(data, quitGroupId) && checkGroupTerminated(data, quitNextGroupId)){
            return true;
        }
        return false;
    }    
    function partClaim(StoremanType.StoremanData storage data, address wkAddr, address listGroupAddr) external {
        require(checkCanPartnerClaim(data,wkAddr, msg.sender,listGroupAddr),"Cannot claim");
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage pn = sk.partners[msg.sender];
        uint amount = pn.deposit.getLastValue();
        require(amount != 0, "not exist");
        pn.deposit.clean();
        if(!pn.quited) {
            sk.partnerDeposit = sk.partnerDeposit.sub(amount);
        }
        address lastPnAddr = sk.partMap[sk.partnerCount.sub(1)];
        StoremanType.Delegator storage lastPn = sk.partners[lastPnAddr];
        sk.partMap[pn.index] = lastPnAddr;
        lastPn.index = pn.index;

        sk.partnerCount = sk.partnerCount.sub(1);
        delete sk.partMap[sk.partnerCount];
        delete sk.partners[msg.sender];
        IListGroup(listGroupAddr).setPartQuitGroupId(wkAddr, msg.sender, bytes32(0x00), bytes32(0x00));

        // slash the node
        if(sk.slashedCount >= data.conf.maxSlashedCount) {
            amount = 0;
        } else {
            amount = amount.mul(data.conf.maxSlashedCount.sub(sk.slashedCount)).div(data.conf.maxSlashedCount);
        }

        emit partClaimEvent(wkAddr, msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }
}
