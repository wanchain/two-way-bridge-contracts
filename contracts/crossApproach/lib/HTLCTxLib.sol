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

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title HTLCTxLib
 * @dev Library for managing Hash Time-Locked Contract (HTLC) transactions
 * This library provides functionality for:
 * - User and storeman transaction management
 * - Debt management between storeman groups
 * - Transaction status tracking and verification
 */
library HTLCTxLib {
    using SafeMath for uint;

    /**
     * @notice Enumeration of possible transaction statuses
     * @dev Status flow:
     * - None: Initial state
     * - Locked: Transaction is locked and pending
     * - Redeemed: Transaction has been completed
     * - Revoked: Transaction has been cancelled
     * - AssetLocked: Asset is locked in debt management
     * - DebtLocked: Debt is locked in debt management
     */
    enum TxStatus {None, Locked, Redeemed, Revoked, AssetLocked, DebtLocked}

    /**
     * @notice Parameters for user-initiated HTLC transactions
     * @dev Used when creating new user transactions
     * @param xHash Hash of the HTLC random number
     * @param smgID ID of the selected storeman group
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param value Amount of tokens to transfer
     * @param lockFee Fee for the lock operation
     * @param lockedTime Duration for which the transaction is locked
     */
    struct HTLCUserParams {
        bytes32 xHash;
        bytes32 smgID;
        uint tokenPairID;
        uint value;
        uint lockFee;
        uint lockedTime;
    }

    /**
     * @notice Base structure for all HTLC transactions
     * @dev Contains common fields for all transaction types
     * @param smgID ID of the storeman group
     * @param lockedTime Duration for which the transaction is locked
     * @param beginLockedTime Timestamp when the transaction was locked
     * @param status Current status of the transaction
     */
    struct BaseTx {
        bytes32 smgID;
        uint lockedTime;
        uint beginLockedTime;
        TxStatus status;
    }

    /**
     * @notice Structure for user-initiated transactions
     * @dev Extends BaseTx with user-specific information
     * @param baseTx Base transaction information
     * @param tokenPairID ID of the token pair
     * @param value Amount of tokens
     * @param fee Transaction fee
     * @param userAccount Address of the user initiating the transaction
     */
    struct UserTx {
        BaseTx baseTx;
        uint tokenPairID;
        uint value;
        uint fee;
        address userAccount;
    }

    /**
     * @notice Structure for storeman-initiated transactions
     * @dev Extends BaseTx with storeman-specific information
     * @param baseTx Base transaction information
     * @param tokenPairID ID of the token pair
     * @param value Amount of tokens
     * @param userAccount Address of the user to receive tokens
     */
    struct SmgTx {
        BaseTx baseTx;
        uint tokenPairID;
        uint value;
        address userAccount;
    }

    /**
     * @notice Structure for storeman debt transactions
     * @dev Extends BaseTx with debt-specific information
     * @param baseTx Base transaction information
     * @param srcSmgID ID of the source storeman group
     */
    struct DebtTx {
        BaseTx baseTx;
        bytes32 srcSmgID;
    }

    /**
     * @notice Main data structure for HTLC transactions
     * @dev Contains mappings for all transaction types
     * @param mapHashXUserTxs Mapping of transaction hashes to user transactions
     * @param mapHashXSmgTxs Mapping of transaction hashes to storeman transactions
     * @param mapHashXDebtTxs Mapping of transaction hashes to debt transactions
     */
    struct Data {
        mapping(bytes32 => UserTx) mapHashXUserTxs;
        mapping(bytes32 => SmgTx) mapHashXSmgTxs;
        mapping(bytes32 => DebtTx) mapHashXDebtTxs;
    }

    /**
     * @notice Adds a new user transaction
     * @dev Creates a new user transaction with the provided parameters
     * @param self The storage data structure
     * @param params Parameters for the new transaction
     * Requirements:
     * - Transaction must not already exist
     */
    function addUserTx(Data storage self, HTLCUserParams memory params)
        public
    {
        UserTx memory userTx = self.mapHashXUserTxs[params.xHash];
        // UserTx storage userTx = self.mapHashXUserTxs[params.xHash];
        // require(params.value != 0, "Value is invalid");
        require(userTx.baseTx.status == TxStatus.None, "User tx exists");

        userTx.baseTx.smgID = params.smgID;
        userTx.baseTx.lockedTime = params.lockedTime;
        userTx.baseTx.beginLockedTime = block.timestamp;
        userTx.baseTx.status = TxStatus.Locked;
        userTx.tokenPairID = params.tokenPairID;
        userTx.value = params.value;
        userTx.fee = params.lockFee;
        userTx.userAccount = msg.sender;

        self.mapHashXUserTxs[params.xHash] = userTx;
    }

    /**
     * @notice Redeems a user transaction
     * @dev Used for storeman redeem (outbound) operations
     * @param self The storage data structure
     * @param x The HTLC random number
     * @return xHash The hash of the random number
     * Requirements:
     * - Transaction must be in Locked status
     * - Transaction must not be expired
     */
    function redeemUserTx(Data storage self, bytes32 x)
        external
        returns(bytes32 xHash)
    {
        xHash = sha256(abi.encodePacked(x));

        UserTx storage userTx = self.mapHashXUserTxs[xHash];
        require(userTx.baseTx.status == TxStatus.Locked, "Status is not locked");
        require(block.timestamp < userTx.baseTx.beginLockedTime.add(userTx.baseTx.lockedTime), "Redeem timeout");

        userTx.baseTx.status = TxStatus.Redeemed;

        return xHash;
    }

    /**
     * @notice Revokes a user transaction
     * @dev Allows cancellation of expired transactions
     * @param self The storage data structure
     * @param xHash Hash of the HTLC random number
     * Requirements:
     * - Transaction must be in Locked status
     * - Transaction must be expired
     */
    function revokeUserTx(Data storage self, bytes32 xHash)
        external
    {
        UserTx storage userTx = self.mapHashXUserTxs[xHash];
        require(userTx.baseTx.status == TxStatus.Locked, "Status is not locked");
        require(block.timestamp >= userTx.baseTx.beginLockedTime.add(userTx.baseTx.lockedTime), "Revoke is not permitted");

        userTx.baseTx.status = TxStatus.Revoked;
    }

    /**
     * @notice Retrieves user transaction information
     * @dev Returns all relevant information about a user transaction
     * @param self The storage data structure
     * @param xHash Hash of the HTLC random number
     * @return smgID ID of the storeman group
     * @return tokenPairID ID of the token pair
     * @return value Amount of tokens
     * @return fee Transaction fee
     * @return userAccount Address of the user
     */
    function getUserTx(Data storage self, bytes32 xHash)
        external
        view
        returns (bytes32, uint, uint, uint, address)
    {
        UserTx storage userTx = self.mapHashXUserTxs[xHash];
        return (userTx.baseTx.smgID, userTx.tokenPairID, userTx.value, userTx.fee, userTx.userAccount);
    }

    /**
     * @notice Adds a new storeman transaction
     * @dev Creates a new storeman transaction with the provided parameters
     * @param self The storage data structure
     * @param xHash Hash of the HTLC random number
     * @param smgID ID of the storeman group
     * @param tokenPairID ID of the token pair
     * @param value Amount of tokens
     * @param userAccount Address of the user to receive tokens
     * @param lockedTime Duration for which the transaction is locked
     * Requirements:
     * - Value must be non-zero
     * - Transaction must not already exist
     */
    function addSmgTx(Data storage self, bytes32 xHash, bytes32 smgID, uint tokenPairID, uint value, address userAccount, uint lockedTime)
        external
    {
        SmgTx memory smgTx = self.mapHashXSmgTxs[xHash];
        // SmgTx storage smgTx = self.mapHashXSmgTxs[xHash];
        require(value != 0, "Value is invalid");
        require(smgTx.baseTx.status == TxStatus.None, "Smg tx exists");

        smgTx.baseTx.smgID = smgID;
        smgTx.baseTx.status = TxStatus.Locked;
        smgTx.baseTx.lockedTime = lockedTime;
        smgTx.baseTx.beginLockedTime = block.timestamp;
        smgTx.tokenPairID = tokenPairID;
        smgTx.value = value;
        smgTx.userAccount = userAccount;

        self.mapHashXSmgTxs[xHash] = smgTx;
    }

    /**
     * @notice Redeems a storeman transaction
     * @dev Used for user redeem (inbound) operations
     * @param self The storage data structure
     * @param x The HTLC random number
     * @return xHash The hash of the random number
     * Requirements:
     * - Transaction must be in Locked status
     * - Transaction must not be expired
     */
    function redeemSmgTx(Data storage self, bytes32 x)
        external
        returns(bytes32 xHash)
    {
        xHash = sha256(abi.encodePacked(x));

        SmgTx storage smgTx = self.mapHashXSmgTxs[xHash];
        require(smgTx.baseTx.status == TxStatus.Locked, "Status is not locked");
        require(block.timestamp < smgTx.baseTx.beginLockedTime.add(smgTx.baseTx.lockedTime), "Redeem timeout");

        smgTx.baseTx.status = TxStatus.Redeemed;

        return xHash;
    }

    /**
     * @notice Revokes a storeman transaction
     * @dev Allows cancellation of expired transactions
     * @param self The storage data structure
     * @param xHash Hash of the HTLC random number
     * Requirements:
     * - Transaction must be in Locked status
     * - Transaction must be expired
     */
    function revokeSmgTx(Data storage self, bytes32 xHash)
        external
    {
        SmgTx storage smgTx = self.mapHashXSmgTxs[xHash];
        require(smgTx.baseTx.status == TxStatus.Locked, "Status is not locked");
        require(block.timestamp >= smgTx.baseTx.beginLockedTime.add(smgTx.baseTx.lockedTime), "Revoke is not permitted");

        smgTx.baseTx.status = TxStatus.Revoked;
    }

    /**
     * @notice Retrieves storeman transaction information
     * @dev Returns all relevant information about a storeman transaction
     * @param self The storage data structure
     * @param xHash Hash of the HTLC random number
     * @return smgID ID of the storeman group
     * @return tokenPairID ID of the token pair
     * @return value Amount of tokens
     * @return userAccount Address of the user to receive tokens
     */
    function getSmgTx(Data storage self, bytes32 xHash)
        external
        view
        returns (bytes32, uint, uint, address)
    {
        SmgTx storage smgTx = self.mapHashXSmgTxs[xHash];
        return (smgTx.baseTx.smgID, smgTx.tokenPairID, smgTx.value, smgTx.userAccount);
    }

    /**
     * @notice Adds a new debt transaction
     * @dev Creates a new debt transaction between storeman groups
     * @param self The storage data structure
     * @param xHash Hash of the HTLC random number
     * @param srcSmgID ID of the source storeman group
     * @param destSmgID ID of the destination storeman group
     * @param lockedTime Duration for which the transaction is locked
     * @param status Initial status of the transaction
     * Requirements:
     * - Transaction must not already exist
     * - Status must be either Locked or DebtLocked
     */
    function addDebtTx(Data storage self, bytes32 xHash, bytes32 srcSmgID, bytes32 destSmgID, uint lockedTime, TxStatus status)
        external
    {
        DebtTx memory debtTx = self.mapHashXDebtTxs[xHash];
        // DebtTx storage debtTx = self.mapHashXDebtTxs[xHash];
        require(debtTx.baseTx.status == TxStatus.None, "Debt tx exists");

        debtTx.baseTx.smgID = destSmgID;
        debtTx.baseTx.status = status;//TxStatus.Locked;
        debtTx.baseTx.lockedTime = lockedTime;
        debtTx.baseTx.beginLockedTime = block.timestamp;
        debtTx.srcSmgID = srcSmgID;

        self.mapHashXDebtTxs[xHash] = debtTx;
    }

    /**
     * @notice Redeems a debt transaction
     * @dev Used to complete debt transfer between storeman groups
     * @param self The storage data structure
     * @param x The HTLC random number
     * @return xHash The hash of the random number
     * Requirements:
     * - Transaction must be in Locked or DebtLocked status
     * - Transaction must not be expired
     */
    function redeemDebtTx(Data storage self, bytes32 x, TxStatus status)
        external
        returns(bytes32 xHash)
    {
        xHash = sha256(abi.encodePacked(x));

        DebtTx storage debtTx = self.mapHashXDebtTxs[xHash];
        // require(debtTx.baseTx.status == TxStatus.Locked, "Status is not locked");
        require(debtTx.baseTx.status == status, "Status is not locked");
        require(block.timestamp < debtTx.baseTx.beginLockedTime.add(debtTx.baseTx.lockedTime), "Redeem timeout");

        debtTx.baseTx.status = TxStatus.Redeemed;

        return xHash;
    }

    /**
     * @notice Revokes a debt transaction
     * @dev Allows cancellation of expired debt transactions
     * @param self The storage data structure
     * @param xHash Hash of the HTLC random number
     * Requirements:
     * - Transaction must be in Locked or DebtLocked status
     * - Transaction must be expired
     */
    function revokeDebtTx(Data storage self, bytes32 xHash, TxStatus status)
        external
    {
        DebtTx storage debtTx = self.mapHashXDebtTxs[xHash];
        // require(debtTx.baseTx.status == TxStatus.Locked, "Status is not locked");
        require(debtTx.baseTx.status == status, "Status is not locked");
        require(block.timestamp >= debtTx.baseTx.beginLockedTime.add(debtTx.baseTx.lockedTime), "Revoke is not permitted");

        debtTx.baseTx.status = TxStatus.Revoked;
    }

    /**
     * @notice Retrieves debt transaction information
     * @dev Returns all relevant information about a debt transaction
     * @param self The storage data structure
     * @param xHash Hash of the HTLC random number
     * @return smgID ID of the storeman group
     * @return srcSmgID ID of the source storeman group
     */
    function getDebtTx(Data storage self, bytes32 xHash)
        external
        view
        returns (bytes32, bytes32)
    {
        DebtTx storage debtTx = self.mapHashXDebtTxs[xHash];
        return (debtTx.srcSmgID, debtTx.baseTx.smgID);
    }

    function getLeftTime(uint endTime) private view returns (uint) {
        if (block.timestamp < endTime) {
            return endTime.sub(block.timestamp);
        }
        return 0;
    }

    /// @notice                     function for get debt info
    /// @param xHash                hash of HTLC random number
    /// @return leftTime            the left lock time
    function getLeftLockedTime(Data storage self, bytes32 xHash)
        external
        view
        returns (uint leftTime)
    {
        UserTx storage userTx = self.mapHashXUserTxs[xHash];
        if (userTx.baseTx.status != TxStatus.None) {
            return getLeftTime(userTx.baseTx.beginLockedTime.add(userTx.baseTx.lockedTime));
        }
        SmgTx storage smgTx = self.mapHashXSmgTxs[xHash];
        if (smgTx.baseTx.status != TxStatus.None) {
            return getLeftTime(smgTx.baseTx.beginLockedTime.add(smgTx.baseTx.lockedTime));
        }
        DebtTx storage debtTx = self.mapHashXDebtTxs[xHash];
        if (debtTx.baseTx.status != TxStatus.None) {
            return getLeftTime(debtTx.baseTx.beginLockedTime.add(debtTx.baseTx.lockedTime));
        }
        require(false, 'invalid xHash');
    }
}
