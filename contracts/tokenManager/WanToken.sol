/*

  Copyright 2019 Wanchain Foundation.

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

pragma solidity ^0.4.24;

import '../components/StandardToken.sol';
import '../components/Owned.sol';

contract WanToken is StandardToken, Owned {
    using SafeMath for uint;

    /****************************************************************************
     **
     ** MODIFIERS
     **
     ****************************************************************************/
    modifier onlyMeaningfulValue(uint value) {
        require(value > 0, "Value is null");
        _;
    }

    /****************************************************************************
     **
     ** EVENTS
     **
     ****************************************************************************/

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

    /****************************************************************************
     **
     ** MANIPULATIONS
     **
     ****************************************************************************/

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
