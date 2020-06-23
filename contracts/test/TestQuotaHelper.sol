pragma solidity 0.4.26;

interface IPriceOracle {
    function getValue(bytes symbol) public view returns(uint price);
}

interface IDepositOracle {
    function getDepositAmount(bytes storemanGroupPK) public view returns(uint deposit);
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

    function getDepositAmount(bytes storemanGroupPK) public view returns(uint deposit) {
        if (keccak256(storemanGroupPK) == keccak256("0xa")) {
            return 1000 ether;
        }

        if (keccak256(storemanGroupPK) == keccak256("0xc")) {
            return 1000 ether;
        }

        if (keccak256(storemanGroupPK) == keccak256("0xd")) {
            return 500 ether;
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

        return ("", 0);
    }
}
