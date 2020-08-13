pragma solidity ^0.4.24;

import "../lib/Deposit.sol";

library StoremanType {
    using Deposit for Deposit.Records;
    enum GroupStatus {none, initial,curveSeted, failed,selected,ready,unregistered, dismissed}
    //ready: gpk finished.
    

    struct Delegator {
        address sender; // the delegator wallet address
        address staker;
        bool  quited;
        uint index; // for delete from candidate;
        Deposit.Records deposit;
        mapping(uint=>uint) incentive;
    }
    struct Partner {
        address sender; // the delegator wallet address
        address staker;
        bool  quited;
        uint index; // for delete from candidate;
        Deposit.Records deposit;
    }
    struct Candidate {
        address sender;
        bytes enodeID;
        bytes PK;
        address  pkAddress;
        bool  quited;
        bool  selected;
        uint  delegatorCount;
        uint  delegateDeposit; // only used when selecting. need not records.
        uint  partnerCount;
        uint  partnerDeposit;
        uint  crossIncoming;
        uint  slashedCount;

        uint  incentivedDelegator; // 计算了多少个delegator的奖励, == delegatorCount 表示奖励都计算完成了.
        uint  incentivedDay;
        bytes32  groupId;
        bytes32  nextGroupId;
        Deposit.Records  deposit;         // 自有资金记录
        
        mapping(uint=>uint) incentive;       // without delegation.. set to 0 after incentive.        
        mapping(uint=>address) addrMap;
        mapping(address=>Delegator) delegators;
        mapping(address=>Partner) partners;
        
    }

    struct StoremanGroup {
        bytes32    groupId;
        GroupStatus    status;
        Deposit.Records    deposit;                  //用于计算group的总收益
        Deposit.Records     depositWeight;            /// 用于在group内给各个成员分配利润.
        uint selectedCount;
        uint memberCount;
        uint whiteCount;    // only used node, don't include backup.
        uint whiteCountAll; // all
        uint workTime;
        uint totalTime;
        uint registerTime;
        uint registerDuration; // how long allow to staking. check when stakeIn tx.
        uint memberCountDesign;
        uint threshold;
        uint chain1;
        uint chain2;
        uint curve1;
        uint curve2;
        uint tickedCount;
        uint minStakeIn;
        uint crossIncoming;
        bytes gpk1;
        bytes gpk2;
        uint delegateFee;
        mapping(uint=>uint) tickedType;
        mapping(uint=>address) tickedNode;
        mapping(uint=>address) addrMap;
        mapping(uint=>address) selectedNode;
        mapping(uint=>address) whiteMap;
        mapping(address=>address) whiteWk;   // the white list specified when start group. 储存白名单对应的钱包地址.
        mapping(uint=>uint) groupIncentive; // by day.
    }
    struct StoremanGlobalConf {
        uint standaloneWeight; // defult 15000; need mul 10000
        uint DelegationMulti;  // 10
        uint backupCount;  // 3
        uint chainTypeCoDefault; //10000
        uint maxSlashedCount;
    }
    struct StoremanData {
        uint contribution;
        uint totalReward;
        StoremanGlobalConf conf;
        address[] oldAddr;
        
        mapping(bytes32 => StoremanType.StoremanGroup)  groups;
        mapping(address=>StoremanType.Candidate) candidates;
        mapping(uint=> mapping(uint => uint)) chainTypeCo;
    }
}
