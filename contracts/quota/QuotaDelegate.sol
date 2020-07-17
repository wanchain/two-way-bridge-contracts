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
import "../tokenManager/ITokenManager.sol";

interface IPriceOracle {
    function getValue(bytes symbol) external view returns(uint price);
}

contract StoremanType {
    enum GroupStatus {none, initial,curveSeted, failed,selected,ready,unregistered, dismissed}
}

interface IDepositOracle {
    function getDeposit(bytes32 smgID) external view returns (uint);
    function getStoremanGroupConfig(bytes32 storemanGroupId)
        external
        view
        returns (
            bytes32 groupId,
            StoremanType.GroupStatus status,
            uint256 deposit,
            uint256 chain1,
            uint256 chain2,
            uint256 curve1,
            uint256 curve2,
            bytes gpk1,
            bytes gpk2,
            uint256 startTime,
            uint256 endTime
        );
}


contract QuotaDelegate is QuotaStorage, Halt {

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
        bytes _depositTokenSymbol
    ) external onlyOwner {
        priceOracleAddress = _priceOracleAddr;
        htlcGroupMap[_htlcAddr] = true;
        htlcGroupMap[_fastHtlcAddr] = true;
        depositOracleAddress = _depositOracleAddr;
        depositRate = _depositRate;
        depositTokenSymbol = _depositTokenSymbol;
        tokenManagerAddress = _tokenManagerAddress;
    }

    /// @notice                                 lock quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    /// @param checkQuota                       input whether need to check quota
    function mintLock(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value,
        bool checkQuota
    ) external onlyHtlc notHalted {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        /// Don't check in the other chain.
        if (checkQuota) {
            uint mintQuota = getMintQuota(tokenId, storemanGroupId);
            require(
                mintQuota.sub(quota._receivable.add(quota._debt)) >= value,
                "Quota is not enough"
            );
        }

        if (!quota._active) {
            quota._active = true;
            storemanTokensMap[storemanGroupId][storemanTokenCountMap[storemanGroupId]] = tokenId;
            storemanTokenCountMap[storemanGroupId] = storemanTokenCountMap[storemanGroupId]
                .add(1);
        }

        quota._receivable = quota._receivable.add(value);
    }

    /// @notice                                 revoke quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function mintRevoke(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc notHalted {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota._receivable = quota._receivable.sub(value);
    }

    /// @notice                                 redeem quota in mint direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function mintRedeem(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc notHalted {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota._receivable = quota._receivable.sub(value);
        quota._debt = quota._debt.add(value);
    }

    /// @notice                                 perform a fast crosschain mint
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    /// @param checkQuota                       input whether need to check quota
    function fastMint(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value,
        bool checkQuota
    ) external onlyHtlc notHalted {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        /// Don't check in the other chain.
        if (checkQuota) {
            uint mintQuota = getMintQuota(tokenId, storemanGroupId);
            require(
                mintQuota.sub(quota._receivable.add(quota._debt)) >= value,
                "Quota is not enough"
            );
        }
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
    function fastBurn(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value,
        bool checkQuota
    ) external onlyHtlc notHalted {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        if (checkQuota) {
            require(quota._debt.sub(quota._payable) >= value, "Value is invalid");
        }
        quota._debt = quota._debt.sub(value);
    }

    /// @notice                                 lock quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function burnLock(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value,
        bool checkQuota
    ) external onlyHtlc notHalted {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        if (checkQuota) {
            require(quota._debt.sub(quota._payable) >= value, "Value is invalid");
        }
        quota._payable = quota._payable.add(value);
    }

    /// @notice                                 revoke quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function burnRevoke(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc notHalted {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota._payable = quota._payable.sub(value);
    }

    /// @notice                                 redeem quota in burn direction
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    /// @param value                            amount of exchange token
    function burnRedeem(
        uint tokenId,
        bytes32 storemanGroupId,
        uint value
    ) external onlyHtlc notHalted {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        quota._debt = quota._debt.sub(value);
        quota._payable = quota._payable.sub(value);
    }

    /// @notice                                 source storeman group lock the debt transaction,update the detailed quota info. of the storeman group
    /// @param srcStoremanGroupId               PK of source storeman group
    /// @param dstStoremanGroupId               PK of destination storeman group
    function debtLock(
        bytes32 srcStoremanGroupId,
        bytes32 dstStoremanGroupId
    ) external onlyHtlc notHalted {
        // uint srcDebt = getFiatDebtTotal(srcStoremanGroupId);
        // uint dstDepost = getFiatDeposit(dstStoremanGroupId);

        // require(dstDepost >= srcDebt, "Dest deposit not enough");

        uint tokenCount = storemanTokenCountMap[srcStoremanGroupId];
        for (uint i = 0; i < tokenCount; i++) {
            uint id = storemanTokensMap[srcStoremanGroupId][i];
            Quota storage src = quotaMap[id][srcStoremanGroupId];

            require( src._receivable == uint(0) && src._payable == uint(0),
                "There are _receivable or _payable in src storeman"
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

            dst._receivable = dst._receivable.add(src._debt);
            src._payable = src._payable.add(src._debt);
        }
    }

    /// @notice                                 destination storeman group redeem the debt transaction,update the detailed quota info. of the storeman group
    /// @param srcStoremanGroupId               PK of source storeman group
    /// @param dstStoremanGroupId               PK of destination storeman group
    function debtRedeem(
        bytes32 srcStoremanGroupId,
        bytes32 dstStoremanGroupId
    ) external onlyHtlc notHalted {
        uint tokenCount = storemanTokenCountMap[srcStoremanGroupId];
        for (uint i = 0; i < tokenCount; i++) {
            uint id = storemanTokensMap[srcStoremanGroupId][i];
            Quota storage src = quotaMap[id][srcStoremanGroupId];
            if (src._debt == 0) {
                continue;
            }
            Quota storage dst = quotaMap[id][dstStoremanGroupId];
            /// Adjust quota record
            dst._receivable = dst._receivable.sub(src._payable);
            dst._debt = dst._debt.add(src._debt);

            src._payable = 0;
            src._debt = 0;
        }
    }

    /// @notice                                 source storeman group revoke the debt transaction,update the detailed quota info. of the storeman group
    /// @param srcStoremanGroupId               PK of source storeman group
    /// @param dstStoremanGroupId               PK of destination storeman group
    function debtRevoke(
        bytes32 srcStoremanGroupId,
        bytes32 dstStoremanGroupId
    ) external onlyHtlc notHalted {
        uint tokenCount = storemanTokenCountMap[srcStoremanGroupId];
        for (uint i = 0; i < tokenCount; i++) {
            uint id = storemanTokensMap[srcStoremanGroupId][i];
            Quota storage src = quotaMap[id][srcStoremanGroupId];
            if (src._debt == 0) {
                continue;
            }
            Quota storage dst = quotaMap[id][dstStoremanGroupId];
            
            dst._receivable = dst._receivable.sub(src._payable);
            src._payable = 0;
        }
    }

    /// @notice                                 get mint quota of storeman, tokenId
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    function getMintQuota(uint tokenId, bytes32 storemanGroupId)
        public
        view
        returns (uint)
    {
        bytes memory symbol;
        uint decimals;
        uint tokenPrice;

        uint fiatQuota = getFiatMintQuota(storemanGroupId);

        (symbol, decimals) = getTokenAncestorInfo(tokenId);
        tokenPrice = getPrice(symbol);
        if (tokenPrice == 0) {
            return 0;
        }

        return fiatQuota.div(tokenPrice).mul(10**decimals).div(1 ether);
    }

    /// @notice                                 get burn quota of storeman, tokenId
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    function getBurnQuota(uint tokenId, bytes32 storemanGroupId)
        public
        view
        returns (uint burnQuota)
    {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        burnQuota = quota._debt.sub(quota._payable);
    }

    /// @notice                                 get debt clean state of storeman
    /// @param storemanGroupId                  PK of source storeman group
    function isDebtClean(bytes32 storemanGroupId) external view returns (bool) {
        uint tokenCount = storemanTokenCountMap[storemanGroupId];
        for (uint i = 0; i < tokenCount; i++) {
            uint id = storemanTokensMap[storemanGroupId][i];
            Quota storage src = quotaMap[id][storemanGroupId];
            if (src._debt > 0 || src._payable > 0 || src._receivable > 0) {
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

    /// get total debt in USD/FIAT
    // function getFiatDebtTotal(bytes32 storemanGroupId) private view returns (uint) {
    //     bytes memory symbol;
    //     uint decimals;
    //     uint tokenPrice;
    //     uint totalDebtValue = 0;
    //     uint tokenCount = storemanTokenCountMap[storemanGroupId];
    //     for (uint i = 0; i < tokenCount; i++) {
    //         uint id = storemanTokensMap[storemanGroupId][i];
    //         (symbol, decimals) = getTokenAncestorInfo(id);
    //         tokenPrice = getPrice(symbol);
    //         Quota storage q = quotaMap[id][storemanGroupId];
    //         uint tokenValue = q._debt.mul(tokenPrice).mul(1 ether).div(10**decimals); /// change Decimals to 18 digits
    //         totalDebtValue = totalDebtValue.add(tokenValue);
    //     }
    //     return totalDebtValue;
    // }

    /// get mint quota in Fiat/USD decimals: 18
    function getFiatMintQuota(bytes32 storemanGroupId) private view returns (uint) {
        bytes memory symbol;
        uint decimals;

        uint totalTokenUsedValue = 0;
        for (uint i = 0; i < storemanTokenCountMap[storemanGroupId]; i++) {
            uint id = storemanTokensMap[storemanGroupId][i];
            (symbol, decimals) = getTokenAncestorInfo(id);
            Quota storage q = quotaMap[id][storemanGroupId];
            uint tokenValue = q._receivable.add(q._debt).mul(getPrice(symbol)).mul(1 ether).div(10**decimals); /// change Decimals to 18 digits
            totalTokenUsedValue = totalTokenUsedValue.add(tokenValue);
        }

        uint depositValue = getFiatDeposit(storemanGroupId).mul(DENOMINATOR).div(depositRate); // 15000 = 150%
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
        IDepositOracle oracle = IDepositOracle(depositOracleAddress);
        (,,deposit,,,,,,,,) = oracle.getStoremanGroupConfig(storemanGroupId);
    }

    function getTokenAncestorInfo(uint tokenId)
        private
        view
        returns (bytes ancestorSymbol, uint decimals)
    {
        ITokenManager tokenManager = ITokenManager(tokenManagerAddress);
        (,,ancestorSymbol,decimals,) = tokenManager.getAncestorInfo(tokenId);
    }

    function getPrice(bytes symbol) private view returns (uint price) {
        IPriceOracle oracle = IPriceOracle(priceOracleAddress);
        price = oracle.getValue(symbol);
    }
}
