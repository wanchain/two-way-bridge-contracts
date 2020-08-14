pragma solidity ^0.4.24;

import "./StoremanType.sol";
import "./StoremanUtil.sol";


library StoremanLib {
    using Deposit for Deposit.Records;
    using SafeMath for uint;

    uint constant MaxPartnerCount = 5;
    event stakeInEvent(bytes32 indexed index,address indexed pkAddr, address indexed from, uint  value);
    event stakeAppendEvent(address indexed pkAddr, address indexed from, uint indexed value);
    event stakeOutEvent(address indexed pkAddr, address indexed from);
    event stakeClaimEvent(address indexed pkAddr, address indexed from,bytes32 indexed groupId, uint value);
    event stakeIncentiveClaimEvent(address indexed sender,address indexed pkAddr,uint indexed amount);
    event storemanTransferEvent(bytes32 indexed groupId, bytes32 indexed preGroupId, address[] wkAddrs);
    event StoremanGroupUnregisterEvent(bytes32 indexed groupId);
    event delegateInEvent(address indexed wkAddr, address indexed from, uint indexed value);
    event delegateClaimEvent(address indexed wkAddr, address indexed from, uint256 indexed amount);
    event delegateIncentiveClaimEvent(address indexed sender,address indexed pkAddr,uint indexed amount);
    event partInEvent(address indexed wkAddr, address indexed from, uint indexed value);

    function calSkWeight(StoremanType.StoremanData storage data) public  view returns (uint){
        return StoremanUtil.calSkWeight(data.conf.standaloneWeight, msg.value);
    }

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
        //require(now <= group.registerTime+group.registerDuration,"Registration closed"); // TODO open after test.
        require(msg.value >= group.minStakeIn, "Too small value in stake");
        address pkAddr = address(keccak256(PK));
        Deposit.Records memory records = Deposit.Records(0);
        StoremanType.Candidate storage sk = data.candidates[pkAddr];
        //require(sk.sender == address(0x00), "Candidate has existed"); // TODO open after test.
        //require(group.status >= StoremanType.GroupStatus.curveSeted,"not configured") // TODO open after test.
        sk.sender = msg.sender;
        sk.enodeID = enodeID;
        sk.PK = PK;
        sk.pkAddress = pkAddr;
        sk.groupId = groupId;
        sk.deposit = records;

        group.skMap[group.memberCount] = sk.pkAddress;
        group.memberCount++;

        Deposit.Record memory r = Deposit.Record(StoremanUtil.getDaybyTime(now), msg.value);
        sk.deposit.addRecord(r);

        // check if it is white
        if(group.whiteWk[pkAddr] != address(0x00)){
            if(group.whiteWk[pkAddr] != msg.sender){
                revert("invalid sender");
            }
            sk.isWhite = true;
        } else {
            realInsert(data,group, pkAddr, calSkWeight(data));
        }

        emit stakeInEvent(group.groupId, pkAddr, msg.sender, msg.value);
    }

    function stakeAppend(StoremanType.StoremanData storage data,  address skPkAddr) external  {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        require(sk.sender == msg.sender, "Only the sender can stakeAppend");

        uint day = StoremanUtil.getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        sk.deposit.addRecord(r);
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
        emit stakeAppendEvent(skPkAddr, msg.sender,msg.value);
    }

    function checkCanStakeOut(StoremanType.StoremanData storage data,  address skPkAddr) public returns(bool){
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        require(sk.sender == msg.sender, "Only the sender can stakeOut");
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
    function stakeOut(StoremanType.StoremanData storage data,  address skPkAddr) external {
        require(checkCanStakeOut(data, skPkAddr),"selecting");
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        sk.quited = true;
        emit stakeOutEvent(skPkAddr, msg.sender);
    }

    function isWorkingNodeInGroup(StoremanType.StoremanGroup storage group, address skPkAddr) private  view returns (bool) {
        uint count = group.memberCountDesign;
        for(uint8 i = 0; i < count; i++) {
            if(skPkAddr == group.selectedNode[i]) {
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
        if(!isWorkingNodeInGroup(group, sk.pkAddress)){
            return true;
        } else {
            if(sk.quited && group.status == StoremanType.GroupStatus.dismissed
            && sk.incentivedDay+1 == StoremanUtil.getDaybyTime(group.workTime+group.totalTime) ) {
                return true;
            }
        }
        return false;
    }
    function checkCanStakeClaim(StoremanType.StoremanData storage data, address skPkAddr) public returns(bool) {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        if(sk.pkAddress != skPkAddr){ // sk doesn't exist.
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
    function stakeClaim(StoremanType.StoremanData storage data, address skPkAddr) external {
        require(checkCanStakeClaim(data,skPkAddr),"Cannot claim");
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        uint amount = sk.deposit.getLastValue();
        sk.deposit.clean();

        amount = amount.add(sk.crossIncoming);
        sk.crossIncoming = 0;
        //TODO slash
        if(sk.slashedCount >= data.conf.maxSlashedCount) {
            amount = 0;
        } else {
            amount = amount.mul(data.conf.maxSlashedCount - sk.slashedCount).div(data.conf.maxSlashedCount);
            sk.sender.transfer(amount);
        }
	    emit stakeClaimEvent(skPkAddr, msg.sender, sk.groupId, amount);
    }

    function stakeIncentiveClaim(StoremanType.StoremanData storage data, address skPkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        uint amount = sk.incentive[0];
        sk.incentive[0] = 0;

        if(amount != 0){
            sk.sender.transfer(amount);
            emit stakeIncentiveClaimEvent(sk.sender,skPkAddr,amount);
        }
    }

    function realInsert(StoremanType.StoremanData storage data, StoremanType.StoremanGroup storage  group, address skAddr, uint weight) internal{
        for (uint i = group.whiteCount; i < group.selectedCount; i++) {
            StoremanType.Candidate storage cmpNode = data.candidates[group.selectedNode[i]];
            uint cmpWeight = cmpNode.delegateDeposit + 
                StoremanUtil.calSkWeight(data.conf.standaloneWeight, cmpNode.deposit.getLastValue()+cmpNode.partnerDeposit);
            if (weight > cmpWeight) {
                break;
            }
        }
        if (i < group.memberCountDesign) {
            for (uint j = group.selectedCount - 1; j >= i; j--) {
                if (j + 1 < group.memberCountDesign) {
                    group.selectedNode[j + 1] = group.selectedNode[j];
                }
            }
            group.selectedNode[i] = skAddr;
            if (group.selectedCount < group.memberCountDesign) {
                group.selectedCount++;
            }
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
                realInsert(data, group, skPkAddr, StoremanUtil.calSkWeight(data.conf.standaloneWeight,sk.deposit.getLastValue())+sk.delegateDeposit);
            }
        }
    }
    function delegateIn(StoremanType.StoremanData storage data, address skPkAddr)
        external
    {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        require(sk.delegateDeposit.add(msg.value) <= sk.deposit.getLastValue().mul(data.conf.DelegationMulti), "Too many delegation");
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        if(dk.sender == address(0x00)) {
            sk.delegatorMap[sk.delegatorCount] = msg.sender;
            dk.index = sk.delegatorCount;
            sk.delegatorCount++;
            dk.sender = msg.sender;
            dk.staker = skPkAddr;
        }
        sk.delegateDeposit = sk.delegateDeposit.add(msg.value);
        uint day = StoremanUtil.getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        dk.deposit.addRecord(r);
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
        emit delegateInEvent(skPkAddr, msg.sender,msg.value);
    }
    // TODO 白名单备份节点，　不允许退出．如何退出
    function inheritNode(StoremanType.StoremanData storage data, StoremanType.StoremanGroup storage group,bytes32 preGroupId, address[] wkAddrs, address[] senders) public
    {
        StoremanType.StoremanGroup storage oldGroup;
        if(preGroupId != bytes32(0x00)) {
            oldGroup = data.groups[preGroupId];
            data.oldAddr.length = 0;
        }
        if(wkAddrs.length == 0){ // If there are no new white nodes, use the old.
            for(uint k = 0; k<oldGroup.whiteCountAll; k++){
                address wa = oldGroup.whiteMap[k];
                StoremanType.Candidate storage skw = data.candidates[wa];
                group.whiteWk[wa] = oldGroup.whiteWk[wa];
                if(!skw.quited) {
                    group.whiteMap[group.whiteCountAll] = wa;
                    group.whiteCountAll++;
                    if(k < oldGroup.whiteCount){
                        group.selectedNode[k] = wa;
                        group.whiteCount++;
                    }
                    data.oldAddr.push(group.whiteMap[k]);
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
        // TODO; 如果没有白名单, 用旧的.
        // 如果有, 完整替换.　新白名单不能与旧的有重叠．
        // 3个替换4个也可以.
        // TODO handle the old group member. set the group deposit.
        if(preGroupId != bytes32(0x00)) {
            oldGroup = data.groups[preGroupId];
            data.oldAddr.length = 0;
            for(uint m = oldGroup.whiteCount; m<oldGroup.memberCountDesign; m++) {
                address skAddr = oldGroup.selectedNode[m];
                StoremanType.Candidate storage sk = data.candidates[skAddr];
                if(sk.groupId == preGroupId && sk.quited == false && sk.slashedCount < data.conf.maxSlashedCount) {
                    group.selectedNode[group.selectedCount] = sk.pkAddress;
                    sk.nextGroupId = group.groupId;
                    group.selectedCount++;
                    group.memberCount++;
                    data.oldAddr.push(sk.pkAddress);
                }
            }
            emit storemanTransferEvent(group.groupId, preGroupId, data.oldAddr);
        }
    }
    function delegateOut(StoremanType.StoremanData storage data, address skPkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        require(checkCanStakeOut(data, skPkAddr),"selecting");

        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        dk.quited = true;
        sk.delegateDeposit -= dk.deposit.getLastValue();
    }

    function delegateClaim(StoremanType.StoremanData storage data, address skPkAddr) external {
        require(checkCanStakeClaim(data,skPkAddr),"Cannot claim");

        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        uint amount = dk.deposit.getLastValue();
        dk.deposit.clean();

        address lastDkAddr = sk.delegatorMap[sk.delegatorCount-1];
         StoremanType.Delegator storage laskDk = sk.delegators[lastDkAddr];
        sk.delegatorMap[dk.index] = lastDkAddr;
        laskDk.index = dk.index;

        delete sk.delegatorMap[sk.delegatorCount-1];
        sk.delegatorCount--;
        delete sk.delegators[msg.sender];

        dk.sender.transfer(amount);
        emit delegateClaimEvent(skPkAddr, msg.sender, amount);
    }
    

    function delegateIncentiveClaim(StoremanType.StoremanData storage data, address skPkAddr) external {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];

        uint amount = dk.incentive[0];
        dk.incentive[0] = 0;

        if(amount!=0){
            dk.sender.transfer(amount);
        }
        emit delegateIncentiveClaimEvent(msg.sender,skPkAddr,amount);
    }


    function partIn(StoremanType.StoremanData storage data, address skPkAddr)
        external
    {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        StoremanType.Partner storage pn = sk.partners[msg.sender];
        if(pn.sender == address(0x00)) {
            sk.partMap[sk.partnerCount] = msg.sender;
            pn.index = sk.partnerCount;
            sk.partnerCount++;
            pn.sender = msg.sender;
            pn.staker = skPkAddr;
            sk.partners[msg.sender] = pn;
        }
        sk.partnerDeposit = sk.partnerDeposit.add(msg.value);
        uint day = StoremanUtil.getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        pn.deposit.addRecord(r);
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
	    emit partInEvent(skPkAddr, msg.sender, msg.value);
    }

    function partOut(StoremanType.StoremanData storage data, address skPkAddr) external {
        require(checkCanStakeOut(data, skPkAddr),"selecting");

        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");

        StoremanType.Partner storage pn = sk.partners[msg.sender];
        pn.quited = true;
        sk.partnerDeposit = sk.partnerDeposit.sub(pn.deposit.getLastValue());
    }
    function partClaim(StoremanType.StoremanData storage data, address skPkAddr) external {
        require(checkCanStakeClaim(data,skPkAddr),"Cannot claim");
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        StoremanType.Partner storage pn = sk.partners[msg.sender];
        uint amount = pn.deposit.getLastValue();
        pn.deposit.clean();

        address lastPnAddr = sk.partMap[sk.delegatorCount-1];
        StoremanType.Partner storage laskPn = sk.partners[lastPnAddr];
        sk.partMap[pn.index] = lastPnAddr;
        laskPn.index = pn.index;

        delete sk.partMap[sk.partnerCount-1];
        sk.partnerCount--;
        delete sk.partners[msg.sender];

        pn.sender.transfer(amount);
    }
}
