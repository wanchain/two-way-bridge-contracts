pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

contract TestStoremanGroup {
    mapping(bytes32 => StoremanGroup) public groups;
    uint backupCount = 3;
    enum GroupStatus {initial,failed,selected,ready,retired,dismissed}
    struct Delegator {
        address sender; // the delegator wallet address
        address staker;
        bool  quited;
        //bool  claimed;
        uint  deposit;
        uint  incentive;
        mapping(uint=>uint) value;
    }
    struct Candidate {
        address sender;
        bytes enodeID;
        bytes PK;
        address  pkAddress; // 合约计算一下.
        bool  quited;
        //bool  claimed;// 不需要??? 提取后deposit归零.
        bool  selected;
        bool  isWorking;
        uint  delegateFee;
        uint  deposit;         // 自有
        uint  depositWeight; //total 自由+代理
        uint  incentive;       // without delegation.. set to 0 after incentive.
        uint  delegatorCount;
        mapping(uint=>address) addrMap;
        mapping(uint=>uint) value;  // 需要遍历.
        mapping(address=>Delegator) delegators;
    }

    struct StoremanGroup {
        //address delegate;                 /// the account for registering a storeman group which provides storeman group deposit
        uint    deposit;                  /// the storeman group deposit in wan coins, change when selecting
        uint    depositWeight;            /// caculate this value when selecting
        uint    txFeeRatio;               /// the fee ratio required by storeman group
        uint    unregisterApplyTime;      /// the time point for storeman group applied unregistration
        GroupStatus    status;
        bytes32    groupIndex;
        string  chainName;
        uint memberCountDesign;
        uint memberCount;
        uint whiteCount;
        mapping(address=>Candidate) candidates; // bianli map 不好做.
        mapping(uint=>address) addrMap;
        mapping(uint=>address) selectedNode;
        mapping(uint=>address) workingNode;
        mapping(address=>bytes) whiteEnodeID;
    }

    function setBackupCount(uint backup){
        backupCount = backup;
    }

/*
    /// @notice                           function for owner set token manager and htlc contract address
    /// @param groupId                 the building storeman group index.
    /// @param chain                      the chain that the group will work for.
    /// @param enodeIDs                   white list enode IDs
    /// @param senders                    senders address of the white list enode.
    /// @param minStake                   minimum value when join the group.
    /// @param workDuration               how long the group will work for
    /// @param registerDuration           how long the duration that allow transfer staking.
    /// @param crossFee                   the fee for cross transaction.
    /// @param preGroupIndex                    the preview group index.
    function registerStart(bytes32 groupId, string chain, bytes[] enodeIDs, address[] senders, uint minStake,
        uint workDuration, uint registerDuration, uint crossFee, bytes32 preGroupIndex)
        external
    {

    }
*/
    function addGroup(uint txFeeRate, bytes32 groupId)
        public
    {
        StoremanGroup memory group = StoremanGroup(0,0,txFeeRate,0,GroupStatus.initial,groupId,'ETH',21,0,0);
        groups[groupId] = group;
    }
    event addStakerEvent(address indexed pkAddr, bytes32 indexed index);

    function addStaker(bytes32 index, bytes PK, bytes enodeID, uint delegateFee)
        public payable
    {
        StoremanGroup group = groups[index];
        address pkAddr = address(keccak256(PK));
        Candidate memory sk = Candidate(msg.sender, enodeID, PK,pkAddr,false,false,false,delegateFee,msg.value,0,0,0);
        group.addrMap[group.memberCount] = pkAddr;
        group.memberCount++;

        group.candidates[pkAddr] = sk;
        emit addStakerEvent(pkAddr, index);
    }
    function getStaker(bytes32 index, address pkAddr) view public returns (bytes,uint,uint) {
        Candidate sk = groups[index].candidates[pkAddr];
        return (sk.PK, sk.delegateFee, sk.delegatorCount);
    }

    function calIncentive(uint p, uint deposit, bool isDelegator) returns (uint) {
        return deposit*p/10000;
    }
    function calSkWeight(uint deposit) returns(uint) {
        return deposit*15/10;
    }
    event incentive(bytes32 indexed index, address indexed to, uint indexed delegatorCount);
    function testIncentiveAll(bytes32 index){
        StoremanGroup group = groups[index];
        for(uint i=0; i<group.memberCountDesign; i++) { //todo change to working.
            address skAddr = group.selectedNode[i];
            Candidate sk = group.candidates[skAddr];
            sk.incentive += calIncentive(1000, sk.deposit,false);
            emit incentive(index, sk.sender, sk.delegatorCount);

            for(uint j=0; j<sk.delegatorCount; j++){
                address deAddr = sk.addrMap[j];
                Delegator de = sk.delegators[deAddr];
                de.incentive += calIncentive(1000, de.deposit, true);
            }
        }
    }
    function addDelegator(bytes32 index, address skPkAddr)
        public
        payable
    {
        Delegator memory dk = Delegator(msg.sender,skPkAddr,false,msg.value,1);
        Candidate sk = groups[index].candidates[skPkAddr];
        sk.addrMap[sk.delegatorCount] = msg.sender;
        sk.delegatorCount++;
        sk.depositWeight += msg.value;
        sk.delegators[msg.sender] = dk;
    }

    function getSelectedSmNumber(bytes32 groupId) public view returns(uint) {
        StoremanGroup group = groups[groupId];
        return group.memberCount;
    }
    function toSelect(bytes32 groupId) public {
        StoremanGroup group = groups[groupId];
        if(group.memberCount < group.memberCountDesign){
            group.status = GroupStatus.failed;
            return;
        }
        // first, select the sm from white list.
        group.whiteCount = 5;

        for(uint i=0; i<group.memberCount; i++){
            uint j;
            for(j=group.memberCountDesign-1; j>group.whiteCount; j--) {
                if(group.candidates[group.addrMap[i]].depositWeight > group.candidates[group.addrMap[j]].depositWeight){
                    continue;
                }
            }
            if(j<group.memberCountDesign-1){
                for(uint k=group.memberCountDesign-2; k>=j; k--){
                    group.selectedNode[k+1] = group.selectedNode[k];
                }
                group.selectedNode[j] = group.addrMap[i];
            }
        }
        group.status = GroupStatus.selected;
        return;
    }
    function getSelectedSmAddress(bytes32 groupId, uint index)view  public returns(address, bytes){
        StoremanGroup group = groups[groupId];
        address addr = group.selectedNode[index];
        Candidate sk = group.candidates[addr];
        return (addr, sk.PK);
    }


    function getSmInfo(bytes32 groupId, address wkAddress) view public returns(address sender,bytes PK,
        bool quited, bool  isWorking,uint  delegateFee,uint  deposit,uint  depositWeight,
        uint incentive, uint delegatorCount
        ){
        StoremanGroup group = groups[groupId];
        Candidate sk = group.candidates[wkAddress];

        return (sk.sender,   sk.PK, sk.quited,
        sk.isWorking,  sk.delegateFee, sk.deposit,
        sk.depositWeight, sk.incentive,  sk.delegatorCount
        );
    }
    function setGpk(bytes32 groupId, bytes gpk) public {
    }
    function setInvalidSm(bytes32 groupId, uint slashType, uint txAddress) public returns(bool isContinue){
        return true;
    }

}
