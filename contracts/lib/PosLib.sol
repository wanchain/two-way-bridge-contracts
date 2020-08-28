// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;
import "./SafeMath.sol";


library PosLib {

    using SafeMath for uint;
    uint public constant DIVISOR = 10000;
    address constant PRECOMPILE_CONTRACT_ADDR = address(0x268);


    function getEpochId(uint256 blockTime) public view returns (uint256) {
        bytes32 functionSelector = keccak256("getEpochId(uint256)");

        (uint256 result, bool success) = callWith32BytesReturnsUint256(
            address(0x262),
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
            success := staticcall(gas(), to, freePtr, 36, freePtr, 32)

            result := mload(freePtr)
        }
    }


    function getPosAvgReturn(uint256 groupStartTime,uint256 curTime)  public view returns(uint256 result,bool success) {
      // bytes32 functionSelector = keccak256("getPosAvgReturn(uint256,uint256)");
       bytes32 functionSelector = 0x8c114a5100000000000000000000000000000000000000000000000000000000;
       address to = PRECOMPILE_CONTRACT_ADDR;

       assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), groupStartTime)
            mstore(add(freePtr, 36), curTime)

            // call ERC20 Token contract transfer function
            success := staticcall(gas(), to, freePtr,68, freePtr, 32)
            result := mload(freePtr)
        }

    }


    function testGetHardCap ()  public view returns(uint256,bool) {
        return getHardCap(block.timestamp - 3600 * 24);
    }


    function getHardCap (uint256 time) public view returns(uint256,bool) {
       bytes32 functionSelector = 0xfa7c2faf00000000000000000000000000000000000000000000000000000000;
       address to = PRECOMPILE_CONTRACT_ADDR;
       uint256 posReturn;
       bool    success;
       assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), time)
            success := staticcall(gas(), to, freePtr,36, freePtr, 32)
            posReturn := mload(freePtr)
        }

        return (posReturn,success);

    }


     function getMinIncentive1 ()  public view returns(uint256,uint256) {
         return (getMinIncentive(100000 ether,block.timestamp - 86400 * 4),0);
     }


     function getMinIncentive2 ()  public view returns(uint256,uint256) {
         return (getMinIncentive(10000000 ether,block.timestamp - 86400 * 4),0);
     }

    function getMinIncentive (uint256 smgDeposit,uint256 smgStartTime) public view returns(uint256) {
        uint256 p1;
        bool    success;

        (p1,success) = getPosAvgReturn(smgStartTime,block.timestamp);
        if(!success) {
            return 0;
        }
        uint256 p1Return = smgDeposit.mul(p1).div(DIVISOR);

        uint256 hardcap;
        (hardcap,success) = getHardCap(block.timestamp);
        if(!success) {
            return 0;
        }

        uint256 hardcapReturn = hardcap.mul(1 ether).div(DIVISOR);

        return hardcapReturn<=p1Return?hardcapReturn:p1Return;
    }


}