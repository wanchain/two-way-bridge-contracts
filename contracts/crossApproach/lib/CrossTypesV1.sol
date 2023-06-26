// SPDX-License-Identifier: MIT

/*

  Copyright 2023 Wanchain Foundation.

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

pragma solidity >=0.8.0;

import "../../interfaces/IRC20Protocol.sol";
import "../../interfaces/IQuota.sol";
import "../../interfaces/IStoremanGroup.sol";
import "../../interfaces/ITokenManager.sol";
import "../../interfaces/ISignatureVerifier.sol";
import "./HTLCTxLib.sol";
import "./RapidityTxLib.sol";

library CrossTypesV1 {
    using SafeMath for uint;

    /**
     *
     * STRUCTURES
     *
     */

    struct Data {

        /// map of the htlc transaction info
        HTLCTxLib.Data htlcTxData;

        /// map of the rapidity transaction info
        RapidityTxLib.Data rapidityTxData;

        /// quota data of storeman group
        IQuota quota;

        /// token manager instance interface
        ITokenManager tokenManager;

        /// storemanGroup admin instance interface
        IStoremanGroup smgAdminProxy;

        /// storemanGroup fee admin instance address
        address smgFeeProxy;

        ISignatureVerifier sigVerifier;

        /// @notice transaction fee, smgID => fee
        mapping(bytes32 => uint) mapStoremanFee;

        /// @notice transaction fee, origChainID => shadowChainID => fee
        mapping(uint => mapping(uint =>uint)) mapContractFee;

        /// @notice transaction fee, origChainID => shadowChainID => fee
        mapping(uint => mapping(uint =>uint)) mapAgentFee;

    }

    /**
     *
     * MANIPULATIONS
     *
     */

    // /// @notice       convert bytes32 to address
    // /// @param b      bytes32
    // function bytes32ToAddress(bytes32 b) internal pure returns (address) {
    //     return address(uint160(bytes20(b))); // high
    //     // return address(uint160(uint256(b))); // low
    // }

    /// @notice       convert bytes to address
    /// @param b      bytes
    function bytesToAddress(bytes memory b) internal pure returns (address addr) {
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
        // IRC20Protocol(tokenScAddr).transfer(to, value);
        (bool success,) = tokenScAddr.call(abi.encodePacked(bytes4(keccak256("transfer(address,uint256)")), to, value));
        require(success, "transfer failed");
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
        // IRC20Protocol(tokenScAddr).transferFrom(from, to, value);
        (bool success,) = tokenScAddr.call(abi.encodePacked(bytes4(keccak256("transferFrom(address,address,uint256)")), from, to, value));
        require(success, "TransferFrom failed");
        afterBalance = IRC20Protocol(tokenScAddr).balanceOf(to);
        return afterBalance == beforeBalance.add(value);
    }
}
