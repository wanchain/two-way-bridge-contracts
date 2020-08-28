// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

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
    event delegateOutEvent(address indexed wkAddr, address indexed from);
    event delegateClaimEvent(address indexed wkAddr, address indexed from, uint256 indexed amount);
    event delegateIncentiveClaimEvent(address indexed sender,address indexed wkAddr,uint indexed amount);
    event partInEvent(address indexed wkAddr, address indexed from, uint indexed value);
    event partOutEvent(address indexed wkAddr, address indexed from);

    function storemanGroupUnregister(StoremanType.StoremanData storage data,bytes32 groupId)
        external
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(block.timestamp > group.workTime + group.totalTime, "not expired");
        group.status = StoremanType.GroupStatus.unregistered;
        emit StoremanGroupUnregisterEvent(groupId);
    }



    function stakeIn(StoremanType.StoremanData storage data, bytes32 groupId, bytes calldata PK, bytes calldata enodeID) external
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(block.timestamp <= group.registerTime+group.registerDuration,"Registration closed");
        require(msg.value >= group.minStakeIn, "Too small value in stake");
        address pkAddr = address(keccak256(PK));
        StoremanType.Candidate storage sk = data.candidates[0][pkAddr];
        require(sk.sender == address(0x00), "Candidate has existed");
        require(group.status == StoremanType.GroupStatus.curveSeted,"not configured");
        sk.sender = msg.sender;
        sk.enodeID = enodeID;
        sk.PK = PK;
        sk.wkAddr = pkAddr;
        sk.groupId = groupId;
        sk.deposit = Deposit.Records(0);
        sk.deposit.addRecord(Deposit.Record(StoremanUtil.getDaybyTime(data.posLib, block.timestamp), msg.value));

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

        emit stakeInEvent(groupId, pkAddr, msg.sender, msg.value);
    }

    function stakeAppend(StoremanType.StoremanData storage data,  address wkAddr) external  {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        require(sk.sender == msg.sender, "Only the sender can stakeAppend");

        uint day = StoremanUtil.getDaybyTime(data.posLib, block.timestamp);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        sk.deposit.addRecord(r);
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
        emit stakeAppendEvent(wkAddr, msg.sender,msg.value);
    }

    function checkCanStakeOut(StoremanType.StoremanData storage data,  address wkAddr) public returns(bool){
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
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
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.sender == msg.sender, "Only the sender can stakeOut");
        require(checkCanStakeOut(data, wkAddr),"selecting");
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

    function checkCanStakeClaimFromGroup(address posLib, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group) private returns (bool) {
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
            && sk.incentivedDay+1 >= StoremanUtil.getDaybyTime(posLib, group.workTime+group.totalTime) ) {
                return true;
            }
        }
        return false;
    }
    function checkCanStakeClaim(StoremanType.StoremanData storage data, address wkAddr) public returns(bool) {
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
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");

        uint amount = sk.incentive[0];
        sk.incentive[0] = 0;

        if(amount != 0){
            sk.sender.transfer(amount);
        }
        emit stakeIncentiveClaimEvent(sk.sender,wkAddr,amount);
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

    function updateGroup(StoremanType.StoremanData storage data,StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage  group, Deposit.Record memory r) internal {
        //如果还没选择, 不需要更新group的值, 在选择的时候一起更新.
        // 如果已经选择过了, 需要更新group的值.
        if(group.status == StoremanType.GroupStatus.none){ // not exist group.
            return;
        }
        address wkAddr = sk.wkAddr;

        if(group.status == StoremanType.GroupStatus.curveSeted) {
            if(group.whiteWk[wkAddr] == address(0x00)){
                realInsert(data, group, wkAddr, StoremanUtil.calSkWeight(data.conf.standaloneWeight, sk.deposit.getLastValue().add(sk.partnerDeposit)).add(sk.delegateDeposit));
            }            
        } else {
            group.deposit.addRecord(r);
            group.depositWeight.addRecord(r);
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

        require(sk.delegateDeposit.add(msg.value) <= sk.deposit.getLastValue().mul(data.conf.DelegationMulti), "Too many delegation");
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        if(dk.deposit.getLastValue() == 0) {
            sk.delegatorMap[sk.delegatorCount] = msg.sender;
            dk.index = sk.delegatorCount;
            sk.delegatorCount++;
            // dk.sender = msg.sender;
            // dk.staker = wkAddr;
        }
        sk.delegateDeposit = sk.delegateDeposit.add(msg.value);
        uint day = StoremanUtil.getDaybyTime(data.posLib, block.timestamp);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        dk.deposit.addRecord(r);
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
        emit delegateInEvent(wkAddr, msg.sender,msg.value);
    }
    // 必须指定白名单. 允许重复. 
    function inheritNode(StoremanType.StoremanData storage data, bytes32 groupId, bytes32 preGroupId, address[] calldata wkAddrs, address[] calldata senders) public
    {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        StoremanType.StoremanGroup storage oldGroup = data.groups[preGroupId];
        address[] memory oldAddr =  new address[](group.memberCountDesign+data.conf.backupCount);
        uint oldCount = 0;
        uint k = 0;

        group.whiteCount = wkAddrs.length.sub(data.conf.backupCount);
        group.whiteCountAll = wkAddrs.length;
        for(k = 0; k < wkAddrs.length; k++){
            group.whiteMap[k] = wkAddrs[k];
            group.whiteWk[wkAddrs[k]] = senders[k];
            if(k < group.whiteCount) {
                group.selectedNode[k] = wkAddrs[k];
                StoremanType.Candidate storage skw = data.candidates[0][wkAddrs[k]];
                if(skw.wkAddr != address(0x00)){ // this node has exist
                    oldAddr[oldCount] = wkAddrs[k];
                    oldCount++;
                    skw.nextGroupId = groupId;
                }
            }
        }
        group.selectedCount = group.whiteCount;
        group.memberCount =group.selectedCount;

        if (preGroupId != bytes32(0x00)) {
            require(oldGroup.status >= StoremanType.GroupStatus.ready,"invalid preGroup");
            for (k = oldGroup.whiteCount; k<oldGroup.memberCountDesign && group.memberCount<group.memberCountDesign; k++) {
                address wkAddr = oldGroup.selectedNode[k];
                StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
                if(sk.groupId == preGroupId && !sk.quited && sk.slashedCount == 0 && !sk.isWhite) {
                    group.selectedNode[group.selectedCount] = sk.wkAddr;
                    if(oldGroup.status == StoremanType.GroupStatus.failed){
                        sk.groupId = groupId;
                    } else {
                        sk.nextGroupId = groupId;
                    }
                    group.selectedCount++;
                    group.memberCount++;
                    oldAddr[oldCount] = sk.wkAddr;
                    oldCount++;
                }
            }
            address[] memory oldArray = new address[](oldCount);
            for(k = 0; k<oldCount; k++){
                oldArray[k] = oldAddr[k];
            }
            emit storemanTransferEvent(groupId, preGroupId, oldArray);
        }
    }
    function delegateOut(StoremanType.StoremanData storage data, address wkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        require(checkCanStakeOut(data, wkAddr),"selecting");

        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        require(dk.deposit.getLastValue() != 0, "no deposit");
        dk.quited = true;
        sk.delegateDeposit = sk.delegateDeposit.sub(dk.deposit.getLastValue());
        emit delegateOutEvent(wkAddr, msg.sender);
    }

    function delegateClaim(StoremanType.StoremanData storage data, address wkAddr) external {
        require(checkCanStakeClaim(data,wkAddr),"Cannot claim");

        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        uint amount = dk.deposit.getLastValue();
        require(amount != 0,"not exist");
        dk.deposit.clean();
        emit delegateClaimEvent(wkAddr, msg.sender, amount);

        address lastDkAddr = sk.delegatorMap[sk.delegatorCount.sub(1)];
        StoremanType.Delegator storage lastDk = sk.delegators[lastDkAddr];
        sk.delegatorMap[dk.index] = lastDkAddr;
        lastDk.index = dk.index;

        emit delegateIncentiveClaimEvent(msg.sender,wkAddr,dk.incentive[0]);
        amount = amount.add(dk.incentive[0]);
        dk.incentive[0] = 0;
        msg.sender.transfer(amount);

        sk.delegatorCount == sk.delegatorCount.sub(1);
        delete sk.delegatorMap[sk.delegatorCount];
        delete sk.delegators[msg.sender];       
    }
    

    function delegateIncentiveClaim(StoremanType.StoremanData storage data, address wkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        require(dk.deposit.getLastValue() != 0, "not exist");
        uint amount = dk.incentive[0];
        dk.incentive[0] = 0;

        if(amount!=0){
            msg.sender.transfer(amount);
        }
        emit delegateIncentiveClaimEvent(msg.sender,wkAddr,amount);
    }


    function partIn(StoremanType.StoremanData storage data, address wkAddr)
        external
    {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");
        require(sk.partnerCount<5,"Too many partners");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        StoremanType.Delegator storage pn = sk.partners[msg.sender];
        if(pn.deposit.getLastValue() == 0) {
            sk.partMap[sk.partnerCount] = msg.sender;
            pn.index = sk.partnerCount;
            sk.partnerCount++;
            // pn.sender = msg.sender;
            // pn.staker = wkAddr;
            sk.partners[msg.sender] = pn;
        }
        sk.partnerDeposit = sk.partnerDeposit.add(msg.value);
        uint day = StoremanUtil.getDaybyTime(data.posLib, block.timestamp);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        pn.deposit.addRecord(r);
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
        emit partInEvent(wkAddr, msg.sender, msg.value);
    }

    function partOut(StoremanType.StoremanData storage data, address wkAddr) external {
        require(checkCanStakeOut(data, wkAddr),"selecting");

        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        require(sk.wkAddr == wkAddr, "Candidate doesn't exist");

        StoremanType.Delegator storage pn = sk.partners[msg.sender];
        require(pn.deposit.getLastValue() != 0, "not exist");

        pn.quited = true;
        sk.partnerDeposit = sk.partnerDeposit.sub(pn.deposit.getLastValue());
        emit partOutEvent(wkAddr, msg.sender);
    }
    function partClaim(StoremanType.StoremanData storage data, address wkAddr) external {
        require(checkCanStakeClaim(data,wkAddr),"Cannot claim");
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.Delegator storage pn = sk.partners[msg.sender];
        uint amount = pn.deposit.getLastValue();
        require(amount != 0, "not exist");
        pn.deposit.clean();

        address lastPnAddr = sk.partMap[sk.partnerCount-1];
        StoremanType.Delegator storage lastPn = sk.partners[lastPnAddr];
        sk.partMap[pn.index] = lastPnAddr;
        lastPn.index = pn.index;

        sk.partnerCount = sk.partnerCount.sub(1);
        delete sk.partMap[sk.partnerCount];
        delete sk.partners[msg.sender];

        msg.sender.transfer(amount);
    }
}
