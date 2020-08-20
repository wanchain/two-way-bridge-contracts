pragma solidity ^0.4.24;

library Bn256Curve {
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;

    function add(uint256 x1, uint256 y1, uint256 x2, uint256 y2)
        public
        view
        returns(uint256 retx, uint256 rety, bool success)
    {
       address to = 0x6;
       assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), x1)
            mstore(add(freePtr, 32), y1)
            mstore(add(freePtr, 64), x2)
            mstore(add(freePtr, 96), y2)

            // call ERC20 Token contract transfer function
            success := staticcall(gas,to, freePtr,128, freePtr, 64)

            retx := mload(freePtr)
            rety := mload(add(freePtr,32))
        }
    }

    function mulG(uint256 scalar)
        public
        view
        returns(uint256 x, uint256 y, bool success)
    {
        bytes32 functionSelector = 0x0e5725cd00000000000000000000000000000000000000000000000000000000;
        address to = PRECOMPILE_CONTRACT_ADDR;
        assembly {
            let freePtr := mload(0x40)

            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), scalar)

            // call ERC20 Token contract transfer function
            success := staticcall(gas, to, freePtr,36, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }
    }

    function calPolyCommit(bytes polyCommit, bytes pk)
        public
        view
        returns(uint256 sx, uint256 sy, bool success)
    {
       address to = PRECOMPILE_CONTRACT_ADDR;
       bytes32 functionSelector = 0x77f683ba00000000000000000000000000000000000000000000000000000000;

       require((polyCommit.length + pk.length)%64 == 0, "bn error len polyCommint or pk");

       uint polyCommitCnt = polyCommit.length/64;
       uint total = (polyCommitCnt + 1)*2;

       assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr,4), mload(add(polyCommit,32)))
            mstore(add(freePtr,36), mload(add(polyCommit,64)))
            let loopCnt := 1
            loop:
                jumpi(loopend, eq(loopCnt,polyCommitCnt))
                mstore(add(freePtr,add(4,mul(loopCnt,64))),         mload(add(add(add(polyCommit,32),mul(loopCnt,64)),0)))
                mstore(add(freePtr,add(4,add(mul(loopCnt,64),32))), mload(add(add(add(add(polyCommit,32),mul(loopCnt,64)),0),32)))
                loopCnt := add(loopCnt, 1)
                jump(loop)
            loopend:

            mstore(add(freePtr,    add(4,mul(loopCnt,64))),     mload(add(pk,32)))
            mstore(add(freePtr,add(add(4,mul(loopCnt,64)),32)), mload(add(pk,64)))

            success := staticcall(gas,to, freePtr,add(mul(total,32),4), freePtr, 64)

            sx := mload(freePtr)
            sy := mload(add(freePtr, 32))
        }
    }

    function mulPk(uint256 scalar, uint256 xPk, uint256 yPk)
    public
    view
    returns (uint256 x, uint256 y, bool success){
        address to = 0x7;

        assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr,0), xPk)
            mstore(add(freePtr,32), yPk)
            mstore(add(freePtr, 64), scalar)

            success := staticcall(gas, to, freePtr,96, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }

    }
}