pragma solidity ^0.4.24;
import "./StoremanType.sol";
import "../lib/PosLib.sol";
import "../interfaces/IMetric.sol";
import "./StoremanUtil.sol";

library IncentiveLib {
    using Deposit for Deposit.Records;

    event incentiveEvent(bytes32 indexed groupId, address indexed pkAddr, bool indexed finished, uint from, uint end);
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

    function getGroupIncentive(StoremanType.StoremanGroup storage group, uint day,StoremanType.StoremanData storage data) public view returns (uint) {
        uint chainTypeCo = getChainTypeCo(data,group.chain1, group.chain2);
        return PosLib.getMinIncentive(group.deposit.getLastValue(),day) * chainTypeCo/10000;
    }

    function calIncentive(uint groupIncentive, uint groupWeight, uint weight) public returns (uint) {
        if (groupWeight == 0) {
            return 0;
        } else {
            return groupIncentive*weight/groupWeight;
        }
    }
    function checkMetric(IMetric metric, StoremanType.StoremanGroup storage group, uint day, uint index) internal returns (bool) {
        if(index == 0) {
            return true; // leader is always OK.
        }
        uint leadCount = metric.getPrdInctMetric(group.groupId, day, day)[0];
        if(leadCount < 6) {
            return true;
        }
        uint nodeCount = metric.getPrdInctMetric(group.groupId, day, day)[index];
        if(nodeCount >= leadCount/2){
            return true;
        }
        return false;
    }
    function rotateSkGroup(StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group) internal {
            if(sk.incentivedDay+1 == StoremanUtil.getDaybyTime(group.workTime+group.totalTime) && group.status == StoremanType.GroupStatus.dismissed) {
                if(bytes32(0x00) != sk.nextGroupId) {
                    sk.groupId = sk.nextGroupId;
                }
                sk.nextGroupId = bytes32(0x00);
            }        
    }
    function calFromEndDay(StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group)public returns(uint,uint) {
        uint fromDay = StoremanUtil.getDaybyTime(group.workTime);
        if (sk.incentivedDay != 0) {
            fromDay = sk.incentivedDay + 1;
        }
        uint endDay = now;
        if (endDay > group.workTime + group.totalTime) {
            endDay = group.workTime + group.totalTime;
        }
        endDay= StoremanUtil.getDaybyTime(endDay);
        return (fromDay, endDay);
    }
    function incentiveNode(uint day, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group,StoremanType.StoremanData storage data) public {
        sk.incentive[day] = calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), StoremanUtil.calSkWeight(data.conf.standaloneWeight,sk.deposit.getValueById(day)));
        sk.incentive[0] += sk.incentive[day];
        data.totalReward += sk.incentive[day];
        for(uint m=0; m<sk.partnerCount; m++){
            sk.incentive[day] += calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), StoremanUtil.calSkWeight(data.conf.standaloneWeight,sk.partners[0].deposit.getValueById(day)));
        }
    }
    function incentiveDelegator(uint day, StoremanType.Candidate storage sk, StoremanType.StoremanGroup storage group,StoremanType.StoremanData storage data) public {
        address deAddr = sk.addrMap[sk.incentivedDelegator];
        sk.delegators[deAddr].incentive[day] = calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), sk.delegators[deAddr].deposit.getValueById(day));
        sk.delegators[deAddr].incentive[0] += sk.delegators[deAddr].incentive[day];
        data.totalReward += sk.delegators[deAddr].incentive[day];
        sk.incentivedDelegator++;
    }
    function incentiveCandidator(StoremanType.StoremanData storage data, address wkAddr, IMetric metric) public {
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        StoremanType.StoremanGroup storage group = data.groups[sk.groupId];
        uint fromDay; uint endDay;
        (fromDay, endDay) = calFromEndDay(sk, group);
        // uint fromDay = StoremanUtil.getDaybyTime(group.workTime);
        // if (sk.incentivedDay != 0) {
        //     fromDay = sk.incentivedDay + 1;
        // }
        // uint endDay = now;
        // if (endDay > group.workTime + group.totalTime) {
        //     endDay = group.workTime + group.totalTime;
        // }
        // endDay= StoremanUtil.getDaybyTime(endDay);

        uint day;
        for (day = fromDay; day < endDay; day++) {
            if (msg.gas < 5000000 ) { // check the gas. because calculate delegator incentive need more gas left.
                emit incentiveEvent(group.groupId, wkAddr, false, fromDay, 0);
                return;
            }
            if (group.groupIncentive[day] == 0) {
                group.groupIncentive[day] = getGroupIncentive(group, day, data);
            }
            uint idx = 0;
            for (; idx < group.selectedCount; idx++) {
                address addr = group.selectedNode[idx];
                if (addr == sk.pkAddress) {
                    break;
                }
            }
            require(idx < group.selectedCount, "not selected");
            if(checkMetric(metric, group, day, idx)){
                if(0 == sk.incentive[day]) {
                    incentiveNode(day, sk,group,data);
                    // sk.incentive[day] = calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), StoremanUtil.calSkWeight(data.conf.standaloneWeight,sk.deposit.getValueById(day)));
                    // sk.incentive[0] += sk.incentive[day];
                    // data.totalReward += sk.incentive[day];
                    // for(uint m=0; m<sk.partnerCount; m++){
                    //     sk.incentive[day] += calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), StoremanUtil.calSkWeight(data.conf.standaloneWeight,sk.partners[0].deposit.getValueById(day)));
                    // }
                }
                while (sk.incentivedDelegator != sk.delegatorCount) {
                    if (msg.gas < 5000000 ) { // check the gas. because calculate delegator incentive need more gas left.
                        emit incentiveEvent(group.groupId, wkAddr, false, fromDay, 0);
                        return;
                    }
                    incentiveDelegator(day, sk,group,data);
                    // address deAddr = sk.addrMap[sk.incentivedDelegator];
                    // sk.delegators[deAddr].incentive[day] = calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), sk.delegators[deAddr].deposit.getValueById(day));
                    // sk.delegators[deAddr].incentive[0] += sk.delegators[deAddr].incentive[day];
                    // data.totalReward += sk.delegators[deAddr].incentive[day];
                    // sk.incentivedDelegator++;
                }
            }
            sk.incentivedDay = day;
            rotateSkGroup(sk, group);
            // if(sk.incentivedDay+1 == StoremanUtil.getDaybyTime(group.workTime+group.totalTime) && group.status == StoremanType.GroupStatus.dismissed) {
            //     if(bytes32(0x00) != sk.nextGroupId) {
            //         sk.groupId = sk.nextGroupId;
            //     }
            //     sk.nextGroupId = bytes32(0x00);
            // }
            sk.incentivedDelegator = 0;
        }
        emit incentiveEvent(group.groupId, wkAddr, true, fromDay, endDay-1);
    }

    event selectedEvent(bytes32 indexed groupId, uint indexed count, address[] members);
    function toSelect(StoremanType.StoremanData storage data,bytes32 groupId) public {
        StoremanType.StoremanGroup storage group = data.groups[groupId];
        if(group.memberCount < group.memberCountDesign){
             group.status = StoremanType.GroupStatus.failed;
            return;
        }
        // first, select the sm from white list.
        // TODO: check all white list should stakein.
        for(uint m = 0; m<group.whiteCount;m++){
            group.selectedNode[m] = group.whiteMap[m];
        }
        address[] memory members = new address[](group.memberCountDesign);
        uint groupDeposit = 0;
        uint groupDepositWeight = 0;
        uint day = group.workTime;
        for(uint i = 0; i<group.memberCountDesign; i++){
            members[i] = group.selectedNode[i];
            StoremanType.Candidate storage sk = data.candidates[group.selectedNode[i]];
            groupDeposit += (sk.deposit.getLastValue()+sk.delegateDeposit);
            groupDepositWeight += (StoremanUtil.calSkWeight(data.conf.standaloneWeight,sk.deposit.getLastValue())+sk.delegateDeposit);
        }
        Deposit.Record memory deposit = Deposit.Record(day, groupDeposit);
        Deposit.Record memory depositWeight = Deposit.Record(day, groupDepositWeight);
        emit selectedEvent(group.groupId, group.memberCountDesign, members);
        group.status = StoremanType.GroupStatus.selected;
        group.deposit.addRecord(deposit);
        group.depositWeight.addRecord(depositWeight);
        return;
    }
 
}
