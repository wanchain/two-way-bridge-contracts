// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title WrappedToken
 * @dev Implementation of a wrapped ERC20 token with burnable functionality
 * This contract provides:
 * - Custom decimal places
 * - Custom name and symbol
 * - Minting and burning capabilities
 * - Ownership management
 * - Token transfer restrictions
 */
contract WrappedToken is ERC20Burnable, Ownable {
    /// @notice Number of decimal places for token amounts
    uint8 private _decimal;
    
    /// @notice Name of the token
    string private _name;
    
    /// @notice Symbol of the token
    string private _symbol;

    /**
     * @notice Initializes the token with name, symbol and decimal places
     * @dev Sets the values for {name}, {symbol} and {decimals}
     * @param name_ Name of the token
     * @param symbol_ Symbol of the token
     * @param decimal_ Number of decimal places
     * Requirements:
     * - All parameters must be provided
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimal_
    ) ERC20(name_, symbol_) {
        _name = name_;
        _symbol = symbol_;
        _decimal = decimal_;
    }

    /**
     * @notice Returns the number of decimal places for token amounts
     * @return Number of decimal places
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimal;
    }

    /**
     * @notice Returns the name of the token
     * @return Name of the token
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @notice Returns the symbol of the token
     * @return Symbol of the token
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * ============================================================================
     * code for mapping token
     * ============================================================================
     */

    /****************************************************************************
     **
     ** MODIFIERS
     **
     ****************************************************************************/
    /**
     * @notice Modifier to ensure value is greater than zero
     * @dev Throws if value is zero
     * @param value Value to check
     */
    modifier onlyMeaningfulValue(uint256 value) {
        require(value > 0, "Value is null");
        _;
    }

    /****************************************************************************
     **
     ** MANIPULATIONS of mapping token
     **
     ****************************************************************************/

    /**
     * @notice Mints new tokens
     * @dev Can only be called by owner
     * @param account_ Address to receive the minted tokens
     * @param value_ Amount of tokens to mint
     * Requirements:
     * - Caller must be owner
     * - Value must be greater than zero
     */
    function mint(address account_, uint256 value_)
        external
        onlyOwner
        onlyMeaningfulValue(value_)
    {
        _mint(account_, value_);
    }

    /**
     * @notice Burns tokens from an account
     * @dev Can only be called by owner
     * @param account_ Address to burn tokens from
     * @param value_ Amount of tokens to burn
     * Requirements:
     * - Caller must be owner
     * - Value must be greater than zero
     */
    function burn(address account_, uint256 value_)
        external
        onlyOwner
        onlyMeaningfulValue(value_)
    {
        _burn(account_, value_);
    }

    /**
     * @notice Updates token name and symbol
     * @dev Can only be called by owner
     * @param name_ New name of the token
     * @param symbol_ New symbol of the token
     * Requirements:
     * - Caller must be owner
     */
    function update(string memory name_, string memory symbol_)
        external
        onlyOwner
    {
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @notice Transfers ownership of the token
     * @dev Can only be called by current owner
     * @param newOwner_ Address of the new owner
     * Requirements:
     * - Caller must be current owner
     */
    function transferOwner(address newOwner_) public onlyOwner {
        Ownable.transferOwnership(newOwner_);
    }

    /**
     * @notice Hook that is called before any token transfer
     * @dev Prevents transfers to the token contract itself
     * @param to Address receiving the tokens
     * Requirements:
     * - Recipient cannot be the token contract
     */
    function _beforeTokenTransfer(address /*from*/, address to, uint256 /*amount*/) internal override view { 
        require(to != address(this), "to address incorrect");
    }
}
