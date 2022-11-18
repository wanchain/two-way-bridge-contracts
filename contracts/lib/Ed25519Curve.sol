pragma solidity ^0.4.24;

library Ed25519Curve {
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;

    function add(uint256 x1, uint256 y1, uint256 x2, uint256 y2)
    public
    view
    returns (uint256 retx, uint256 rety, bool success)
    {
        bytes32 functionSelector = 0xf838b95d00000000000000000000000000000000000000000000000000000000;
        address to = PRECOMPILE_CONTRACT_ADDR;
        assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)

            mstore(add(freePtr, 4), x1)
            mstore(add(freePtr, 36), y1)
            mstore(add(freePtr, 68), x2)
            mstore(add(freePtr, 100), y2)

        // call ERC20 Token contract transfer function
            success := staticcall(gas, to, freePtr, 132, freePtr, 64)

            retx := mload(freePtr)
            rety := mload(add(freePtr, 32))
        }
    }

    function mulG(uint256 scalar)
    public
    view
    returns (uint256 x, uint256 y, bool success)
    {
        bytes32 functionSelector = 0x0f6990cc00000000000000000000000000000000000000000000000000000000;
        address to = PRECOMPILE_CONTRACT_ADDR;
        assembly {
            let freePtr := mload(0x40)

            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), scalar)

            success := staticcall(gas, to, freePtr, 36, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr, 32))
        }
    }

    function calPolyCommit(bytes polyCommit, bytes pk)
    public
    view
    returns (uint256 sx, uint256 sy, bool success)
    {
        address to = PRECOMPILE_CONTRACT_ADDR;
        bytes32 functionSelector = 0xce5aef4c00000000000000000000000000000000000000000000000000000000;

        require((polyCommit.length + pk.length) % 64 == 0, "ed error len polyCommint or pk");

        uint polyCommitCnt = polyCommit.length / 64;
        uint total = (polyCommitCnt + 1) * 2;

        assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), mload(add(polyCommit, 32)))
            mstore(add(freePtr, 36), mload(add(polyCommit, 64)))
            let loopCnt := 1
            loop :
            jumpi(loopend, eq(loopCnt, polyCommitCnt))
            mstore(add(freePtr, add(4, mul(loopCnt, 64))), mload(add(add(add(polyCommit, 32), mul(loopCnt, 64)), 0)))
            mstore(add(freePtr, add(4, add(mul(loopCnt, 64), 32))), mload(add(add(add(add(polyCommit, 32), mul(loopCnt, 64)), 0), 32)))
            loopCnt := add(loopCnt, 1)
            jump(loop)
            loopend :

            mstore(add(freePtr, add(4, mul(loopCnt, 64))), mload(add(pk, 32)))
            mstore(add(freePtr, add(add(4, mul(loopCnt, 64)), 32)), mload(add(pk, 64)))

            success := staticcall(gas, to, freePtr, add(mul(total, 32), 4), freePtr, 64)

            sx := mload(freePtr)
            sy := mload(add(freePtr, 32))
        }
    }

    function mulPk(uint256 scalar, uint256 xPk, uint256 yPk)
    public
    view
    returns (uint256 x, uint256 y, bool success){

        bytes32 functionSelector = 0x1f57c67500000000000000000000000000000000000000000000000000000000;
        address to = PRECOMPILE_CONTRACT_ADDR;

        assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)

            mstore(add(freePtr, 4), scalar)
            mstore(add(freePtr, 36), xPk)
            mstore(add(freePtr, 68), yPk)

            success := staticcall(gas, to, freePtr, 100, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr, 32))
        }

    }

    function equalPt(uint256 xLeft, uint256 yLeft, uint256 xRight, uint256 yRight) public view returns (bool){
        return xLeft == xRight && yLeft == yRight;
    }
}