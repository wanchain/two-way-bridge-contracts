pragma solidity ^0.4.24;

import "./StoremanType.sol";
import "./StoremanUtil.sol";


library StoremanLib {
    using Deposit for Deposit.Records;
    using SafeMath for uint;

    uint constant MaxPartnerCount = 5;
    event stakeInEvent(bytes32 indexed groupId,address indexed wkAddr, address indexed from, uint  value);
    event stakeAppendEvent(address indexed wkAddr, address indexed from, uint indexed value);
    event stakeOutEvent(address indexed wkAddr, address indexed from);
    event stakeClaimEvent(address indexed wkAddr, address indexed from,bytes32 indexed groupId, uint value);
    event stakeIncentiveClaimEvent(address indexed sender,address indexed wkAddr,uint indexed amount);
    event stakeIncentiveCrossFeeEvent(address indexed sender,address indexed wkAddr,uint indexed amount);

    event storemanTransferEvent(bytes32 indexed groupId, bytes32 indexed preGroupId, address[] wkAddrs);
    event StoremanGroupUnregisterEvent(bytes32 indexed groupId);
    event delegateInEvent(address indexed wkAddr, address indexed from, uint indexed value);
    event delegateClaimEvent(address indexed wkAddr, address indexed from, uint256 indexed amount);
    event delegateIncentiveClaimEvent(address indexed sender,address indexed wkAddr,uint indexed amount);
    event partInEvent(address indexed wkAddr, address indexed from, uint indexed value);

    function storemanGroupUnregister(StoremanType.StoremanData storage data,bytes32 groupId)
        external
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(now > group.workTime + group.totalTime, "not expired");
        group.status = StoremanType.GroupStatus.unregistered;
        emit StoremanGroupUnregisterEvent(groupId);
    }



    function stakeIn(StoremanType.StoremanData storage data, bytes32 groupId, bytes PK, bytes enodeID) external
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(now <= group.registerTime+group.registerDuration,"Registration closed");
        require(msg.value >= group.minStakeIn, "Too small value in stake");
        address pkAddr = address(keccak256(PK));
        StoremanType.Candidate storage sk = data.candidates[pkAddr];
        require(sk.sender == address(0x00), "Candidate has existed");
        require(group.status == StoremanType.GroupStatus.curveSeted,"not configured");
        sk.sender = msg.sender;
        sk.enodeID = enodeID;
        sk.PK = PK;
        sk.wkAddr = pkAddr;
        sk.groupId = groupId;
        sk.deposit = Deposit.Records(0);
        sk.deposit.addRecord(Deposit.Record(StoremanUtil.getDaybyTime(now), msg.value));

        group.skMap[group.memberCount] = sk.wkAddr;
        group.memberCount++;

        // check if it is white
        if(group.whiteWk[pkAddr] != address(0x00)){
            if(group.whiteWk[pkAddr] != msg.sender){
                revert("invalid sender");
            }
            sk.isWhite = true;
        } else {
            realInsert(data,group, pkAddr, StoremanUtil.calSkWeight(data.conf.standaloneWeight, msg.value));
        }

        emit stakeInEvent(group.groupId, pkAddr, msg.sender, msg.value);
    }

    function stakeAppend(StoremanType.StoremanData storage data,  address wkAddr) external  {
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        require(sk.sender == msg.sender, "Only the sender can stakeAppend");

        uint day = StoremanUtil.getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        sk.deposit.addRecord(r);
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
        emit stakeAppendEvent(wkAddr, msg.sender,msg.value);
    }

    function checkCanStakeOut(StoremanType.StoremanData storage data,  address wkAddr) public returns(bool){
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        //如果group还没选择, 不许退.
        // 如果参加了下一个group, 下一个group还没选择, 不许退.
        //否则标志为退出状态 quited==true
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
        require(sk.sender == msg.sender, "Only the sender can stakeOut");
        require(checkCanStakeOut(data, wkAddr),"selecting");
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        sk.quited = true;
        emit stakeOutEvent(wkAddr, msg.sender);
    }

    function isWorkingNodeInGroup(StoremanType.StoremanGroup storage group, address wkAddr) private  view returns (bool) {
        uint count = group.memberCountDesign;
        for(uint8 i = 0; i < count; i++) {
            if(wkAddr == group.selectedNode[i]) {
                return true;
            }
        }
        return false;
    }

    function checkCanStakeClaimFromGroup(StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group) private returns (bool) {
        // 如果group还没选择, 不许提取.
        // group组建失败, 可以提取.
        // 如果已经选择过了, 没选中, 可以提取.
        // 如果选择过了, 而且选中了, 那么必须1. 标记为quited了, 2, group状态是dismissed了. 3. incentived.
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
            if(sk.quited && group.status == StoremanType.GroupStatus.dismissed
            && sk.incentivedDay+1 == StoremanUtil.getDaybyTime(group.workTime+group.totalTime) ) {
                return true;
            }
        }
        return false;
    }
    function checkCanStakeClaim(StoremanType.StoremanData storage data, address wkAddr) public returns(bool) {
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        if(sk.wkAddr != wkAddr){ // sk doesn't exist.
            return false;
        }
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        if(checkCanStakeClaimFromGroup(sk, group) && checkCanStakeClaimFromGroup(sk, nextGroup)){
            return true;
        } else {
            return false;
        }
    }

    function stakeClaim(StoremanType.StoremanData storage data, address wkAddr) external {
        require(checkCanStakeClaim(data,wkAddr),"Cannot claim");
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        uint amount = sk.deposit.getLastValue();
        require(amount != 0, "Claimed");
        sk.deposit.clean();

        // slash the node
        if(sk.slashedCount >= data.conf.maxSlashedCount) {
            amount = 0;
        } else {
            amount = amount.mul(data.conf.maxSlashedCount - sk.slashedCount).div(data.conf.maxSlashedCount);
        }
	    emit stakeClaimEvent(wkAddr, msg.sender, sk.groupId, amount);

        // the cross chain fee
        emit stakeIncentiveCrossFeeEvent(msg.sender, wkAddr, sk.crossIncoming);
        amount = amount.add(sk.crossIncoming);
        sk.crossIncoming = 0;

        // the incentive
        emit stakeIncentiveClaimEvent(sk.sender,wkAddr,sk.incentive[0]);
        amount = amount.add(sk.incentive[0]);
        sk.incentive[0] = 0;

        if(amount != 0){
            sk.sender.transfer(amount);
        }
    }

    function stakeIncentiveClaim(StoremanType.StoremanData storage data, address wkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");

        uint amount = sk.incentive[0];
        sk.incentive[0] = 0;

        if(amount != 0){
            sk.sender.transfer(amount);
        }
        emit stakeIncentiveClaimEvent(sk.sender,wkAddr,amount);
    }

    function realInsert(StoremanType.StoremanData storage data, StoremanType.StoremanGroup storage  group, address skAddr, uint weight) internal{
        for (uint i = group.whiteCount; i < group.selectedCount; i++) {
            StoremanType.Candidate storage cmpNode = data.candidates[group.selectedNode[i]];
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
            for (uint j = i; j < group.selectedCount; j++) {
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

// 如果节点本来就在list里面, realInsert有问题. TODO
    function updateGroup(StoremanType.StoremanData storage data,StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage  group, Deposit.Record r) internal {
        //如果还没选择, 不需要更新group的值, 在选择的时候一起更新.
        // 如果已经选择过了, 需要更新group的值.
        if(group.status == StoremanType.GroupStatus.none){ // not exist group.
            return;
        }
        address wkAddr = sk.wkAddr;
        if(group.status >= StoremanType.GroupStatus.selected){
            require(isWorkingNodeInGroup(group, wkAddr), "StoremanType.Candidate is kicked");
            group.deposit.addRecord(r);
            group.depositWeight.addRecord(r);
        } else {
            if(group.whiteWk[wkAddr] == address(0x00)){
                realInsert(data, group, wkAddr, StoremanUtil.calSkWeight(data.conf.standaloneWeight, sk.deposit.getLastValue().add(sk.partnerDeposit)).add(sk.delegateDeposit));
            }
        }
    }
    function delegateIn(StoremanType.StoremanData storage data, address wkAddr)
        external
    {
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        require(sk.delegateDeposit.add(msg.value) <= sk.deposit.getLastValue().mul(data.conf.DelegationMulti), "Too many delegation");
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        if(dk.sender == address(0x00)) {
            sk.delegatorMap[sk.delegatorCount] = msg.sender;
            dk.index = sk.delegatorCount;
            sk.delegatorCount++;
            dk.sender = msg.sender;
            dk.staker = wkAddr;
        }
        sk.delegateDeposit = sk.delegateDeposit.add(msg.value);
        uint day = StoremanUtil.getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        dk.deposit.addRecord(r);
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
        emit delegateInEvent(wkAddr, msg.sender,msg.value);
    }
    function inheritNode(StoremanType.StoremanData storage data, StoremanType.StoremanGroup storage group,bytes32 preGroupId, address[] wkAddrs, address[] senders) public
    {
        StoremanType.StoremanGroup storage oldGroup = data.groups[preGroupId];
        data.oldAddr.length = 0;

        if(wkAddrs.length == 0){ // If there are no new white nodes, use the old.
            for(uint k = 0; k<oldGroup.whiteCountAll; k++){
                address wa = oldGroup.whiteMap[k];
                StoremanType.Candidate storage skw = data.candidates[wa];
                if((!skw.quited) && skw.slashedCount==0) {  // a node was slashed, will not transfer to next.
                    group.whiteWk[wa] = oldGroup.whiteWk[wa];
                    group.whiteMap[group.whiteCountAll] = wa;
                    group.whiteCountAll++;
                    if (k < oldGroup.whiteCount){
                        group.selectedNode[group.whiteCount] = wa;
                        group.whiteCount++;
                    }
                    data.oldAddr.push(wa);
                    skw.nextGroupId = group.groupId;
                }
            }
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
        }
        group.selectedCount = group.whiteCount;
        group.memberCount =group.selectedCount;
        // 如果没有白名单, 用旧的.
        // 如果有, 完整替换.　新白名单不能与旧的有重叠．
        // 3个替换4个也可以.
        if (preGroupId != bytes32(0x00)) {
            for (uint m = oldGroup.whiteCount; m<oldGroup.memberCountDesign; m++) {
                address skAddr = oldGroup.selectedNode[m];
                StoremanType.Candidate storage sk = data.candidates[skAddr];
                if(sk.groupId == preGroupId && sk.quited == false && sk.slashedCount < data.conf.maxSlashedCount) {
                    group.selectedNode[group.selectedCount] = sk.wkAddr;
                    sk.nextGroupId = group.groupId;
                    group.selectedCount++;
                    group.memberCount++;
                    data.oldAddr.push(sk.wkAddr);
                }
            }
            emit storemanTransferEvent(group.groupId, preGroupId, data.oldAddr);
        }
    }
    function delegateOut(StoremanType.StoremanData storage data, address wkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        require(checkCanStakeOut(data, wkAddr),"selecting");

        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        require(dk.sender == msg.sender, "Only the sender can stakeOut");

        dk.quited = true;
        sk.delegateDeposit = sk.delegateDeposit.sub(dk.deposit.getLastValue());
    }

    function delegateClaim(StoremanType.StoremanData storage data, address wkAddr) external {
        require(checkCanStakeClaim(data,wkAddr),"Cannot claim");

        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        uint amount = dk.deposit.getLastValue();
        require(dk.sender == msg.sender,"not exist");
        dk.deposit.clean();
        emit delegateClaimEvent(wkAddr, msg.sender, amount);

        address lastDkAddr = sk.delegatorMap[sk.delegatorCount.sub(1)];
        StoremanType.Delegator storage lastDk = sk.delegators[lastDkAddr];
        sk.delegatorMap[dk.index] = lastDkAddr;
        lastDk.index = dk.index;

        emit delegateIncentiveClaimEvent(msg.sender,wkAddr,dk.incentive[0]);
        amount = amount.add(dk.incentive[0]);
        dk.incentive[0] = 0;
        dk.sender.transfer(amount);

        sk.delegatorCount == sk.delegatorCount.sub(1);
        delete sk.delegatorMap[sk.delegatorCount];
        delete sk.delegators[msg.sender];       
    }
    

    function delegateIncentiveClaim(StoremanType.StoremanData storage data, address wkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];

        uint amount = dk.incentive[0];
        dk.incentive[0] = 0;

        if(amount!=0){
            dk.sender.transfer(amount);
        }
        emit delegateIncentiveClaimEvent(msg.sender,wkAddr,amount);
    }


    function partIn(StoremanType.StoremanData storage data, address wkAddr)
        external
    {
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        require(sk.partnerCount<5,"Too many partners");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        StoremanType.Delegator storage pn = sk.partners[msg.sender];
        if(pn.sender == address(0x00)) {
            sk.partMap[sk.partnerCount] = msg.sender;
            pn.index = sk.partnerCount;
            sk.partnerCount++;
            pn.sender = msg.sender;
            pn.staker = wkAddr;
            sk.partners[msg.sender] = pn;
        }
        sk.partnerDeposit = sk.partnerDeposit.add(msg.value);
        uint day = StoremanUtil.getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        pn.deposit.addRecord(r);
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
	      emit partInEvent(wkAddr, msg.sender, msg.value);
    }

    function partOut(StoremanType.StoremanData storage data, address wkAddr) external {
        require(checkCanStakeOut(data, wkAddr),"selecting");

        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");

        StoremanType.Delegator storage pn = sk.partners[msg.sender];
        require(pn.sender == msg.sender, "Only the sender can stakeOut");

        pn.quited = true;
        sk.partnerDeposit = sk.partnerDeposit.sub(pn.deposit.getLastValue());
    }
    function partClaim(StoremanType.StoremanData storage data, address wkAddr) external {
        require(checkCanStakeClaim(data,wkAddr),"Cannot claim");
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        StoremanType.Delegator storage pn = sk.partners[msg.sender];
        require(pn.sender == msg.sender,"not exist");
        uint amount = pn.deposit.getLastValue();
        pn.deposit.clean();

        address lastPnAddr = sk.partMap[sk.partnerCount-1];
        StoremanType.Delegator storage lastPn = sk.partners[lastPnAddr];
        sk.partMap[pn.index] = lastPnAddr;
        lastPn.index = pn.index;

        sk.partnerCount = sk.partnerCount.sub(1);
        delete sk.partMap[sk.partnerCount];
        delete sk.partners[msg.sender];

        pn.sender.transfer(amount);
    }
}
