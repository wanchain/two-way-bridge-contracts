#!/bin/bash

# using mainnet config as default
CONFIG_FILE="remix.config.vechain.mainnet.json"

echo $1

# check if has --testnet
if [[ "$1" == "--testnet" ]]; then
    CONFIG_FILE="remix.config.vechain.testnet.json"
fi
yarn rpc-proxy -c $CONFIG_FILE