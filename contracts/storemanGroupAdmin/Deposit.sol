// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title Deposit
 * @dev Library for managing deposit records, used to track storeman group stake history
 * 
 * @custom:key-features
 * - Cumulative deposit record management
 * - ID-based historical queries
 * - Support for incremental deposit records
 * - Cleanup functionality
 * 
 * @custom:security
 * - Uses SafeMath to prevent overflows
 * - Internal access control
 * - Ordered record storage
 */
library Deposit {
    using SafeMath for uint;

    /**
     * @dev Structure for a single deposit record
     * 
     * @param id ID of the deposit record, typically a timestamp or sequence number
     * @param value Current total deposit value, including previous deposits
     * 
     * @custom:usage
     * - Used to store cumulative deposit amount at a specific point in time
     * - ID typically used to correlate with external events or blocks
     */
    struct Record {
        uint id;
        uint value; // the value is current total value, include the old deposit
    }

    /**
     * @dev Structure for a collection of deposit records
     * 
     * @param total Total number of records
     * @param records Mapping from index to deposit record
     * 
     * @custom:usage
     * - Used to manage a set of related deposit records
     * - Supports chronological storage and retrieval
     * - Maintains cumulative values to simplify queries
     */
    struct Records {
        uint total;
        mapping(uint=>Record) records;
    }

    /**
     * @dev Get the deposit value of the last record
     * 
     * @param self Storage reference to the Records collection
     * @return uint Deposit value of the last record, or 0 if no records exist
     * 
     * @custom:effects
     * - Read-only operation, does not modify state
     * - Returns 0 if no records exist
     */
    function getLastValue(Records storage self) internal view returns (uint) {
        if(self.total == 0) {
            return 0;
        } else {
            return self.records[self.total-1].value;
        }
    }

    /**
     * @dev Get deposit value by ID, returns the value of the last record with ID less than or equal to the specified ID
     * 
     * @param self Storage reference to the Records collection
     * @param id ID to query for
     * @return uint Deposit value associated with the specified ID
     * 
     * @custom:effects
     * - Read-only operation, does not modify state
     * - Searches backwards from the most recent record for efficiency
     * - Returns the value of the first record with ID less than or equal to the specified ID
     * - Returns 0 if all record IDs are greater than the specified ID
     */
    function getValueById(Records storage self, uint id) internal view returns (uint) {
        for (uint i = self.total; i > 0; i--) {
            if (id >= self.records[i-1].id){
                return self.records[i-1].value;
            }
        }
        return 0;
    }

    /**
     * @dev Clean all deposit records
     * 
     * @param self Storage reference to the Records collection
     * 
     * @custom:effects
     * - Resets the total number of records to 0
     * - Does not actually delete previous records, but they will no longer be accessible
     * - Used for restarting record-keeping or cleaning up unneeded historical data
     */
    function clean(Records storage self) internal {
        self.total = 0;
    }

    /**
     * @dev Add a new deposit record
     * 
     * @param self Storage reference to the Records collection
     * @param r New record to add
     * 
     * @custom:effects
     * - If it's the first record, adds it directly
     * - If the new record's ID is the same as the last record's ID, combines the values of the two records
     * - Otherwise, adds a new record with value being the new record's value plus the last record's value
     * - Maintains cumulative deposit values to simplify historical queries
     */
    function addRecord(Records storage self, Record memory r) internal {
        if(self.total == 0) {
            self.records[0] = r;
            self.total = 1;
        } else {
            Record storage e = self.records[self.total-1];
            if(e.id == r.id) {
                e.value = e.value.add(r.value);
            }else{
                Record memory n = Record(r.id, r.value);
                n.value = n.value.add(self.records[self.total-1].value);
                self.records[self.total] = n;
                self.total++;
            }
        }
    }
}