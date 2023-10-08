#!/bin/sh

# deployer address
BridgeDeployer='0xdc8e034c5714c11a7d137973f7e9bf1ddb74d7d322656265f899eb3d9fb2d31c'
ResourceAccountDeployer='0xbde2425cebebb051c0de52d83c7610fa90d0dd39326f52f737fd1ea2a21f18d3'

aptos move run --function-id $BridgeDeployer::Cross::set_chain_id --args u64:2147484285

aptos move run --function-id $BridgeDeployer::TokenManager::add_token_pair \
  --args u64:350 string:0x1::aptos_coin::AptosCoin string:AptosCoin string:APT u8:8 u64:2147484285 u64:2147484285 string:0x1::aptos_coin::AptosCoin u64:2153201998 string:0x21b70e32973ffF93c302ed3c336C625eD1C87603

