#!/bin/sh

# deployer address
BridgeDeployer='0xf53320936356d3f21a17aa42ae09b9d9e0a48053641bac69bbb1f7e20d3cb706'
ResourceAccountDeployer='0x1ea21d055d67185a0c5de10fcc95a72bace3d3e0e056058c1945997bc845af8f'
# BridgeDeployer is your account, you must have its private key
# ResourceAccountDeployer is derivatived by BridgeDeployer, you can refer to ResourceAccount::test_resource_account to get the exact address

# # Step 1: ------------------- deploy prepare modules, get bytecode of resource account -------------------
# # compile modules
# aptos move compile --package-dir $PWD/CoinBase/
# aptos move compile --package-dir $PWD/ResourceAccount/
# aptos move compile --package-dir $PWD/Oracle/
# aptos move compile --package-dir $PWD/WrappedCoin/
# aptos move compile --package-dir $PWD/Cross/

# # publish modules
# aptos move publish --package-dir $PWD/CoinBase/
# aptos move publish --package-dir $PWD/ResourceAccount/

# # create resource account & publish WrappedCoin
# aptos move compile --package-dir $PWD/WrappedCoin/ --save-metadata
# # get the first arg
# hexdump -ve '1/1 "%02x"' $PWD/WrappedCoin/build/WrappedCoinV1/package-metadata.bcs

# echo
# echo

# # get the second arg
# hexdump -ve '1/1 "%02x"' $PWD/WrappedCoin/build/WrappedCoinV1/bytecode_modules/WrappedCoinV1.mv

# Step 2: ------------------- Use bytecode of resource account to create resource account module -------------------

# This command is to publish WrappedCoin contract, using ResourceAccountDeployer address. Note: replace two args with the above two hex
aptos move run --function-id $BridgeDeployer::ResourceAccount::initialize_lp_account \
--args hex:0d57726170706564436f696e5631010000000000000000403643383634423231413830373333384145463841443636393234303137424430423936453544344130443130323333413437303230453432313845364137374595021f8b08000000000002ff458ec16e83301044ef7c05e2c2a585356030957a885af5037a680f510ef67a9da0046cd9405b55fdf71a35554ebba379339abd937896473a24931c297d4cf3772f9d23fd6487e98de5c94a3e0c76da1c5640017992ec35399a344d385038243b37dbf0e263fcc3fa7304bfd3e330c79b9de6d98587b28cf2b4a802ed58ca0dbebf4815ae2f5a4f4504b2bb342c4a0f7e0bfe59a35da934ffc557fea663c2d3bae1a26e1ba66b03a2eedacad4ac0380168853cf8d520c15564219c8d29fb85e6aed29846dfa2b05bb78a41da25da6f999dcc57ed13621874f46b2621a38d76dc70497805c130383d873d9554a22d5ba2620e02d7081ac6f78df770a45c3a511264f7e01280cd50f5d010000010d57726170706564436f696e5631681f8b08000000000002ff4dc93d0a80300c40e1bda7c8155c45047f4ee0a07369030a6d53d26490d2bbab9b6f7b7c91bc06840d0b293b9c9c234db2620e7423f7fdc13667f40b5d69efa01a782bc2ea047e34e4d326a108dfccb6e008b599661ec281c0655e00000000000300000000000000000000000000000000000000000000000000000000000000010e4170746f734672616d65776f726b00000000000000000000000000000000000000000000000000000000000000010b4170746f735374646c696200000000000000000000000000000000000000000000000000000000000000010a4d6f76655374646c696200 \
hex:a11ceb0b0500000005010002020206070826082e200a4e0500000001000100010d57726170706564436f696e56310b57726170706564436f696e0b64756d6d795f6669656c641ea21d055d67185a0c5de10fcc95a72bace3d3e0e056058c1945997bc845af8f000201020100

# Step 3: ------------------- deploy other modules -------------------
aptos move publish --package-dir $PWD/Oracle/
aptos move publish --package-dir $PWD/Cross/

# echo 'Finish!'





