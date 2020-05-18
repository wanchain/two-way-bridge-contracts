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

import "../components/BasicStorage.sol";
import "../interfaces/ITokenManager.sol";
import "../interfaces/IHTLC.sol";




contract StoremanGroupStorage is BasicStorage {

  /// token manager instance address
  ITokenManager public tokenManager;
  /// HTLC instance address
  IHTLC public htlc;

  mapping(bytes32 => StoremanGroup) public groups;
  mapping(bytes => mapping(bytes => bytes32)) internal storemanGroupMap;

  uint backupCount = 3;
  uint minStake = 10000;
  address[] public badAddrs;
  uint[] public badTypes;
  enum GroupStatus {initial,failed,selected,ready,retired,dismissed}
  struct Delegator {
      address sender; // the delegator wallet address
      address staker;
      bool  quited;
      //bool  claimed;
      uint  deposit;
      uint  incentive;
      mapping(uint=>uint) value;
  }
  struct Candidate {
      address sender;
      bytes enodeID;
      bytes PK;
      address  pkAddress; // 合约计算一下.
      bool  quited;
      //bool  claimed;// 不需要??? 提取后deposit归零.
      bool  selected;
      bool  isWorking;
      uint  delegateFee;
      uint  deposit;         // 自有
      uint  depositWeight; //total 自由+代理
      uint  incentive;       // without delegation.. set to 0 after incentive.
      uint  delegatorCount;
      mapping(uint=>address) addrMap;
      mapping(uint=>uint) value;  // 需要遍历.
      mapping(address=>Delegator) delegators;
  }

  struct StoremanGroup {
      bytes32    groupId;
      uint    txFeeRatio;               /// the fee ratio required by storeman group
      uint memberCountDesign;
      uint threshold;
      GroupStatus    status;
      uint    deposit;                  /// the storeman group deposit in wan coins, change when selecting
      uint    depositWeight;            /// caculate this value when selecting
      uint    unregisterApplyTime;      /// the time point for storeman group applied unregistration
      uint memberCount;
      uint whiteCount;
      bytes  chain;
      mapping(address=>Candidate) candidates; // bianli map 不好做.
      mapping(uint=>address) addrMap;
      mapping(uint=>address) selectedNode;
      mapping(uint=>address) workingNode;
      mapping(uint=>address) whiteMap;
      mapping(address=>address) whiteWk;   // the white list specified when start group.
  }
}