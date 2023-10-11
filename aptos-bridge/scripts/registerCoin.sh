#!/bin/bash

# deployer address
BridgeDeployer='0x7364c51e72493809040586ed9a712206908775e2aea394da9d1fa7204e6d605b'
ResourceAccountDeployer='0x52a7a47f555d45654c7f3f49675f975931758ad57718f9be89711189c8a8b921'

aptos move run --function-id $BridgeDeployer::TokenManager::register_coin \
  --type-args 0x52a7a47f555d45654c7f3f49675f975931758ad57718f9be89711189c8a8b921::WrappedCoinV1::WrappedCoin\<0x7364c51e72493809040586ed9a712206908775e2aea394da9d1fa7204e6d605b::CoinBase::WAN\> 
  