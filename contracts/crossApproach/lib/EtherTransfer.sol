// SPDX-License-Identifier: MIT

pragma solidity ^0.8.1;

/**
 * @title EtherTransfer
 * @dev Library for safe ether transfer operations
 * This library provides a safer alternative to Solidity's native transfer function
 * by allowing custom gas limits and better error handling
 */
library EtherTransfer {
    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://consensys.net/diligence/blog/2023/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.8.0/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount, uint256 gasLimit) internal {
        require(address(this).balance >= amount, "EtherTransfer: insufficient balance");

        (bool success, ) = recipient.call{value: amount, gas: gasLimit}("");
        require(success, "EtherTransfer: unable to send value, recipient may have reverted");
    }
}
