// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";


/**
* @notice This is the template for all NFT contract.
*/
contract MappingNftToken is ERC721, ERC721Enumerable, ERC721Metadata, Ownable {

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
    ) public
      ERC721(name_, symbol_)
      ERC721Enumerable(name_, symbol_) {
        _name = name_;
        _symbol = symbol_;
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
        address tokenOwner = ERC721.ownerOf(tokenId);
        require(account_ == tokenOwner, "invalid nft token owner");
        _burn(nftID);
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
