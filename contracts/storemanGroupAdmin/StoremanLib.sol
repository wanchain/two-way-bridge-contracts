pragma solidity ^0.4.24;

import "./StoremanType.sol";


library StoremanLib {
    using Deposit for Deposit.Records;
    event stakeInEvent(bytes32 indexed index,address indexed pkAddr);

    function getDaybyTime(uint time)  public pure returns(uint) {
        return time/10; // TODO; get the day. not minute.
    }
    function calSkWeight(uint deposit) public  returns(uint) {
        return deposit*15/10;
    }

    function stakeIn(StoremanType.StoremanData storage data, bytes32 groupId, bytes PK, bytes enodeID, uint delegateFee) public
    {
        address pkAddr = address(keccak256(PK));
        Deposit.Records memory records = Deposit.Records(0);
        StoremanType.Candidate memory sk = StoremanType.Candidate({
            sender:msg.sender,
            enodeID:enodeID,
            PK:PK,
            pkAddress:pkAddr, // 合约计算一下.
            quited:false,
            selected:false,
            delegateFee:delegateFee,
            delegatorCount:0,
            delegateDeposit:0,
            groupId: groupId,
            incentivedDay: 0,
            nextGroupId: bytes32(0x00),
            incentivedDelegator:0, // 计算了多少个delegator的奖励, == delegatorCount 表示奖励都计算完成了.
            deposit:records
        });

        StoremanType.StoremanGroup storage group = data.groups[groupId];
        data.candidates[pkAddr] = sk;
        group.addrMap[group.memberCount] = sk.pkAddress;
        group.memberCount++;

        uint day = getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        data.candidates[pkAddr].deposit.addRecord(r);

        //check if it is white
        if(group.whiteWk[pkAddr] != address(0x00)){
            if(group.whiteWk[pkAddr] != msg.sender){
                revert("invalid sender");
            }
        } else {
            realInsert(data,group, pkAddr, calSkWeight(msg.value), group.memberCountDesign-1);
        }

        emit stakeInEvent(group.groupId, pkAddr);
    }

    function stakeAppend(StoremanType.StoremanData storage data,  address skPkAddr) internal  {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        require(sk.sender == msg.sender, "Only the sender can use stakeAppend");

        uint day = getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        sk.deposit.addRecord(r);
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
    }

    function stakeOut(StoremanType.StoremanData storage data,  address skPkAddr) internal {
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
    
    function stakeClaim(StoremanType.StoremanData storage data, address skPkAddr) public {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];

        // 两个group分别检查.
        require(checkCanClaim(sk, group), "group can't claim");
        require(checkCanClaim(sk, nextGroup), "nextGroup can't claim");

        uint amount = sk.incentive[0];
        amount += sk.deposit.getLastValue();
        
        sk.incentive[0] = 0;
        sk.deposit.clean();
        
        require(amount != 0);        
        sk.sender.transfer(amount);
        // TODO; transfer crossIncoming/21;

    }
    function realInsert(StoremanType.StoremanData storage data, StoremanType.StoremanGroup storage  group, address skAddr, uint weight, uint last) internal{
        for(uint j = last; j>=group.whiteCount; j--) {
            if(weight > data.candidates[group.selectedNode[j]].delegateDeposit + calSkWeight(data.candidates[group.selectedNode[j]].deposit.getLastValue())){
                continue;
            }
            break;
        }
        if(j<last){
            for(uint k = last-1; k>j; k--){
                group.selectedNode[k+1] = group.selectedNode[k];
            }
            group.selectedNode[j+1] = skAddr;
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
                for(uint selectedIndex = group.whiteCount; selectedIndex<group.memberCountDesign; selectedIndex++){
                    if(group.selectedNode[selectedIndex] == skPkAddr) {
                        break;
                    }
                }
                realInsert(data, group, skPkAddr, calSkWeight(sk.deposit.getLastValue())+sk.delegateDeposit, selectedIndex);
            }
        }
    }
    function delegateIn(StoremanType.StoremanData storage data, address skPkAddr) // TODO only change the first group? ???????
        public 
    {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];        

        StoremanType.Delegator storage dk = sk.delegators[msg.sender];
        if(dk.sender == address(0x00)) {
            sk.addrMap[sk.delegatorCount] = msg.sender;
            dk.index = sk.delegatorCount;
            sk.delegatorCount++;
            dk.sender = msg.sender;
            dk.staker = skPkAddr;
            sk.delegators[msg.sender] = dk;
        }
        sk.delegateDeposit += msg.value;
        uint day = getDaybyTime(now);
        Deposit.Record memory r = Deposit.Record(day, msg.value);
        dk.deposit.addRecord(r);
        updateGroup(data, sk, group, r);
        updateGroup(data, sk, nextGroup, r);
    }
    function delegateOut(StoremanType.StoremanData storage data, address skPkAddr) public {
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

    function delegateClaim(StoremanType.StoremanData storage data, address skPkAddr) public {
        StoremanType.Candidate storage sk = data.candidates[skPkAddr];
        require(sk.pkAddress == skPkAddr, "Candidate doesn't exist");
        StoremanType.StoremanGroup storage  group = data.groups[sk.groupId];
        StoremanType.StoremanGroup storage  nextGroup = data.groups[sk.nextGroupId];
        StoremanType.Delegator storage dk = sk.delegators[msg.sender];

        // 两个group分别检查.
        require(checkCanClaim(sk, group), "group can't claim");
        require(checkCanClaim(sk, nextGroup), "nextGroup can't claim");

        uint amount;
        amount = dk.incentive[0];
        amount += dk.deposit.getLastValue();
        dk.sender.transfer(amount);
        dk.incentive[0] = 0;
        dk.deposit.clean();

        sk.addrMap[dk.index] = sk.addrMap[sk.delegatorCount];
        delete sk.addrMap[sk.delegatorCount];
        sk.delegatorCount--;
        delete sk.delegators[msg.sender];
    }



}
