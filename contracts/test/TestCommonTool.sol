// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../lib/CommonTool.sol";

contract TestCommonTool  {

    function bytesToBytes32(bytes memory source) pure public returns (bytes32 result) {
        return CommonTool.bytesToBytes32(source);
    }

    function cmpBytes(bytes memory b1, bytes memory b2)
    public
    pure
    returns(bool)
    {
        return CommonTool.cmpBytes(b1, b2);
    }


}