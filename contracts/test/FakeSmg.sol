// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import '../storemanGroupAdmin/StoremanType.sol';
contract FakeSmg {
    /*
    *
    *   VARIABLES
    *
    */
    uint constant SelectedSMNumber = 4;
    uint constant ThresholdNumber = 3;
    string constant GroupIdStr = "0000000000000000000000000000000000000031353839393533323738313235";
    string constant GroupIdStr1 = "0000000000000000000000000000000000000031353839393533323738313236";
    string constant EnodeIdStr = "0000000000000000000000000000000000000000000000000000000000000001";
    string constant bytestr = "bytes";

    string constant gpk1Str = "82e5d4ad633e9e028b283e52338e4fe4c5467091fd4f5d9aec74cb78c25738be1154a9b1cff44b7fe935e774da7a9fad873b76323573138bc361a9cfdb6a20d2";
    string constant gpk2Str = "1761e90a6287d8e771373074626befaf4a46e6e3a2d45f8b7a2ec5361f1de7a102d43cd0d14e5a438d754c01d0d94cf2a8ff8fd9df49c9f7291975c831bcb983";


    string constant gpkShare1Str = "f716e789cd79d106343b8e9c3ac494865d02241337cf6ce8df4df6548ec1eccc900963c639664b1667df09d322a8e5c8a9185a09742f96b204b4fcc59dae7fab";
    string constant gpkShare2Str = "17a4f5c4add16108a4ab16fc1635635af0df9798176459ca3cd58a15ceb64d4808651a691e5f89ed012ee076bc39bff193064b852ce11741f0110a81c6d876d7";


    bytes32  grpId;

//    string[4] Pks = ["0425fa6a4190ddc87d9f9dd986726cafb901e15c21aafd2ed729efed1200c73de89f1657726631d29733f4565a97dc00200b772b4bc2f123a01e582e7e56b80cf8",
//    "04be3b7fd88613dc272a36f4de570297f5f33b87c26de3060ad04e2ea697e13125a2454acd296e1879a7ddd0084d9e4e724fca9ef610b21420978476e2632a1782",
//    "0495e8fd461c37f1db5da62bfbee2ad305d77e57fbef917ec8109e6425e942fb60ddc28b1edfdbcda1aa5ace3160b458b9d3d5b1fe306b4d09a030302a08e2db93",
//    "04ccd16e96a70a5b496ff1cec869902b6a8ffa00715897937518f1c9299726f7090bc36cc23c1d028087eb0988c779663e996391f290631317fc22f84fa9bf2467"];

    string[4] Pks = ["25fa6a4190ddc87d9f9dd986726cafb901e15c21aafd2ed729efed1200c73de89f1657726631d29733f4565a97dc00200b772b4bc2f123a01e582e7e56b80cf8",
    "be3b7fd88613dc272a36f4de570297f5f33b87c26de3060ad04e2ea697e13125a2454acd296e1879a7ddd0084d9e4e724fca9ef610b21420978476e2632a1782",
    "95e8fd461c37f1db5da62bfbee2ad305d77e57fbef917ec8109e6425e942fb60ddc28b1edfdbcda1aa5ace3160b458b9d3d5b1fe306b4d09a030302a08e2db93",
    "ccd16e96a70a5b496ff1cec869902b6a8ffa00715897937518f1c9299726f7090bc36cc23c1d028087eb0988c779663e996391f290631317fc22f84fa9bf2467"];

    address constant ADD_0 = address(0x0000000000000000000000000000000000000000);
    address constant ADD_LEADER= address(0x2d0E7c0813A51d3bd1d08246Af2A8a7A57d8922E);

    address public leaderAdd;
    // groupId=>index=>pk
    mapping(bytes32 => mapping(uint8 => bytes)) mapSmgInfo;

    constructor() {
        grpId = bytesToBytes32(fromHex(GroupIdStr), 0);

        for (uint i = 0; i < Pks.length; i++) {
            mapSmgInfo[grpId][uint8(i)] = fromHex(Pks[i]);
        }

        grpId = bytesToBytes32(fromHex(GroupIdStr1), 0);

        for (uint j = 0; j < Pks.length; j++) {
            mapSmgInfo[grpId][uint8(j)] = fromHex(Pks[j]);
        }

    }

    /*
    *
    *   FUNCTIONS
    *
    */

    function getSelectedSmNumber(bytes32 /* groupId */) external pure returns (uint number){
        return SelectedSMNumber;
    }

    function getThresholdByGrpId(bytes32 /* groupId */) external pure returns (uint){
        return ThresholdNumber;
    }

    function getSelectedSmInfo(bytes32 groupId, uint index) external view returns (address txAddress, bytes memory pk, bytes memory enodeId){
        (txAddress,pk,enodeId) = (leaderAdd, mapSmgInfo[groupId][uint8(index)], fromHex(EnodeIdStr));
    }


    function getStoremanInfo(address /* wkAddress */) external pure  returns(
        bytes32 groupId,
        bytes32 nextGroupId)
    {
        return (bytesToBytes32(fromHex(GroupIdStr),0),bytesToBytes32(fromHex(GroupIdStr1),0));
    }

    function getStoremanGroupInfo(bytes32 /* id */)
    external
    pure
    returns(bytes32 groupId, StoremanType.GroupStatus status, uint deposit, uint whiteCount,  uint memberCount,  uint startTime, uint endTime){
        return (bytesToBytes32(fromHex(GroupIdStr),0),StoremanType.GroupStatus.ready,uint(0),uint(0),uint(0),uint(0),uint(0));
    }


    function getStoremanGroupConfig(bytes32 /* id */) external pure returns(bytes32 groupId, uint8 status, uint deposit, uint chain1, uint chain2,
        uint curve1, uint curve2,  bytes memory gpk1, bytes memory gpk2, uint startTime, uint endTime){
        return (bytesToBytes32(fromHex(GroupIdStr),0),0,0,0,0,0x00,0x01,fromHex(gpk1Str),fromHex(gpk2Str),0,0);
    }


    function getGpkShare(bytes32 /* groupId */, uint /* index */) external pure returns(bytes memory gpkShare1, bytes memory gpkShare2){
        return (fromHex(gpkShare1Str),fromHex(gpkShare2Str));
    }


    function setLeader(address leader) external{
        leaderAdd  = leader;
    }

    function bytesToBytes32(bytes memory b, uint offset) internal pure returns (bytes32) {
        bytes32 out;

        for (uint i = 0; i < 32; i++) {
            out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
        }
        return out;
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

    function recordSmSlash(address wk) external{}
}