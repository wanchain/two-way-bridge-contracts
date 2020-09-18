
pragma solidity 0.4.26;

import "../lib/SafeMath.sol";
import "../components/BasicStorage.sol";

contract QuotaStorage is BasicStorage {

    using SafeMath for uint;

    struct Quota {

        uint debt_receivable;

        uint debt_payable;

        uint _debt;

        uint asset_receivable;

        uint asset_payable;

        uint _asset;

        bool _active;
    }

    uint public constant DENOMINATOR = 10000;

    mapping(uint => mapping(bytes32 => Quota)) quotaMap;

    mapping(bytes32 => mapping(uint => uint)) storemanTokensMap;

    mapping(bytes32 => uint) storemanTokenCountMap;

    mapping(address => bool) public htlcGroupMap;

    address public depositOracleAddress;

    address public priceOracleAddress;

    uint public depositRate;

    string public depositTokenSymbol;

    address public tokenManagerAddress;

    address public debtOracleAddress;

    uint public fastCrossMinValue;

    modifier onlyHtlc() {
        require(htlcGroupMap[msg.sender], "Not in HTLC group");
        _;
    }
}
