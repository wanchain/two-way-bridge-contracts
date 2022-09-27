// SPDX-License-Identifier: MIT

pragma solidity ^0.4.25;

import 'openzeppelin-eth/contracts/ownership/Ownable.sol';
import 'openzeppelin-eth/contracts/token/ERC721/ERC721Full.sol';


/**
* @notice This is the template for all NFT contract.
*/
contract MappingNftToken is ERC721Full, Ownable {

    using SafeMath for uint;

    string private _name;
    string private _symbol;

    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     * The defaut value of {decimals} is 18. To select a different value for
     * {decimals} you should overload it.
     *
     * All three of these values are immutable: they can only be set once during
     * construction.
     */
    constructor(
        string name_,
        string symbol_
    ) public {
        _name = name_;
        _symbol = symbol_;
        Ownable.initialize(msg.sender);
        ERC721.initialize();
        ERC721Enumerable.initialize();
        ERC721Metadata.initialize(name_, symbol_);
    }

    /****************************************************************************
     **
     ** MANIPULATIONS of mapping token
     **
     ****************************************************************************/

    /// @notice Create token
    /// @dev Create token
    /// @param account_ Address will receive token
    /// @param nftID ID of token to be minted
    function mint(address account_, uint256 nftID)
    external
    onlyOwner
    {
        _mint(account_, nftID);
    }

    /// @notice Burn token
    /// @dev Burn token
    /// @param account_ Address of whose token will be burnt
    /// @param nftID   ID of token to be burnt
    function burn(address account_, uint256 nftID)
        external
        onlyOwner
    {
        _burn(account_, nftID);
    }

    /// @notice update token name, symbol
    /// @dev update token name, symbol
    /// @param name_ token new name
    /// @param symbol_ token new symbol
    function update(string name_, string symbol_)
    external
    onlyOwner
    {
        _name = name_;
        _symbol = symbol_;
    }

    function transferOwner(address newOwner_) public onlyOwner {
        Ownable.transferOwnership(newOwner_);
    }

    // mint supprt data
    function mint(address account_, uint256 nftID, bytes data)
        external
        onlyOwner
    {
        _mint(account_, nftID);
    }

    function burnBatch(address account_, uint256[] nftIDs)
        external
        onlyOwner
    {
        for(uint i = 0; i < nftIDs.length; ++i) {
            _burn(account_, nftIDs[i]);
        }
    }

    function mintBatch(address account_, uint256[] nftIDs, bytes data)
        external
        onlyOwner
    {
         for(uint i = 0; i < nftIDs.length; ++i) {
             _mint(account_, nftIDs[i]);
         }
    }
}
