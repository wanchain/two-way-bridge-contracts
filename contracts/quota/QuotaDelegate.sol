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

/**
 * Math operations with safety checks
 */

import "../components/Halt.sol";
import "./QuotaStorage.sol";

interface IPriceOracle {
    function getValue(bytes symbol) public view returns(uint price);
}

interface IDepositOracle {
    function getDepositAmount(bytes storemanGroupPK) public view returns(uint deposit);
}

interface ITokenManager {
    function getTokenPairInfo(uint id) public view returns(bytes ancestorSymbol, uint decimals);
}


contract QuotaDelegate is QuotaStorage, Halt {

    /// @notice                         config params for owner
    /// @param _priceOracleAddr         token price oracle contract address
    /// @param _htlcAddr                HTLC contract address
    /// @param _depositOracleAddr       deposit oracle address, storemanAdmin or oracle
    /// @param _depositRate             deposit rate value, 1500 means 150%
    /// @param _depositTokenSymbol      deposit token symbol, default is WAN
    /// @param _tokenManagerAddress     token manager contract address
    function config(
        address _priceOracleAddr,
        address _htlcAddr,
        address _depositOracleAddr,
        uint256 _depositRate,
        bytes _depositTokenSymbol,
        address _tokenManagerAddress
    ) external {
        priceOracleAddress = _priceOracleAddr;
        htlcAddress = _htlcAddr;
        depositOracleAddress = _depositOracleAddr;
        depositRate = _depositRate;
        depositTokenSymbol = _depositTokenSymbol;
        tokenManagerAddress = _tokenManagerAddress;
    }

    /// @notice                                 lock quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupPK                  PK of source storeman group
    /// @param value                            amount of exchange token
    function mintLock(
        uint256 tokenId,
        bytes storemanGroupPK,
        uint256 value
    ) external onlyHtlc {
        uint256 deposit = getDepositAmount(storemanGroupPK);
        uint256 mintQuota = getMintQuota(tokenId, storemanGroupPK);

        /// Make sure enough inbound quota available
        Quota storage quota = quotaMap[tokenId][storemanGroupPK];
        if (!quota._active) {
            quota._active = true;
            storemanTokensMap[storemanGroupPK][storemanTokenCountMap[storemanGroupPK]] = tokenId;
            storemanTokenCountMap[storemanGroupPK] = storemanTokenCountMap[storemanGroupPK]
                .add(1);
        }

        require(
            mintQuota.sub(quota._receivable.add(quota._debt)) >= value,
            "Quota is not enough"
        );

        /// Increase receivable
        quota._receivable = quota._receivable.add(value);

        emit MintLock(msg.sender, tokenId, storemanGroupPK, value, quota._receivable, quota._payable);
    }

    /// @notice                                 revoke quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupPK                  PK of source storeman group
    /// @param value                            amount of exchange token
    function mintRevoke(
        uint256 tokenId,
        bytes storemanGroupPK,
        uint256 value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupPK];
        require(quota._active, "Quota is not active");
        /// Credit receivable, double-check receivable is no less than value to be unlocked
        quota._receivable = quota._receivable.sub(value);

        emit MintRevoke(msg.sender, tokenId, storemanGroupPK, value, quota._receivable, quota._payable);
    }

    /// @notice                                 redeem quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupPK                  PK of source storeman group
    /// @param value                            amount of exchange token
    function mintRedeem(
        uint256 tokenId,
        bytes storemanGroupPK,
        uint256 value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupPK];
        require(quota._active, "Quota is not active");
        /// Adjust quota record
        quota._receivable = quota._receivable.sub(value);
        quota._debt = quota._debt.add(value);

        emit MintRedeem(msg.sender, tokenId, storemanGroupPK, value, quota._receivable, quota._payable);
    }

    /// @notice                                 lock quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupPK                  PK of source storeman group
    /// @param value                            amount of exchange token
    function burnLock(
        uint256 tokenId,
        bytes storemanGroupPK,
        uint256 value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupPK];
        require(quota._active, "Quota is not active");
        /// Make sure it has enough outboundQuota
        require(quota._debt.sub(quota._payable) >= value, "Value is invalid");
        /// Adjust quota record
        quota._payable = quota._payable.add(value);

        emit BurnLock(msg.sender, tokenId, storemanGroupPK, value, quota._receivable, quota._payable);
    }

    /// @notice                                 revoke quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupPK                  PK of source storeman group
    /// @param value                            amount of exchange token
    function burnRevoke(
        uint256 tokenId,
        bytes storemanGroupPK,
        uint256 value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupPK];
        require(quota._active, "Quota is not active");
        /// Adjust quota record
        quota._payable = quota._payable.sub(value);

        emit BurnRevoke(msg.sender, tokenId, storemanGroupPK, value, quota._receivable, quota._payable);
    }

    /// @notice                                 redeem quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupPK                  PK of source storeman group
    /// @param value                            amount of exchange token
    function burnRedeem(
        uint256 tokenId,
        bytes storemanGroupPK,
        uint256 value
    ) external onlyHtlc {
        Quota storage quota = quotaMap[tokenId][storemanGroupPK];
        require(quota._active, "Quota is not active");
        /// Adjust quota record
        quota._debt = quota._debt.sub(value);
        quota._payable = quota._payable.sub(value);

        emit BurnRedeem(msg.sender, tokenId, storemanGroupPK, value, quota._receivable, quota._payable);
    }

    /// @notice                                 source storeman group lock the debt transaction,update the detailed quota info. of the storeman group
    /// @param tokenId                          tokenPairId of crosschain
    /// @param value                            amount of exchange token
    /// @param srcStoremanGroupPK               PK of source storeman group
    /// @param dstStoremanGroupPK               PK of destination storeman group
    function debtLock(
        uint256 tokenId,
        uint256 value,
        bytes srcStoremanGroupPK,
        bytes dstStoremanGroupPK
    ) external onlyHtlc {
        /// src: there's no processing tx, and have enough debt!
        Quota storage src = quotaMap[tokenId][srcStoremanGroupPK];
        require(
            src._receivable == uint256(0) &&
                src._payable == uint256(0) &&
                src._debt >= value,
            "PK is not allowed to repay debt"
        );

        /// dst: has enough quota
        Quota storage dst = quotaMap[tokenId][dstStoremanGroupPK];
        uint256 dstMintQuota = getMintQuota(tokenId, dstStoremanGroupPK);
        require(
            dstMintQuota.sub(dst._receivable.add(dst._debt)) >= value,
            "Quota is not enough"
        );

        dst._receivable = dst._receivable.add(value);
        src._payable = src._payable.add(value);

        emit DebtLock(msg.sender, tokenId, srcStoremanGroupPK, dstStoremanGroupPK, value);
    }

    /// @notice                                 destination storeman group redeem the debt transaction,update the detailed quota info. of the storeman group
    /// @param tokenId                          tokenPairId of crosschain
    /// @param value                            amount of exchange token
    /// @param srcStoremanGroupPK               PK of source storeman group
    /// @param dstStoremanGroupPK               PK of destination storeman group
    function debtRedeem(
        uint256 tokenId,
        uint256 value,
        bytes srcStoremanGroupPK,
        bytes dstStoremanGroupPK
    ) external onlyHtlc {
        Quota storage dst = quotaMap[tokenId][dstStoremanGroupPK];
        Quota storage src = quotaMap[tokenId][srcStoremanGroupPK];

        /// Make sure a legit storemanGroup provided
        require(dst._active, "Dst PK token doesn't exist");

        /// Adjust quota record
        dst._receivable = dst._receivable.sub(value);
        dst._debt = dst._debt.add(value);

        src._payable = src._payable.sub(value);
        src._debt = src._debt.sub(value);

        emit DebtRedeem(msg.sender, tokenId, srcStoremanGroupPK, dstStoremanGroupPK, value);
    }

    /// @notice                                 source storeman group revoke the debt transaction,update the detailed quota info. of the storeman group
    /// @param tokenId                          tokenPairId of crosschain
    /// @param value                            amount of exchange token
    /// @param srcStoremanGroupPK               PK of source storeman group
    /// @param dstStoremanGroupPK               PK of destination storeman group
    function debtRevoke(
        uint256 tokenId,
        uint256 value,
        bytes srcStoremanGroupPK,
        bytes dstStoremanGroupPK
    ) external onlyHtlc {
        Quota storage dst = quotaMap[tokenId][dstStoremanGroupPK];
        Quota storage src = quotaMap[tokenId][srcStoremanGroupPK];
        /// Make sure a legit storemanGroup provided
        require(dst._active, "Dst PK token doesn't exist");

        /// Credit receivable, double-check receivable is no less than value to be unlocked
        dst._receivable = dst._receivable.sub(value);
        src._payable = src._payable.sub(value);

        emit DebtRevoke(msg.sender, tokenId, srcStoremanGroupPK, dstStoremanGroupPK, value);
    }

    /// @notice                                 get mint quota of storeman, tokenId
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupPK                  PK of source storeman group
    function getMintQuota(uint256 tokenId, bytes storemanGroupPK)
        public
        view
        returns (uint256 mintQuota)
    {
        bytes memory symbol;
        uint decimals;
        uint256 tokenPrice;

        uint256 deposit = getDepositAmount(storemanGroupPK);
        if (deposit == 0) {
            mintQuota = 0;
            return;
        }

        uint256 depositValue = deposit.mul(getPrice(depositTokenSymbol)).mul(1000).div(depositRate); // 1500 = 150%
        uint256 totalTokenUsedValue = 0;
        uint256 tokenCount = storemanTokenCountMap[storemanGroupPK];
        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 id = storemanTokensMap[storemanGroupPK][i];
            (symbol, decimals) = getTokenAncestorInfo(id);
            tokenPrice = getPrice(symbol);
            Quota storage q = quotaMap[id][storemanGroupPK];
            uint256 tokenValue = q._receivable.add(q._debt).mul(tokenPrice).mul(1 ether).div(10**decimals); /// change Decimals to 18 digits
            totalTokenUsedValue = totalTokenUsedValue.add(tokenValue);
        }

        if (depositValue <= totalTokenUsedValue) {
            mintQuota = 0;
            return;
        }

        (symbol, decimals) = getTokenAncestorInfo(tokenId);
        tokenPrice = getPrice(symbol);
        if (tokenPrice == 0) {
            mintQuota = 0;
            return;
        }

        mintQuota = depositValue.sub(totalTokenUsedValue).div(tokenPrice).mul(10**decimals).div(1 ether);
    }

    /// @notice                                 get burn quota of storeman, tokenId
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupPK                  PK of source storeman group
    function getBurnQuota(uint256 tokenId, bytes storemanGroupPK)
        public
        view
        returns (uint256 burnQuota)
    {
        Quota storage quota = quotaMap[tokenId][storemanGroupPK];
        burnQuota = quota._debt.sub(quota._payable);
    }

    // ----------- Private Functions ---------------

    function getDepositAmount(bytes storemanGroupPK)
        private
        view
        returns (uint256 deposit)
    {
        IDepositOracle oracle = IDepositOracle(depositOracleAddress);
        deposit = oracle.getDepositAmount(storemanGroupPK);
    }

    function getTokenAncestorInfo(uint256 tokenId)
        private
        view
        returns (bytes ancestorSymbol, uint decimals)
    {
        ITokenManager tokenManager = ITokenManager(tokenManagerAddress);
        (ancestorSymbol, decimals) = tokenManager.getTokenPairInfo(tokenId);
    }

    function getPrice(bytes symbol) private view returns (uint256 price) {
        IPriceOracle oracle = IPriceOracle(priceOracleAddress);
        price = oracle.getValue(symbol);
    }
}
