
pragma solidity ^0.4.24;

import '../components/StandardToken.sol';
import '../components/Owned.sol';

contract WanToken is StandardToken, Owned {
    using SafeMath for uint;
    modifier onlyMeaningfulValue(uint value) {
        require(value > 0, "Value is null");
        _;
    }
    event TokenMintedLogger(
        address indexed account,
        uint indexed value,
        uint indexed totalSupply
    );

    event TokenBurntLogger(
        address indexed account,
        uint indexed value,
        uint indexed totalSupply
    );

    constructor(string tokenName, string tokenSymbol, uint8 tokenDecimal)
        public
    {
        name = tokenName;
        symbol = tokenSymbol;
        decimals = tokenDecimal;
    }
    function mint(address account, uint value)
        external
        onlyOwner
        onlyMeaningfulValue(value)
    {
        require(account != address(0), "Account is null");

        balances[account] = balances[account].add(value);
        totalSupply = totalSupply.add(value);

        emit TokenMintedLogger(account, value, totalSupply);
    }

    function burn(address account, uint value)
        external
        onlyOwner
        onlyMeaningfulValue(value)
    {
        balances[account] = balances[account].sub(value);
        totalSupply = totalSupply.sub(value);

        emit TokenBurntLogger(account, value, totalSupply);
    }

}
