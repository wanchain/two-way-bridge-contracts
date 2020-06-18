pragma solidity ^0.4.24;

import "./SafeMath.sol";

contract Encrypt {
    using SafeMath for uint;
    uint public constant DIVISOR = 10000;
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;

    function add(uint256 x1, uint256 y1, uint256 x2, uint256 y2)
        public
        view
        returns(uint256 retx, uint256 rety, bool success)
    {
        bytes32 functionSelector = 0xe022d77c00000000000000000000000000000000000000000000000000000000;
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
        returns(uint256 x, uint256 y, bool success)
    {
        bytes32 functionSelector = 0xbb734c4e00000000000000000000000000000000000000000000000000000000; //keccak256("mulG(uint256)");
        address to = PRECOMPILE_CONTRACT_ADDR;
        assembly {
            let freePtr := mload(0x40)

            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), scalar)

            // call ERC20 Token contract transfer function
            success := staticcall(gas, to, freePtr, 36, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr, 32))
        }
    }

    function calPolyCommit(bytes polyCommit, bytes pk)
        public
        view
        returns(uint256 sx, uint256 sy, bool success)
    {
        require((polyCommit.length + pk.length) % 65 == 0);
        bytes32 functionSelector = 0xf9d9c3ff00000000000000000000000000000000000000000000000000000000; //keccak256("calPolyCommit(bytes,uint256)");
        address to = PRECOMPILE_CONTRACT_ADDR;
        uint polyCommitCnt = polyCommit.length / 65;
        uint total = (polyCommitCnt + 1) * 2;

        assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), mload(add(polyCommit, 33)))
            mstore(add(freePtr, 36), mload(add(polyCommit, 65)))
            let loopCnt := 1
            loop:
                jumpi(loopend, eq(loopCnt,polyCommitCnt))
                mstore(add(freePtr, add(4, mul(loopCnt, 64))), mload(add(add(add(polyCommit, 32), mul(loopCnt, 65)), 1)))
                mstore(add(freePtr, add(4, add(mul(loopCnt, 64), 32))), mload(add(add(add(add(polyCommit, 32), mul(loopCnt, 65)), 1), 32)))
                loopCnt := add(loopCnt, 1)
                jump(loop)
            loopend:

            mstore(add(freePtr, add(4, mul(loopCnt, 64))), mload(add(pk, 33)))
            mstore(add(freePtr, add(add(4, mul(loopCnt, 64)), 32)), mload(add(pk, 65)))

            success := staticcall(gas, to, freePtr, add(mul(total, 32), 4), freePtr, 64)

            sx := mload(freePtr)
            sy := mload(add(freePtr, 32))
        }
    }

    function enc(bytes32 rbpri, bytes32 iv, uint256 mes, bytes pub)
        public
        view
        returns(bytes, bool success)
    {
        bytes32 functionSelector = 0xa1ecea4b00000000000000000000000000000000000000000000000000000000;
        address to = PRECOMPILE_CONTRACT_ADDR;
        bytes memory cc = new bytes(6*32);
        assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), rbpri)
            mstore(add(freePtr, 36), iv)
            mstore(add(freePtr, 68), mes)
            mstore(add(freePtr, 100), mload(add(pub, 33)))
            mstore(add(freePtr, 132), mload(add(pub, 65)))

            // call ERC20 Token contract transfer function
            success := staticcall(gas,to, freePtr, 164, freePtr, 1024)

            let loopCnt := 0
            loop:
                jumpi(loopend, eq(loopCnt, 6))
                mstore(add(cc, mul(add(loopCnt, 1), 32)), mload(add(freePtr, mul(loopCnt, 32))))
                loopCnt := add(loopCnt, 1)
                jump(loop)
            loopend:
        }
        return (cc,success);
    }
}