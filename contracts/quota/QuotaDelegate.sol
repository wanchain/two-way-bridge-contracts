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

/**
 * Math operations with safety checks
 */

import "../components/Halt.sol";
import "./QuotaStorage.sol";
import "../tokenManager/ITokenManager.sol";
import "../interfaces/IStoremanGroup.sol";
import "../interfaces/IOracle.sol";

interface IDebtOracle {
    function isDebtClean(bytes32 storemanGroupId) external view returns (bool);
}


contract QuotaDelegate is QuotaStorage, Halt {
    using SafeMath for uint;

    /// @notice                         config params for owner
    /// @param _priceOracleAddr         token price oracle contract address
    /// @param _htlcAddr                HTLC contract address
    /// @param _depositOracleAddr       deposit oracle address, storemanAdmin or oracle
    /// @param _depositRate             deposit rate value, 15000 means 150%
    /// @param _depositTokenSymbol      deposit token symbol, default is WAN
    /// @param _tokenManagerAddress     token manager contract address
    function config(
        address _priceOracleAddr,
        address _htlcAddr,
        address _fastHtlcAddr,
        address _depositOracleAddr,
        address _tokenManagerAddress,
        uint _depositRate,
        string calldata _depositTokenSymbol
    ) external onlyOwner {
        priceOracleAddress = _priceOracleAddr;
        htlcGroupMap[_htlcAddr] = true;
        htlcGroupMap[_fastHtlcAddr] = true;
        depositOracleAddress = _depositOracleAddr;
        depositRate = _depositRate;
        depositTokenSymbol = _depositTokenSymbol;
        tokenManagerAddress = _tokenManagerAddress;
    }

    function setDebtOracle(address oracle) external onlyOwner {
        debtOracleAddress = oracle;
    }

    /// @notice                                 lock quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function userMintLock(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        
        uint mintQuota = getUserMintQuota(tokenId, storemanGroupId);
        require(
            mintQuota >= value,
            "Quota is not enough"
        );

        if (!quota._active) {
            quota._active = true;
            storemanTokensMap[storemanGroupId][storemanTokenCountMap[storemanGroupId]] = tokenId;
            storemanTokenCountMap[storemanGroupId] = storemanTokenCountMap[storemanGroupId]
                .add(1);
        }

        quota.asset_receivable = quota.asset_receivable.add(value);
    }

    /// @notice                                 lock quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function smgMintLock(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        
        if (!quota._active) {
            quota._active = true;
            storemanTokensMap[storemanGroupId][storemanTokenCountMap[storemanGroupId]] = tokenId;
            storemanTokenCountMap[storemanGroupId] = storemanTokenCountMap[storemanGroupId]
                .add(1);
        }

        quota.debt_receivable = quota.debt_receivable.add(value);
    }

    /// @notice                                 revoke quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function userMintRevoke(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota.asset_receivable = quota.asset_receivable.sub(value);
    }

    /// @notice                                 revoke quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function smgMintRevoke(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota.debt_receivable = quota.debt_receivable.sub(value);
    }

    /// @notice                                 redeem quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function userMintRedeem(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota.debt_receivable = quota.debt_receivable.sub(value);
        quota._debt = quota._debt.add(value);
    }

    /// @notice                                 redeem quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function smgMintRedeem(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota.asset_receivable = quota.asset_receivable.sub(value);
        quota._asset = quota._asset.add(value);
    }

    /// @notice                                 perform a fast crosschain mint
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function userFastMint(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        
        uint mintQuota = getUserMintQuota(tokenId, storemanGroupId);
        require(
            mintQuota >= value,
            "Quota is not enough"
        );
        
        if (!quota._active) {
            quota._active = true;
            storemanTokensMap[storemanGroupId][storemanTokenCountMap[storemanGroupId]] = tokenId;
            storemanTokenCountMap[storemanGroupId] = storemanTokenCountMap[storemanGroupId]
                .add(1);
        }
        quota._asset = quota._asset.add(value);
    }

    /// @notice                                 perform a fast crosschain mint
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function smgFastMint(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        
        if (!quota._active) {
            quota._active = true;
            storemanTokensMap[storemanGroupId][storemanTokenCountMap[storemanGroupId]] = tokenId;
            storemanTokenCountMap[storemanGroupId] = storemanTokenCountMap[storemanGroupId]
                .add(1);
        }
        quota._debt = quota._debt.add(value);
    }

    /// @notice                                 perform a fast crosschain burn
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function userFastBurn(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        require(quota._debt.sub(quota.debt_payable) >= value, "Value is invalid");
        quota._debt = quota._debt.sub(value);
    }

    /// @notice                                 perform a fast crosschain burn
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function smgFastBurn(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota._asset = quota._asset.sub(value);
    }

    /// @notice                                 lock quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function userBurnLock(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        require(quota._debt.sub(quota.debt_payable) >= value, "Value is invalid");
        quota.debt_payable = quota.debt_payable.add(value);
    }

    /// @notice                                 lock quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function smgBurnLock(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota.asset_payable = quota.asset_payable.add(value);
    }

    /// @notice                                 revoke quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function userBurnRevoke(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota.debt_payable = quota.debt_payable.sub(value);
    }

    /// @notice                                 revoke quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function smgBurnRevoke(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota.asset_payable = quota.asset_payable.sub(value);
    }

    /// @notice                                 redeem quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function userBurnRedeem(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota._asset = quota._asset.sub(value);
        quota.asset_payable = quota.asset_payable.sub(value);
    }

    /// @notice                                 redeem quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function smgBurnRedeem(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota._debt = quota._debt.sub(value);
        quota.debt_payable = quota.debt_payable.sub(value);
    }

    /// @notice                                 source storeman group lock the debt transaction,update the detailed quota info. of the storeman group
    /// @param srcStoremanGroupId               PK of source storeman group
    /// @param dstStoremanGroupId               PK of destination storeman group
    function debtLock(
        bytes32 srcStoremanGroupId,
        bytes32 dstStoremanGroupId
    ) external onlyHtlc {
        uint tokenCount = storemanTokenCountMap[srcStoremanGroupId];
        // TODO gas out of range
        for (uint i = 0; i < tokenCount; i++) {
            uint id = storemanTokensMap[srcStoremanGroupId][i];
            Quota storage src = quotaMap[id][srcStoremanGroupId];

            require( src.debt_receivable == uint(0) && src.debt_payable == uint(0),
                "There are debt_receivable or debt_payable in src storeman"
            );

            if (src._debt == 0) {
                continue;
            }

            Quota storage dst = quotaMap[id][dstStoremanGroupId];
            if (!dst._active) {
                dst._active = true;
                storemanTokensMap[dstStoremanGroupId][storemanTokenCountMap[dstStoremanGroupId]] = id;
                storemanTokenCountMap[dstStoremanGroupId] = storemanTokenCountMap[dstStoremanGroupId]
                    .add(1);
            }

            dst.debt_receivable = dst.debt_receivable.add(src._debt);
            src.debt_payable = src.debt_payable.add(src._debt);
        }
    }

    /// @notice                                 destination storeman group redeem the debt transaction,update the detailed quota info. of the storeman group
    /// @param srcStoremanGroupId               PK of source storeman group
    /// @param dstStoremanGroupId               PK of destination storeman group
    function debtRedeem(
        bytes32 srcStoremanGroupId,
        bytes32 dstStoremanGroupId
    ) external onlyHtlc {
        uint tokenCount = storemanTokenCountMap[srcStoremanGroupId];
        for (uint i = 0; i < tokenCount; i++) {
            uint id = storemanTokensMap[srcStoremanGroupId][i];
            Quota storage src = quotaMap[id][srcStoremanGroupId];
            if (src._debt == 0) {
                continue;
            }
            Quota storage dst = quotaMap[id][dstStoremanGroupId];
            /// Adjust quota record
            dst.debt_receivable = dst.debt_receivable.sub(src.debt_payable);
            dst._debt = dst._debt.add(src._debt);

            src.debt_payable = 0;
            src._debt = 0;
        }
    }

    /// @notice                                 source storeman group revoke the debt transaction,update the detailed quota info. of the storeman group
    /// @param srcStoremanGroupId               PK of source storeman group
    /// @param dstStoremanGroupId               PK of destination storeman group
    function debtRevoke(
        bytes32 srcStoremanGroupId,
        bytes32 dstStoremanGroupId
    ) external onlyHtlc {
        uint tokenCount = storemanTokenCountMap[srcStoremanGroupId];
        for (uint i = 0; i < tokenCount; i++) {
            uint id = storemanTokensMap[srcStoremanGroupId][i];
            Quota storage src = quotaMap[id][srcStoremanGroupId];
            if (src._debt == 0) {
                continue;
            }
            Quota storage dst = quotaMap[id][dstStoremanGroupId];
            
            dst.debt_receivable = dst.debt_receivable.sub(src.debt_payable);
            src.debt_payable = 0;
        }
    }

    /// @notice                                 source storeman group lock the debt transaction,update the detailed quota info. of the storeman group
    /// @param srcStoremanGroupId               PK of source storeman group
    /// @param dstStoremanGroupId               PK of destination storeman group
    function assetLock(
        bytes32 srcStoremanGroupId,
        bytes32 dstStoremanGroupId
    ) external onlyHtlc {
        uint tokenCount = storemanTokenCountMap[srcStoremanGroupId];
        for (uint i = 0; i < tokenCount; i++) {
            uint id = storemanTokensMap[srcStoremanGroupId][i];
            Quota storage src = quotaMap[id][srcStoremanGroupId];

            require( src.asset_receivable == uint(0) && src.asset_payable == uint(0),
                "There are asset_receivable or asset_payable in src storeman"
            );

            if (src._asset == 0) {
                continue;
            }

            Quota storage dst = quotaMap[id][dstStoremanGroupId];
            if (!dst._active) {
                dst._active = true;
                storemanTokensMap[dstStoremanGroupId][storemanTokenCountMap[dstStoremanGroupId]] = id;
                storemanTokenCountMap[dstStoremanGroupId] = storemanTokenCountMap[dstStoremanGroupId]
                    .add(1);
            }

            dst.asset_receivable = dst.asset_receivable.add(src._asset);
            src.asset_payable = src.asset_payable.add(src._asset);
        }
    }

    /// @notice                                 destination storeman group redeem the debt transaction,update the detailed quota info. of the storeman group
    /// @param srcStoremanGroupId               PK of source storeman group
    /// @param dstStoremanGroupId               PK of destination storeman group
    function assetRedeem(
        bytes32 srcStoremanGroupId,
        bytes32 dstStoremanGroupId
    ) external onlyHtlc {
        uint tokenCount = storemanTokenCountMap[srcStoremanGroupId];
        for (uint i = 0; i < tokenCount; i++) {
            uint id = storemanTokensMap[srcStoremanGroupId][i];
            Quota storage src = quotaMap[id][srcStoremanGroupId];
            if (src._asset == 0) {
                continue;
            }
            Quota storage dst = quotaMap[id][dstStoremanGroupId];
            /// Adjust quota record
            dst.asset_receivable = dst.asset_receivable.sub(src.asset_payable);
            dst._asset = dst._asset.add(src._asset);

            src.asset_payable = 0;
            src._asset = 0;
        }
    }

    /// @notice                                 source storeman group revoke the debt transaction,update the detailed quota info. of the storeman group
    /// @param srcStoremanGroupId               PK of source storeman group
    /// @param dstStoremanGroupId               PK of destination storeman group
    function assetRevoke(
        bytes32 srcStoremanGroupId,
        bytes32 dstStoremanGroupId
    ) external onlyHtlc {
        uint tokenCount = storemanTokenCountMap[srcStoremanGroupId];
        for (uint i = 0; i < tokenCount; i++) {
            uint id = storemanTokensMap[srcStoremanGroupId][i];
            Quota storage src = quotaMap[id][srcStoremanGroupId];
            if (src._asset == 0) {
                continue;
            }
            Quota storage dst = quotaMap[id][dstStoremanGroupId];
            
            dst.asset_receivable = dst.asset_receivable.sub(src.asset_payable);
            src.asset_payable = 0;
        }
    }

    /// @notice                                 get user mint quota of storeman, tokenId
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    function getUserMintQuota(uint tokenId, bytes32 storemanGroupId)
        public
        view
        returns (uint)
    {
        string memory symbol;
        uint decimals;
        uint tokenPrice;

        (symbol, decimals) = getTokenAncestorInfo(tokenId);
        tokenPrice = getPrice(symbol);
        if (tokenPrice == 0) {
            return 0;
        }

        uint fiatQuota = getUserFiatMintQuota(storemanGroupId, symbol);

        return fiatQuota.div(tokenPrice).mul(10**decimals).div(1 ether);
    }

    /// @notice                                 get smg mint quota of storeman, tokenId
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    function getSmgMintQuota(uint tokenId, bytes32 storemanGroupId)
        public
        view
        returns (uint)
    {
        string memory symbol;
        uint decimals;
        uint tokenPrice;

        (symbol, decimals) = getTokenAncestorInfo(tokenId);
        tokenPrice = getPrice(symbol);
        if (tokenPrice == 0) {
            return 0;
        }

        uint fiatQuota = getSmgFiatMintQuota(storemanGroupId, symbol);

        return fiatQuota.div(tokenPrice).mul(10**decimals).div(1 ether);
    }

    /// @notice                                 get user burn quota of storeman, tokenId
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    function getUserBurnQuota(uint tokenId, bytes32 storemanGroupId)
        public
        view
        returns (uint burnQuota)
    {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        burnQuota = quota._debt.sub(quota.debt_payable);
    }

    /// @notice                                 get smg burn quota of storeman, tokenId
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    function getSmgBurnQuota(uint tokenId, bytes32 storemanGroupId)
        public
        view
        returns (uint burnQuota)
    {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        burnQuota = quota._asset.sub(quota.asset_payable);
    }

    /// @notice                                 get asset of storeman, tokenId
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    function getAsset(uint tokenId, bytes32 storemanGroupId)
        public
        view
        returns (uint asset, uint asset_receivable, uint asset_payable)
    {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        return (quota._asset, quota.asset_receivable, quota.asset_payable);
    }

    /// @notice                                 get debt of storeman, tokenId
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    function getDebt(uint tokenId, bytes32 storemanGroupId)
        public
        view
        returns (uint debt, uint debt_receivable, uint debt_payable)
    {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        return (quota._debt, quota.debt_receivable, quota.debt_payable);
    }

    /// @notice                                 get debt clean state of storeman
    /// @param storemanGroupId                  PK of source storeman group
    function isDebtClean(bytes32 storemanGroupId) external view returns (bool) {
        uint tokenCount = storemanTokenCountMap[storemanGroupId];
        if (tokenCount == 0) {
            if (debtOracleAddress == address(0)) {
                return true;
            } else {
                IDebtOracle debtOracle = IDebtOracle(debtOracleAddress);
                return debtOracle.isDebtClean(storemanGroupId);
            }
        }

        for (uint i = 0; i < tokenCount; i++) {
            uint id = storemanTokensMap[storemanGroupId][i];
            Quota storage src = quotaMap[id][storemanGroupId];
            if (src._debt > 0 || src.debt_payable > 0 || src.debt_receivable > 0) {
                return false;
            }

            if (src._asset > 0 || src.asset_payable > 0 || src.asset_receivable > 0) {
                return false;
            }
        }
        return true;
    }

    // ----------- Private Functions ---------------

    /// @notice                                 get storeman group's deposit value in USD
    /// @param storemanGroupId                  storeman group ID
    function getFiatDeposit(bytes32 storemanGroupId) private view returns (uint) {
        uint deposit = getDepositAmount(storemanGroupId);
        return deposit.mul(getPrice(depositTokenSymbol));
    }

    /// get mint quota in Fiat/USD decimals: 18
    function getUserFiatMintQuota(bytes32 storemanGroupId, string memory rawSymbol) private view returns (uint) {
        string memory symbol;
        uint decimals;

        uint totalTokenUsedValue = 0;
        for (uint i = 0; i < storemanTokenCountMap[storemanGroupId]; i++) {
            uint id = storemanTokensMap[storemanGroupId][i];
            (symbol, decimals) = getTokenAncestorInfo(id);
            Quota storage q = quotaMap[id][storemanGroupId];
            uint tokenValue = q.asset_receivable.add(q._asset).mul(getPrice(symbol)).mul(1 ether).div(10**decimals); /// change Decimals to 18 digits
            totalTokenUsedValue = totalTokenUsedValue.add(tokenValue);
        }
        
        uint depositValue = 0;
        if (keccak256(rawSymbol) == keccak256("WAN")) {
            depositValue = getFiatDeposit(storemanGroupId);
        } else {
            depositValue = getFiatDeposit(storemanGroupId).mul(DENOMINATOR).div(depositRate); // 15000 = 150%
        }

        if (depositValue <= totalTokenUsedValue) {
            return 0;
        }

        return depositValue.sub(totalTokenUsedValue); /// decimals: 18
    }

    /// get mint quota in Fiat/USD decimals: 18
    function getSmgFiatMintQuota(bytes32 storemanGroupId, string memory rawSymbol) private view returns (uint) {
        string memory symbol;
        uint decimals;

        uint totalTokenUsedValue = 0;
        for (uint i = 0; i < storemanTokenCountMap[storemanGroupId]; i++) {
            uint id = storemanTokensMap[storemanGroupId][i];
            (symbol, decimals) = getTokenAncestorInfo(id);
            Quota storage q = quotaMap[id][storemanGroupId];
            uint tokenValue = q.debt_receivable.add(q._debt).mul(getPrice(symbol)).mul(1 ether).div(10**decimals); /// change Decimals to 18 digits
            totalTokenUsedValue = totalTokenUsedValue.add(tokenValue);
        }

        uint depositValue = 0;
        if (keccak256(rawSymbol) == keccak256("WAN")) {
            depositValue = getFiatDeposit(storemanGroupId);
        } else {
            depositValue = getFiatDeposit(storemanGroupId).mul(DENOMINATOR).div(depositRate); // 15000 = 150%
        }

        if (depositValue <= totalTokenUsedValue) {
            return 0;
        }

        return depositValue.sub(totalTokenUsedValue); /// decimals: 18
    }

    function getDepositAmount(bytes32 storemanGroupId)
        private
        view
        returns (uint deposit)
    {
        IStoremanGroup smgAdmin = IStoremanGroup(depositOracleAddress);
        (,,deposit,,,,,,,,) = smgAdmin.getStoremanGroupConfig(storemanGroupId);
    }

    function getTokenAncestorInfo(uint tokenId)
        private
        view
        returns (string memory ancestorSymbol, uint decimals)
    {
        ITokenManager tokenManager = ITokenManager(tokenManagerAddress);
        (,,ancestorSymbol,decimals,) = tokenManager.getAncestorInfo(tokenId);
    }

    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }

    function getPrice(string memory symbol) private view returns (uint price) {
        IOracle oracle = IOracle(priceOracleAddress);
        price = oracle.getValue(stringToBytes32(symbol));
    }
}
