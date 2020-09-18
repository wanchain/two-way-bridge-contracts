pragma solidity ^0.4.26;

import "./Deposit.sol";

library StoremanType {
    using Deposit for Deposit.Records;
    enum GroupStatus {none, initial,curveSeted, failed,selected,ready,unregistered, dismissed}
    struct Delegator {
        bool  quited;
        uint index; 
        Deposit.Records deposit;
        mapping(uint=>uint) incentive;
    }

    struct Candidate {
        address sender;
        bytes enodeID;
        bytes PK;
        address  wkAddr;
        bool isWhite;
        bool quited;
        uint delegatorCount;
        uint delegateDeposit; 
        uint partnerCount;
        uint partnerDeposit;
        uint crossIncoming;
        uint slashedCount;

        uint incentivedDelegator; 
        uint incentivedDay;
        bytes32  groupId;
        bytes32  nextGroupId;
        Deposit.Records  deposit;         

        mapping(uint=>uint) incentive;       
        mapping(uint=>address) delegatorMap;
        mapping(address=>Delegator) delegators;
        mapping(uint=>address) partMap;
        mapping(address=>Delegator) partners;

    }

    struct StoremanGroup {

        GroupStatus    status;
        Deposit.Records    deposit;                  
        Deposit.Records     depositWeight;            
        uint selectedCount;
        uint memberCount;
        uint whiteCount;    
        uint whiteCountAll; 
        uint workTime;
        uint totalTime;
        uint registerTime;
        uint registerDuration; 
        uint memberCountDesign;
        uint threshold;
        uint chain1;
        uint chain2;
        uint curve1;
        uint curve2;
        uint tickedCount;
        uint minStakeIn;
        uint minDelegateIn;
        uint minPartIn;
        uint crossIncoming;
        bytes gpk1;
        bytes gpk2;
        uint delegateFee;
        mapping(uint=>uint) tickedType;
        mapping(uint=>address) tickedNode;
        mapping(uint=>address) skMap;
        mapping(uint=>address) selectedNode;
        mapping(uint=>address) whiteMap;
        mapping(address=>address) whiteWk;   
        mapping(uint=>uint) groupIncentive; 
    }
    struct StoremanGlobalConf {
        uint standaloneWeight; 
        uint DelegationMulti;  
        uint backupCount;  
        uint chainTypeCoDefault; 
        uint maxSlashedCount;
    }
    struct StoremanData {
        uint contribution;
        uint totalReward;
        address posLib;

        StoremanGlobalConf conf;

        mapping(bytes32 => StoremanType.StoremanGroup)  groups;
        mapping(uint=>mapping(address=>StoremanType.Candidate)) candidates;
        mapping(uint=> mapping(uint => uint)) chainTypeCo;
    }
    struct StoremanInfo {
        address sender;
        bytes enodeID;
        bytes PK;
        address  wkAddr;
        bool isWhite;
        bool quited;
        uint delegatorCount;
        uint delegateDeposit;
        uint partnerCount;
        uint partnerDeposit;
        uint crossIncoming;
        uint slashedCount;

        uint incentivedDelegator;
        uint incentivedDay;
        bytes32  groupId;
        bytes32  nextGroupId;
        uint  deposit;
        uint incentive;
    }
    struct StoremanGroupInfo {
        bytes32    groupId;
        GroupStatus    status;
        uint    deposit;                  
        uint    depositWeight;            
        uint selectedCount;
        uint memberCount;
        uint whiteCount;    
        uint whiteCountAll; 
        uint startTime;
        uint endTime;
        uint registerTime;
        uint registerDuration; 
        uint memberCountDesign;
        uint threshold;
        uint chain1;
        uint chain2;
        uint curve1;
        uint curve2;
        uint tickedCount;
        uint minStakeIn;
        uint minDelegateIn;
        uint minPartIn;
        uint crossIncoming;
        bytes gpk1;
        bytes gpk2;
        uint delegateFee;
    }
    struct StoremanGroupInput {
        bytes32    groupId;
        bytes32    preGroupId;
        uint workTime;
        uint totalTime;
        uint registerDuration;
        uint memberCountDesign;
        uint threshold;
        uint chain1;
        uint chain2;
        uint curve1;
        uint curve2;
        uint minStakeIn;
        uint minDelegateIn;
        uint minPartIn;
        uint delegateFee;
    }
}
