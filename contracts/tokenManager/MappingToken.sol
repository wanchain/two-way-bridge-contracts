
pragma solidity 0.4.26;

import '../components/StandardToken.sol';
import '../components/Owned.sol';

contract MappingToken is StandardToken, Owned {
    using SafeMath for uint;

    modifier onlyMeaningfulValue(uint value) {
        require(value > 0, "Value is null");
        _;
    }
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
        balances[account] = balances[account].add(value);
        totalSupply = totalSupply.add(value);

        emit Transfer(address(0), account, value);
    }

    function burn(address account, uint value)
        external
        onlyOwner
        onlyMeaningfulValue(value)
    {
        balances[account] = balances[account].sub(value);
        totalSupply = totalSupply.sub(value);

        emit Transfer(account, address(0), value);
    }

    function update(string _name, string _symbol)
        external
        onlyOwner
    {
        name = _name;
        symbol = _symbol;
    }
}