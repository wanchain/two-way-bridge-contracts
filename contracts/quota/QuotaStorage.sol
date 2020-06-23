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
    
    /// @dev Math operations with safety checks
    using SafeMath for uint;

    struct Quota {
        /// amount of original token to be received, equals to amount of WAN token to be minted
        uint _receivable;
        /// amount of WAN token to be burnt
        uint _payable;
        /// amount of original token has been exchanged to the wanchain
        uint _debt;
        /// data is active
        bool _active;
    }

    event MintLock(address indexed sender, uint indexed tokenId, bytes indexed storemanGroupPK, uint value, uint _receivable, uint _payable);

    event MintRedeem(address indexed sender, uint indexed tokenId, bytes indexed storemanGroupPK, uint value, uint _receivable, uint _payable);

    event MintRevoke(address indexed sender, uint indexed tokenId, bytes indexed storemanGroupPK, uint value, uint _receivable, uint _payable);

    event BurnLock(address indexed sender, uint indexed tokenId, bytes indexed storemanGroupPK, uint value, uint _receivable, uint _payable);

    event BurnRedeem(address indexed sender, uint indexed tokenId, bytes indexed storemanGroupPK, uint value, uint _receivable, uint _payable);

    event BurnRevoke(address indexed sender, uint indexed tokenId, bytes indexed storemanGroupPK, uint value, uint _receivable, uint _payable);

    event DebtLock(
        address indexed sender,
        uint256 indexed tokenId,
        bytes indexed srcStoremanGroupPK,
        bytes dstStoremanGroupPK,
        uint256 value);

    event DebtRedeem(
        address indexed sender,
        uint256 indexed tokenId,
        bytes indexed srcStoremanGroupPK,
        bytes dstStoremanGroupPK,
        uint256 value);

    event DebtRevoke(
        address indexed sender,
        uint256 indexed tokenId,
        bytes indexed srcStoremanGroupPK,
        bytes dstStoremanGroupPK,
        uint256 value);

    /// @dev mapping: tokenId => storemanPk => Quota
    mapping(uint => mapping(bytes => Quota)) quotaMap;

    /// @dev mapping: storemanPk => tokenIndex => tokenId, tokenIndex:0,1,2,3...
    mapping(bytes => mapping(uint => uint)) storemanTokensMap;

    /// @dev mapping: storemanPk => token count
    mapping(bytes => uint) storemanTokenCountMap;

    /// @dev save htlc address
    address public htlcAddress;

    /// @dev save deposit oracle address (storeman admin or oracle)
    address public depositOracleAddress;

    /// @dev save price oracle address
    address public priceOracleAddress;

    /// @dev deposit rate use for deposit amount calculate
    uint public depositRate;

    /// @dev deposit token's symbol
    bytes public depositTokenSymbol;

    /// @dev token manger contract address
    address public tokenManagerAddress;

    modifier onlyHtlc() {
        require(msg.sender == htlcAddress, "Not HTLC contract");
        _;
    }
}
