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

import "../../lib/SafeMath.sol";

library RapidityTxLib {
    using SafeMath for uint;

    /**
     *
     * ENUMS
     *
     */

    /// @notice tx info status
    /// @notice uninitialized,Minted,Burned
    enum TxStatus {None, Minted, Burned}

    /**
     *
     * STRUCTURES
     *
     */

    /// @notice HTLC(Hashed TimeLock Contract) tx info
    struct BaseTx {
        bytes32 smgID;              // HTLC transaction storeman ID
        uint tokenPairID;
        uint value;
        TxStatus status;            // HTLC transaction status
        address userAccount;        // HTLC transaction sender address
    }

    /// @notice user  tx info
    struct UserTx {
        BaseTx baseTx;
        uint fee;
        bytes mirrorAccount;      // Shadow address or account on mirror chain
    }
    /// @notice storeman  tx info
    struct SmgTx {
        BaseTx baseTx;
    }

    struct Data {
        /// @notice mapping of hash(x) to UserTx -- uniqueID->htlcTxData
        mapping(bytes32 => UserTx) mapUniqueUserTxs;

        /// @notice mapping of hash(x) to UserTx -- uniqueID->htlcTxData
        mapping(bytes32 => SmgTx) mapUniqueSmgTxs;
    }

    /**
     *
     * MANIPULATIONS
     *
     */

    /// @notice                     add user transaction info
    /// @param  uniqueID            unique random number
    /// @param  smgID               ID of the storeman which user has selected
    /// @param  tokenPairID         token pair ID of cross chain
    /// @param  value               HTLC transfer value of token
    /// @param  fee                 HTLC transfer lock fee
    /// @param  mirrorAccount       mirrorAccount address. used for receipt coins on opposite block chain
    /// @param  status              HTLC tx status
    function addUserTx(Data storage self, bytes32 uniqueID, bytes32 smgID, uint tokenPairID,
                    uint value, uint fee, bytes mirrorAccount, TxStatus status)
        external
    {
        UserTx memory userTx = self.mapUniqueUserTxs[uniqueID];
        require(userTx.baseTx.status == TxStatus.None, "User tx exists");

        userTx.baseTx.smgID = smgID;
        userTx.baseTx.status = status;
        userTx.baseTx.tokenPairID = tokenPairID;
        userTx.baseTx.value = value;
        userTx.baseTx.userAccount = msg.sender;
        userTx.fee = fee;
        userTx.mirrorAccount = mirrorAccount;

        self.mapUniqueUserTxs[uniqueID] = userTx;
    }

    /// @notice                     add storeman transaction info
    /// @param  uniqueID            unique random number
    /// @param  smgID               ID of the storeman which user has selected
    /// @param  tokenPairID         token pair ID of cross chain
    /// @param  value               HTLC transfer value of token
    /// @param  userAccount         user account address on the destination chain, which is used to receive token
    /// @param  status              HTLC tx status
    function addSmgTx(Data storage self, bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, address userAccount, TxStatus status)
        external
    {
        SmgTx memory smgTx = self.mapUniqueSmgTxs[uniqueID];
        require(smgTx.baseTx.status == TxStatus.None, "Smg tx exists");

        smgTx.baseTx.smgID = smgID;
        smgTx.baseTx.status = status;
        smgTx.baseTx.tokenPairID = tokenPairID;
        smgTx.baseTx.value = value;
        smgTx.baseTx.userAccount = userAccount;

        self.mapUniqueSmgTxs[uniqueID] = smgTx;
    }
}
