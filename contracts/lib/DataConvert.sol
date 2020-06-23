pragma solidity ^0.4.24;

library DataConvert {
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

    function cmpBytes(bytes b1, bytes b2)
        public
        pure
        returns(bool)
    {
        uint len1 = b1.length;
        uint len2 = b2.length; // maybe has padding
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
}