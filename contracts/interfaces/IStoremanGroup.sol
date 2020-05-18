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

interface IStoremanGroup {
    function getSelectedSmNumber(bytes32 groupId) external returns(uint number);
    function getSmInfo(bytes32 groupId, address wkAddress) public view  returns(address sender,bytes PK,
        bool quited, bool  isWorking,uint  delegateFee,uint  deposit,uint  depositWeight,
        uint incentive, uint delegatorCount
        );
    function setGpk(bytes32 groupId, bytes gpk) external;
    function setInvalidSm(bytes32 groupId, uint[] slashType, address[] txAddress) external returns(bool isContinue);

    // comment because it is same as getSelectedSmNumber
    //function getTotalNumberByGrpId(bytes32 grpId) external returns (uint);
    function getThresholdByGrpId(bytes32 grpId) external returns (uint);
    function getWorkingGrps() external returns (bytes32[] grpIds);
    // comment because index 0 is always the index of leader
    //function getLeaderIndexByGrpId(bytes32 grpId) external returns (uint);
    function getSelectedSmInfo(bytes32 groupId, uint index) external returns( address txAddress, bytes pk, bytes enodeId);

}