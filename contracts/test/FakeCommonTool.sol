
pragma solidity ^0.4.24;

library FakeCommonTool {

    enum CurveType  {SK, BN}

    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;

    bytes constant encValue = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    function bytes2uint(bytes source, uint16 offset, uint16 length)
    public
    pure
    returns(uint)
    {
        uint number = 0;
        for (uint i = 0; i < length; i++) {
            number = number + uint8(source[i + offset]) * (2 ** (8 * (length - (i + 1))));
        }
        return number;
    }

    function bytesToBytes32(bytes memory source) pure public returns (bytes32 result) {
        assembly {
            result := mload(add(source, 32))
        }
    }

    function cmpBytes(bytes b1, bytes b2)
    public
    pure
    returns(bool)
    {
        uint len1 = b1.length;
        uint len2 = b2.length; 
        if (len2 >= len1) {
            for (uint i = 0; i < len2; i++) {
                if (i < len1) {
                    if (b1[i] != b2[i]) {
                        return false;
                    }
                } else if (b2[i] != 0x0) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    function enc(bytes32 rbpri, bytes32 iv, uint256 mes, bytes pub)
    public
    view
    returns(bytes, bool success)
    {
        return (encValue, mes != 0);
    }
}
