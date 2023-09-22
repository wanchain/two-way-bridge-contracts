#!/bin/sh

# deployer address
BridgeDeployer='0x786870d087d01714842efcadc56d947ddf4e177ebc9b4fcd8ca546410d8f3d98'
ResourceAccountDeployer='0xd89c5175dd0f1644b3039a945dcd9bb933958b72f85bc7d70d2b777a355890c0'

aptos move run --function-id $BridgeDeployer::Cross::set_chain_id --args u64:1073741832

