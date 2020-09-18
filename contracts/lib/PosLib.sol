pragma solidity ^0.4.24;
import "./SafeMath.sol";


library PosLib {

    using SafeMath for uint;
    uint public constant DIVISOR = 10000;
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;


    function getEpochId(uint256 blockTime) public view returns (uint256) {
        bytes32 functionSelector = keccak256("getEpochId(uint256)");

        (uint256 result, bool success) = callWith32BytesReturnsUint256(
            0x262,
            functionSelector,
            bytes32(blockTime)
        );

        require(success, "ASSEMBLY_CALL getEpochId failed");

        return result;
    }

    function callWith32BytesReturnsUint256(
        address to,
        bytes32 functionSelector,
        bytes32 param1
    ) private view returns (uint256 result, bool success) {
        assembly {
            let freePtr := mload(0x40)

            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), param1)

            // call ERC20 Token contract transfer function
            success := staticcall(gas, to, freePtr, 36, freePtr, 32)

            result := mload(freePtr)
        }
    }


    function getPosAvgReturn(uint256 targetSecond)  public view returns(uint256 result,bool success) {
      // bytes32 functionSelector = keccak256("getPosAvgReturn(uint256)");
       bytes32 functionSelector = 0x94fee72400000000000000000000000000000000000000000000000000000000;
       address to = PRECOMPILE_CONTRACT_ADDR;

       assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), targetSecond)

            // call ERC20 Token contract transfer function
            success := staticcall(gas, to, freePtr,36, freePtr, 32)
            result := mload(freePtr)
        }
    }


    function testGetHardCap ()  public view returns(uint256,bool) {
        return getHardCap(now - 3600 * 24);
    }


    function getHardCap (uint256 time) public view returns(uint256,bool) {
       bytes32 functionSelector = 0x8b19e7b700000000000000000000000000000000000000000000000000000000;
       address to = PRECOMPILE_CONTRACT_ADDR;
       uint256 posReturn=0;
       bool    success;
       assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), time)
            success := staticcall(gas, to, freePtr,36, freePtr, 32)
            posReturn := mload(freePtr)
        }

        return (posReturn,success);

    }


    //  function getMinIncentive1 ()  public view returns(uint256,uint256) {
    //      return (getMinIncentive(100000 ether,now - 86400 * 4),0);
    //  }


    //  function getMinIncentive2 ()  public view returns(uint256,uint256) {
    //      return (getMinIncentive(10000000 ether,now - 86400 * 4),0);
    //  }

    function getMinIncentive (uint256 smgDeposit,uint256 day, uint256 totalDeposit) public view returns(uint256) {
        uint256 p1;
        bool    success;
        uint targetSecond = day.mul(3600*24);
        (p1,success) = getPosAvgReturn(targetSecond);
        if(!success) {
            return 0;
        }
        uint256 p1Return = smgDeposit.mul(p1).div(DIVISOR).div(365);

        uint256 hardcap;
        (hardcap,success) = getHardCap(targetSecond);
        if(!success) {
            return 0;
        }

        uint256 hardcapReturn = hardcap.mul(1 ether).div(DIVISOR).mul(smgDeposit).div(totalDeposit);

        return hardcapReturn<=p1Return?hardcapReturn:p1Return;
    }


}
