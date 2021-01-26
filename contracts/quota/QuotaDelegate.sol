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

import "./QuotaStorageV2.sol";
import "../interfaces/IOracle.sol";

interface _ITokenManager {
    function getAncestorSymbol(uint id) external view returns (string symbol, uint8 decimals);
}

interface _IStoremanGroup {
    function getDeposit(bytes32 id) external view returns(uint deposit);
}

interface IDebtOracle {
    function isDebtClean(bytes32 storemanGroupId) external view returns (bool);
}


contract QuotaDelegate is QuotaStorageV2 {

    event AssetTransfered(bytes32 indexed srcStoremanGroupId, bytes32 indexed dstStoremanGroupId, uint tokenId, uint value);

    event DebtReceived(bytes32 indexed srcStoremanGroupId, bytes32 indexed dstStoremanGroupId, uint tokenId, uint value);

    modifier checkMinValue(uint tokenId, uint value) {
        if (fastCrossMinValue > 0) {
            string memory symbol;
            uint decimals;
            (symbol, decimals) = getTokenAncestorInfo(tokenId);
            uint price = getPrice(symbol);
            if (price > 0) {
                uint count = fastCrossMinValue.mul(10**decimals).div(price);
                require(value >= count, "value too small");
            }
        }
        _;
    }
    
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
        string _depositTokenSymbol
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

    function setFastCrossMinValue(uint value) external onlyOwner {
        fastCrossMinValue = value;
    }

    /// @notice                                 get asset of storeman, tokenId
    /// @param tokenId                          tokenPairId of crosschain
    /// @param storemanGroupId                  PK of source storeman group
    function getAsset(uint tokenId, bytes32 storemanGroupId)
        public
        view
        returns (uint asset, uint asset_receivable, uint asset_payable)
    {
        uint tokenKey = getTokenKey(tokenId);
        Quota storage quota = v2QuotaMap[tokenKey][storemanGroupId];
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
        uint tokenKey = getTokenKey(tokenId);
        Quota storage quota = v2QuotaMap[tokenKey][storemanGroupId];
        return (quota._debt, quota.debt_receivable, quota.debt_payable);
    }

    /// @notice                                 get debt clean state of storeman
    /// @param storemanGroupId                  PK of source storeman group
    function isDebtClean(bytes32 storemanGroupId) external view returns (bool) {
        uint tokenCount = v2TokenCountMap[storemanGroupId];
        if (tokenCount == 0) {
            if (debtOracleAddress == address(0)) {
                return true;
            } else {
                IDebtOracle debtOracle = IDebtOracle(debtOracleAddress);
                return debtOracle.isDebtClean(storemanGroupId);
            }
        }

        for (uint i = 0; i < tokenCount; i++) {
            uint id = v2TokensMap[storemanGroupId][i];
            Quota storage src = v2QuotaMap[id][storemanGroupId];
            if (src._debt > 0 || src.debt_payable > 0 || src.debt_receivable > 0) {
                return false;
            }

            if (src._asset > 0 || src.asset_payable > 0 || src.asset_receivable > 0) {
                return false;
            }
        }
        return true;
    }

    /// @dev get minimize token count for fast cross chain
    function getFastMinCount(uint tokenId) public view returns (uint, string, uint, uint, uint) {
        if (fastCrossMinValue == 0) {
            return (0, "", 0, 0, 0);
        }
        string memory symbol;
        uint decimals;
        (symbol, decimals) = getTokenAncestorInfo(tokenId);
        uint price = getPrice(symbol);
        uint count = 0;
        if (price > 0) {
            count = fastCrossMinValue.mul(10**decimals).div(price);
        }
        return (fastCrossMinValue, symbol, decimals, price, count);
    }

    /** New Cross Chain Interface*/
    function userLock(uint tokenId, bytes32 storemanGroupId, uint value) 
        public 
        onlyHtlc 
        checkMinValue(tokenId, value) 
    {
        uint tokenKey = getTokenKey(tokenId);

        Quota storage quota = v2QuotaMap[tokenKey][storemanGroupId];

        if (!quota._active) {
            quota._active = true;
            v2TokensMap[storemanGroupId][v2TokenCountMap[storemanGroupId]] = tokenKey;
            v2TokenCountMap[storemanGroupId] = v2TokenCountMap[storemanGroupId]
                .add(1);
        }
        quota._asset = quota._asset.add(value);
    }

    function userBurn(uint tokenId, bytes32 storemanGroupId, uint value) 
        external 
        onlyHtlc 
        checkMinValue(tokenId, value) 
    {
        uint tokenKey = getTokenKey(tokenId);

        Quota storage quota = v2QuotaMap[tokenKey][storemanGroupId];
        quota._debt = quota._debt.sub(value);
    }

    function smgRelease(uint tokenId, bytes32 storemanGroupId, uint value) 
        external 
        onlyHtlc 
    {
        uint tokenKey = getTokenKey(tokenId);

        Quota storage quota = v2QuotaMap[tokenKey][storemanGroupId];
        quota._asset = quota._asset.sub(value);
    }

    function smgMint(uint tokenId, bytes32 storemanGroupId, uint value)
        public onlyHtlc 
    {
        uint tokenKey = getTokenKey(tokenId);

        Quota storage quota = v2QuotaMap[tokenKey][storemanGroupId];        
        if (!quota._active) {
            quota._active = true;
            v2TokensMap[storemanGroupId][v2TokenCountMap[storemanGroupId]] = tokenKey;
            v2TokenCountMap[storemanGroupId] = v2TokenCountMap[storemanGroupId]
                .add(1);
        }
        quota._debt = quota._debt.add(value);
    }

    function upgrade(bytes32[] storemanGroupIdArray) external onlyOwner {
        require(version < 2, "Can upgrade again.");
        version = 2; //upgraded v2
        uint length = storemanGroupIdArray.length;

        for (uint m = 0; m < length; m++) {
            bytes32 storemanGroupId = storemanGroupIdArray[m];
            uint tokenCount = storemanTokenCountMap[storemanGroupId];

            for (uint i = 0; i < tokenCount; i++) {
                uint id = storemanTokensMap[storemanGroupId][i];
                uint tokenKey = getTokenKey(id);

                Quota storage src = quotaMap[id][storemanGroupId];

                uint debt = src._debt;
                if (debt > 0) {
                    Quota storage quota = v2QuotaMap[tokenKey][storemanGroupId];        
                    if (!quota._active) {
                        quota._active = true;
                        v2TokensMap[storemanGroupId][v2TokenCountMap[storemanGroupId]] = tokenKey;
                        v2TokenCountMap[storemanGroupId] = v2TokenCountMap[storemanGroupId]
                            .add(1);
                    }
                    quota._debt = quota._debt.add(debt);
                }

                uint asset = src._asset;
                if (asset > 0) {
                    Quota storage quota2 = v2QuotaMap[tokenKey][storemanGroupId];
                    if (!quota2._active) {
                        quota2._active = true;
                        v2TokensMap[storemanGroupId][v2TokenCountMap[storemanGroupId]] = tokenKey;
                        v2TokenCountMap[storemanGroupId] = v2TokenCountMap[storemanGroupId]
                            .add(1);
                    }
                    quota2._asset = quota2._asset.add(asset);
                }
            }
        }
    }

    function transferAsset(
        bytes32 srcStoremanGroupId,
        bytes32 dstStoremanGroupId
    ) external onlyHtlc {
        uint tokenCount = v2TokenCountMap[srcStoremanGroupId];
        for (uint i = 0; i < tokenCount; i++) {
            uint id = v2TokensMap[srcStoremanGroupId][i];
            Quota storage src = v2QuotaMap[id][srcStoremanGroupId];
            if (src._asset == 0) {
                continue;
            }
            Quota storage dst = v2QuotaMap[id][dstStoremanGroupId];
            if (!dst._active) {
                dst._active = true;
                v2TokensMap[dstStoremanGroupId][v2TokenCountMap[dstStoremanGroupId]] = id;
                v2TokenCountMap[dstStoremanGroupId] = v2TokenCountMap[dstStoremanGroupId]
                    .add(1);
            }
            /// Adjust quota record
            dst._asset = dst._asset.add(src._asset);

            emit AssetTransfered(srcStoremanGroupId, dstStoremanGroupId, id, src._asset);

            src.asset_payable = 0;
            src._asset = 0;
        }
    }

    function receiveDebt(
        bytes32 srcStoremanGroupId,
        bytes32 dstStoremanGroupId
    ) external onlyHtlc {
        uint tokenCount = v2TokenCountMap[srcStoremanGroupId];
        for (uint i = 0; i < tokenCount; i++) {
            uint id = v2TokensMap[srcStoremanGroupId][i];
            Quota storage src = v2QuotaMap[id][srcStoremanGroupId];
            if (src._debt == 0) {
                continue;
            }
            Quota storage dst = v2QuotaMap[id][dstStoremanGroupId];
            if (!dst._active) {
                dst._active = true;
                v2TokensMap[dstStoremanGroupId][v2TokenCountMap[dstStoremanGroupId]] = id;
                v2TokenCountMap[dstStoremanGroupId] = v2TokenCountMap[dstStoremanGroupId]
                    .add(1);
            }
            /// Adjust quota record
            dst._debt = dst._debt.add(src._debt);

            emit DebtReceived(srcStoremanGroupId, dstStoremanGroupId, id, src._debt);

            src.debt_payable = 0;
            src._debt = 0;
        }
    }

    function getQuotaMap(uint tokenKey, bytes32 storemanGroupId) 
        public view returns (uint debt_receivable, uint debt_payable, uint _debt, uint asset_receivable, uint asset_payable, uint _asset, bool _active) {
        Quota storage quota = v2QuotaMap[tokenKey][storemanGroupId];
        return (quota.debt_receivable, quota.debt_payable, quota._debt, quota.asset_receivable, quota.asset_payable, quota._asset, quota._active);
    }

    function getTokenKey(uint tokenId) public view returns (uint) {
        string memory symbol;
        uint decimals;
        (symbol, decimals) = getTokenAncestorInfo(tokenId);
        uint tokenKey = uint(keccak256(abi.encodePacked(symbol, decimals)));
        return tokenKey;
    }

    function getTokenCount(bytes32 storemanGroupId) public view returns (uint) {
        return v2TokenCountMap[storemanGroupId];
    }

    function getTokenId(bytes32 storemanGroupId, uint index) public view returns (uint) {
        return v2TokensMap[storemanGroupId][index];
    }

    function getTokenQuota(string ancestorSymbol, uint decimals, bytes32 storemanGroupId)
        public view returns (uint debt_receivable, uint debt_payable, uint _debt, uint asset_receivable, uint asset_payable, uint _asset, bool _active) {
        uint tokenKey = uint(keccak256(abi.encodePacked(ancestorSymbol, decimals)));
        return getQuotaMap(tokenKey, storemanGroupId);
    }

    function getOldQuotaMap(uint tokenId, bytes32 storemanGroupId) 
        public view returns (uint debt_receivable, uint debt_payable, uint _debt, uint asset_receivable, uint asset_payable, uint _asset, bool _active) {
        Quota storage quota = quotaMap[tokenId][storemanGroupId];
        return (quota.debt_receivable, quota.debt_payable, quota._debt, quota.asset_receivable, quota.asset_payable, quota._asset, quota._active);
    }

    // ----------- Private Functions ---------------

    function getTokenAncestorInfo(uint tokenId)
        private
        view
        returns (string ancestorSymbol, uint decimals)
    {
        _ITokenManager tokenManager = _ITokenManager(tokenManagerAddress);
        (ancestorSymbol,decimals) = tokenManager.getAncestorSymbol(tokenId);
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

    function getPrice(string symbol) private view returns (uint price) {
        IOracle oracle = IOracle(priceOracleAddress);
        price = oracle.getValue(stringToBytes32(symbol));
    }
}
