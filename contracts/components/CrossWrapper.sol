// SPDX-License-Identifier: MIT

/*

  Copyright 2023 Wanchain Foundation.

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

pragma solidity 0.8.18;

interface ICross {
    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount) external payable;
    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes calldata userAccount) external payable;
    function userLockNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory userAccount) external payable;
    function userBurnNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, address tokenAccount, bytes memory userAccount) external payable;
}

contract CrossWrapper {
    ICross public cross;

    event PartnerCross(string partner);

    constructor(address _cross) {
        cross = ICross(_cross);
    }

    function userLock(bytes32 smgID, uint tokenPairID, uint value, bytes calldata userAccount, string memory partner) external payable {
        cross.userLock{value: msg.value}(smgID, tokenPairID, value, userAccount);
        emit PartnerCross(partner);
    }

    function userBurn(bytes32 smgID, uint tokenPairID, uint value, uint fee, address tokenAccount, bytes calldata userAccount, string memory partner) external payable {
        cross.userBurn{value: msg.value}(smgID, tokenPairID, value, fee, tokenAccount, userAccount);
        emit PartnerCross(partner);
    }

    function userLockNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, bytes memory userAccount, string memory partner) external payable {
        cross.userLockNFT{value: msg.value}(smgID, tokenPairID, tokenIDs, tokenValues, userAccount);
        emit PartnerCross(partner);
    }

    function userBurnNFT(bytes32 smgID, uint tokenPairID, uint[] memory tokenIDs, uint[] memory tokenValues, address tokenAccount, bytes memory userAccount, string memory partner) external payable {
        cross.userBurnNFT{value: msg.value}(smgID, tokenPairID, tokenIDs, tokenValues, tokenAccount, userAccount);
        emit PartnerCross(partner);
    }
}
