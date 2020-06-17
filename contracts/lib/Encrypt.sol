pragma solidity ^0.4.24;

/**
 * @title SafeMath
 * @dev Math operations with safety checks that revert on error
 */
library SafeMath {

    /**
    * @dev Multiplies two numbers, reverts on overflow.
    */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b);

        return c;
    }

    /**
    * @dev Integer division of two numbers truncating the quotient, reverts on division by zero.
    */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0); // Solidity only automatically asserts when dividing by 0
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
    * @dev Subtracts two numbers, reverts on overflow (i.e. if subtrahend is greater than minuend).
    */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a);
        uint256 c = a - b;

        return c;
    }

    /**
    * @dev Adds two numbers, reverts on overflow.
    */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a);

        return c;
    }

    /**
    * @dev Divides two numbers and returns the remainder (unsigned integer modulo),
    * reverts when dividing by zero.
    */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b != 0);
        return a % b;
    }
}

contract Encrypt {

    using SafeMath for uint;
    uint public constant DIVISOR = 10000;
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;

    function add(uint256 x1, uint256 y1, uint256 x2,uint256 y2)  public view returns(uint256 retx, uint256 rety,bool success) {
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
            success := staticcall(gas,to, freePtr,132, freePtr, 64)

            retx := mload(freePtr)
            rety := mload(add(freePtr,32))
        }
    }

    function mulG(uint256 scalar)   public view returns(uint256 x, uint256 y,bool success) {
        bytes32 functionSelector = 0xbb734c4e00000000000000000000000000000000000000000000000000000000;//keccak256("mulG(uint256)");
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

    function calPolyCommit(bytes polyCommit, bytes pk)   public view returns(uint256 sx, uint256 sy,bool success) {
       bytes32 functionSelector = 0xf9d9c3ff00000000000000000000000000000000000000000000000000000000;//keccak256("calPolyCommit(bytes,uint256)");
       address to = PRECOMPILE_CONTRACT_ADDR;

       require((polyCommit.length + pk.length) % 65 == 0, "Invalid paras");

       uint polyCommitCnt = polyCommit.length/65;
       uint total = (polyCommitCnt + 1)*2;

       assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr,4), mload(add(polyCommit,33)))
            mstore(add(freePtr,36), mload(add(polyCommit,65)))
            let loopCnt := 1
            loop:
                jumpi(loopend, eq(loopCnt,polyCommitCnt))
                mstore(add(freePtr,add(4,mul(loopCnt,64))),         mload(add(add(add(polyCommit,32),mul(loopCnt,65)),1)))
                mstore(add(freePtr,add(4,add(mul(loopCnt,64),32))), mload(add(add(add(add(polyCommit,32),mul(loopCnt,65)),1),32)))
                loopCnt := add(loopCnt, 1)
                jump(loop)
            loopend:

            mstore(add(freePtr,    add(4,mul(loopCnt,64))),     mload(add(pk,33)))
            mstore(add(freePtr,add(add(4,mul(loopCnt,64)),32)), mload(add(pk,65)))

            success := staticcall(gas,to, freePtr,add(mul(total,32),4), freePtr, 64)

            sx := mload(freePtr)
            sy := mload(add(freePtr, 32))
        }
    }

    function enc(bytes32 rbpri,bytes32 iv,uint256 mes, bytes pub)   public view returns (bytes,bool success) {
        bytes32 functionSelector = 0xa1ecea4b00000000000000000000000000000000000000000000000000000000;
        address to = PRECOMPILE_CONTRACT_ADDR;
        bytes memory cc = new bytes(6*32);
        assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), rbpri)
            mstore(add(freePtr, 36), iv)
            mstore(add(freePtr, 68), mes)
            mstore(add(freePtr, 100), mload(add(pub,33)))
            mstore(add(freePtr, 132), mload(add(pub,65)))

            // call ERC20 Token contract transfer function
            success := staticcall(gas,to, freePtr,164, freePtr,1024)

            let loopCnt := 0
            loop:
                jumpi(loopend, eq(loopCnt,6))
                mstore(add(cc,mul(loopCnt,32)),mload(add(freePtr,mul(loopCnt,32))))
                loopCnt := add(loopCnt, 1)
                jump(loop)
            loopend:
        }

        return (cc, success);
    }

    function checkSig (bytes32 hash, bytes32 r, bytes32 s, bytes pk) public view returns(bool) {
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
            mstore(add(freePtr, 100), mload(add(pk,33)))
            mstore(add(freePtr, 132), mload(add(pk,65)))

            // call ERC20 Token contract transfer function
            success := staticcall(gas, to, freePtr,164, freePtr, 32)
            result := mload(freePtr)
        }

        if (success) {
            return result == 1;
        } else {
            return false;
        }
    }
}