#!/bin/sh

# deployer address
BridgeDeployer = '0x0f97d720564154bcb9fab1392f6ff8d4ca9333f6f4ff66a5da8cce493953e645'
ResourceAccountDeployer = '0x6ee56eb2a8e83a89df13189a87e1b9ba1c45aaf150cfc9ebb7b0dcb90431b22b'
# BridgeDeployer is your account, you must have its private key
# ResourceAccountDeployer is derivatived by BridgeDeployer, you can refer to ResourceAccount::test_resource_account to get the exact address

# compile modules
aptos move compile --package-dir $PWD/CoinBase/
aptos move compile --package-dir $PWD/ResourceAccount/
aptos move compile --package-dir $PWD/Oracle/
aptos move compile --package-dir $PWD/TokenManager/
aptos move compile --package-dir $PWD/WrappedCoin/
aptos move compile --package-dir $PWD/Cross/

# publish modules
# aptos move publish --package-dir $PWD/CoinBase/
# aptos move publish --package-dir $PWD/ResourceAccount/
