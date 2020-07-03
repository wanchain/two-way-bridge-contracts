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
//  Code style according to: https://github.com/wanchain/wanchain-token/blob/master/style-guide.rst

pragma solidity ^0.4.24;

import "../../lib/Encrypt.sol";
import "../../lib/DataConvert.sol";
import "./ICurve.sol";
import "./CreateGpkTypes.sol";

library CreateGpkLib {

    function unifyPk(bytes pk)
        public
        pure
        returns(bytes)
    {
        if (pk.length == 65) {
            return pk;
        }
        bytes memory uPk = new bytes(65);
        if (pk.length == 64) {
            uPk[0] = 0x04;
            for (uint i = 0; i < 64; i++) {
                uPk[i + 1] = pk[i];
            }
        }
        return uPk;
    }

    /// @notice                           function for generate gpk and pkShare
    /// @param round                      round
    /// @param polyCommit                 poly commit
    /// @param curve                      curve contract address
    function updateGpk(CreateGpkTypes.Round storage round, bytes polyCommit, address curve)
        public
    {
        bytes memory gpk = round.gpk;
        uint x = DataConvert.bytes2uint(polyCommit, 1, 32);
        uint y = DataConvert.bytes2uint(polyCommit, 33, 32);
        if (gpk.length != 0) {
            uint gpkX = DataConvert.bytes2uint(gpk, 1, 32);
            uint gpkY = DataConvert.bytes2uint(gpk, 33, 32);
            bool success;
            (x, y, success) = ICurve(curve).add(x, y, gpkX, gpkY);
            require(success == true, "Gpk failed");
        } else {
            gpk = new bytes(65);
            gpk[0] = 0x04;
        }
        assembly { mstore(add(gpk, 33), x) }
        assembly { mstore(add(gpk, 65), y) }
        round.gpk = gpk;
    }

    /// @notice                           function for generate gpk and pkShare
    /// @param round                      round
    /// @param polyCommit                 poly commit
    /// @param curve                      curve contract address
    function updatePkShare(CreateGpkTypes.Group storage group, CreateGpkTypes.Round storage round, bytes polyCommit, address curve)
        public
    {
        uint x;
        uint y;
        bool success;
        for (uint i = 0; i < group.smNumber; i++) {
            address txAddress = group.indexMap[i];
            bytes memory pk = group.addressMap[txAddress];
            (x, y, success) = ICurve(curve).calPolyCommit(polyCommit, pk);
            require(success == true, "PolyCommit failed");

            bytes memory pkShare = round.srcMap[txAddress].pkShare;
            if (pkShare.length != 0) {
                uint pkX = DataConvert.bytes2uint(pkShare, 1, 32);
                uint pkY = DataConvert.bytes2uint(pkShare, 33, 32);
                (x, y, success) = ICurve(curve).add(x, y, pkX, pkY);
                require(success == true, "Add failed");
            } else {
                pkShare = new bytes(65);
                pkShare[0] = 0x04;
            }
            assembly { mstore(add(pkShare, 33), x) }
            assembly { mstore(add(pkShare, 65), y) }
            round.srcMap[txAddress].pkShare = pkShare;
            if (group.curveNumber == 1) {
                group.roundMap[group.round][group.chainMap[1]].srcMap[txAddress].pkShare = pkShare;
            }
        }
    }

    /// @notice                           function for verify sij to judge challenge
    /// @param d                          Dest
    /// @param destPk                     dest storeman pk
    /// @param polyCommit                 polyCommit of pki
    /// @param curve                      curve contract address
    function verifySij(CreateGpkTypes.Dest storage d, bytes destPk, bytes polyCommit, address curve)
        public
        view
        returns(bool)
    {
        // check sij
        uint x;
        uint y;
        uint pcX;
        uint pcY;
        bool success;
        (x, y, success) = ICurve(curve).mulG(d.sij);
        if (success) {
            (pcX, pcY, success) = ICurve(curve).calPolyCommit(polyCommit, destPk);
            if (success && (x == pcX) && (y == pcY)) {
                // check enc
                uint iv = DataConvert.bytes2uint(d.encSij, 65, 16);
                bytes memory cipher;
                (cipher, success) = Encrypt.enc(bytes32(d.ephemPrivateKey), bytes32(iv), d.sij, destPk);
                if (success) {
                    return DataConvert.cmpBytes(d.encSij, cipher);
                }
            }
        }
        return false;
    }
}