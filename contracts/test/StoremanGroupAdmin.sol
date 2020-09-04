pragma solidity 0.4.26;
pragma experimental ABIEncoderV2;

contract StoremanGroupAdmin {
  enum GroupStatus {none, initial, curveSeted, failed, selected, ready, unregistered, dismissed}

  event registerStartEvent(bytes32 indexed groupId, uint workStart,uint workDuration, uint registerDuration, bytes32 indexed preGroupId);
  event StoremanGroupUnregisterEvent(bytes32 indexed groupId);

  event StoremanGroupDismissedLogger(bytes tokenOrigAccount, bytes storemanGroup, uint dismissTime);
  event storemanTransferEvent(bytes32 indexed groupId, bytes32 indexed preGroupId, address[] wkAddrs);

  event storemanGroupContributeEvent(address indexed sender, uint indexed value);

  struct StoremanGroupConfig {
    uint8   status;
    uint    chain1;
    uint    chain2;
    uint    curve1;
    uint    curve2;
    bytes   gpk1;
    bytes   gpk2;
    uint    startTime;
    uint    endTime;
  }

  int public total;
  mapping(bytes32 => StoremanGroupConfig) public mapConfig;
  mapping(bytes32 => uint) public mapDeposit;
  mapping(bytes32 => uint) public mapFee;

  mapping(bytes => mapping(bytes => bytes32)) storemanGroupMap;

  address[] public oldAddr;

  function smgTransfer(bytes32 smgID) public payable
  {
    mapFee[smgID] = mapFee[smgID] + msg.value;
  }

  function addDeposit(bytes32 smgID, uint amount) external
  {
    mapDeposit[smgID] = mapDeposit[smgID] + amount;
  }

  function setStoremanGroupConfig(
    bytes32 groupId,
    uint8 status,
    uint deposit,
    uint[2] chain,
    uint[2] curve,
    bytes gpk1,
    bytes gpk2,
    uint startTime,
    uint endTime
  )
    external
  {
    mapConfig[groupId] = StoremanGroupConfig(status, chain[0], chain[1], curve[0], curve[1], gpk1, gpk2, startTime, endTime);
    mapDeposit[groupId] = deposit;
  }

  function getStoremanGroupConfig(
    bytes32 id
  )
    external
    view
    returns(bytes32 groupId, uint8 status, uint deposit, uint chain1, uint chain2, uint curve1, uint curve2,  bytes gpk1, bytes gpk2, uint startTime, uint endTime)
  {
    groupId = id;

    status = mapConfig[id].status;
    chain1 = mapConfig[id].chain1;
    chain2 = mapConfig[id].chain2;
    curve1 = mapConfig[id].curve1;
    curve2 = mapConfig[id].curve2;
    gpk1 = mapConfig[id].gpk1;
    gpk2 = mapConfig[id].gpk2;
    startTime = mapConfig[id].startTime;
    endTime = mapConfig[id].endTime;

    deposit = mapDeposit[id];
  }

  // register event
  function registerStart(bytes32 groupId,
    uint workStart, uint workDuration, uint registerDuration,  bytes32 preGroupId)
    // uint workStart,uint workDuration, uint registerDuration,  bytes32 preGroupId,  address[] wkAddrs, address[] senders)
    external
  {
    mapConfig[groupId].status = uint8(GroupStatus.initial);
    // mapConfig[groupId].startTime = workStart;
    // mapConfig[groupId].endTime = workStart + workDuration;

    // mapDeposit[groupId].deposit = deposit;

    emit registerStartEvent(groupId, workStart, workDuration, registerDuration, preGroupId);
    if(preGroupId != bytes32(0x00)) {
      emit storemanTransferEvent(groupId, preGroupId, oldAddr);
    }
  }

  function storemanGroupUnregister(bytes32 groupId)
    external
  {
    mapConfig[groupId].status = uint8(GroupStatus.unregistered);
    emit StoremanGroupUnregisterEvent(groupId);
  }

  function storemanGroupDismiss(bytes tokenOrigAccount, bytes storemanGroup, bytes32 groupId)
  // function storemanGroupDismiss(bytes tokenOrigAccount, bytes storemanGroup, bytes32 )
    external
  {
    mapConfig[groupId].status = uint8(GroupStatus.dismissed);
    emit StoremanGroupDismissedLogger(tokenOrigAccount, storemanGroup, now);
  }

  function contribute() public payable {
    emit storemanGroupContributeEvent(msg.sender, msg.value);
    return;
  }
}