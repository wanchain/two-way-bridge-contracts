pragma solidity 0.4.26;

interface IPriceOracle {
    function getValue(bytes symbol) public view returns(uint price);
}

interface IDepositOracle {
    function getDepositAmount(bytes32 storemanGroupId) public view returns(uint deposit);
}

interface ITokenManager {
    function getTokenPairInfo(uint id) public view returns(bytes ancestorSymbol);
}

contract TestQuotaHelper {

    mapping(bytes32 => uint) priceMap;

    constructor() public {
        priceMap[keccak256("BTC")] = 998000000000;
        priceMap[keccak256("ETH")] = 24500000000;
        priceMap[keccak256("WAN")] = 21240000;
    }

    function getValue(bytes key) public view returns(uint price) {
        return priceMap[keccak256(key)];
    }

    function setValue(bytes key, uint value) public {
        priceMap[keccak256(key)] = value;
    }

    function getDeposit(bytes32 storemanGroupId) public view returns(uint deposit) {
        if (storemanGroupId == keccak256("storeman1")) {
            return 1000 ether;
        }

        if (storemanGroupId == keccak256("storeman2")) {
            return 1000 ether;
        }

        if (storemanGroupId == keccak256("storeman3")) {
            return 1000 ether;
        }

        if (storemanGroupId == keccak256("storeman4")) {
            return 100 ether;
        }

        return 0;
    }

    function getTokenPairInfo(uint id) public view returns(bytes ancestorSymbol, uint decimails) {
        if (id == 0) {
            return ("WAN", 8);
        }

        if (id == 1) {
            return ("BTC", 8);
        }

        if (id == 2) {
            return ("ETH", 18);
        }

        if (id == 3) {
            return ("ETC", 18);
        }

        return ("", 0);
    }
}
