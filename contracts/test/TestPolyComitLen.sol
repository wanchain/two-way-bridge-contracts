pragma solidity ^0.8.18;

import "../gpk/GpkStorageV2.sol";
import "../interfaces/IStoremanGroup.sol";

contract TestPolyCommitLen is GpkStorageV2 {
    uint constant COMMIT_PT_LEN = 64;
    uint constant CURVE_COUNT = 3;
    string constant GroupIdStr = "0000000000000000000000000000000000000031353839393533323738313235";
    constructor(address smg_){
        smg = smg_;
        uint8[3]  memory curves = [1, 0, 0];
        uint8[3]  memory algs = [1, 0, 2];
        bytes32 grpId = bytesToBytes32(fromHex(GroupIdStr), 0);
        for (uint i = 0; i < CURVE_COUNT; i++) {
            curve[grpId][i] = curves[i];
            algo[grpId][i] = algs[i];
        }
    }
    function CheckPolyCommitLen(bytes32 groupId, uint8 curveIndex, bytes memory polyCommit)
    external
    view
    returns (uint,uint,uint){

        uint threshold = IStoremanGroup(smg).getThresholdByGrpId(groupId);
        if (curve[groupId][curveIndex] == 0 && algo[groupId][curveIndex] == 0) {    // 0:0 sec/ecdsa
            threshold = threshold / 2;
        }
        require(polyCommit.length == threshold*COMMIT_PT_LEN, "Invalid commit length");
        require(false, "check len success");
        return (polyCommit.length,COMMIT_PT_LEN,threshold);
    }

// Convert an hexadecimal character to their value
    function fromHexChar(uint c) public pure returns (uint) {
        if (uint8(c) >= uint8(bytes1('0')) && uint8(c) <= uint8(bytes1('9'))) {
            return c - uint(uint8(bytes1('0')));
        }
        if (uint8(c) >= uint8(bytes1('a')) && uint8(c) <= uint8(bytes1('f'))) {
            return 10 + c - uint(uint8(bytes1('a')));
        }
        if (uint8(c) >= uint8(bytes1('A')) && uint8(c) <= uint8(bytes1('F'))) {
            return 10 + c - uint(uint8(bytes1('A')));
        }
        return uint(0);
    }

// Convert an hexadecimal string to raw bytes
    function fromHex(string memory s) public pure returns (bytes memory) {
        bytes memory ss = bytes(s);
        require(ss.length % 2 == 0);
// length must be even
        bytes memory r = new bytes(ss.length / 2);
        for (uint i = 0; i < ss.length / 2; ++i) {
            r[i] = bytes1(uint8(fromHexChar(uint(uint8(ss[2 * i]))) * 16 +
            fromHexChar(uint(uint8(ss[2 * i + 1])))));
        }
        return r;
    }

    function bytesToBytes32(bytes memory b, uint offset) internal pure returns (bytes32) {
        bytes32 out;

        for (uint i = 0; i < 32; i++) {
            out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
        }
        return out;
    }
}

