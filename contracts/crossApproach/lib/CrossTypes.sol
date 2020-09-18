
pragma solidity ^0.4.26;

import "../../interfaces/IRC20Protocol.sol";
import "../../interfaces/IQuota.sol";
import "../../interfaces/IStoremanGroup.sol";
import "../../interfaces/ITokenManager.sol";
import "../../interfaces/ISignatureVerifier.sol";
import "../../lib/SafeMath.sol";
import "./RapidityTxLib.sol";

library CrossTypes {
    using SafeMath for uint;
    struct Data {

        RapidityTxLib.Data rapidityTxData;

        IQuota quota;

        ITokenManager tokenManager;

        IStoremanGroup smgAdminProxy;

        address smgFeeProxy;

        ISignatureVerifier sigVerifier;

        mapping(bytes32 => uint) mapStoremanFee;

        mapping(uint => mapping(uint =>uint)) mapLockFee;

        mapping(uint => mapping(uint =>uint)) mapRevokeFee;

    }

    function bytesToAddress(bytes b) internal pure returns (address addr) {
        assembly {
            addr := mload(add(b,20))
        }
    }

    function transfer(address tokenScAddr, address to, uint value)
        internal
        returns(bool)
    {
        uint beforeBalance;
        uint afterBalance;
        beforeBalance = IRC20Protocol(tokenScAddr).balanceOf(to);
        IRC20Protocol(tokenScAddr).transfer(to, value);
        afterBalance = IRC20Protocol(tokenScAddr).balanceOf(to);
        return afterBalance == beforeBalance.add(value);
    }

    function transferFrom(address tokenScAddr, address from, address to, uint value)
        internal
        returns(bool)
    {
        uint beforeBalance;
        uint afterBalance;
        beforeBalance = IRC20Protocol(tokenScAddr).balanceOf(to);
        IRC20Protocol(tokenScAddr).transferFrom(from, to, value);
        afterBalance = IRC20Protocol(tokenScAddr).balanceOf(to);
        return afterBalance == beforeBalance.add(value);
    }

}
