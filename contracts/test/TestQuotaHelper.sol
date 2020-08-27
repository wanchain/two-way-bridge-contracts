// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

interface IPriceOracle {
    function getValue(bytes symbol) public view returns (uint256 price);
}

interface IDepositOracle {
    function getDepositAmount(bytes32 storemanGroupId)
        public
        view
        returns (uint256 deposit);
}

interface ITokenManager {
    function getTokenPairInfo(uint256 id)
        public
        view
        returns (bytes ancestorSymbol);
}

contract StoremanType {
    enum GroupStatus {
        none,
        initial,
        curveSeted,
        failed,
        selected,
        ready,
        unregistered,
        dismissed
    }
}

contract TestQuotaHelper {
    mapping(bytes32 => uint256) priceMap;

    constructor() public {
        priceMap[stringToBytes32("BTC")] = 998000000000;
        priceMap[stringToBytes32("ETH")] = 24500000000;
        priceMap[stringToBytes32("WAN")] = 21240000;
    }

    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }

    function getValue(bytes32 key) public view returns (uint256 price) {
        return priceMap[key];
    }

    function setValue(string key, uint256 value) public {
        priceMap[stringToBytes32(key)] = value;
    }

    function getStoremanGroupConfig(bytes32 storemanGroupId)
        external
        view
        returns (
            bytes32 groupId,
            uint256 status,
            uint256 deposit,
            uint256 chain1,
            uint256 chain2,
            uint256 curve1,
            uint256 curve2,
            bytes gpk1,
            bytes gpk2,
            uint256 startTime,
            uint256 endTime
        )
    {
        if (storemanGroupId == keccak256("storeman1")) {
            deposit = 1000 ether;
        }

        if (storemanGroupId == keccak256("storeman2")) {
            deposit = 1000 ether;
        }

        if (storemanGroupId == keccak256("storeman3")) {
            deposit = 1000 ether;
        }

        if (storemanGroupId == keccak256("storeman4")) {
            deposit = 1000 ether;
        }
    }

    function getDeposit(bytes32 storemanGroupId)
        public
        view
        returns (uint256 deposit)
    {
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

    function getAncestorInfo(uint256 id)
        external
        view
        returns (
            bytes account,
            string name,
            string symbol,
            uint8 decimals,
            uint256 chainId
        )
    {
        if (id == 0) {
            return ("", "", "WAN", 18, 1);
        }

        if (id == 1) {
            return ("", "", "BTC", 8, 1);
        }

        if (id == 2) {
            return ("", "", "ETH", 18, 1);
        }

        if (id == 3) {
            return ("", "", "ETC", 18, 1);
        }

        return ("", "", "", 0, 1);
    }

    function isDebtClean(bytes32 storemanGroupId) external view returns (bool) {
        return false;
    }
}
