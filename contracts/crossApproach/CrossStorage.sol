
pragma solidity ^0.4.26;

import "../components/BasicStorage.sol";
import "./lib/CrossTypes.sol";
import "./lib/RapidityTxLib.sol";

contract CrossStorage is BasicStorage {
    using RapidityTxLib for RapidityTxLib.Data;
    CrossTypes.Data internal storageData;

    uint public smgFeeReceiverTimeout = uint(10*60);

    enum GroupStatus { none, initial, curveSeted, failed, selected, ready, unregistered, dismissed }

}