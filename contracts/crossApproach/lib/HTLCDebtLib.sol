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

// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;
pragma experimental ABIEncoderV2;

import "./HTLCTxLib.sol";
import "./CrossTypes.sol";

library HTLCDebtLib {
    using SafeMath for uint;
    using HTLCTxLib for HTLCTxLib.Data;

    /**
     *
     * STRUCTURES
     *
     */
    /// @notice struct of HTLC debt lock parameters
    struct HTLCDebtLockParams {
        bytes32 xHash;                  // hash of HTLC random number
        bytes32 srcSmgID;               // ID of source storeman group
        bytes32 destSmgID;              // ID of destination storeman group
        uint lockedTime;                // HTLC lock time
    }

    /**
     *
     * EVENTS
     *
     **/

    /// @notice                     event of storeman debt lock
    /// @param xHash                hash of HTLC random number
    /// @param srcSmgID             ID of source storeman group
    /// @param destSmgID            ID of destination storeman group
    event SrcDebtLockLogger(bytes32 indexed xHash, bytes32 indexed srcSmgID, bytes32 indexed destSmgID);

    /// @notice                     event of redeem storeman debt
    /// @param xHash                hash of HTLC random number
    /// @param srcSmgID             ID of source storeman group
    /// @param destSmgID            ID of destination storeman group
    /// @param x                    HTLC random number
    event DestDebtRedeemLogger(bytes32 indexed xHash, bytes32 indexed srcSmgID, bytes32 indexed destSmgID, bytes32 x);

    /// @notice                     event of revoke storeman debt
    /// @param xHash                hash of HTLC random number
    /// @param srcSmgID             ID of source storeman group
    /// @param destSmgID            ID of destination storeman group
    event SrcDebtRevokeLogger(bytes32 indexed xHash, bytes32 indexed srcSmgID, bytes32 indexed destSmgID);

    /// @notice                     event of storeman debt lock
    /// @param xHash                hash of HTLC random number
    /// @param srcSmgID             ID of source storeman group
    /// @param destSmgID            ID of destination storeman group
    event DestDebtLockLogger(bytes32 indexed xHash, bytes32 indexed srcSmgID, bytes32 indexed destSmgID);

    /// @notice                     event of redeem storeman debt
    /// @param xHash                hash of HTLC random number
    /// @param srcSmgID             ID of source storeman group
    /// @param destSmgID            ID of destination storeman group
    /// @param x                    HTLC random number
    event SrcDebtRedeemLogger(bytes32 indexed xHash, bytes32 indexed srcSmgID, bytes32 indexed destSmgID, bytes32 x);

    /// @notice                     event of revoke storeman debt
    /// @param xHash                hash of HTLC random number
    /// @param srcSmgID             ID of source storeman group
    /// @param destSmgID            ID of destination storeman group
    event DestDebtRevokeLogger(bytes32 indexed xHash, bytes32 indexed srcSmgID, bytes32 indexed destSmgID);

    /**
     *
     * MANIPULATIONS
     *
     */

    /// @notice                     lock storeman debt
    /// @param  storageData         Cross storage data
    /// @param  params              parameters of storeman debt lock
    function srcDebtLock(CrossTypes.Data storage storageData, HTLCDebtLockParams memory params)
        public
    {
        storageData.htlcTxData.addDebtTx(params.xHash, params.srcSmgID, params.destSmgID, params.lockedTime);

        storageData.quota.assetLock(params.srcSmgID, params.destSmgID);

        emit SrcDebtLockLogger(params.xHash, params.srcSmgID, params.destSmgID);
    }

    /// @notice                     lock storeman debt
    /// @param  storageData         Cross storage data
    /// @param  params              parameters of storeman debt lock
    function destDebtLock(CrossTypes.Data storage storageData, HTLCDebtLockParams memory params)
        public
    {
        storageData.htlcTxData.addDebtTx(params.xHash, params.srcSmgID, params.destSmgID, params.lockedTime);

        storageData.quota.debtLock(params.srcSmgID, params.destSmgID);

        emit DestDebtLockLogger(params.xHash, params.srcSmgID, params.destSmgID);
    }

    /// @notice                     redeem storeman debt
    /// @param  storageData         Cross storage data
    /// @param  x                   HTLC random number
    function srcDebtRedeem(CrossTypes.Data storage storageData, bytes32 x)
        external
    {
        bytes32 xHash = storageData.htlcTxData.redeemDebtTx(x);

        bytes32 srcSmgID;
        bytes32 destSmgID;
        (srcSmgID, destSmgID) = storageData.htlcTxData.getDebtTx(xHash);

        storageData.quota.debtRedeem(srcSmgID, destSmgID);

        emit SrcDebtRedeemLogger(xHash, srcSmgID, destSmgID, x);
    }

    /// @notice                     redeem storeman debt
    /// @param  storageData         Cross storage data
    /// @param  x                   HTLC random number
    function destDebtRedeem(CrossTypes.Data storage storageData, bytes32 x)
        external
    {
        bytes32 xHash = storageData.htlcTxData.redeemDebtTx(x);

        bytes32 srcSmgID;
        bytes32 destSmgID;
        (srcSmgID, destSmgID) = storageData.htlcTxData.getDebtTx(xHash);

        storageData.quota.assetRedeem(srcSmgID, destSmgID);

        emit DestDebtRedeemLogger(xHash, srcSmgID, destSmgID, x);
    }

    /// @notice                     revoke storeman debt
    /// @param  storageData         Cross storage data
    /// @param  xHash               hash of HTLC random number
    function destDebtRevoke(CrossTypes.Data storage storageData, bytes32 xHash)
        external
    {
        storageData.htlcTxData.revokeDebtTx(xHash);

        bytes32 srcSmgID;
        bytes32 destSmgID;
        (srcSmgID, destSmgID) = storageData.htlcTxData.getDebtTx(xHash);

        storageData.quota.debtRevoke(srcSmgID, destSmgID);

        emit DestDebtRevokeLogger(xHash, srcSmgID, destSmgID);
    }

    /// @notice                     revoke storeman debt
    /// @param  storageData         Cross storage data
    /// @param  xHash               hash of HTLC random number
    function srcDebtRevoke(CrossTypes.Data storage storageData, bytes32 xHash)
        external
    {
        storageData.htlcTxData.revokeDebtTx(xHash);

        bytes32 srcSmgID;
        bytes32 destSmgID;
        (srcSmgID, destSmgID) = storageData.htlcTxData.getDebtTx(xHash);

        storageData.quota.assetRevoke(srcSmgID, destSmgID);

        emit SrcDebtRevokeLogger(xHash, srcSmgID, destSmgID);
    }

}
