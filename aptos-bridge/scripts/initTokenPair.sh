#!/bin/sh

# deployer address
BridgeDeployer='0x7364c51e72493809040586ed9a712206908775e2aea394da9d1fa7204e6d605b'
ResourceAccountDeployer='0x52a7a47f555d45654c7f3f49675f975931758ad57718f9be89711189c8a8b921'

aptos move run --function-id $BridgeDeployer::Cross::set_chain_id --args u64:2147484285 \
  --assume-yes

aptos move run --function-id $BridgeDeployer::TokenManager::add_token_pair \
  --args u64:350 string:0x1::aptos_coin::AptosCoin string:AptosCoin string:APT u8:8 u64:2147484285 u64:2147484285 string:0x1::aptos_coin::AptosCoin u64:2153201998 string:0x21b70e32973ffF93c302ed3c336C625eD1C87603 \
  --assume-yes

aptos move run --function-id $BridgeDeployer::TokenManager::create_wrapped_coin \
  --type-args 0x7364c51e72493809040586ed9a712206908775e2aea394da9d1fa7204e6d605b::CoinBase::WAN \
  --args string:WAN@aptos string:WAN \
  --assume-yes
  
aptos move run --function-id $BridgeDeployer::TokenManager::add_token_pair \
  --args u64:352 string:0x0000000000000000000000000000000000000000 string:WAN@aptos string:APT u8:18 u64:2153201998 u64:2153201998 string:0x0000000000000000000000000000000000000000 u64:2147484285 string:0x7364c51e72493809040586ed9a712206908775e2aea394da9d1fa7204e6d605b::TokenManager::WrappedInfo\<0x7364c51e72493809040586ed9a712206908775e2aea394da9d1fa7204e6d605b::CoinBase::WAN\> \
  --assume-yes  

