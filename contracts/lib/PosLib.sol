// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title PosLib
 * @dev Library for Proof of Stake (PoS) related calculations and operations
 * 
 * Key features:
 * - Epoch ID retrieval
 * - Average PoS return calculation
 * - Hard cap determination
 * - Minimum incentive calculation
 * 
 * @custom:security
 * - Precompile contract calls
 * - Safe math operations
 * - Input validation
 */
library PosLib {

    using SafeMath for uint;

    /**
     * @dev Constant divisor for percentage calculations
     */
    uint public constant DIVISOR = 10000;

    /**
     * @dev Address of the precompile contract
     * Used for PoS related operations
     */
    address constant PRECOMPILE_CONTRACT_ADDR = address(0x268);

    /**
     * @dev Get the epoch ID for a given block time
     * 
     * @param blockTime The block time to query
     * 
     * @return uint256 The epoch ID
     * 
     * @custom:effects
     * - Calls precompile contract to retrieve epoch ID
     * - Requires successful call execution
     */
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

    /**
     * @dev Internal function to call a precompile contract with a 32-byte parameter
     * 
     * @param to Address of the precompile contract
     * @param functionSelector Function selector for the call
     * @param param1 First parameter for the call
     * 
     * @return result Result of the call
     * @return success Whether the call was successful
     */
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

    /**
     * @dev Get the average PoS return for a target duration
     * 
     * @param targetSecond The target duration in seconds
     * 
     * @return result Average PoS return
     * @return success Whether the call was successful
     * 
     * @custom:effects
     * - Calls precompile contract to retrieve average PoS return
     */
    function getPosAvgReturn(uint256 targetSecond)  public view returns(uint256 result,bool success) {
      // bytes32 functionSelector = keccak256("getPosAvgReturn(uint256)");
       bytes32 functionSelector = 0x94fee72400000000000000000000000000000000000000000000000000000000;
       address to = PRECOMPILE_CONTRACT_ADDR;

       assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), targetSecond)

            // call ERC20 Token contract transfer function
            success := staticcall(gas(), to, freePtr,36, freePtr, 32)
            result := mload(freePtr)
        }
    }

    /**
     * @dev Test function to get hard cap
     * 
     * @return uint256 Hard cap value
     * @return bool Whether the call was successful
     */
    function testGetHardCap ()  public view returns(uint256,bool) {
        return getHardCap(block.timestamp - 3600 * 24);
    }

    /**
     * @dev Get the hard cap for a given time
     * 
     * @param time The time to query
     * 
     * @return uint256 Hard cap value
     * @return bool Whether the call was successful
     * 
     * @custom:effects
     * - Calls precompile contract to retrieve hard cap
     */
    function getHardCap (uint256 time) public view returns(uint256,bool) {
       bytes32 functionSelector = 0x8b19e7b700000000000000000000000000000000000000000000000000000000;
       address to = PRECOMPILE_CONTRACT_ADDR;
       uint256 posReturn=0;
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

    /**
     * @dev Calculate the minimum incentive for a given deposit and duration
     * 
     * @param smgDeposit Storeman group deposit
     * @param day Duration in days
     * @param totalDeposit Total deposit amount
     * 
     * @return uint256 Minimum incentive value
     * 
     * @custom:effects
     * - Calculates minimum incentive based on PoS return and hard cap
     */
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
