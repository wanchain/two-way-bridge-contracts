/**
 * @title SafeMath
 * @dev Math operations with safety checks that revert on error
 */
pragma solidity ^0.4.24;
import "./SafeMath.sol";

library EnhancementLib {

    using SafeMath for uint;
    uint public constant DIVISOR = 10000;
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;

    /**
     * public function
     * @dev add 2 point on the curve
     * @param x1 the x value for first point
     * @param y1 the y value for first point
     * @param x2 the x value for second point
     * @param y2 the y value for second point
     * @return retx the x value for result point
     * @return rety the y value for result point
     * @return success the result for calling precompile contract,true is success,false is failed
     */
    function add(uint256 x1, uint256 y1, uint256 x2,uint256 y2)  public view returns(uint256 retx, uint256 rety,bool success) {

       bytes32 functionSelector =0xe022d77c00000000000000000000000000000000000000000000000000000000;
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

    /**
     * public function
     * @dev point on curve to multiple base point
     * @param scalar for mul
     * @return x the x value for result point
     * @return y the y value for result point
     * @return success the result for calling precompile contract,true is success,false is failed
     */
    function s256MulG(uint256 scalar)   public view returns(uint256 x, uint256 y,bool success) {
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
	
    /**
     * public function     
     * @dev point on curve to multiple base point
     * @param scalar for mul 
     * @return x the x value for result point
     * @return y the y value for result point
     * @return success the result for calling precompile contract,true is success,false is failed
     */ 
    function bn256MulG(uint256 scalar)   public view returns(uint256 x, uint256 y,bool success) {
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



    function s256CalPolyCommit(bytes polyCommit, bytes pk)   public view returns(uint256 sx, uint256 sy,bool success) {

        bytes32 functionSelector = 0x66c85fc200000000000000000000000000000000000000000000000000000000;
       return polyCal(polyCommit,pk,functionSelector);
    }

    function bn256CalPolyCommit(bytes polyCommit, bytes pk)  public view returns (uint256 sx, uint256 sy,bool success) {

       bytes32 functionSelector = 0x77f683ba00000000000000000000000000000000000000000000000000000000;
       return polyCal(polyCommit,pk,functionSelector);
    }

    function polyCal(bytes polyCommit, bytes pk,bytes32 functionSelector) internal view returns(uint256 sx, uint256 sy,bool success) {
        address to = PRECOMPILE_CONTRACT_ADDR;
       require((polyCommit.length + pk.length)%64 == 0, "error len polyCommint or pk");

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

    /**
     * public function
     * @dev verify the signature
     * @param hash the hash value for signature
     * @param r the r value for signature
     * @param s the s value for signature
     * @param pk the public key for encrypt
     * @return bool the result for verify,true is success,false is failed
     */
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
            mstore(add(freePtr, 100), mload(add(pk,32)))
            mstore(add(freePtr, 132), mload(add(pk,64)))

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

    /**
     * public function
     * @dev point on curve to multiple scalar
     * @param scalar for mul
     * @return xPk the x value for result point
     * @return yPk the y value for result point
     * @return success the result for calling precompile contract,true is success,false is failed
     */
    function mulPk(uint256 scalar, uint256 xPk, uint256 yPk)
       public
       view
       returns (uint256 x, uint256 y, bool success) {
       bytes32 functionSelector = 0xa99aa2f200000000000000000000000000000000000000000000000000000000;
       address to = PRECOMPILE_CONTRACT_ADDR;

       assembly {
            let freePtr := mload(0x40)
            mstore(freePtr, functionSelector)
            mstore(add(freePtr, 4), scalar)
            mstore(add(freePtr,36), xPk)
            mstore(add(freePtr,68), yPk)

            success := staticcall(gas, to, freePtr,100, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }

    }

    /**
     * public function
     * @dev point on curve to multiple scalar on s256
     * @param scalar for mul
     * @return xPk the x value for result point
     * @return yPk the y value for result point
     * @return success the result for calling precompile contract,true is success,false is failed
     */
    function s256ScalarMul(uint256 scalar, uint256 xPk, uint256 yPk)
    public
    view
    returns (uint256 x, uint256 y, bool success) {
       address to = 0x43;
       assembly {
            let freePtr := mload(0x40)
            mstore(add(freePtr, 0), scalar)
            mstore(add(freePtr,32), xPk)
            mstore(add(freePtr,64), yPk)

            success := staticcall(gas, to, freePtr,96, freePtr, 64)

            x := mload(freePtr)
            y := mload(add(freePtr,32))
        }

    }


    /**
     * public function
     * @dev add 2 point on the curve
     * @param x1 the x value for first point
     * @param y1 the y value for first point
     * @param x2 the x value for second point
     * @param y2 the y value for second point
     * @return retx the x value for result point
     * @return rety the y value for result point
     * @return success the result for calling precompile contract,true is success,false is failed
     */
    function s256add(uint256 x1, uint256 y1, uint256 x2,uint256 y2)  public view returns(uint256 retx, uint256 rety,bool success) {
       address to = 0x42;
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


    /**
     * public function
     * @dev point on curve to multiple scalar on s256
     * @param scalar for mul
     * @return xPk the x value for result point
     * @return yPk the y value for result point
     * @return success the result for calling precompile contract,true is success,false is failed
     */
    function bn256ScalarMul(uint256 scalar, uint256 xPk, uint256 yPk)
    public
    view
    returns (uint256 x, uint256 y, bool success) {
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


    /**
     * public function
     * @dev add 2 point on the curve bn256
     * @param x1 the x value for first point
     * @param y1 the y value for first point
     * @param x2 the x value for second point
     * @param y2 the y value for second point
     * @return retx the x value for result point
     * @return rety the y value for result point
     * @return success the result for calling precompile contract,true is success,false is failed
     */
    function bn256add(uint256 x1, uint256 y1, uint256 x2,uint256 y2)  public view returns(uint256 retx, uint256 rety,bool success) {
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
}