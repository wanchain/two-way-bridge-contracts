// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

library Secp256k1Curve {
    address constant PRECOMPILE_CONTRACT_ADDR = address(0x268);

    function add(uint256 x1, uint256 y1, uint256 x2, uint256 y2)
        public
        view
        returns(uint256 retx, uint256 rety, bool success)
    {
        address to = address(0x42);
        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), x1)
            mstore(add(freePtr, 32), y1)
            mstore(add(freePtr, 64), x2)
            mstore(add(freePtr, 96), y2)

            // call ERC20 Token contract transfer function
            success := staticcall(gas(),to, freePtr,128, freePtr, 64)

            retx := mload(freePtr)
            rety := mload(add(freePtr,32))
        }
    }

    function mulG(uint256 scalar)
        public
        view
        returns(uint256 x, uint256 y, bool success)
    {
        bytes32 functionSelector = 0xbb734c4e00000000000000000000000000000000000000000000000000000000;//keccak256("mulG(uint256)");
        address to = PRECOMPILE_CONTRACT_ADDR;
        assembly {
            let freePtr := mload(0x40)

            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), scalar)

            // call ERC20 Token contract transfer function
            success := staticcall(gas(), to, freePtr,36, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }
    }

    function calPolyCommit(bytes memory polyCommit, bytes memory pk)
        public
        view
        returns(uint256 sx, uint256 sy, bool success)
    {
       address to = PRECOMPILE_CONTRACT_ADDR;
       bytes32 functionSelector = 0x66c85fc200000000000000000000000000000000000000000000000000000000;

       require((polyCommit.length + pk.length)%64 == 0, "error len polyCommint or pk");

       uint polyCommitCnt = polyCommit.length/64;
       uint total = (polyCommitCnt + 1)*2;

       assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr,4), mload(add(polyCommit,32)))
            mstore(add(freePtr,36), mload(add(polyCommit,64)))

            let loopCnt := 1
            for { } eq(loopCnt, polyCommitCnt) { loopCnt := add(loopCnt, 1) } {
                mstore(add(freePtr, add(4, mul(loopCnt, 64))), mload(add(add(add(polyCommit, 32), mul(loopCnt, 64)), 0)))
                mstore(add(freePtr, add(4, add(mul(loopCnt, 64), 32))), mload(add(add(add(add(polyCommit, 32), mul(loopCnt, 64)), 0), 32)))
            }
            mstore(add(freePtr,    add(4,mul(loopCnt,64))),     mload(add(pk,32)))
            mstore(add(freePtr,add(add(4,mul(loopCnt,64)),32)), mload(add(pk,64)))

            success := staticcall(gas(),to, freePtr,add(mul(total,32),4), freePtr, 64)

            sx := mload(freePtr)
            sy := mload(add(freePtr, 32))
        }
    }

    function mulPk(uint256 scalar, uint256 xPk, uint256 yPk)
    public
    view
    returns (uint256 x, uint256 y, bool success){
        address to = address(0x43);
        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), scalar)
            mstore(add(freePtr,32), xPk)
            mstore(add(freePtr,64), yPk)

            success := staticcall(gas(), to, freePtr,96, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }

    }
    function equalPt (uint256 xLeft, uint256 yLeft,uint256 xRight, uint256 yRight) public pure returns(bool){
        return xLeft == xRight && yLeft == yRight;
    }

    function checkSig (bytes32 hash, bytes32 r, bytes32 s, bytes memory pk) public view returns(bool) {
        bytes32 functionSelector = 0x861731d500000000000000000000000000000000000000000000000000000000;
        address to = PRECOMPILE_CONTRACT_ADDR;
        uint256 result;
        bool success;
        assembly {
            let freePtr := mload(0x40)

            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), hash)
            mstore(add(freePtr, 36), r)
            mstore(add(freePtr, 68), s)
            mstore(add(freePtr, 100), mload(add(pk,32)))
            mstore(add(freePtr, 132), mload(add(pk,64)))

            success := staticcall(gas(), to, freePtr,164, freePtr, 32)

            result := mload(freePtr)
        }

        if (success) {
            return result == 1;
        } else {
            return false;
        }
    }
}