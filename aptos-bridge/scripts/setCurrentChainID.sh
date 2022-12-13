#!/bin/sh

# deployer address
BridgeDeployer='0x0fed7b4e9b93c0373998b80cebee85010af2dea9cd5ddc754a01fb89fec291e4'
ResourceAccountDeployer='0x94bdaffa0d0bfde11de612c640071677c5f68f7721b407f83c738d4c1c05ce7d'

aptos move run --function-id $BridgeDeployer::Cross::set_chain_id --args u64:1073741832

