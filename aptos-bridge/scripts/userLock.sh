#!/bin/sh

# deployer address
BridgeDeployer='0x0fed7b4e9b93c0373998b80cebee85010af2dea9cd5ddc754a01fb89fec291e4'
ResourceAccountDeployer='0x94bdaffa0d0bfde11de612c640071677c5f68f7721b407f83c738d4c1c05ce7d'

aptos move run --function-id $BridgeDeployer::Cross::user_lock \
  --type-args 0x1::aptos_coin::AptosCoin \
  --args address:0x94bdaffa0d0bfde11de612c640071677c5f68f7721b407f83c738d4c1c05ce7d u64:350 u64:10000 string:0x4cf0a877e906dead748a41ae7da8c220e4247d9e

