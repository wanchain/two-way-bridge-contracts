pragma solidity ^0.4.24;

import "./StoremanType.sol";

import "../lib/PosLib.sol";

library IncentiveLib {
    using Deposit for Deposit.Records;
    event incentive(bytes32 indexed groupId, address indexed pkAddr, bool indexed finished);

    function getGroupIncentive(StoremanType.StoremanGroup storage group, uint time) public view returns (uint)  {
        return PosLib.getMinIncentive(Deposit.getLastValue(group.deposit), time, 10000, 10000);
        //return 30000000;
    }
    function getDaybyTime(uint time)  public pure returns(uint) {
        return time/10; // TODO; get the day. not minute.
    }
    function calIncentive(uint groupIncentive, uint groupWeight, uint weight) public returns (uint) {
        return groupIncentive*weight/groupWeight;
    }
    function calSkWeight(uint deposit) public  returns(uint) {
        return deposit*15/10;
    }

    
    function incentiveCandidator(StoremanType.StoremanData storage data, address wkAddr) public  {
        StoremanType.Candidate storage sk = data.candidates[wkAddr];
        StoremanType.StoremanGroup storage group = data.groups[sk.groupId];

        uint fromDay = group.workDay;
        if(sk.incentivedDay != 0) {
            fromDay = sk.incentivedDay + 1;
        }
        uint endDay = getDaybyTime(now)-1;
        if(endDay > group.workDay+group.totalDays) {
            endDay = group.workDay+group.totalDays;
        }
        uint day;
        for(day = fromDay; day < endDay; day++) {
            if(group.groupIncentive[day] == 0){
                group.groupIncentive[day] = getGroupIncentive(group, day); // TODO: change to the correct time
                sk.incentive += calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day),  calSkWeight(sk.deposit.getValueById(day)));
            }

            while(sk.incentivedDelegator != sk.delegatorCount) {
                address deAddr = sk.addrMap[sk.incentivedDelegator];
                StoremanType.Delegator storage de = sk.delegators[deAddr];
                de.incentive += calIncentive(group.groupIncentive[day], group.depositWeight.getValueById(day), de.deposit.getValueById(day));
            
                sk.incentivedDelegator++;
                if(msg.gas < 5000000 ){ // check the gas. because calculate delegator incentive need more gas left.
                    emit incentive(group.groupId, wkAddr, false);
                    return;
                }
            }
            //TODO: recoed the incentived day.
            sk.incentivedDay = day;
        }
        emit incentive(group.groupId, wkAddr, true);

            // TODO 所有的sk完成incentive,  sk的当前group变成nextGroup.
        
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
        uint day = group.workDay;
        for(uint i = 0; i<group.memberCountDesign; i++){
            members[i] = group.selectedNode[i];
            StoremanType.Candidate storage sk = data.candidates[group.selectedNode[i]];
            groupDeposit += (sk.deposit.getLastValue()+sk.delegateDeposit);
            groupDepositWeight += (calSkWeight(sk.deposit.getLastValue())+sk.delegateDeposit);
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