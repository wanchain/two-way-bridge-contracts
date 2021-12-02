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

pragma solidity 0.4.26;
pragma experimental ABIEncoderV2;

/**
 * Math operations with safety checks
 */

import "./TokenManagerDelegate.sol";

contract TokenManagerDelegateV2 is TokenManagerDelegate {


    function getNftInfo(uint tokenPairId) external view returns (address addr, string name, string symbol) {
        if (mapTokenPairInfo[tokenPairId].fromChainID == 0) {
            name = '';
            symbol = '';
            addr = address(0);
        } else {
            address instance = bytesToAddress(mapTokenPairInfo[tokenPairId].toAccount);
            name = IMappingToken(instance).name();
            symbol = IMappingToken(instance).symbol();
            addr = instance;
        }
    }

    function isNFT(address _tokenAddr) external returns (bool isNft) {

        bytes4 ERC721_FLAG_FUNC = bytes4(keccak256("isApprovedForAll(address,address)"));
        bytes memory data = abi.encodeWithSelector(ERC721_FLAG_FUNC, 0x0,0x0);

        bool success;

        assembly {
            success := call(
            gas(),            // gas remaining
            _tokenAddr,       // destination address
            0,              // no ether
            add(data, 32),  // input buffer (starts after the first 32 bytes in the `data` array)
            mload(data),    // input length (loaded from the first 32 bytes in the `data` array)
            0,              // output buffer
            0               // output length
            )
        }

        return success;
    }

}
