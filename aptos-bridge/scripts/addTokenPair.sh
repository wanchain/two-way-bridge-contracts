#!/bin/sh

# deployer address
BridgeDeployer='0xdc8e034c5714c11a7d137973f7e9bf1ddb74d7d322656265f899eb3d9fb2d31c'
ResourceAccountDeployer='0xbde2425cebebb051c0de52d83c7610fa90d0dd39326f52f737fd1ea2a21f18d3'

aptos move run --function-id $BridgeDeployer::TokenManager::add_token_pair \
  --args u64:352 string:0x0000000000000000000000000000000000000000 string:WAN@aptos string:APT u8:18 u64:2153201998 u64:2153201998 string:0x0000000000000000000000000000000000000000 u64:2147484285 string:0xdc8e034c5714c11a7d137973f7e9bf1ddb74d7d322656265f899eb3d9fb2d31c::TokenManager::WrappedInfo\<0xdc8e034c5714c11a7d137973f7e9bf1ddb74d7d322656265f899eb3d9fb2d31c::CoinBase::WAN\>  

