#!/bin/sh

# deployer address
BridgeDeployer='0xdc8e034c5714c11a7d137973f7e9bf1ddb74d7d322656265f899eb3d9fb2d31c'
ResourceAccountDeployer='0xbde2425cebebb051c0de52d83c7610fa90d0dd39326f52f737fd1ea2a21f18d3'
# BridgeDeployer is your account, you must have its private key
# ResourceAccountDeployer is derivatived by BridgeDeployer, you can refer to ResourceAccount::test_resource_account to get the exact address

# Step 1: ------------------- deploy prepare modules, get bytecode of resource account -------------------
# compile modules
# echo "\033[35mCompile packages...\033[0m"
# aptos move compile --package-dir $PWD/CoinBase/
# aptos move compile --package-dir $PWD/ResourceAccount/
# aptos move compile --package-dir $PWD/Oracle/
# aptos move compile --package-dir $PWD/WrappedCoin/
# aptos move compile --package-dir $PWD/Cross/

# echo "\033[35mPublish CoinBase...\033[0m"
# # publish modules
# aptos move publish --package-dir $PWD/CoinBase/ --assume-yes

# echo "\033[35mPublish ResourceAccount...\033[0m"
# aptos move publish --package-dir $PWD/ResourceAccount/ --assume-yes

# echo "\033[35mCompile WrappedCoin...\033[0m"
# # create resource account & publish WrappedCoin
# aptos move compile --package-dir $PWD/WrappedCoin/ --save-metadata

# echo "\033[35mPrint WrappedCoinV1 bytecode...\033[0m"
# # get the first arg
# hexdump -ve '1/1 "%02x"' $PWD/WrappedCoin/build/WrappedCoinV1/package-metadata.bcs

# echo
# echo

# # get the second arg
# hexdump -ve '1/1 "%02x"' $PWD/WrappedCoin/build/WrappedCoinV1/bytecode_modules/WrappedCoinV1.mv

# echo
# exit

# Step 2: ------------------- Use bytecode of resource account to create resource account module -------------------

echo "\033[35mPublish Resource Account Package...\033[0m"

# This command is to publish WrappedCoin contract, using ResourceAccountDeployer address. Note: replace two args with the above two hex
aptos move run --function-id $BridgeDeployer::ResourceAccount::initialize_lp_account \
--args hex:0d57726170706564436f696e5631010000000000000000403445344142413434373837463646344635363842394236343431363030374332333031454137334437384541413537363445344242464139324146444138463192021f8b08000000000002ff458ec14ec3301044eff98aa8975c20b19da64d903854203e80031caa1ed6bbeb366a135b761240887fc716453ded8ee6cd68f60ef00c473e64230c9c3fe6c5bb07e7989e6c3fbec9225bd887de8ec991a5284591657b62c723f1883d8743b673930d2f3ec63fac3f47f03b3ff653bcabd334b9f05055519e665da21d2a48f0fd0574b8be683d971158dde561d6d4fb14fcb306bb7065fe8baffc4dc784e725e16aad1ac34676d011371d9014283429c9ade85abd6e0001958655fe13d70391e710d2f4570e76f6c83b443b8fd333bb8bfde234a1109f9a3815236bd65a3412452c57d4d6b8dd4861a0132488eaae561bd328b3adb786248302258d6ca92eb25f1ea49fe85d010000010d57726170706564436f696e5631681f8b08000000000002ff4dc93d0a80300c40e1bda7c8155c45047f4ee0a07369030a6d53d26490d2bbab9b6f7b7c91bc06840d0b293b9c9c234db2620e7423f7fdc13667f40b5d69efa01a782bc2ea047e34e4d326a108dfccb6e008b599661ec281c0655e00000000000300000000000000000000000000000000000000000000000000000000000000010e4170746f734672616d65776f726b00000000000000000000000000000000000000000000000000000000000000010b4170746f735374646c696200000000000000000000000000000000000000000000000000000000000000010a4d6f76655374646c696200 \
hex:a11ceb0b0600000005010002020206070826082e200a4e0500000001000100010d57726170706564436f696e56310b57726170706564436f696e0b64756d6d795f6669656c64bde2425cebebb051c0de52d83c7610fa90d0dd39326f52f737fd1ea2a21f18d3000201020100 \
 --assume-yes

echo

# Step 3: ------------------- deploy other modules -------------------
echo "\033[35mPublish Oracle...\033[0m"
aptos move publish --package-dir $PWD/Oracle/  --assume-yes

echo "\033[35mPublish Cross...\033[0m"
aptos move publish --package-dir $PWD/Cross/  --assume-yes

echo "\033[35mFinish!\033[0m"

# echo 'Finish!'





