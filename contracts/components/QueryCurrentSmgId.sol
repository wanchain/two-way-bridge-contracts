// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../storemanGroupAdmin/StoremanType.sol";

interface ISmg {
    function getActiveGroupIds(uint day) external view returns (bytes32[] memory);
    function getStoremanGroupInfo(bytes32 id) external view returns(StoremanType.StoremanGroupInfo memory info);
}

contract QueryCurrentSmgId {
    ISmg public smg;
    constructor(address smgAddr) {
        smg = ISmg(smgAddr);
    }

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
