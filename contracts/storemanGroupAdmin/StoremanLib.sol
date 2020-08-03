pragma solidity ^0.4.24;

import "./StoremanType.sol";
import "./StoremanUtil.sol";


library StoremanLib {
    using Deposit for Deposit.Records;

    uint constant MaxPartnerCount = 5;
    event stakeInEvent(bytes32 indexed index,address indexed pkAddr, uint indexed value);
    event incentiveClaimEvent(address indexed sender,address indexed pkAddr,uint indexed amount);
    event delegateIncentiveClaimEvent(address indexed sender,address indexed pkAddr,uint indexed amount);
    event storemanTransferEvent(bytes32 indexed groupId, bytes32 indexed preGroupId, address[] wkAddrs);
    event StoremanGroupUnregisterEvent(bytes32 indexed groupId);

    function calSkWeight(StoremanType.StoremanData storage data) internal  view returns (uint){
        return StoremanUtil.calSkWeight(data.conf.standaloneWeight, msg.value);
    }

    function storemanGroupUnregister(StoremanType.StoremanData storage data,bytes32 groupId)
        external
    {
        StoremanType.StoremanGroup storage smg = data.groups[groupId];
        smg.status = StoremanType.GroupStatus.unregistered;
        emit StoremanGroupUnregisterEvent(groupId);
    }

    function setInvalidSm(StoremanType.StoremanData storage data, bytes32 groupId, uint[] slashType,  address[] badAddrs)
        external
        returns(bool isContinue)
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        for(uint k = 0; k < group.memberCount; k++){
            if(group.tickedCount + group.whiteCount >= group.whiteCountAll){
                return false;
            }
            for(uint i = 0; i<badAddrs.length; i++){
                if(group.selectedNode[k] == badAddrs[i]){
                    group.tickedNode[group.tickedCount] = group.selectedNode[k];
                    group.selectedNode[k] = group.whiteMap[group.tickedCount + group.whiteCount];
                    group.tickedCount += 1;
                    break;
                }
            }
        }
        return true;
    }


    function stakeIn(StoremanType.StoremanData storage data, bytes32 groupId, bytes PK, bytes enodeID) external
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        //require(now <= group.registerTime+group.registerDuration,"Registration closed");
        require(msg.value >= group.minStakeIn, "Too small value in stake");
        address pkAddr = address(keccak256(PK));
        Deposit.Records memory records = Deposit.Records(0);
        StoremanType.Candidate storage sk = data.candidates[pkAddr];
        require(sk.sender == address(0x00), "Candidate has existed");
        sk.sender = msg.sender;
        sk.enodeID = enodeID;
        sk.PK = PK;
        sk.pkAddress = pkAddr;
        sk.groupId = groupId;
        sk.deposit = records;

        group.addrMap[group.memberCount] = sk.pkAddress;
        group.memberCount++;

        Deposit.Record memory r = Deposit.Record(StoremanUtil.getDaybyTime(now), msg.value);
        sk.deposit.addRecord(r);

        // check if it is white
        if(group.whiteWk[pkAddr] != address(0x00)){
            if(group.whiteWk[pkAddr] != msg.sender){
                revert("invalid sender");
            }
        } else {
            realInsert(data,group, pkAddr, calSkWeight(data));
        }

        emit stakeInEvent(group.groupId, pkAddr, msg.value);
    }

    function stakeAppend(StoremanType.StoremanData storage data,  address skPkAddr) external  {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        require(sk.sender == msg.sender, "Only the sender can use stakeAppend");

        uint day = StoremanUtil.getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        sk.deposit.addRecord(r);
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
    }

    function stakeOut(StoremanType.StoremanData storage data,  address skPkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        //如果group还没选择, 不许退.
        // 如果参加了下一个group, 下一个group还没选择, 不许退.
        //否则标志为退出状态 quited==true
        require(group.status >= StoremanType.GroupStatus.selected, "selecting time, can't quit");
        if(nextGroup.status != StoremanType.GroupStatus.none) {
            require(nextGroup.status >= StoremanType.GroupStatus.selected, "selecting time, can't quit");
        }
        sk.quited = true;
    }

    function isWorkingNodeInGroup(StoremanType.StoremanGroup storage group, address skPkAddr) internal  view returns (bool) {
        uint count = group.memberCountDesign;
        for(uint8 i = 0; i < count; i++) {
            if(skPkAddr == group.selectedNode[i]) {
                return true;
            }
        }
        return false;
    }

    function checkCanClaim(StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group) internal returns (bool) {
        // 如果group还没选择, 不许提取.
        // 如果已经选择过了, 没选中, 可以提取.
        // 如果选择过了, 而且选中了, 那么必须1. 标记为quited了, 2, group状态是dismissed了.
        if(group.status == StoremanType.GroupStatus.none) {
            return true; // group does not exist. maybe it is next group.
        }
        if(group.status < StoremanType.GroupStatus.selected) {
            return false;
        }
        if(!isWorkingNodeInGroup(group, sk.pkAddress)){
            return true;
        } else {
            if(sk.quited && group.status == StoremanType.GroupStatus.dismissed) {
                return true;
            }
        }
        return false;
    }

    function stakeClaim(StoremanType.StoremanData storage data, address skPkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        // 两个group分别检查.
        require(checkCanClaim(sk, group), "group can't claim");
        require(checkCanClaim(sk, nextGroup), "nextGroup can't claim");

        uint amount = sk.deposit.getLastValue();
        sk.deposit.clean();

        require(amount != 0);
        sk.sender.transfer(amount);
        // todo 加事件
        // TODO; transfer crossIncoming/21;　／／ｚｈａｎｇ
    }

    function incentiveClaim(StoremanType.StoremanData storage data, address skPkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        uint amount = sk.incentive[0];
        sk.incentive[0] = 0;

        require(amount != 0);
        sk.sender.transfer(amount);

        emit incentiveClaimEvent(sk.sender,skPkAddr,amount);

    }

    function realInsert(StoremanType.StoremanData storage data, StoremanType.StoremanGroup storage  group, address skAddr, uint weight) internal{
        uint last = group.memberCountDesign-1;
        for(uint j = last; j>=group.whiteCount; j--) {
            if(weight > data.candidates[group.selectedNode[j]].delegateDeposit + StoremanUtil.calSkWeight(data.conf.standaloneWeight,data.candidates[group.selectedNode[j]].deposit.getLastValue())){
                continue;
            }
            break;
        }
        if(j<last){
            for(uint k = last-1; k>j; k--){
                group.selectedNode[k+1] = group.selectedNode[k];
            }
            group.selectedNode[j+1] = skAddr;
            group.selectedCount++; // TODO deleted? why?
        }
    }
    function updateGroup(StoremanType.StoremanData storage data,StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage  group, Deposit.Record r) internal {
        //如果还没选择, 不需要更新group的值, 在选择的时候一起更新.
        // 如果已经选择过了, 需要更新group的值.
        if(group.status == StoremanType.GroupStatus.none){ // not exist group.
            return;
        }
        address skPkAddr = sk.pkAddress;
        if(group.status >= StoremanType.GroupStatus.selected){
            require(isWorkingNodeInGroup(group, skPkAddr), "StoremanType.Candidate is kicked");
            group.deposit.addRecord(r);
            group.depositWeight.addRecord(r);
        } else {
            if(group.whiteWk[skPkAddr] == address(0x00)){
                // for(uint selectedIndex = group.whiteCount; selectedIndex<group.memberCountDesign; selectedIndex++){
                //     if(group.selectedNode[selectedIndex] == skPkAddr) {
                //         break;
                //     }
                // }
                realInsert(data, group, skPkAddr, StoremanUtil.calSkWeight(data.conf.standaloneWeight,sk.deposit.getLastValue())+sk.delegateDeposit);
            }
        }
    }
    event delegateInEvent(address indexed wkAddr, address indexed from, uint indexed value);
    function delegateIn(StoremanType.StoremanData storage data, address skPkAddr)
        external
    {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        require(sk.delegateDeposit+msg.value <= sk.deposit.getLastValue()*data.conf.DelegationMulti, "Too many delegation");
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        if(dk.sender == address(0x00)) {
            sk.addrMap[sk.delegatorCount] = msg.sender;
            dk.index = sk.delegatorCount;
            sk.delegatorCount++;
            dk.sender = msg.sender;
            dk.staker = skPkAddr;
        }
        sk.delegateDeposit += msg.value;
        uint day = StoremanUtil.getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        dk.deposit.addRecord(r);
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
        delegateInEvent(skPkAddr, msg.sender,msg.value);
    }
    function inheritNode(StoremanType.StoremanData storage data, StoremanType.StoremanGroup storage group,bytes32 preGroupId, address[] wkAddrs, address[] senders) internal
    {

        StoremanType.StoremanGroup storage oldGroup;
        if(preGroupId != bytes32(0x00)) {
            oldGroup = data.groups[preGroupId];
            data.oldAddr.length = 0;
        }
        if(wkAddrs.length == 0){ // If there are no new white nodes, use the old.
            group.whiteCount = oldGroup.whiteCount;
            group.whiteCountAll = oldGroup.whiteCountAll;
            for(uint k = 0; k<oldGroup.whiteCountAll; k++){
                group.whiteMap[k] = oldGroup.whiteMap[k];
                group.whiteWk[group.whiteMap[k]] = oldGroup.whiteWk[oldGroup.whiteMap[k]];
                if(k < group.whiteCount){
                    group.selectedNode[k] = group.whiteMap[k];
                }
                data.oldAddr.push(group.whiteMap[k]);
            }
            group.selectedCount = oldGroup.selectedCount;
        } else {   // If there are new white nodes, use the new.
            group.whiteCount = wkAddrs.length - data.conf.backupCount;
            group.whiteCountAll = wkAddrs.length;
            for(uint i = 0; i < wkAddrs.length; i++){
                group.whiteMap[i] = wkAddrs[i];
                group.whiteWk[wkAddrs[i]] = senders[i];
                if(i < group.whiteCount) {
                    group.selectedNode[i] = wkAddrs[i];
                }
            }
            group.selectedCount = group.whiteCount;
        }
        // TODO; 如果没有白名单, 用旧的.
        // 如果有, 完整替换.
        // 3个替换4个也可以.
        // TODO handle the old group member. set the group deposit.
        if(preGroupId != bytes32(0x00)) {
            oldGroup = data.groups[preGroupId];
            data.oldAddr.length = 0;
            for(uint m = oldGroup.whiteCount; m<oldGroup.memberCountDesign; m++) {
                address skAddr = oldGroup.selectedNode[m];
                StoremanType.Candidate storage sk = data.candidates[skAddr];
                if(sk.groupId == preGroupId && sk.quited == false) {
                    group.selectedNode[group.selectedCount] = sk.pkAddress;
                    group.selectedCount++;
                    data.oldAddr.push(sk.pkAddress);
                }
            }
            emit storemanTransferEvent(group.groupId, preGroupId, data.oldAddr);
        }
    }
    function delegateOut(StoremanType.StoremanData storage data, address skPkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        //如果group还没选择, 不许退.
        // 如果参加了下一个group, 下一个group还没选择, 不许退.
        //否则标志为退出状态 quited==true

        require(group.status >= StoremanType.GroupStatus.selected, "selecting time, can't quit");
        if(nextGroup.status != StoremanType.GroupStatus.none) {
            require(nextGroup.status >= StoremanType.GroupStatus.selected, "selecting time, can't quit");
        }

        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        dk.quited = true;
        sk.delegateDeposit -= dk.deposit.getLastValue();
    }

    function delegateClaim(StoremanType.StoremanData storage data, address skPkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];

        // 两个group分别检查.
        require(checkCanClaim(sk, group), "group can't claim");
        require(checkCanClaim(sk, nextGroup), "nextGroup can't claim");

        uint amount = dk.deposit.getLastValue();
        dk.deposit.clean();

        sk.addrMap[dk.index] = sk.addrMap[sk.delegatorCount-1];
        delete sk.addrMap[sk.delegatorCount-1];
        sk.delegatorCount--;
        delete sk.delegators[msg.sender];

        dk.sender.transfer(amount);
    }

    function delegateIncentiveClaim(StoremanType.StoremanData storage data, address skPkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];

        uint amount = dk.incentive[0];
        dk.incentive[0] = 0;

        require(amount!=0);
        dk.sender.transfer(amount);
        emit delegateIncentiveClaimEvent(msg.sender,skPkAddr,amount);
    }


    event partInEvent(address indexed wkAddr, address indexed from, uint indexed value);
    function partIn(StoremanType.StoremanData storage data, address skPkAddr) // TODO only change the first group? ???????
        external
    {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        StoremanType.Partner storage pn = sk.partners[msg.sender];
        if(pn.sender == address(0x00)) {
            sk.addrMap[sk.partnerCount] = msg.sender;
            pn.index = sk.partnerCount;
            sk.partnerCount++;
            pn.sender = msg.sender;
            pn.staker = skPkAddr;
            sk.partners[msg.sender] = pn;
        }
        sk.partnerDeposit += msg.value;
        uint day = StoremanUtil.getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        pn.deposit.addRecord(r);
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
	emit partInEvent(skPkAddr, msg.sender, msg.value);
    }

    function partOut(StoremanType.StoremanData storage data, address skPkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        //如果group还没选择, 不许退.
        // 如果参加了下一个group, 下一个group还没选择, 不许退.
        //否则标志为退出状态 quited==true

        require(group.status >= StoremanType.GroupStatus.selected, "selecting time, can't quit");
        if(nextGroup.status != StoremanType.GroupStatus.none) {
            require(nextGroup.status >= StoremanType.GroupStatus.selected, "selecting time, can't quit");
        }

        StoremanType.Partner storage pn = sk.partners[msg.sender];
        pn.quited = true;
        sk.partnerDeposit -= pn.deposit.getLastValue();
    }
    function partClaim(StoremanType.StoremanData storage data, address skPkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        StoremanType.Partner storage pn = sk.partners[msg.sender];

        // 两个group分别检查.
        require(checkCanClaim(sk, group), "group can't claim");
        require(checkCanClaim(sk, nextGroup), "nextGroup can't claim");

        uint amount = pn.deposit.getLastValue();
        pn.deposit.clean();

        sk.addrMap[pn.index] = sk.addrMap[sk.partnerCount-1];
        delete sk.addrMap[sk.partnerCount-1];
        sk.partnerCount--;
        delete sk.partners[msg.sender];

        pn.sender.transfer(amount);
    }
}
