pragma solidity ^0.4.24;

library Encrypt {
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;

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
            mstore(add(freePtr, 100), mload(add(pub, 32)))
            mstore(add(freePtr, 132), mload(add(pub, 64)))

            // call ERC20 Token contract transfer function
            success := staticcall(gas,to, freePtr, 164, freePtr, 1024)

            let loopCnt := 0
            loop:
                jumpi(loopend, eq(loopCnt, 6))
                mstore(add(cc, mul(loopCnt, 32)), mload(add(freePtr, mul(loopCnt, 32))))
                loopCnt := add(loopCnt, 1)
                jump(loop)
            loopend:
        }
        return (cc,success);
    }
}