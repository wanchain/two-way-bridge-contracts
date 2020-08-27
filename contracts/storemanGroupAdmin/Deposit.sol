// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

import "../lib/SafeMath.sol";

library Deposit {
    using SafeMath for uint;

    struct Record {
        uint id;
        uint value; // the value is current total value, include the old deposit
    }

    struct Records {
        uint total;
        mapping(uint=>Record) records;
    }

    function getLastValue(Records storage self) internal view returns (uint) {
        if(self.total == 0) {
            return 0;
        } else {
            return self.records[self.total-1].value;
        }
    }
    function getValueById(Records storage self, uint id) internal view returns (uint) {
        for (uint i = self.total; i > 0; i--) {
            if (id >= self.records[i-1].id){
                return self.records[i-1].value;
            }
        }
        return 0;
    }
    function clean(Records storage self) internal {
        self.total = 0;
    }
    function addRecord(Records storage self, Record r) internal {
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