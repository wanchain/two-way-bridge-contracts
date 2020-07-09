pragma solidity ^0.4.24;

contract FakeSmg {
    /*
    *
    *   VARIABLES
    *
    */
    uint constant SelectedSMNumber = 4;
    uint constant ThresholdNumber = 3;
    string constant GroupIdStr = "0000000000000000000000000000000000000031353839393533323738313235";
    string constant EnodeIdStr = "0000000000000000000000000000000000000000000000000000000000000001";

    bytes32  grpId;
    bytes  enodeId;

//    string[4] Pks = ["0425fa6a4190ddc87d9f9dd986726cafb901e15c21aafd2ed729efed1200c73de89f1657726631d29733f4565a97dc00200b772b4bc2f123a01e582e7e56b80cf8",
//    "04be3b7fd88613dc272a36f4de570297f5f33b87c26de3060ad04e2ea697e13125a2454acd296e1879a7ddd0084d9e4e724fca9ef610b21420978476e2632a1782",
//    "0495e8fd461c37f1db5da62bfbee2ad305d77e57fbef917ec8109e6425e942fb60ddc28b1edfdbcda1aa5ace3160b458b9d3d5b1fe306b4d09a030302a08e2db93",
//    "04ccd16e96a70a5b496ff1cec869902b6a8ffa00715897937518f1c9299726f7090bc36cc23c1d028087eb0988c779663e996391f290631317fc22f84fa9bf2467"];

    string[4] Pks = ["25fa6a4190ddc87d9f9dd986726cafb901e15c21aafd2ed729efed1200c73de89f1657726631d29733f4565a97dc00200b772b4bc2f123a01e582e7e56b80cf8",
    "be3b7fd88613dc272a36f4de570297f5f33b87c26de3060ad04e2ea697e13125a2454acd296e1879a7ddd0084d9e4e724fca9ef610b21420978476e2632a1782",
    "95e8fd461c37f1db5da62bfbee2ad305d77e57fbef917ec8109e6425e942fb60ddc28b1edfdbcda1aa5ace3160b458b9d3d5b1fe306b4d09a030302a08e2db93",
    "ccd16e96a70a5b496ff1cec869902b6a8ffa00715897937518f1c9299726f7090bc36cc23c1d028087eb0988c779663e996391f290631317fc22f84fa9bf2467"];

    address constant ADD_0 = 0x0000000000000000000000000000000000000000;

    // groupId=>index=>pk
    mapping(bytes32 => mapping(uint8 => bytes)) mapSmgInfo;

    constructor(){
        grpId = bytesToBytes32(fromHex(GroupIdStr), 0);
        enodeId = fromHex(EnodeIdStr);

        for (uint i = 0; i < Pks.length; i++) {
            mapSmgInfo[grpId][uint8(i)] = fromHex(Pks[i]);
        }
    }

    /*
    *
    *   FUNCTIONS
    *
    */

    function getSelectedSmNumber(bytes32 groupId) external returns (uint number){
        return SelectedSMNumber;
    }

    function getThresholdByGrpId(bytes32 grpId) external returns (uint){
        return ThresholdNumber;
    }

    function getSelectedSmInfo(bytes32 grpId, uint index) external returns (address txAddress, bytes pk, bytes enId){
        (txAddress,pk,enodeId) = (ADD_0, mapSmgInfo[grpId][uint8(index)], enodeId);
    }

    function bytesToBytes32(bytes b, uint offset) internal pure returns (bytes32) {
        bytes32 out;

        for (uint i = 0; i < 32; i++) {
            out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
        }
        return out;
    }


    // Convert an hexadecimal character to their value
    function fromHexChar(uint c) public pure returns (uint) {
        if (byte(c) >= byte('0') && byte(c) <= byte('9')) {
            return c - uint(byte('0'));
        }
        if (byte(c) >= byte('a') && byte(c) <= byte('f')) {
            return 10 + c - uint(byte('a'));
        }
        if (byte(c) >= byte('A') && byte(c) <= byte('F')) {
            return 10 + c - uint(byte('A'));
        }
        return uint(0);
    }

    // Convert an hexadecimal string to raw bytes
    function fromHex(string s) public pure returns (bytes) {
        bytes memory ss = bytes(s);
        require(ss.length % 2 == 0);
        // length must be even
        bytes memory r = new bytes(ss.length / 2);
        for (uint i = 0; i < ss.length / 2; ++i) {
            r[i] = byte(fromHexChar(uint(ss[2 * i])) * 16 +
                fromHexChar(uint(ss[2 * i + 1])));
        }
        return r;
    }
}