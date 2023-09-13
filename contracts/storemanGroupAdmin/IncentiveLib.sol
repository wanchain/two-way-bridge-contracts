// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;
import "./StoremanType.sol";
import "../interfaces/IPosLib.sol";
import "../interfaces/IMetric.sol";
import "../interfaces/IListGroup.sol";
import "./StoremanUtil.sol";

library IncentiveLib {
    using Deposit for Deposit.Records;
    using SafeMath for uint;
    uint public constant DIVISOR = 10000;

    event incentiveEvent(bytes32 indexed groupId, address indexed wkAddr, bool indexed finished, uint from, uint end);
    event selectedEvent(bytes32 indexed groupId, uint indexed count, address[] members);
    function getChainTypeCo(StoremanType.StoremanData storage data, uint chain1, uint chain2) public view returns(uint co){
        if(chain1 < chain2) {
            co = data.chainTypeCo[chain1][chain2];
        } else {
            co = data.chainTypeCo[chain2][chain1];
        }
        if(co == 0){
            return data.conf.chainTypeCoDefault;
        }
        return co;
    }

    function getGroupIncentive(address groupListAddr, StoremanType.StoremanGroup storage group, uint day,StoremanType.StoremanData storage data) private returns (uint) {
        uint chainTypeCo = getChainTypeCo(data,group.chain1, group.chain2);
        uint totalDeposit = IListGroup(groupListAddr).getTotalDeposit(day);
        if(totalDeposit == 0){
            bytes32[] memory groupIds = IListGroup(groupListAddr).getActiveGroupIds(day);
            for(uint i=0; i<groupIds.length; i++){
                totalDeposit = totalDeposit.add(data.groups[groupIds[i]].deposit.getValueById(day));
            }
            require(totalDeposit != 0, "internal error");
            IListGroup(groupListAddr).setTotalDeposit(day, totalDeposit);
        }
        return IPosLib(data.posLib).getMinIncentive(group.deposit.getValueById(day),day, totalDeposit).mul(chainTypeCo).div(DIVISOR);
    }

    function calIncentive(uint groupIncentive, uint groupWeight, uint weight) private pure returns (uint) {
        return groupIncentive.mul(weight).div(groupWeight);
    }
    function checkMetric(IMetric metric, bytes32 groupId, uint day, uint index) private returns (bool) {
        if(index == 0) {
            return true; // leader is always OK.
        }
        uint[] memory counts = metric.getPrdInctMetric(groupId, day, day);
        uint leadCount = counts[0];
        if(leadCount < 6) {
            return true;
        }
        uint nodeCount = counts[index];
        if(nodeCount >= leadCount/2){
            return true;
        }
        return false;
    }
    function rotateSkGroup(address posLib, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group) public {
        if(sk.incentivedDay+1 == StoremanUtil.getDaybyTime(posLib, group.workTime+group.totalTime) && group.status == StoremanType.GroupStatus.dismissed) {
            if(sk.nextGroupId != bytes32(0x00)) {
                sk.groupId = sk.nextGroupId;
                sk.nextGroupId = bytes32(0x00);
            } else {
                // if  whitelist, set groupId = 0
                if(sk.isWhite){
                    sk.groupId = bytes32(0x00);
                }
            }
        }
    }
    function calFromEndDay(address posLib, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group) private view returns(uint,uint) {
        uint fromDay = StoremanUtil.getDaybyTime(posLib, group.workTime);
        if (fromDay <= sk.incentivedDay){
            fromDay = sk.incentivedDay + 1;
        }
        uint endDay = block.timestamp;
        if (endDay > group.workTime + group.totalTime) {
            endDay = group.workTime + group.totalTime;
        }
        endDay = StoremanUtil.getDaybyTime(posLib, endDay);
        return (fromDay, endDay);
    }

    function checkPartQuited(address listGroupAddr, StoremanType.Candidate storage sk, address pnAddr) private view returns(bool){
        bytes32 QuitGroupId;
        bytes32 QuitNextGroupId;
        (QuitGroupId,QuitNextGroupId) = IListGroup(listGroupAddr).getPartQuitGroupId(sk.wkAddr, pnAddr);
        StoremanType.Delegator storage pn = sk.partners[pnAddr];
        if(pn.quited && QuitGroupId != sk.groupId && QuitNextGroupId != sk.groupId){
            return true;
        }
        return false;
    }
    function checkDelegateQuited(address listGroupAddr, StoremanType.Candidate storage sk, address deAddr) private view returns(bool){
        bytes32 QuitGroupId;
        bytes32 QuitNextGroupId;
        (QuitGroupId,QuitNextGroupId) = IListGroup(listGroupAddr).getDelegateQuitGroupId(sk.wkAddr, deAddr);
        StoremanType.Delegator storage de = sk.delegators[deAddr];
        if(de.quited && QuitGroupId != sk.groupId && QuitNextGroupId != sk.groupId){
            return true;
        }
        return false;
    }
    function incentiveNode(uint day, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group,StoremanType.StoremanData storage data, address listGroupAddr) public {
        sk.incentive[day] = calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), StoremanUtil.calSkWeight(data.conf.standaloneWeight,sk.deposit.getValueById(day)));
        sk.incentive[0] =  sk.incentive[0].add(sk.incentive[day]);
        data.totalReward = data.totalReward.add(sk.incentive[day]);
        for(uint m=0; m<sk.partnerCount; m++){
            if(checkPartQuited(listGroupAddr, sk, sk.partMap[m])){
                continue;
            }
            
            uint partnerWeight = StoremanUtil.calSkWeight(data.conf.standaloneWeight, sk.partners[sk.partMap[m]].deposit.getValueById(day));
            uint partnerReward = calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), partnerWeight);
            sk.incentive[day] = sk.incentive[day].add(partnerReward);
            sk.incentive[0] = sk.incentive[0].add(partnerReward);
            data.totalReward = data.totalReward.add(partnerReward);
        }
    }
    function incentiveDelegator(uint day, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group,StoremanType.StoremanData storage data, address listGroupAddr) public {
        address deAddr = sk.delegatorMap[sk.incentivedDelegator];
        if(checkDelegateQuited(listGroupAddr, sk, deAddr)){
            sk.incentivedDelegator++;
            return;            
        }

        uint incs = calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), sk.delegators[deAddr].deposit.getValueById(day));
        uint incSk = incs.mul(group.delegateFee).div(DIVISOR);
        uint incDe = incs.sub(incSk);
        sk.delegators[deAddr].incentive[day] = sk.delegators[deAddr].incentive[day].add(incDe);
        sk.delegators[deAddr].incentive[0] = sk.delegators[deAddr].incentive[0].add(incDe);
        sk.incentive[day] = sk.incentive[day].add(incSk);
        sk.incentive[0] = sk.incentive[0].add(incSk);
        data.totalReward = data.totalReward.add(incs);
        sk.incentivedDelegator++;
    }

    /*
    @dev The logic of incentive
    1) get the incentive by day and groupID.
    If the incentive array by day haven't got from low level, the tx will try to get it.
    so the one who first incentive will spend more gas.
    2) calculate the sk incentive every days.
    3) calculate the delegator every days one by one.
     */    
    function incentiveCandidator(StoremanType.StoremanData storage data, address wkAddr,  address metricAddr, address listGroupAddr) public {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.StoremanGroup storage group = data.groups[sk.groupId];
        require(group.status >= StoremanType.GroupStatus.ready, "not ready");
        uint fromDay; uint endDay;
        uint reservedGas = 2500000;
        (fromDay, endDay) = calFromEndDay(data.posLib, sk, group);

        uint day;
        uint idx = 0;
        for (; idx < group.selectedCount; idx++) {
            address addr = group.selectedNode[idx];
            if (addr == sk.wkAddr) {
                break;
            }
        }
        require(idx < group.selectedCount, "not selected");

        for (day = fromDay; day < endDay; day++) {
            if (gasleft() < reservedGas ) { // check the gas. because calculate delegator incentive need more gas left.
                emit incentiveEvent(sk.groupId, wkAddr, false, fromDay, day);
                return;
            }
            if (group.groupIncentive[day] == 0) {
                group.groupIncentive[day] = getGroupIncentive(listGroupAddr, group, day, data);
            }

            if(checkMetric(IMetric(metricAddr), sk.groupId, day, idx)){
                if(0 == sk.incentive[day]) {
                    incentiveNode(day, sk,group,data, listGroupAddr);
                }
                while (sk.incentivedDelegator < sk.delegatorCount) {
                    if (gasleft() < reservedGas ) {
                        emit incentiveEvent(sk.groupId, wkAddr, false, fromDay, 0);
                        return;
                    }
                    incentiveDelegator(day, sk,group,data,listGroupAddr);
                }
            }
            sk.incentivedDay = day;
            rotateSkGroup(data.posLib, sk, group);
            sk.incentivedDelegator = 0;
        }
        emit incentiveEvent(sk.groupId, wkAddr, true, fromDay, endDay-1);
    }

    function setGroupDeposit(StoremanType.StoremanData storage data,StoremanType.StoremanGroup storage group) public {
        uint day = StoremanUtil.getDaybyTime(data.posLib, group.workTime);
        uint groupDeposit = 0;
        uint groupDepositWeight = 0;
        for(uint i = 0; i<group.memberCountDesign; i++){
            StoremanType.Candidate storage sk = data.candidates[0][group.selectedNode[i]];
            groupDeposit = groupDeposit.add(sk.deposit.getLastValue().add(sk.partnerDeposit).add(sk.delegateDeposit));
            groupDepositWeight = groupDepositWeight.add(StoremanUtil.calSkWeight(data.conf.standaloneWeight,sk.deposit.getLastValue().add(sk.partnerDeposit)).add(sk.delegateDeposit));
        }
        Deposit.Record memory deposit = Deposit.Record(day, groupDeposit);
        Deposit.Record memory depositWeight = Deposit.Record(day, groupDepositWeight);
        group.deposit.clean();
        group.depositWeight.clean();
        group.deposit.addRecord(deposit);
        group.depositWeight.addRecord(depositWeight);
        return;        
    }
    function cleanSmNode(StoremanType.Candidate storage skt, bytes32 groupId) public {
        if(skt.isWhite){
            if(skt.groupId == groupId){
                skt.groupId = bytes32(0x00);
            }else if(skt.nextGroupId == groupId){
                skt.nextGroupId = bytes32(0x00);
            }
        }        
    }

    function toSelect(StoremanType.StoremanData storage data,bytes32 groupId) public {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(group.status == StoremanType.GroupStatus.curveSeted,"Wrong status");
        require(block.timestamp > group.registerTime + group.registerDuration, "Wrong time");
        if(group.memberCount < group.memberCountDesign){
            group.status = StoremanType.GroupStatus.failed;
            for(uint k=0; k<group.whiteCountAll; k++){
                StoremanType.Candidate storage skt = data.candidates[0][group.whiteMap[k]];
                cleanSmNode(skt, groupId);
            }
            return;
        }
        address[] memory members = new address[](group.memberCountDesign);
        for(uint i = 0; i<group.memberCountDesign; i++){
            members[i] = group.selectedNode[i];
        }

        emit selectedEvent(groupId, group.memberCountDesign, members);
        group.status = StoremanType.GroupStatus.selected;
        setGroupDeposit(data,group);
        return;
    }
}
