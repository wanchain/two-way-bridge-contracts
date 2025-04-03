// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;
pragma experimental ABIEncoderV2;

/**
 * @title Multicall2
 * @dev Contract for aggregating multiple read-only function calls in a single external call
 * Based on the popular Multicall pattern but with enhanced functionality
 * 
 * Key features:
 * - Batch multiple read-only calls to reduce RPC requests and gas costs
 * - Block information retrieval for consistent state views
 * - Transaction state queries with atomic execution
 * - Flexible success handling with try variants
 * - Support for cross-contract data aggregation
 * 
 * @custom:security
 * - Read-only operations prevent state modifications
 * - Safe call handling with success status checking
 * - Block state validation for consistent snapshots
 * - Error propagation with detailed status reporting
 * 
 * @custom:usage
 * - Useful for frontends needing to fetch multiple contract states
 * - Reduces network overhead by batching calls
 * - Ensures all data is from the same block (atomic reads)
 * - Can be used for complex data aggregation across contracts
 */
contract Multicall2 {
    /**
     * @dev Structure for call parameters
     * Each Call instance represents a contract call to execute
     * 
     * @param target Address of the contract to call
     * @param callData Encoded function call data (function selector + arguments)
     */
    struct Call {
        address target;
        bytes callData;
    }

    /**
     * @dev Structure for call results
     * Each Result contains both success flag and returned data
     * 
     * @param success Whether the call was successful (true) or reverted (false)
     * @param returnData Returned data from the call (ABI encoded response)
     */
    struct Result {
        bool success;
        bytes returnData;
    }

    /**
     * @dev Aggregate multiple calls and require all to succeed
     * This is the simplest form of aggregation with no tolerance for failures
     * 
     * @param calls Array of calls to execute in sequence
     * 
     * @return blockNumber Current block number when the calls were executed
     * @return returnData Array of call results in the same order as input calls
     * 
     * @custom:effects
     * - Executes all calls in sequence in a single transaction
     * - Requires all calls to succeed, reverting the entire transaction otherwise
     * - Returns current block number to identify the blockchain state
     * - Useful when all calls must succeed or the entire operation should fail
     */
    function aggregate(Call[] memory calls) public returns (uint256 blockNumber, bytes[] memory returnData) {
        blockNumber = block.number;
        returnData = new bytes[](calls.length);
        for(uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            require(success, "Multicall aggregate: call failed");
            returnData[i] = ret;
        }
    }

    /**
     * @dev Aggregate calls with block information
     * Enhanced version that includes block hash for state verification
     * 
     * @param calls Array of calls to execute in sequence
     * 
     * @return blockNumber Current block number when the calls were executed
     * @return blockHash Current block hash for state verification
     * @return returnData Array of call results with success flags
     * 
     * @custom:effects
     * - Executes calls with block context for state consistency
     * - Requires all calls to succeed, reverting the entire transaction otherwise
     * - Returns block hash which can be used to verify the blockchain state
     * - Combines functionality of aggregate and blockHash in one call
     */
    function blockAndAggregate(Call[] memory calls) public returns (uint256 blockNumber, bytes32 blockHash, Result[] memory returnData) {
        (blockNumber, blockHash, returnData) = tryBlockAndAggregate(true, calls);
    }

    /**
     * @dev Get block hash for a specific block number
     * Wraps the blockhash opcode for convenient access
     * 
     * @param blockNumber Block number to query (must be one of the 256 most recent blocks)
     * 
     * @return blockHash Hash of the specified block, or zero bytes if block is too old
     * 
     * @custom:effects
     * - Returns zero bytes for blocks older than the 256 most recent blocks
     * - Useful for verifying that a state is from a specific block
     */
    function getBlockHash(uint256 blockNumber) public view returns (bytes32 blockHash) {
        blockHash = blockhash(blockNumber);
    }

    /**
     * @dev Get current block number
     * Wraps the block.number property
     * 
     * @return blockNumber Current block number at execution time
     */
    function getBlockNumber() public view returns (uint256 blockNumber) {
        blockNumber = block.number;
    }

    /**
     * @dev Get current block coinbase address
     * Wraps the block.coinbase property
     * 
     * @return coinbase Address of the current block's coinbase (miner/validator)
     */
    function getCurrentBlockCoinbase() public view returns (address coinbase) {
        coinbase = block.coinbase;
    }

    /**
     * @dev Get current block difficulty or prevrandao value
     * Wraps the block.difficulty/prevrandao property
     * 
     * @return difficulty Current block's difficulty or randomness value post-merge
     * 
     * @custom:effects
     * - Returns prevrandao value after The Merge
     * - Returns difficulty before The Merge
     */
    function getCurrentBlockDifficulty() public view returns (uint256 difficulty) {
        difficulty = block.prevrandao;
    }

    /**
     * @dev Get current block gas limit
     * Wraps the block.gaslimit property
     * 
     * @return gaslimit Current block's gas limit
     */
    function getCurrentBlockGasLimit() public view returns (uint256 gaslimit) {
        gaslimit = block.gaslimit;
    }

    /**
     * @dev Get current block timestamp
     * Wraps the block.timestamp property
     * 
     * @return timestamp Current block's timestamp (seconds since Unix epoch)
     */
    function getCurrentBlockTimestamp() public view returns (uint256 timestamp) {
        timestamp = block.timestamp;
    }

    /**
     * @dev Get ETH balance of an address
     * Wraps the address.balance property
     * 
     * @param addr Address to query balance for
     * 
     * @return balance ETH balance of the address in wei
     */
    function getEthBalance(address addr) public view returns (uint256 balance) {
        balance = addr.balance;
    }

    /**
     * @dev Get hash of the last block
     * Convenience method for getting the previous block's hash
     * 
     * @return blockHash Hash of the previous block
     */
    function getLastBlockHash() public view returns (bytes32 blockHash) {
        blockHash = blockhash(block.number - 1);
    }

    /**
     * @dev Try to aggregate calls with optional success requirement
     * More flexible version that can continue despite individual call failures
     * 
     * @param requireSuccess Whether to require all calls to succeed (true) or continue on failure (false)
     * @param calls Array of calls to execute in sequence
     * 
     * @return returnData Array of call results with individual success status
     * 
     * @custom:effects
     * - Executes all calls in sequence in a single transaction
     * - Can optionally continue despite individual call failures
     * - Returns success status and data for each call
     * - Useful for UIs that need to display partial results even if some calls fail
     * - When requireSuccess is false, never reverts due to target call failures
     */
    function tryAggregate(bool requireSuccess, Call[] memory calls) public returns (Result[] memory returnData) {
        returnData = new Result[](calls.length);
        for(uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);

            if (requireSuccess) {
                require(success, "Multicall2 aggregate: call failed");
            }

            returnData[i] = Result(success, ret);
        }
    }

    /**
     * @dev Try to aggregate calls with block information
     * Most comprehensive version with both flexible success handling and block context
     * 
     * @param requireSuccess Whether to require all calls to succeed (true) or continue on failure (false)
     * @param calls Array of calls to execute in sequence
     * 
     * @return blockNumber Current block number when the calls were executed
     * @return blockHash Current block hash for state verification
     * @return returnData Array of call results with individual success status
     * 
     * @custom:effects
     * - Executes calls with block context for state consistency
     * - Can optionally continue despite individual call failures
     * - Returns block information and detailed results for each call
     * - Most flexible variant that provides complete information
     * - Useful for applications that need full context and error handling
     */
    function tryBlockAndAggregate(bool requireSuccess, Call[] memory calls) public returns (uint256 blockNumber, bytes32 blockHash, Result[] memory returnData) {
        blockNumber = block.number;
        blockHash = blockhash(block.number);
        returnData = tryAggregate(requireSuccess, calls);
    }
}
