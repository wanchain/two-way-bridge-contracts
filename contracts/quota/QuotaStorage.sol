/*

  Copyright 2019 Wanchain Foundation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

//                            _           _           _
//  __      ____ _ _ __   ___| |__   __ _(_)_ __   __| | _____   __
//  \ \ /\ / / _` | '_ \ / __| '_ \ / _` | | '_ \@/ _` |/ _ \ \ / /
//   \ V  V / (_| | | | | (__| | | | (_| | | | | | (_| |  __/\ V /
//    \_/\_/ \__,_|_| |_|\___|_| |_|\__,_|_|_| |_|\__,_|\___| \_/
//
//

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
