#!/bin/sh

# deployer address
BridgeDeployer='0x786870d087d01714842efcadc56d947ddf4e177ebc9b4fcd8ca546410d8f3d98'
ResourceAccountDeployer='0xd89c5175dd0f1644b3039a945dcd9bb933958b72f85bc7d70d2b777a355890c0'
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

# Step 2: ------------------- Use bytecode of resource account to create resource account module -------------------

echo "\033[35mPublish Resource Account Package...\033[0m"

# This command is to publish WrappedCoin contract, using ResourceAccountDeployer address. Note: replace two args with the above two hex
aptos move run --function-id $BridgeDeployer::ResourceAccount::initialize_lp_account \
--args hex:0d57726170706564436f696e5631010000000000000000404345444346434232374230333939323938413434324545303332303144393130434345374338443631463333353035443343373046363539303934303732433397021f8b08000000000002ff4590b14ec3301086f73c4594250b248e13c736124305e2011860a83ad8be4b1bb5892d3b0920c4bb638ba24e77a7fffbef7eddde297356473c64b39a307fcccb77af9c4378b2e3fcd694d9863e8c764e4a53918a9459b607743803ce66c470c8766eb1e1c547fb87f5e7087ee7c77189b5382d8b0b0f751dc7d3aa2b63a75a25f8fea274b8b6c67aac2250dce561d530fa64fc9326bb613dfc2fbef2b7393a3c6e091772908c682a34357460483901c179d313ec09e18a8200ca545fe43f31bd02f018428afe8ac1aedee0ce18bbcecb33ba8bfdc214a1249f20a4610d67006468faaed32d69a5921d0303526bd9b69209cde92098361ce24daa39e7aa654c4862e2a77e01bba935855d010000010d57726170706564436f696e5631681f8b08000000000002ff4dc93d0a80300c40e1bda7c8155c45047f4ee0a07369030a6d53d26490d2bbab9b6f7b7c91bc06840d0b293b9c9c234db2620e7423f7fdc13667f40b5d69efa01a782bc2ea047e34e4d326a108dfccb6e008b599661ec281c0655e00000000000300000000000000000000000000000000000000000000000000000000000000010e4170746f734672616d65776f726b00000000000000000000000000000000000000000000000000000000000000010b4170746f735374646c696200000000000000000000000000000000000000000000000000000000000000010a4d6f76655374646c696200 \
hex:a11ceb0b0600000005010002020206070826082e200a4e0500000001000100010d57726170706564436f696e56310b57726170706564436f696e0b64756d6d795f6669656c64d89c5175dd0f1644b3039a945dcd9bb933958b72f85bc7d70d2b777a355890c0000201020100 \
 --assume-yes

echo

# Step 3: ------------------- deploy other modules -------------------
echo "\033[35mPublish Oracle...\033[0m"
aptos move publish --package-dir $PWD/Oracle/  --assume-yes

echo "\033[35mPublish Cross...\033[0m"
aptos move publish --package-dir $PWD/Cross/  --assume-yes

echo "\033[35mFinish!\033[0m"

# echo 'Finish!'





