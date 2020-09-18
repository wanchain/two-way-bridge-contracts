
pragma solidity ^0.4.26;
pragma experimental ABIEncoderV2;

import "./RapidityTxLib.sol";
import "./CrossTypes.sol";
import "../../interfaces/ITokenManager.sol";
import "../../interfaces/ISmgFeeProxy.sol";
import "../../lib/SafeMath.sol";

library RapidityLib {
    using SafeMath for uint;
    using RapidityTxLib for RapidityTxLib.Data;
    struct RapidityUserMintParams {
        bytes32 smgID;                      
        uint tokenPairID;                   
        uint value;                         
        bytes userShadowAccount;            
    }

    struct RapiditySmgMintParams {
        bytes32 uniqueID;                   
        bytes32 smgID;                      
        uint tokenPairID;                   
        uint value;                         
        address userShadowAccount;          
    }

    struct RapidityUserBurnParams {
        bytes32 smgID;                  
        uint tokenPairID;               
        uint value;                     
        bytes userOrigAccount;          
    }

    struct RapiditySmgBurnParams {
        bytes32 uniqueID;               
        bytes32 smgID;                  
        uint tokenPairID;               
        uint value;                     
        address userOrigAccount;          
    }
    event UserFastMintLogger(bytes32 indexed smgID, uint indexed tokenPairID, uint value, uint fee, bytes userAccount);

    event SmgFastMintLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address userAccount);

    event UserFastBurnLogger(bytes32 indexed smgID, uint indexed tokenPairID, uint value, uint fee, bytes userAccount);

    event SmgFastBurnLogger(bytes32 indexed uniqueID, bytes32 indexed smgID, uint indexed tokenPairID, uint value, address userAccount);
    function userFastMint(CrossTypes.Data storage storageData, RapidityUserMintParams memory params)
        public
    {
        uint origChainID;
        uint shadowChainID;
        bytes memory tokenOrigAccount;
        (origChainID,tokenOrigAccount,shadowChainID,) = storageData.tokenManager.getTokenPairInfo(params.tokenPairID);
        require(origChainID != 0, "Token does not exist");

        uint lockFee = storageData.mapLockFee[origChainID][shadowChainID];

        storageData.quota.userFastMint(params.tokenPairID, params.smgID, params.value);

        if (lockFee > 0) {
            if (storageData.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[params.smgID] = storageData.mapStoremanFee[params.smgID].add(lockFee);
            } else {
                ISmgFeeProxy(storageData.smgFeeProxy).smgTransfer.value(lockFee)(params.smgID);
            }
        }

        address tokenScAddr = CrossTypes.bytesToAddress(tokenOrigAccount);

        uint left;
        if (tokenScAddr == address(0)) {
            left = (msg.value).sub(params.value).sub(lockFee);
        } else {
            left = (msg.value).sub(lockFee);

            require(CrossTypes.transferFrom(tokenScAddr, msg.sender, this, params.value), "Lock token failed");
        }
        if (left != 0) {
            (msg.sender).transfer(left);
        }
        emit UserFastMintLogger(params.smgID, params.tokenPairID, params.value, lockFee, params.userShadowAccount);
    }

    function smgFastMint(CrossTypes.Data storage storageData, RapiditySmgMintParams memory params)
        public
    {
        storageData.rapidityTxData.addRapidityTx(params.uniqueID);

        storageData.quota.smgFastMint(params.tokenPairID, params.smgID, params.value);

        storageData.tokenManager.mintToken(params.tokenPairID, params.userShadowAccount, params.value);

        emit SmgFastMintLogger(params.uniqueID, params.smgID, params.tokenPairID, params.value, params.userShadowAccount);
    }

    function userFastBurn(CrossTypes.Data storage storageData, RapidityUserBurnParams memory params)
        public
    {
        uint origChainID;
        uint shadowChainID;
        bytes memory tokenShadowAccount;
        (origChainID,,shadowChainID,tokenShadowAccount) = storageData.tokenManager.getTokenPairInfo(params.tokenPairID);
        require(origChainID != 0, "Token does not exist");

        uint lockFee = storageData.mapLockFee[origChainID][shadowChainID];

        storageData.quota.userFastBurn(params.tokenPairID, params.smgID, params.value);

        address tokenScAddr = CrossTypes.bytesToAddress(tokenShadowAccount);
        require(CrossTypes.transferFrom(tokenScAddr, msg.sender, this, params.value), "Lock token failed");

        storageData.tokenManager.burnToken(params.tokenPairID, params.value);

        if (lockFee > 0) {
            if (storageData.smgFeeProxy == address(0)) {
                storageData.mapStoremanFee[params.smgID] = storageData.mapStoremanFee[params.smgID].add(lockFee);
            } else {
                ISmgFeeProxy(storageData.smgFeeProxy).smgTransfer.value(lockFee)(params.smgID);
            }
        }

        uint left = (msg.value).sub(lockFee);
        if (left != 0) {
            (msg.sender).transfer(left);
        }

        emit UserFastBurnLogger(params.smgID, params.tokenPairID, params.value, lockFee, params.userOrigAccount);
    }

    function smgFastBurn(CrossTypes.Data storage storageData, RapiditySmgBurnParams memory params)
        public
    {
        uint origChainID;
        bytes memory tokenOrigAccount;
        (origChainID,tokenOrigAccount,,) = storageData.tokenManager.getTokenPairInfo(params.tokenPairID);
        require(origChainID != 0, "Token does not exist");

        storageData.rapidityTxData.addRapidityTx(params.uniqueID);

        storageData.quota.smgFastBurn(params.tokenPairID, params.smgID, params.value);

        address tokenScAddr = CrossTypes.bytesToAddress(tokenOrigAccount);

        if (tokenScAddr == address(0)) {
            (params.userOrigAccount).transfer(params.value);
        } else {
            require(CrossTypes.transfer(tokenScAddr, params.userOrigAccount, params.value), "Transfer token failed");
        }

        emit SmgFastBurnLogger(params.uniqueID, params.smgID, params.tokenPairID, params.value, params.userOrigAccount);
    }

}
