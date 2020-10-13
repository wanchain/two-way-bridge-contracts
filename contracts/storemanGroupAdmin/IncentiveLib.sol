pragma solidity ^0.4.24;
import "./StoremanType.sol";
import "../interfaces/IPosLib.sol";
import "../interfaces/IMetric.sol";
import "./StoremanUtil.sol";

library IncentiveLib {
    using Deposit for Deposit.Records;
    using SafeMath for uint;

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

    function getGroupIncentive(address posLib, StoremanType.StoremanGroup storage group, uint day,StoremanType.StoremanData storage data) private view returns (uint) {
        uint chainTypeCo = getChainTypeCo(data,group.chain1, group.chain2);
        uint totalDeposit = address(this).balance.sub(data.contribution).add(data.totalReward);
        return IPosLib(posLib).getMinIncentive(group.deposit.getLastValue(),day, totalDeposit).mul(chainTypeCo).div(10000);
    }

    function calIncentive(uint groupIncentive, uint groupWeight, uint weight) private returns (uint) {
        if (groupWeight == 0) {
            return 0;
        } else {
            return groupIncentive.mul(weight).div(groupWeight);
        }
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
    function rotateSkGroup(address posLib, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group) private {
        if(sk.incentivedDay+1 == StoremanUtil.getDaybyTime(posLib, group.workTime+group.totalTime) && group.status == StoremanType.GroupStatus.dismissed) {
            if(sk.nextGroupId != bytes32(0x00)) {
                sk.groupId = sk.nextGroupId;
                sk.nextGroupId = bytes32(0x00);
            }
        }
    }
    function calFromEndDay(address posLib, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group) private returns(uint,uint) {
        uint fromDay;
        if (sk.incentivedDay != 0) {
            fromDay = sk.incentivedDay + 1;
        } else {
            fromDay = StoremanUtil.getDaybyTime(posLib, group.workTime);
        }
        uint endDay = now;
        if (endDay > group.workTime + group.totalTime) {
            endDay = group.workTime + group.totalTime;
        }
        endDay = StoremanUtil.getDaybyTime(posLib, endDay);
        return (fromDay, endDay);
    }

    function incentiveNode(uint day, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group,StoremanType.StoremanData storage data) public {
        sk.incentive[day] = calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), StoremanUtil.calSkWeight(data.conf.standaloneWeight,sk.deposit.getValueById(day)));
        sk.incentive[0] =  sk.incentive[0].add(sk.incentive[day]);
        data.totalReward = data.totalReward.add(sk.incentive[day]);
        for(uint m=0; m<sk.partnerCount; m++){
            uint partnerWeight = StoremanUtil.calSkWeight(data.conf.standaloneWeight, sk.partners[sk.partMap[m]].deposit.getValueById(day));
            uint partnerReward = calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), partnerWeight);
            sk.incentive[day] = sk.incentive[day].add(partnerReward);
            sk.incentive[0] = sk.incentive[0].add(partnerReward);
            data.totalReward = data.totalReward.add(partnerReward);
        }
    }
    function incentiveDelegator(uint day, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group,StoremanType.StoremanData storage data) public {
        address deAddr = sk.delegatorMap[sk.incentivedDelegator];
        uint incs = calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), sk.delegators[deAddr].deposit.getValueById(day));
        uint incSk = incs.mul(group.delegateFee).div(10000);
        uint incDe = incs.sub(incSk);
        sk.delegators[deAddr].incentive[day] = incDe;
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
    function incentiveCandidator(StoremanType.StoremanData storage data, address wkAddr,  address metricAddr) public {
        StoremanType.Candidate storage sk = data.candidates[0][wkAddr];
        StoremanType.StoremanGroup storage group = data.groups[sk.groupId];
        require(group.status >= StoremanType.GroupStatus.ready, "not ready");
        uint fromDay; uint endDay;
        uint reservedGas = 2000000;
        (fromDay, endDay) = calFromEndDay(data.posLib, sk, group);

        uint day;
        for (day = fromDay; day < endDay; day++) {
            if (msg.gas < reservedGas ) { // check the gas. because calculate delegator incentive need more gas left.
                emit incentiveEvent(sk.groupId, wkAddr, false, fromDay, day);
                return;
            }
            if (group.groupIncentive[day] == 0) {
                group.groupIncentive[day] = getGroupIncentive(data.posLib, group, day, data);
            }
            uint idx = 0;
            for (; idx < group.selectedCount; idx++) {
                address addr = group.selectedNode[idx];
                if (addr == sk.wkAddr) {
                    break;
                }
            }
            require(idx < group.selectedCount, "not selected");
            if(checkMetric(IMetric(metricAddr), sk.groupId, day, idx)){
                if(0 == sk.incentive[day]) {
                    incentiveNode(day, sk,group,data);
                }
                while (sk.incentivedDelegator != sk.delegatorCount) {
                    if (msg.gas < reservedGas ) {
                        emit incentiveEvent(sk.groupId, wkAddr, false, fromDay, 0);
                        return;
                    }
                    incentiveDelegator(day, sk,group,data);
                }
            }
            sk.incentivedDay = day;
            rotateSkGroup(data.posLib, sk, group);
            sk.incentivedDelegator = 0;
        }
        emit incentiveEvent(sk.groupId, wkAddr, true, fromDay, endDay-1);
    }

    function setGroupDeposit(StoremanType.StoremanData storage data,StoremanType.StoremanGroup storage group){
        uint day = group.workTime;
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
    function toSelect(StoremanType.StoremanData storage data,bytes32 groupId) public {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        require(group.status == StoremanType.GroupStatus.curveSeted,"Wrong status");
        require(now > group.registerTime + group.registerDuration, "Wrong time");
        if(group.memberCount < group.memberCountDesign){
            group.status = StoremanType.GroupStatus.failed;
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
