#!/bin/sh

# deployer address
BridgeDeployer='0x0fed7b4e9b93c0373998b80cebee85010af2dea9cd5ddc754a01fb89fec291e4'
ResourceAccountDeployer='0x94bdaffa0d0bfde11de612c640071677c5f68f7721b407f83c738d4c1c05ce7d'
# BridgeDeployer is your account, you must have its private key
# ResourceAccountDeployer is derivatived by BridgeDeployer, you can refer to ResourceAccount::test_resource_account to get the exact address

# Step 1: ------------------- deploy prepare modules, get bytecode of resource account -------------------
# compile modules
echo "\033[35mCompile packages...\033[0m"
aptos move compile --package-dir $PWD/CoinBase/
aptos move compile --package-dir $PWD/ResourceAccount/
aptos move compile --package-dir $PWD/Oracle/
aptos move compile --package-dir $PWD/WrappedCoin/
aptos move compile --package-dir $PWD/Cross/

echo "\033[35mPublish CoinBase...\033[0m"
# publish modules
aptos move publish --package-dir $PWD/CoinBase/ --assume-yes

echo "\033[35mPublish ResourceAccount...\033[0m"
aptos move publish --package-dir $PWD/ResourceAccount/ --assume-yes

echo "\033[35mCompile WrappedCoin...\033[0m"
# create resource account & publish WrappedCoin
aptos move compile --package-dir $PWD/WrappedCoin/ --save-metadata

echo "\033[35mPrint WrappedCoinV1 bytecode...\033[0m"
# get the first arg
hexdump -ve '1/1 "%02x"' $PWD/WrappedCoin/build/WrappedCoinV1/package-metadata.bcs

echo
echo

# get the second arg
hexdump -ve '1/1 "%02x"' $PWD/WrappedCoin/build/WrappedCoinV1/bytecode_modules/WrappedCoinV1.mv

echo

# Step 2: ------------------- Use bytecode of resource account to create resource account module -------------------

echo "\033[35mPublish Resource Account Package...\033[0m"

# This command is to publish WrappedCoin contract, using ResourceAccountDeployer address. Note: replace two args with the above two hex
aptos move run --function-id $BridgeDeployer::ResourceAccount::initialize_lp_account \
--args hex:0d57726170706564436f696e5631010000000000000000403542413237394441314645343230353941433945423530463246454136313739454137383032333333364235463643384333463930323845304137303343363594021f8b08000000000002ff458ec14ec3301044eff98aa8975c20b1d3d44e903854203e80031caa1ed6bbeb366a1b5b761240887fc781224ebba379339a9d073cc181f7d90017ceeff3e23580f74c0fae1f5e6491cd1c62ef86c591a5284591653b62cf03f1803dc77db6f5a38b4f21c5df5c3825f0333ff463baabe338fa785755491e2753a2bb54b0c0b76730f1faa20b5c26607593c7c9501f96e0af75713357f6aff8caffeb94083cffe0baedb400a8415952163499ae21451b2d0474a26e8596a246bdcabfd27a200a1ce332fd99a39b02f216d14dc3f8c8feec3e78995088f7ae3104d68220612cb194c44ad6a81a91ea94d6b8b1aab55ad7d23442db768d7add528312c5065953917d0312654ba95d010000010d57726170706564436f696e5631681f8b08000000000002ff4dc93d0a80300c40e1bda7c8155c45047f4ee0a07369030a6d53d26490d2bbab9b6f7b7c91bc06840d0b293b9c9c234db2620e7423f7fdc13667f40b5d69efa01a782bc2ea047e34e4d326a108dfccb6e008b599661ec281c0655e00000000000300000000000000000000000000000000000000000000000000000000000000010e4170746f734672616d65776f726b00000000000000000000000000000000000000000000000000000000000000010b4170746f735374646c696200000000000000000000000000000000000000000000000000000000000000010a4d6f76655374646c696200 \
hex:a11ceb0b0500000005010002020206070826082e200a4e0500000001000100010d57726170706564436f696e56310b57726170706564436f696e0b64756d6d795f6669656c6494bdaffa0d0bfde11de612c640071677c5f68f7721b407f83c738d4c1c05ce7d000201020100 \
 --assume-yes

echo

# Step 3: ------------------- deploy other modules -------------------
echo "\033[35mPublish Oracle...\033[0m"
aptos move publish --package-dir $PWD/Oracle/  --assume-yes

echo "\033[35mPublish Cross...\033[0m"
aptos move publish --package-dir $PWD/Cross/  --assume-yes

echo "\033[35mFinish!\033[0m"

# echo 'Finish!'





