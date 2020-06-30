pragma solidity ^0.4.24;

import "../lib/Deposit.sol";

library StoremanType {
    using Deposit for Deposit.Records;
    enum GroupStatus {none, initial,failed,selected,ready,retired, dismissed}

    struct Delegator {
        address sender; // the delegator wallet address
        address staker;
        bool  quited;
        //bool  claimed;
        //uint  deposit;
        uint index; // for delete from candidate;
        uint  incentive;
        Deposit.Records deposit;
    }
    struct Candidate {
        address sender;
        bytes enodeID;
        bytes PK;
        address  pkAddress; // 合约计算一下.
        bool  quited;
        //bool  claimed;// 不需要??? 提取后deposit归零.
        bool  selected;
        uint  delegateFee;
        uint  delegatorCount;
        uint  delegateDeposit; // only used when selecting. need not records.
        uint  incentive;       // without delegation.. set to 0 after incentive.
        uint  incentivedDelegator; // 计算了多少个delegator的奖励, == delegatorCount 表示奖励都计算完成了.
        uint  incentivedDay;
        bytes32  groupId;
        bytes32  nextGroupId;
        Deposit.Records  deposit;         // 自有资金记录
        
        mapping(uint=>address) addrMap;
        mapping(address=>Delegator) delegators;
    }
    struct GroupConfig {
        uint memberCountDesign;
        uint threshold;
    }

    struct StoremanGroup {
        bytes32    groupId;
        uint    txFeeRatio;               /// the fee ratio required by storeman group
        GroupStatus    status;
        Deposit.Records    deposit;                  //用于计算group的总收益
        Deposit.Records     depositWeight;            /// 用于在group内给各个成员分配利润.
        uint    unregisterApplyTime;      /// the time point for storeman group applied unregistration
        uint selectedCount;
        uint memberCount;
        uint whiteCount;
        uint  workDay;
        uint  totalDays;
        uint memberCountDesign;
        uint threshold;
        bytes chain;
        mapping(uint=>address) addrMap;
        mapping(uint=>address) selectedNode;
        mapping(uint=>address) whiteMap;
        mapping(address=>address) whiteWk;   // the white list specified when start group. 储存白名单对应的钱包地址.
        mapping(uint=>uint) groupIncentive; // by day.
    }
  
    struct StoremanData {
        uint crossChainCo;//need to mul 1000
        uint chainTypeCo; //need to mul 1000  
        mapping(bytes32 => StoremanType.StoremanGroup)  groups;
        mapping(bytes => mapping(bytes => bytes32))  storemanGroupMap;
        mapping(address=>StoremanType.Candidate) candidates;
    }
}