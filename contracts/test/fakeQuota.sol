
pragma solidity ^0.4.24;
contract fakeQuota {
    bool flag=true;
    function isDebtClean(bytes32 storemanGroupId) external view returns (bool) {
      return flag;
    }
    function setDebtClean(bool f) public {
      flag = f;
    }
}
