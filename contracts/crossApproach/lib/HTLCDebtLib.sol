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
pragma experimental ABIEncoderV2;

// import "./HTLCTxLib.sol";
import "./CrossTypes.sol";

library HTLCDebtLib {
    // using SafeMath for uint;
    // using HTLCTxLib for HTLCTxLib.Data;

    /**
     *
     * STRUCTURES
     *
     */

    /// @notice struct of debt and asset parameters
    struct DebtAssetParams {
        bytes32 uniqueID;               /// hash of HTLC random number
        bytes32 srcSmgID;               /// ID of source storeman group
        bytes32 destSmgID;              /// ID of destination storeman group
    }

    /**
     *
     * EVENTS
     *
     **/

    /// @notice                     event of storeman asset transfer
    /// @param uniqueID                random number
    /// @param srcSmgID             ID of source storeman group
    /// @param destSmgID            ID of destination storeman group
    event TransferAssetLogger(bytes32 indexed uniqueID, bytes32 indexed srcSmgID, bytes32 indexed destSmgID);

    /// @notice                     event of storeman debt receive
    /// @param uniqueID                random number
    /// @param srcSmgID             ID of source storeman group
    /// @param destSmgID            ID of destination storeman group
    event ReceiveDebtLogger(bytes32 indexed uniqueID, bytes32 indexed srcSmgID, bytes32 indexed destSmgID);

    /**
     *
     * MANIPULATIONS
     *
     */

    /// @notice                     transfer asset
    /// @param  storageData         Cross storage data
    /// @param  params              parameters of storeman debt lock
    function transferAsset(CrossTypes.Data storage storageData, DebtAssetParams memory params)
        public
    {
        if (address(storageData.quota) != address(0)) {
            storageData.quota.transferAsset(params.srcSmgID, params.destSmgID);
        }
        emit TransferAssetLogger(params.uniqueID, params.srcSmgID, params.destSmgID);
    }

    /// @notice                     receive debt
    /// @param  storageData         Cross storage data
    /// @param  params              parameters of storeman debt lock
    function receiveDebt(CrossTypes.Data storage storageData, DebtAssetParams memory params)
        public
    {
        if (address(storageData.quota) != address(0)) {
            storageData.quota.receiveDebt(params.srcSmgID, params.destSmgID);
        }
        emit ReceiveDebtLogger(params.uniqueID, params.srcSmgID, params.destSmgID);
    }
}
