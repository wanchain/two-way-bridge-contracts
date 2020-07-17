pragma solidity 0.4.26;

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
    enum GroupStatus {none, initial,curveSeted, failed,selected,ready,unregistered, dismissed}
}

contract TestQuotaHelper {
    mapping(bytes32 => uint256) priceMap;

    constructor() public {
        priceMap[keccak256("BTC")] = 998000000000;
        priceMap[keccak256("ETH")] = 24500000000;
        priceMap[keccak256("WAN")] = 21240000;
    }

    function getValue(bytes key) public view returns (uint256 price) {
        return priceMap[keccak256(key)];
    }

    function setValue(bytes key, uint256 value) public {
        priceMap[keccak256(key)] = value;
    }

    function getStoremanGroupConfig(bytes32 storemanGroupId)
        external
        view
        returns (
            bytes32 groupId,
            StoremanType.GroupStatus status,
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

  function getAncestorInfo(uint id) external view
    returns (bytes account, bytes name, bytes symbol, uint8 decimals, uint chainId)
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
}
