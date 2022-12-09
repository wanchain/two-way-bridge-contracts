#!/bin/sh

# deployer address
BridgeDeployer='0x0fed7b4e9b93c0373998b80cebee85010af2dea9cd5ddc754a01fb89fec291e4'
ResourceAccountDeployer='0x94bdaffa0d0bfde11de612c640071677c5f68f7721b407f83c738d4c1c05ce7d'
# BridgeDeployer is your account, you must have its private key
# ResourceAccountDeployer is derivatived by BridgeDeployer, you can refer to ResourceAccount::test_resource_account to get the exact address

# Step 1: ------------------- deploy prepare modules, get bytecode of resource account -------------------
# compile modules
# aptos move compile --package-dir $PWD/CoinBase/
# aptos move compile --package-dir $PWD/ResourceAccount/
# aptos move compile --package-dir $PWD/Oracle/
# aptos move compile --package-dir $PWD/WrappedCoin/
# aptos move compile --package-dir $PWD/Cross/

# publish modules
# aptos move publish --package-dir $PWD/CoinBase/
# aptos move publish --package-dir $PWD/ResourceAccount/

# create resource account & publish WrappedCoin
# aptos move compile --package-dir $PWD/WrappedCoin/ --save-metadata
# get the first arg
# hexdump -ve '1/1 "%02x"' $PWD/WrappedCoin/build/WrappedCoinV1/package-metadata.bcs

echo
echo

# get the second arg
# hexdump -ve '1/1 "%02x"' $PWD/WrappedCoin/build/WrappedCoinV1/bytecode_modules/WrappedCoinV1.mv

# Step 2: ------------------- Use bytecode of resource account to create resource account module -------------------

# This command is to publish WrappedCoin contract, using ResourceAccountDeployer address. Note: replace two args with the above two hex
# aptos move run --function-id 0x0fed7b4e9b93c0373998b80cebee85010af2dea9cd5ddc754a01fb89fec291e4::ResourceAccount::initialize_lp_account \
# --args hex:0d57726170706564436f696e5631010000000000000000404634384136384235383141413130383339373233363044374539363343333543463341444238424641353743304241304445463638433133463333433936423795021f8b08000000000002ff458ecd4ec3301084ef798aa8975c2059e7c74e913854201e80031caa1eecdd751bb58d2d3b2920c4bbe388a29e7647f3cd68b65ee351ef79978dfaccf9635ebc07ed3dd3931bc6375164170e7170e3e288124a28b26c4bec79241e71e0b8cb367e72f125a4f8870bc7047ee7fb614a777598261f1faa2ac9c36c4a74e74a2ff0fd499b787dd1052e13b0bacbe36c68084bf0cf3abb0b57f6bff8cadf744a04be2c78dfc8565063a16f94ac6d23140048e08ed79d3546a0c1ba371656f94f5aaf8902c7b84c7fe5e8e680bc4174f3383db33fb92f5e2614f0b96e0d696b3510184b2c04b11435ca164009a9147656f656a95a981694ed1b544d4f2d0a840e595191fd02aef385aa5d010000010d57726170706564436f696e5631681f8b08000000000002ff4dc93d0a80300c40e1bda7c8155c45047f4ee0a07369030a6d53d26490d2bbab9b6f7b7c91bc06840d0b293b9c9c234db2620e7423f7fdc13667f40b5d69efa01a782bc2ea047e34e4d326a108dfccb6e008b599661ec281c0655e00000000000300000000000000000000000000000000000000000000000000000000000000010e4170746f734672616d65776f726b00000000000000000000000000000000000000000000000000000000000000010b4170746f735374646c696200000000000000000000000000000000000000000000000000000000000000010a4d6f76655374646c696200 \
# hex:a11ceb0b0500000005010002020206070826082e200a4e0500000001000100010d57726170706564436f696e56310b57726170706564436f696e0b64756d6d795f6669656c6494bdaffa0d0bfde11de612c640071677c5f68f7721b407f83c738d4c1c05ce7d000201020100

# Step 3: ------------------- deploy other modules -------------------
aptos move publish --package-dir $PWD/Oracle/
aptos move publish --package-dir $PWD/Cross/

# echo 'Finish!'





