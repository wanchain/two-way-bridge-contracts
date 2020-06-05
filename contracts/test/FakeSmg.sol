pragma solidity ^0.4.24;

contract FakeSmg {
    /*
    *
    *   VARIABLES
    *
    */
    uint constant SelectedSMNumber = 24;
    uint constant ThresholdNumber = 3;
    //string constant GroupIdStr = "0x0000000000000000000000000000000000000000000000000000000000000001";
    string constant GroupIdStr = "0x0000000000000000000000000000000000000031353839393533323738313235";
    //string constant EnodeIdStr = "0x0000000000000000000000000000000000000000000000000000000000000001";
    string constant EnodeIdStr = "0000000000000000000000000000000000000000000000000000000000000001";

    bytes32  grpId;
    bytes  enodeId;

//    string[4] Pks =["0x04d9482a01dd8bb0fb997561e734823d6cf341557ab117b7f0de72530c5e2f0913ef74ac187589ed90a2b9b69f736af4b9f87c68ae34c550a60f4499e2559cbfa5",
//                    "0x043d0461abc005e082021fb2dd81781f676941b2f922422932d56374646328a8132bb0f7956532981bced30a1aa3301e9134041b399058de31d388651fc005b49e",
//                    "0x04f65f08b31c46e97751865b24a176f28888f2cef91ffdf95d0cbf3fd71b4abdab7f4b4b55cfac5853198854569bad590ed260557f50e6bc944ad63a274369339a",
//                    "0x042687ff2d4ba1cfa8bbd27aa33d691dabe007a0eaaf109aab2a990154906f00860e5ead9ed95080c144a61a0eabb5df7f109ff348c9b9de68ee133a49c0731fc0"];

    string[4] Pks =["04d9482a01dd8bb0fb997561e734823d6cf341557ab117b7f0de72530c5e2f0913ef74ac187589ed90a2b9b69f736af4b9f87c68ae34c550a60f4499e2559cbfa5",
                    "043d0461abc005e082021fb2dd81781f676941b2f922422932d56374646328a8132bb0f7956532981bced30a1aa3301e9134041b399058de31d388651fc005b49e",
                    "04f65f08b31c46e97751865b24a176f28888f2cef91ffdf95d0cbf3fd71b4abdab7f4b4b55cfac5853198854569bad590ed260557f50e6bc944ad63a274369339a",
                    "042687ff2d4ba1cfa8bbd27aa33d691dabe007a0eaaf109aab2a990154906f00860e5ead9ed95080c144a61a0eabb5df7f109ff348c9b9de68ee133a49c0731fc0"];

    address constant ADD_0 = 0x0000000000000000000000000000000000000000;

    // groupId=>index=>gpk
    mapping(bytes32 => mapping(uint8 => bytes)) mapSmgInfo;

    constructor(){
        grpId = bytesToBytes32(fromHex(GroupIdStr),0);
        enodeId = fromHex(EnodeIdStr);

        for(uint i = 0; i< Pks.length; i++){
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
        (txAddress,pk,enodeId) = (ADD_0,mapSmgInfo[grpId][uint8(index)],enodeId);
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
    }

    // Convert an hexadecimal string to raw bytes
    function fromHex(string s) public pure returns (bytes) {
        bytes memory ss = bytes(s);
        require(ss.length%2 == 0); // length must be even
        bytes memory r = new bytes(ss.length/2);
        for (uint i=0; i<ss.length/2; ++i) {
            r[i] = byte(fromHexChar(uint(ss[2*i])) * 16 +
            fromHexChar(uint(ss[2*i+1])));
        }
        return r;
    }
}