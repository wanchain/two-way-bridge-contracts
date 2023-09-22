#!/bin/sh

# deployer address
BridgeDeployer='0x786870d087d01714842efcadc56d947ddf4e177ebc9b4fcd8ca546410d8f3d98'
ResourceAccountDeployer='0xd89c5175dd0f1644b3039a945dcd9bb933958b72f85bc7d70d2b777a355890c0'

aptos move run --function-id $BridgeDeployer::Cross::set_chain_id \
  --args u64:0x8000027d

aptos move run --function-id $BridgeDeployer::TokenManager::add_token_pair \
  --args u64:350 string:0x1::aptos_coin::AptosCoin string:AptosCoin string:APT u8:8 u64:0x8000027d u64:0x8000027d string:0x1::aptos_coin::AptosCoin u64:2153201998 string:0x21b70e32973ffF93c302ed3c336C625eD1C87603

