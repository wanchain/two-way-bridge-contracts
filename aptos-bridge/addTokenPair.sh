#!/bin/sh

# deployer address
BridgeDeployer='0xf53320936356d3f21a17aa42ae09b9d9e0a48053641bac69bbb1f7e20d3cb706'
ResourceAccountDeployer='0x1ea21d055d67185a0c5de10fcc95a72bace3d3e0e056058c1945997bc845af8f'

aptos move run --function-id $BridgeDeployer::TokenManager::add_token_pair \
  --args u64:350 string:0x1::aptos_coin::AptosCoin string:AptosCoin string:APT u8:8 u64:1073741832 u64:1073741832 string:0x1::aptos_coin::AptosCoin u64:2153201998 string:0x21b70e32973ffF93c302ed3c336C625eD1C87603

