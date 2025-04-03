// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/**
 * @title ICross
 * @dev Interface for the cross-chain functionality contract that handles asset transfers and communication between chains
 * 
 * @custom:key-features
 * - Enable/disable cross-chain functionality
 * - Get related contract addresses
 * - Get current chain ID information
 */
interface ICross {
    /**
     * @dev Sets the halt status of the cross-chain contract
     * 
     * @param halt true to halt cross-chain functionality, false to resume
     */
    function setHalt(bool halt) external;
    
    /**
     * @dev Gets the addresses of related contracts in the cross-chain system
     * 
     * @return tokenManager Token manager contract address
     * @return smgAdminProxy Storeman group admin proxy contract address
     * @return smgFeeProxy Storeman group fee proxy contract address
     * @return quota Quota management contract address
     * @return sigVerifier Signature verification contract address
     * 
     * @custom:usage
     * - Used to verify key contract addresses
     * - Ensures system component consistency
     */
    function getPartners() external view returns(address tokenManager, address smgAdminProxy, address smgFeeProxy, address quota, address sigVerifier);
    
    /**
     * @dev Gets the ID of the current blockchain
     * 
     * @return uint256 The unique identifier of the current blockchain
     * 
     * @custom:usage
     * - Used in cross-chain transactions to verify target chains
     * - Ensures messages are sent to the correct target chain
     */
    function currentChainID() external view returns (uint256);
}
