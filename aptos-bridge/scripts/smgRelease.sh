#!/bin/sh

# deployer address
BridgeDeployer='0xdc8e034c5714c11a7d137973f7e9bf1ddb74d7d322656265f899eb3d9fb2d31c'
ResourceAccountDeployer='0xbde2425cebebb051c0de52d83c7610fa90d0dd39326f52f737fd1ea2a21f18d3'

aptos move run --function-id $BridgeDeployer::Cross::smg_release \
  --type-args 0x1::aptos_coin::AptosCoin \
  --args address:0xbde2425cebebb051c0de52d83c7610fa90d0dd39326f52f737fd1ea2a21f18d3 address:0xbde2425cebebb051c0de52d83c7610fa90d0dd39326f52f737fd1ea2a21f18d3 u64:350 u64:1000 u64:0 address:0xdc8e034c5714c11a7d137973f7e9bf1ddb74d7d322656265f899eb3d9fb2d31c string:0xdc8e034c5714c11a7d137973f7e9bf1ddb74d7d322656265f899eb3d9fb2d31c

