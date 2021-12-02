// SPDX-License-Identifier: MIT

pragma solidity ^0.4.26;

//import "openzeppelin-eth/contracts/math/SafeMath.sol";
//import "../lib/SafeMath.sol";
import 'openzeppelin-eth/contracts/ownership/Ownable.sol';
import 'openzeppelin-eth/contracts/token/ERC721/ERC721Full.sol';


/**
* @notice This is the template for all NFT contract.
*/
contract MappingNftToken is ERC721Full, Ownable {

    using SafeMath for uint;

    /// total number of NFT
    uint public totalSupply;

    uint8 private _decimal;
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

    function decimals() public pure returns (uint8) {
        return 0; // For NFT, decimal set to 0.
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
    modifier onlyMeaningfulValue(uint256 nftID) {
        require(nftID > 0, "Value is null");
        _;
    }


    /****************************************************************************
     **
     ** EVENTS
     **
     ****************************************************************************/
    /// @notice Logger for token mint
    /// @dev Logger for token mint
    /// @param account Whom these token will be minted to
    /// @param nftID ID of NFT to be minted
    /// @param totalSupply Total amount of NFT after token mint
    event TokenMintedLogger(
        address indexed account,
        uint indexed nftID,
        uint indexed totalSupply
    );

    /// @notice Logger for token burn
    /// @dev Logger for token burn
    /// @param account Initiator address
    /// @param nftID ID of NFT to be burnt
    /// @param totalSupply Total amount of NFT after token burn
    event TokenBurntLogger(
        address indexed account,
        uint indexed nftID,
        uint indexed totalSupply
    );


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
    onlyMeaningfulValue(nftID)
    {
        _mint(account_, nftID);

        totalSupply = totalSupply.add(1);
        emit TokenMintedLogger(account_, nftID, totalSupply);
    }

    /// @notice Burn token
    /// @dev Burn token
    /// @param account_ Address of whose token will be burnt
    /// @param nftID   ID of token to be burnt
    function burn(address account_, uint256 nftID)
    external
    onlyOwner
    onlyMeaningfulValue(nftID)
    {
        _burn(account_, nftID);

        totalSupply = totalSupply.sub(1);
        emit TokenBurntLogger(account_, nftID, totalSupply);
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

    function _beforeTokenTransfer(address from, address to, uint256 amount)  view internal {
        require(to != address(this), "to address incorrect");
    }
}
