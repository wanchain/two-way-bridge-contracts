#!/bin/sh

# deployer address
BridgeDeployer='0xf53320936356d3f21a17aa42ae09b9d9e0a48053641bac69bbb1f7e20d3cb706'
ResourceAccountDeployer='0x1ea21d055d67185a0c5de10fcc95a72bace3d3e0e056058c1945997bc845af8f'

aptos move run --function-id $BridgeDeployer::TokenManagerV2::add_token_pair \
  --args 350u64 