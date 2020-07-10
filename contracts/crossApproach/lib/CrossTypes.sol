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

pragma solidity ^0.4.26;

import "../interfaces/IQuota.sol";
import "../interfaces/ISmgAdminProxy.sol";
import "../interfaces/ITokenManager.sol";
import "../interfaces/ISignatureVerifier.sol";
import "./HTLCTxLib.sol";
import "./RapidityTxLib.sol";

library CrossTypes {
    // using HTLCTxLib for HTLCTxLib.Data;
    // using RapidityTxLib for RapidityTxLib.Data;

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
        ISmgAdminProxy smgAdminProxy;

        /// storemanGroup fee admin instance address
        address smgFeeProxy;

        ISignatureVerifier sigVerifier;

        /// @notice transaction fee, hashX => fee
        mapping(bytes32 => uint) mapXHashFee;

        /// @notice transaction fee, smgID => fee
        mapping(bytes32 => uint) mapStoremanFee;

        /// @notice transaction fee, origChainID => shadowChainID => fee
        mapping(uint => mapping(uint =>uint)) mapLockFee;

        /// @notice transaction fee, origChainID => shadowChainID => fee
        mapping(uint => mapping(uint =>uint)) mapRevokeFee;

    }

    /**
     *
     * MANIPULATIONS
     *
     */

    /// @notice       convert bytes32 to address
    /// @param b      bytes32
    function bytes32ToAddress(bytes32 b) internal pure returns (address) {
        return address(uint160(bytes20(b))); // high
        // return address(uint160(uint256(b))); // low
    }

}
