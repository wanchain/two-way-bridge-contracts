#!/bin/sh

# deployer address
BridgeDeployer='0xdc8e034c5714c11a7d137973f7e9bf1ddb74d7d322656265f899eb3d9fb2d31c'
ResourceAccountDeployer='0xbde2425cebebb051c0de52d83c7610fa90d0dd39326f52f737fd1ea2a21f18d3'

aptos move run --function-id $BridgeDeployer::Oracle::set_storeman_group_config \
  --args address:0xbde2425cebebb051c0de52d83c7610fa90d0dd39326f52f737fd1ea2a21f18d3 u64:350 u64:10000 string:0x4cf0a877e906dead748a41ae7da8c220e4247d9e

