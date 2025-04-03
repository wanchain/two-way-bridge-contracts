// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../storemanGroupAdmin/StoremanType.sol";

/**
 * @title ISmg
 * @dev Interface for Storeman Group management operations
 * 
 * Key features:
 * - Query active group IDs
 * - Get storeman group information
 */
interface ISmg {
    /**
     * @dev Get active group IDs for a specific day
     * 
     * @param day The day to query (in days since epoch)
     * @return Array of active group IDs
     */
    function getActiveGroupIds(uint day) external view returns (bytes32[] memory);

    /**
     * @dev Get storeman group information by ID
     * 
     * @param id The group ID to query
     * @return StoremanGroupInfo struct containing group details
     */
    function getStoremanGroupInfo(bytes32 id) external view returns(StoremanType.StoremanGroupInfo memory info);
}

/**
 * @title QueryCurrentSmgId
 * @dev Contract for querying current active storeman group ID based on timestamp
 * 
 * Key features:
 * - Query active group ID by timestamp
 * - Handle multiple active groups
 * - Time-based group selection
 * 
 * @custom:security
 * - External contract validation
 * - Safe array access
 * - Time boundary checks
 */
contract QueryCurrentSmgId {
    /**
     * @dev Interface instance for storeman group operations
     * 
     * @custom:usage
     * - Used for querying group information
     * - Set during contract construction
     */
    ISmg public smg;

    /**
     * @dev Constructor initializes the storeman group interface
     * 
     * @param smgAddr Address of the storeman group contract
     * 
     * @custom:effects
     * - Sets the ISmg interface instance
     */
    constructor(address smgAddr) {
        smg = ISmg(smgAddr);
    }

    /**
     * @dev Get the active group ID for a specific timestamp
     * 
     * @param time Unix timestamp to query
     * @return bytes32 The active group ID
     * 
     * @custom:logic
     * - Converts timestamp to day
     * - Gets active groups for the day
     * - Returns appropriate group ID based on time window
     * 
     * @custom:returns
     * - bytes32(0) if no active groups
     * - Single group ID if only one active group
     * - Group ID within time window if multiple groups
     * - First group ID as fallback
     */
    function getActiveGroupIds(uint time) external view returns (bytes32) {
        uint day = time / 86400;
        bytes32[] memory ids = smg.getActiveGroupIds(day);
        if (ids.length == 0) {
            return bytes32(0);
        }
        
        if (ids.length == 1) {
            return ids[0];
        }

        for (uint i=0; i<ids.length; i++) {
            StoremanType.StoremanGroupInfo memory info = smg.getStoremanGroupInfo(ids[i]);
            if (time >= info.startTime && time < info.endTime) {
                return ids[i];
            }
        }
        return ids[0];
    }
}
