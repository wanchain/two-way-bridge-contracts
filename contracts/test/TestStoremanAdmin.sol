pragma solidity 0.4.26;

contract TestStoremanAdmin {

    struct ChainData {
        uint chain1;
        uint chain2;
        uint curve1;
        uint curve2;
        bool active;
    }

    struct SmgData {
        uint chainPairID;
        uint deposit;
        uint startTime;
        uint endTime;
        uint8 status;
        bytes gpk1;
        bytes gpk2;
    }

    mapping(bytes32 => SmgData) mapStoreman;
    /// chainPairID => ChainData
    mapping(uint => ChainData) mapChainPair;
    uint totalChainPairID;

    // constructor() {
    //     ChainData memory chainData = SmgData({
    //         chain1: 1,
    //         chain2: 2,
    //         curve1: 1,
    //         curve2: 2,
    //         active: true
    //     });
    //     mapChainPair[totalChainPairID] = chainData;
    //     totalChainPairID += 1;
    // }

    function addChainInfo(uint chain1, uint chain2, uint curve1, uint curve2) public {
        ChainData memory chainData = ChainData({
            chain1: chain1,
            chain2: chain2,
            curve1: curve1,
            curve2: curve2,
            active: true
        });
        mapChainPair[totalChainPairID] = chainData;
        totalChainPairID += 1;
    }

    function getChainInfo(uint chainPairID) public view
      returns(uint, uint, uint, uint, bool)
    {
        ChainData memory chainData = mapChainPair[chainPairID];
        return (chainData.chain1, chainData.chain2, chainData.curve1, chainData.curve2, chainData.active);
    }

    function getChainPairIDCount() public view
      returns(uint)
    {
        return totalChainPairID;
    }

    function addStoremanGroup(bytes32 groupId, uint8 status, uint deposit, uint chainPairID,
                              bytes gpk1, bytes gpk2, uint startTime, uint endTime) public {
        ChainData memory chainData = mapChainPair[chainPairID];
        require(chainData.active, "Invalid chain pair");

        SmgData memory smgData = SmgData({
            chainPairID: chainPairID,
            deposit: deposit,
            startTime: startTime,
            endTime: endTime,
            status: status,
            gpk1: gpk1,
            gpk2: gpk2
        });
        mapStoreman[groupId] = smgData;
    }

    function getStoremanGroupConfig(bytes32 id)
        public
        view
        returns(bytes32 groupId, uint8 status, uint deposit, uint chain1, uint chain2, uint curve1, uint curve2, bytes gpk1, bytes gpk2, uint startTime, uint endTime)
    {
        SmgData memory smgData = mapStoreman[id];
        ChainData memory chainData = mapChainPair[smgData.chainPairID];

        return (id, smgData.status, smgData.deposit, chainData.chain1, chainData.chain2, chainData.curve1, chainData.curve2,
            smgData.gpk1, smgData.gpk2, smgData.startTime, smgData.endTime);
    }

    function updateStoremanGroupStatus(bytes32 id, uint8 status)
        public
    {
        SmgData memory smgData = mapStoreman[id];
        smgData.status = status;
        mapStoreman[id] = smgData;
    }

}
