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

pragma solidity 0.8.18;

import "./CrossStorageV4.sol";
import "./lib/RapidityLibV4.sol";
import "./lib/NFTLibV1.sol";

/**
 * @title CrossDelegateV4
 * @dev Main implementation contract for cross-chain functionality
 * This contract handles:
 * - Cross-chain token transfers
 * - NFT transfers
 * - Fee management
 * - Admin and operator role management
 * - Transaction verification and execution
 */
contract CrossDelegateV4 is CrossStorageV4 {
    using SafeMath for uint;

    /**
     * @notice Events emitted by the contract
     */

    /**
     * @notice Emitted when a new admin is set
     * @param adminAccount The address of the new admin
     */
    event SetAdmin(address adminAccount);

    /**
     * @notice Emitted when fees are updated for cross-chain operations
     * @param srcChainID Source chain identifier
     * @param destChainID Destination chain identifier
     * @param contractFee Fee charged by the contract
     * @param agentFee Fee charged by the agent
     */
    event SetFee(uint indexed srcChainID, uint indexed destChainID, uint contractFee, uint agentFee);

    /**
     * @notice Emitted when token pair fees are updated
     * @param tokenPairID ID of the token pair
     * @param contractFee Fee charged by the contract for this token pair
     */
    event SetTokenPairFee(uint indexed tokenPairID, uint contractFee);

    /**
     * @notice Emitted when a storeman group withdraws original coins to a receiver
     * @param smgID ID of the storeman group
     * @param timeStamp Timestamp of the withdrawal
     * @param receiver Address of the receiver
     * @param fee Shadow coin fee received by the storeman group
     */
    event WithdrawHistoryFeeLogger(bytes32 indexed smgID, uint indexed timeStamp, address indexed receiver, uint fee);

    /**
     * @notice Emitted when operator status is configured
     * @param operator Address of the operator
     * @param enabled Whether the operator is enabled or disabled
     */
    event ConfigOperator(address indexed operator, bool indexed enabled);

    /**
     * @notice Emitted when admin status is configured
     * @param admin Address of the admin
     * @param enabled Whether the admin is enabled or disabled
     */
    event ConfigAdmin(address indexed admin, bool indexed enabled);

    /**
     *
     * MODIFIERS
     *
     */

    /**
     * @notice Ensures the caller has admin privileges
     * @dev Checks if the caller is an admin, the main admin, or the owner
     */
    modifier onlyAdmin() {
        require(isAdmin[msg.sender] || msg.sender == admin || msg.sender == owner, "not admin");
        _;
    }

    /**
     * @notice Ensures the caller has operator privileges
     * @dev Checks if the caller is an operator, an admin, the main admin, or the owner
     */
    modifier onlyOperator() {
        require(isOperator[msg.sender] || isAdmin[msg.sender] || msg.sender == admin || msg.sender == owner, "not operator");
        _;
    }

    /**
     * @notice Ensures the storeman group is in ready state
     * @dev Checks if the specified storeman group is ready for operations
     */
    modifier onlyReadySmg(bytes32 smgID) {
        uint8 status;
        uint startTime;
        uint endTime;
        (status,startTime,endTime) = storageData.smgAdminProxy.getStoremanGroupStatus(smgID);

        require(status == uint8(GroupStatus.ready) && block.timestamp >= startTime && block.timestamp <= endTime, "PK is not ready");
        _;
    }


    /**
     *
     * MANIPULATIONS
     *
     */
    /**
     * @notice Initiates a cross-chain token transfer by locking original tokens
     * @dev This function handles the initial step of cross-chain transfer where original tokens are locked
     * @param smgID ID of the storeman group handling the transfer
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param value Amount of tokens to transfer
     * @param userAccount Account information for receiving tokens on the destination chain
     * Requirements:
     * - Contract must not be halted
     * - Storeman group must be ready
     * - Value must be greater than 0
     * - Token pair must exist
     */
    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount)
    public
    payable
    virtual
    notHalted
    nonReentrant
    onlyReadySmg(smgID)
    {
        address smgFeeProxy = getSmgFeeProxy();

        RapidityLibV4.RapidityUserLockParams memory params = RapidityLibV4.RapidityUserLockParams({
        smgID: smgID,
        tokenPairID: tokenPairID,
        value: value,
        currentChainID: currentChainID,
        tokenPairContractFee: mapTokenPairContractFee[tokenPairID],
        etherTransferGasLimit: getEtherTransferGasLimit(),
        destUserAccount: userAccount,
        smgFeeProxy: smgFeeProxy
        });
        RapidityLibV4.userLock(storageData, params);
    }

    /**
     * @notice Initiates a cross-chain token transfer by burning WRC20 tokens
     * @dev This function handles the initial step of cross-chain transfer where WRC20 tokens are burned
     * @param smgID ID of the storeman group handling the transfer
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param value Amount of tokens to transfer
     * @param fee Fee for the transfer operation
     * @param tokenAccount Address of the token contract
     * @param userAccount Account information for receiving tokens on the destination chain
     * Requirements:
     * - Contract must not be halted
     * - Storeman group must be ready
     * - Value must be greater than fee
     * - Token pair must exist
     */
    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes calldata userAccount)
    public
    payable
    virtual
    notHalted
    nonReentrant
    onlyReadySmg(smgID)
    {
        address smgFeeProxy = getSmgFeeProxy();

        RapidityLibV4.RapidityUserBurnParams memory params = RapidityLibV4.RapidityUserBurnParams({
        smgID: smgID,
        tokenPairID: tokenPairID,
        value: value,
        fee: fee,
        currentChainID: currentChainID,
        tokenPairContractFee: mapTokenPairContractFee[tokenPairID],
        etherTransferGasLimit: getEtherTransferGasLimit(),
        srcTokenAccount: tokenAccount,
        destUserAccount: userAccount,
        smgFeeProxy: smgFeeProxy
        });
        RapidityLibV4.userBurn(storageData, params);
    }

    /**
     * @notice Mints WRC20 tokens for cross-chain transfer
     * @dev This function is called by the storeman group to mint WRC20 tokens after receiving original tokens
     * @param uniqueID Unique identifier for the cross-chain transaction
     * @param smgID ID of the storeman group handling the transfer
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param value Amount of tokens to mint
     * @param fee Fee for the transfer operation
     * @param tokenAccount Address of the token contract
     * @param userAccount Address of the user to receive the minted tokens
     * @param r First part of the signature
     * @param s Second part of the signature
     * Requirements:
     * - Contract must not be halted
     * - Signature must be valid
     * - Transaction must not be already processed
     * - Value must be greater than fee
     */
    function smgMint(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, address userAccount, bytes calldata r, bytes32 s)
    external
    notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        RapidityLibV4.RapiditySmgMintParams memory params = RapidityLibV4.RapiditySmgMintParams({
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        value: value,
        fee: fee,
        destTokenAccount: tokenAccount,
        destUserAccount: userAccount,
        smgFeeProxy: (storageData.smgFeeProxy == address(0)) ? owner : storageData.smgFeeProxy // fix: Stack too deep
        });
        RapidityLibV4.smgMint(storageData, params);

        bytes32 mHash = hashFunc(abi.encode(currentChainID, uniqueID, tokenPairID, value, fee, tokenAccount, userAccount));
        verifySignature(curveID, mHash, PK, r, s);
    }

    /**
     * @notice Releases original tokens in exchange for WRC20 tokens on Wanchain
     * @dev This function is called by the storeman group to release original tokens after receiving WRC20 tokens
     * @param uniqueID Unique identifier for the cross-chain transaction
     * @param smgID ID of the storeman group handling the transfer
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param value Amount of tokens to release
     * @param fee Fee for the transfer operation
     * @param tokenAccount Address of the token contract
     * @param userAccount Address of the user to receive the original tokens
     * @param r First part of the signature
     * @param s Second part of the signature
     * Requirements:
     * - Contract must not be halted
     * - Storeman group must be ready and valid
     * - Signature must be valid
     * - Transaction must not be already processed
     */
    function smgRelease(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, address userAccount, bytes calldata r, bytes32 s)
    external
    notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        RapidityLibV4.RapiditySmgReleaseParams memory params = RapidityLibV4.RapiditySmgReleaseParams({
        uniqueID: uniqueID,
        smgID: smgID,
        tokenPairID: tokenPairID,
        value: value,
        fee: fee,
        etherTransferGasLimit: getEtherTransferGasLimit(),
        destTokenAccount: tokenAccount,
        destUserAccount: userAccount,
        smgFeeProxy: (storageData.smgFeeProxy == address(0)) ? owner : storageData.smgFeeProxy // fix: Stack too deep
        });
        RapidityLibV4.smgRelease(storageData, params);

        bytes32 mHash = hashFunc(abi.encode(currentChainID, uniqueID, tokenPairID, value, fee, tokenAccount, userAccount));
        verifySignature(curveID, mHash, PK, r, s);
    }

    /**
     * @notice Sets the fees for cross-chain transfers between specific chains
     * @dev This function allows operators to set both contract and agent fees for cross-chain operations
     * @param param Struct containing the fee parameters:
     *        - srcChainID: Source chain ID
     *        - destChainID: Destination chain ID
     *        - contractFee: Fee charged by the contract
     *        - agentFee: Fee charged by the agent
     * Requirements:
     * - Caller must be an operator
     */
    function setFee(SetFeesParam calldata param) public virtual onlyOperator {
        storageData.mapContractFee[param.srcChainID][param.destChainID] = param.contractFee;
        storageData.mapAgentFee[param.srcChainID][param.destChainID] = param.agentFee;
        emit SetFee(param.srcChainID, param.destChainID, param.contractFee, param.agentFee);
    }

    /**
     * @notice Sets fees for multiple cross-chain transfer pairs at once
     * @dev This function allows operators to set fees for multiple chain pairs in a single transaction
     * @param params Array of fee parameters for different chain pairs
     * Requirements:
     * - Caller must be an operator
     */
    function setFees(SetFeesParam [] calldata params) public virtual onlyOperator {
        for (uint i = 0; i < params.length; ++i) {
            storageData.mapContractFee[params[i].srcChainID][params[i].destChainID] = params[i].contractFee;
            storageData.mapAgentFee[params[i].srcChainID][params[i].destChainID] = params[i].agentFee;
            emit SetFee(params[i].srcChainID, params[i].destChainID, params[i].contractFee, params[i].agentFee);
        }
    }

    /**
     * @notice Sets the contract fee for a specific token pair
     * @dev This function allows operators to set the contract fee for cross-chain transfers of a specific token pair
     * @param tokenPairID ID of the token pair
     * @param contractFee Fee charged by the contract for this token pair
     * Requirements:
     * - Caller must be an operator
     */
    function setTokenPairFee(uint256 tokenPairID, uint256 contractFee) external virtual onlyOperator {
        mapTokenPairContractFee[tokenPairID] = contractFee;
        emit SetTokenPairFee(tokenPairID, contractFee);
    }

    /**
     * @notice Sets contract fees for multiple token pairs at once
     * @dev This function allows operators to set contract fees for multiple token pairs in a single transaction
     * @param params Array of token pair fee parameters
     * Requirements:
     * - Caller must be an operator
     */
    function setTokenPairFees(SetTokenPairFeesParam [] calldata params) public virtual onlyOperator {
        for (uint i = 0; i < params.length; ++i) {
            mapTokenPairContractFee[params[i].tokenPairID] = params[i].contractFee;
            emit SetTokenPairFee(params[i].tokenPairID, params[i].contractFee);
        }
    }

    /**
     * @notice Sets the current chain ID for the contract
     * @dev This function allows admin to set the chain ID only if it hasn't been set before
     * @param chainID The chain ID to set
     * Requirements:
     * - Caller must be admin
     * - Chain ID must not be already set
     */
    function setChainID(uint256 chainID) external virtual onlyAdmin {
        if (currentChainID == 0) {
            currentChainID = chainID;
        }
    }

    /**
     * @notice Computes the hash of input data using either keccak256 or sha256
     * @dev This function is used for signature verification in cross-chain transactions
     * @param data The input data to hash
     * @return The computed hash value
     */
    function hashFunc(bytes memory data) public view returns (bytes32){
        if(hashType == 1) {
            return keccak256(data);
        } else {
            return sha256(data);
        }
    }

    /**
     * @notice Sets the hash function type to be used for signature verification
     * @dev This function allows the owner to switch between keccak256 (1) and sha256 (0)
     * @param _hashType The hash function type to set (1 for keccak256, 0 for sha256)
     * Requirements:
     * - Caller must be the owner
     */
    function setHashType(uint _hashType) external onlyOwner {
        hashType = _hashType;
    }

    /**
     * @notice Sets the admin address for the contract
     * @dev This function allows the owner to change the admin address
     * @param adminAccount The new admin address
     * Requirements:
     * - Caller must be the owner
     */
    function setAdmin(address adminAccount) external onlyOwner {
        admin = adminAccount;
        emit SetAdmin(adminAccount);
    }

    /**
     * @notice Sets a uint value in the contract's storage
     * @dev This function allows admin to set values in the contract's storage using key-value pairs
     * @param key The primary key for the storage location
     * @param innerKey The secondary key for the storage location
     * @param value The uint value to store
     * Requirements:
     * - Caller must be admin
     */
    function setUintValue(bytes calldata key, bytes calldata innerKey, uint value) external virtual onlyAdmin {
        return BasicStorageLib.setStorage(uintData, key, innerKey, value);
    }

    /**
     * @notice Deletes a uint value from the contract's storage
     * @dev This function allows admin to remove values from the contract's storage
     * @param key The primary key for the storage location
     * @param innerKey The secondary key for the storage location
     * Requirements:
     * - Caller must be admin
     */
    function delUintValue(bytes calldata key, bytes calldata innerKey) external virtual onlyAdmin {
        return BasicStorageLib.delStorage(uintData, key, innerKey);
    }

    /// @notice                             update the initialized state value of this contract
    /// @param tokenManager                 address of the token manager
    /// @param smgAdminProxy                address of the storeman group admin
    /// @param smgFeeProxy                  address of the proxy to store fee for storeman group
    /// @param sigVerifier                  address of the signature verifier
    function setPartners(address tokenManager, address smgAdminProxy, address smgFeeProxy, address, address sigVerifier)
    external
    onlyOwner
    {
        require(tokenManager != address(0) && smgAdminProxy != address(0) && sigVerifier != address(0),
            "Parameter is invalid");

        storageData.smgAdminProxy = IStoremanGroup(smgAdminProxy);
        storageData.tokenManager = ITokenManager(tokenManager);
        // storageData.quota = IQuota(quota);
        storageData.smgFeeProxy = smgFeeProxy;
        storageData.sigVerifier = ISignatureVerifier(sigVerifier);
    }


    /**
     * @notice Withdraws accumulated historical fees to the foundation account
     * @dev This function allows withdrawing fees accumulated by storeman groups
     * @param smgIDs Array of storeman group IDs whose fees are to be withdrawn
     * Requirements:
     * - smgFeeProxy must be a valid address
     */
    function smgWithdrawHistoryFee(bytes32 [] calldata smgIDs) external {
        uint fee;
        uint currentFee;
        address smgFeeProxy = storageData.smgFeeProxy;
        if (smgFeeProxy == address(0)) {
            smgFeeProxy = owner;
        }
        require(smgFeeProxy != address(0), "invalid smgFeeProxy");

        for (uint i = 0; i < smgIDs.length; ++i) {
            currentFee = storageData.mapStoremanFee[smgIDs[i]];
            delete storageData.mapStoremanFee[smgIDs[i]];
            fee = fee.add(currentFee);
            emit WithdrawHistoryFeeLogger(smgIDs[i], block.timestamp, smgFeeProxy, currentFee);
        }
        if (fee > 0) {
            EtherTransfer.sendValue(payable(smgFeeProxy), fee, getEtherTransferGasLimit());
        }
    }


    /**
     * @notice Retrieves a uint value from the contract's storage
     * @dev This function allows reading values from the contract's storage using key-value pairs
     * @param key The primary key for the storage location
     * @param innerKey The secondary key for the storage location
     * @return The stored uint value
     */
    function getUintValue(bytes calldata key, bytes calldata innerKey) public view returns (uint) {
        return BasicStorageLib.getStorage(uintData, key, innerKey);
    }

    /**
     * @notice Retrieves the accumulated fee for a specific storeman group
     * @dev This function allows checking the fee amount that a storeman group has accumulated
     * @param key The storeman group ID
     * @return fee The accumulated fee amount for the storeman group
     */
    function getStoremanFee(bytes32 key) external view returns(uint fee) {
        fee = storageData.mapStoremanFee[key];
    }

    /**
     * @notice Retrieves the fees for cross-chain transfers between specific chains
     * @dev This function allows checking both contract and agent fees for a specific chain pair
     * @param param Struct containing the chain IDs to check fees for
     * @return fee Struct containing the contract and agent fees
     */
    function getFee(GetFeesParam calldata param) public view returns(GetFeesReturn memory fee) {
        fee.contractFee = storageData.mapContractFee[param.srcChainID][param.destChainID];
        fee.agentFee = storageData.mapAgentFee[param.srcChainID][param.destChainID];
    }

    /**
     * @notice Retrieves fees for multiple cross-chain transfer pairs at once
     * @dev This function allows checking fees for multiple chain pairs in a single call
     * @param params Array of chain pair parameters to check fees for
     * @return fees Array of fee structs containing contract and agent fees for each chain pair
     */
    function getFees(GetFeesParam [] calldata params) public view returns(GetFeesReturn [] memory fees) {
        fees = new GetFeesReturn[](params.length);
        for (uint i = 0; i < params.length; ++i) {
            fees[i].contractFee = storageData.mapContractFee[params[i].srcChainID][params[i].destChainID];
            fees[i].agentFee = storageData.mapAgentFee[params[i].srcChainID][params[i].destChainID];
        }
    }

    /**
     * @notice Retrieves the contract fee for a specific token pair
     * @dev This function allows checking the contract fee for cross-chain transfers of a specific token pair
     * @param tokenPairID ID of the token pair
     * @return contractFee The contract fee for the specified token pair
     */
    function getTokenPairFee(uint256 tokenPairID) external view returns(uint256 contractFee) {
        contractFee = mapTokenPairContractFee[tokenPairID];
    }

    /**
     * @notice Retrieves contract fees for multiple token pairs at once
     * @dev This function allows checking contract fees for multiple token pairs in a single call
     * @param tokenPairIDs Array of token pair IDs
     * @return contractFees Array of contract fees for each token pair
     */
    function getTokenPairFees(uint256[] calldata tokenPairIDs) external view returns(uint256 [] memory contractFees) {
        contractFees = new uint256[](tokenPairIDs.length);
        for (uint i = 0; i < tokenPairIDs.length; ++i) {
            contractFees[i] = mapTokenPairContractFee[tokenPairIDs[i]];
        }
    }

    /**
     * @notice Retrieves the initialized state and partner addresses of the contract
     * @dev This function returns the addresses of all core components and partner contracts
     * @return tokenManager Address of the token manager contract
     * @return smgAdminProxy Address of the storeman group admin proxy
     * @return smgFeeProxy Address of the proxy to store fees for storeman group
     * @return quota Address of the quota contract
     * @return sigVerifier Address of the signature verifier contract
     */
    function getPartners()
    external
    view
    returns(address tokenManager, address smgAdminProxy, address smgFeeProxy, address quota, address sigVerifier)
    {
        tokenManager = address(storageData.tokenManager);
        smgAdminProxy = address(storageData.smgAdminProxy);
        smgFeeProxy = storageData.smgFeeProxy;
        quota = address(storageData.quota);
        sigVerifier = address(storageData.sigVerifier);
    }


    /** Private and Internal Functions */

    /**
     * @notice Retrieves information about a ready storeman group
     * @dev This function returns the curve ID and public key of a storeman group that is ready for operations
     * @param smgID ID of the storeman group to check
     * @return curveID ID of the elliptic curve used by the storeman group
     * @return PK Public key of the storeman group
     * Requirements:
     * - Storeman group must be in ready status
     */
    function acquireReadySmgInfo(bytes32 smgID)
    internal
    view
    returns (uint curveID, bytes memory PK)
    {
        uint8 status;
        uint startTime;
        uint endTime;
        (,status,,,,curveID,,PK,,startTime,endTime) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.ready) && block.timestamp >= startTime && block.timestamp <= endTime, "PK is not ready");

        return (curveID, PK);
    }

    /**
     * @notice Retrieves information about an unregistered storeman group
     * @dev This function returns the curve ID and public key of a storeman group that is not yet registered
     * @param smgID ID of the storeman group to check
     * @return curveID ID of the elliptic curve used by the storeman group
     * @return PK Public key of the storeman group
     * Requirements:
     * - Storeman group must be in unregistered status
     */
    function acquireUnregisteredSmgInfo(bytes32 smgID)
    internal
    view
    returns (uint curveID, bytes memory PK)
    {
        uint8 status;
        (,status,,,,curveID,,PK,,,) = storageData.smgAdminProxy.getStoremanGroupConfig(smgID);

        require(status == uint8(GroupStatus.unregistered), "PK is not unregistered");
    }

    /**
     * @notice Converts a bytes array to bytes32 starting from a specified offset
     * @dev This function is used for extracting bytes32 values from a bytes array
     * @param b The bytes array to convert
     * @param offset The starting offset in the array
     * @return result The converted bytes32 value
     */
    function bytesToBytes32(bytes memory b, uint offset) internal pure returns (bytes32 result) {
        assembly {
            result := mload(add(add(b, offset), 32))
        }
    }

    /**
     * @notice Verifies a signature using the provided parameters
     * @dev This function verifies a signature using the storeman group's public key and the signature components
     * @param curveID ID of the elliptic curve used for verification
     * @param message The message that was signed
     * @param PK The public key of the signer
     * @param r First component of the signature
     * @param s Second component of the signature
     * Requirements:
     * - Signature must be valid according to the signature verifier contract
     */
    function verifySignature(uint curveID, bytes32 message, bytes memory PK, bytes memory r, bytes32 s) internal {
        bytes32 PKx = bytesToBytes32(PK, 0);
        bytes32 PKy = bytesToBytes32(PK, 32);

        bytes32 Rx = bytesToBytes32(r, 0);
        bytes32 Ry = bytesToBytes32(r, 32);

        require(storageData.sigVerifier.verify(curveID, s, PKx, PKy, Rx, Ry, message), "Signature verification failed");
    }

    /**
     * @notice Gets the address of the storeman group fee proxy
     * @dev This function returns the fee proxy address, falling back to the owner if not set
     * @return The address of the fee proxy or owner
     */
    function getSmgFeeProxy() internal view returns (address) {
        address smgFeeProxy = storageData.smgFeeProxy;
        return (smgFeeProxy == address(0)) ? owner : smgFeeProxy;
    }

    //*********************************************************************************************
    //*********************************************************************************************
    // NFT
    /**
     * @notice Implements the ERC721 token receiver interface
     * @dev This function allows the contract to receive ERC721 tokens
     * address - operator The address which called safeTransferFrom function
     * address - from The address which previously owned the token
     * uint256 - tokenId The token identifier
     * bytes - data Additional data with no specified format
     * @return The function selector of onERC721Received
     */
    function onERC721Received(address, address, uint256, bytes memory)
        public
        pure
        returns(bytes4)
    {
        return this.onERC721Received.selector;
    }

    /**
     * @notice Implements the ERC1155 token receiver interface for single token transfers
     * @dev This function allows the contract to receive ERC1155 tokens
     * address - operator The address which called safeTransferFrom function
     * address - from The address which previously owned the token
     * uint256 - id The token identifier
     * uint256 - value The amount of tokens being transferred
     * bytes - data Additional data with no specified format
     * @return The function selector of onERC1155Received
     */
    function onERC1155Received(address, address, uint256, uint256, bytes memory) 
        public 
        pure 
        returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }

    /**
     * @notice Implements the ERC1155 token receiver interface for batch token transfers
     * @dev This function allows the contract to receive multiple ERC1155 tokens in a single transaction
     * address - operator The address which called safeBatchTransferFrom function
     * address - from The address which previously owned the tokens
     * uint256[] - ids Array of token identifiers
     * uint256[] - values Array of token amounts
     * bytes - data Additional data with no specified format
     * @return The function selector of onERC1155BatchReceived
     */
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) 
        public
        pure
        returns (bytes4)
    {
        return this.onERC1155BatchReceived.selector;
    }

    /**
     * @notice Initiates a cross-chain NFT transfer by locking original NFTs
     * @dev This function handles the initial step of cross-chain NFT transfer where original NFTs are locked
     * @param smgID ID of the storeman group handling the transfer
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param tokenIDs Array of NFT token IDs to transfer
     * @param tokenValues Array of token values (amounts) for each NFT
     * @param userAccount Account information for receiving NFTs on the destination chain
     * Requirements:
     * - Contract must not be halted
     * - Storeman group must be ready
     * - Number of tokens must be between 1 and maxBatchSize
     * - Length of tokenIDs and tokenValues must match
     */
    function userLockNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory userAccount)
        public
        payable
        virtual
        notHalted
        nonReentrant
        onlyReadySmg(smgID)
    {
        require(tokenIDs.length > 0 && tokenIDs.length <= getMaxBatchSize(), "Invalid length");
        require(tokenIDs.length == tokenValues.length, "Length mismatch");

        NFTLibV1.RapidityUserLockNFTParams memory params = NFTLibV1.RapidityUserLockNFTParams({
            smgID: smgID,
            tokenPairID: tokenPairID,
            tokenIDs: tokenIDs,
            tokenValues: tokenValues,
            currentChainID: currentChainID,
            tokenPairContractFee: mapTokenPairContractFee[tokenPairID],
            etherTransferGasLimit: getEtherTransferGasLimit(),
            destUserAccount: userAccount,
            smgFeeProxy: getSmgFeeProxy()
        });
        NFTLibV1.userLockNFT(storageData, params);
    }

    /**
     * @notice Initiates a cross-chain NFT transfer by burning WRC721 tokens
     * @dev This function handles the initial step of cross-chain NFT transfer where WRC721 tokens are burned
     * @param smgID ID of the storeman group handling the transfer
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param tokenIDs Array of NFT token IDs to transfer
     * @param tokenValues Array of token values (amounts) for each NFT
     * @param tokenAccount Address of the token contract
     * @param userAccount Account information for receiving NFTs on the destination chain
     * Requirements:
     * - Contract must not be halted
     * - Storeman group must be ready
     * - Number of tokens must be between 1 and maxBatchSize
     * - Length of tokenIDs and tokenValues must match
     */
    function userBurnNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, address tokenAccount, bytes memory userAccount)
        public
        payable
        notHalted
        nonReentrant
        onlyReadySmg(smgID)
    {
        require(tokenIDs.length > 0 && tokenIDs.length <= getMaxBatchSize(), "Invalid length");
        require(tokenIDs.length == tokenValues.length, "Length mismatch");

        NFTLibV1.RapidityUserBurnNFTParams memory params = NFTLibV1.RapidityUserBurnNFTParams({
            smgID: smgID,
            tokenPairID: tokenPairID,
            tokenIDs: tokenIDs,
            tokenValues: tokenValues,
            currentChainID: currentChainID,
            tokenPairContractFee: mapTokenPairContractFee[tokenPairID],
            etherTransferGasLimit: getEtherTransferGasLimit(),
            srcTokenAccount: tokenAccount,
            destUserAccount: userAccount,
            smgFeeProxy: getSmgFeeProxy()
        });
        NFTLibV1.userBurnNFT(storageData, params);
    }

    /**
     * @notice Mints WRC721 tokens for cross-chain NFT transfer
     * @dev This function is called by the storeman group to mint WRC721 tokens after receiving original NFTs
     * @param uniqueID Unique identifier for the cross-chain transaction
     * @param smgID ID of the storeman group handling the transfer
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param tokenIDs Array of NFT token IDs to mint
     * @param tokenValues Array of token values (amounts) for each NFT
     * @param extData Additional data for the transfer
     * @param tokenAccount Address of the token contract
     * @param userAccount Address of the user to receive the minted NFTs
     * @param r First part of the signature
     * @param s Second part of the signature
     * Requirements:
     * - Contract must not be halted
     * - Storeman group must be ready and valid
     * - Signature must be valid
     * - Transaction must not be already processed
     */
    function smgMintNFT(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory extData, address tokenAccount, address userAccount, bytes memory r, bytes32 s)
        public
        notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        NFTLibV1.RapiditySmgMintNFTParams memory params = NFTLibV1.RapiditySmgMintNFTParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            tokenIDs: tokenIDs,
            tokenValues: tokenValues,
            extData: extData,
            destTokenAccount: tokenAccount,
            destUserAccount: userAccount
        });

        NFTLibV1.smgMintNFT(storageData, params);
        bytes32 mHash = hashFunc(abi.encode(currentChainID, uniqueID, tokenPairID, tokenIDs, tokenValues, extData, tokenAccount, userAccount));
        verifySignature(curveID, mHash, PK, r, s);
    }

    /**
     * @notice Releases original NFTs in exchange for WRC721 tokens on Wanchain
     * @dev This function is called by the storeman group to release original NFTs after receiving WRC721 tokens
     * @param uniqueID Unique identifier for the cross-chain transaction
     * @param smgID ID of the storeman group handling the transfer
     * @param tokenPairID ID of the token pair for cross-chain transfer
     * @param tokenIDs Array of NFT token IDs to release
     * @param tokenValues Array of token values (amounts) for each NFT
     * @param tokenAccount Address of the token contract
     * @param userAccount Address of the user to receive the original NFTs
     * @param r First part of the signature
     * @param s Second part of the signature
     * Requirements:
     * - Contract must not be halted
     * - Storeman group must be ready and valid
     * - Signature must be valid
     * - Transaction must not be already processed
     */
    function smgReleaseNFT(bytes32 uniqueID, bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, address tokenAccount, address userAccount, bytes memory r, bytes32 s)
        public
        notHalted
    {
        uint curveID;
        bytes memory PK;
        (curveID, PK) = acquireReadySmgInfo(smgID);

        NFTLibV1.RapiditySmgReleaseNFTParams memory params = NFTLibV1.RapiditySmgReleaseNFTParams({
            uniqueID: uniqueID,
            smgID: smgID,
            tokenPairID: tokenPairID,
            tokenIDs: tokenIDs,
            tokenValues: tokenValues,
            destTokenAccount: tokenAccount,
            destUserAccount: userAccount
        });
        NFTLibV1.smgReleaseNFT(storageData, params);

        bytes32 mHash = hashFunc(abi.encode(currentChainID, uniqueID, tokenPairID, tokenIDs, tokenValues, tokenAccount, userAccount));
        verifySignature(curveID, mHash, PK, r, s);
    }

    /**
     * @notice Sets the maximum batch size for NFT transfers
     * @dev This function allows admin to set the maximum number of NFTs that can be transferred in a single transaction
     * @param _maxBatchSize The new maximum batch size
     * Requirements:
     * - Caller must be admin
     */
    function setMaxBatchSize(uint _maxBatchSize) 
      external
      virtual
      onlyAdmin
    {
      maxBatchSize = _maxBatchSize;
    }

    /**
     * @notice Gets the maximum batch size for NFT transfers
     * @dev This function returns the maximum number of NFTs that can be transferred in a single transaction
     * @return The maximum batch size (defaults to 20 if not set)
     */
    function getMaxBatchSize() 
      public
      view
      returns (uint)
    {
      if(maxBatchSize == 0) {
        return 20;
      }
      return maxBatchSize;
    }

    /**
     * @notice Gets the batch fee for NFT transfers
     * @dev This function calculates the fee for transferring a batch of NFTs
     * @param tokenPairID ID of the token pair
     * @param batchLength Number of NFTs in the batch
     * @return The calculated batch fee
     */
    function getBatchFee(uint tokenPairID, uint batchLength) 
      external
      view
      returns (uint)
    {
      uint contractFee;
      (, contractFee) = NFTLibV1.getTokenScAddrAndContractFee(storageData, tokenPairID, mapTokenPairContractFee[tokenPairID], currentChainID, batchLength);
      return contractFee;
    }

    /**
     * @notice Sets the gas limit for ether transfers
     * @dev This function allows admin to set the gas limit used for ether transfers
     * @param _etherTransferGasLimit The new gas limit
     * Requirements:
     * - Caller must be admin
     */
    function setEtherTransferGasLimit(uint _etherTransferGasLimit) 
      external
      virtual
      onlyAdmin
    {
      etherTransferGasLimit = _etherTransferGasLimit;
    }

    /**
     * @notice Gets the gas limit for ether transfers
     * @dev This function returns the gas limit used for ether transfers
     * @return The gas limit (defaults to 2300 if not set)
     */
    function getEtherTransferGasLimit() 
      public
      view
      returns (uint)
    {
      if(etherTransferGasLimit == 0) {
        return 2300;
      }
      return etherTransferGasLimit;
    }

    /**
     * @notice Configures operator status for an address
     * @dev This function allows admin to enable or disable operator privileges for an address
     * @param _operator The address to configure
     * @param enabled Whether to enable or disable operator privileges
     * Requirements:
     * - Caller must be admin
     */
    function configOperator(address _operator, bool enabled) external onlyAdmin {
        isOperator[_operator] = enabled;
        emit ConfigOperator(_operator, enabled);
    }

    /**
     * @notice Configures admin status for an address
     * @dev This function allows owner to enable or disable admin privileges for an address
     * @param _admin The address to configure
     * @param enabled Whether to enable or disable admin privileges
     * Requirements:
     * - Caller must be owner
     */
    function configAdmin(address _admin, bool enabled) external onlyOwner {
        isAdmin[_admin] = enabled;
        emit ConfigAdmin(_admin, enabled);
    }
}
