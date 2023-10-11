#!/bin/sh

# deployer address
BridgeDeployer='0x7364c51e72493809040586ed9a712206908775e2aea394da9d1fa7204e6d605b'
ResourceAccountDeployer='0x52a7a47f555d45654c7f3f49675f975931758ad57718f9be89711189c8a8b921'
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
--args hex:0d57726170706564436f696e5631010000000000000000404244353434423233363542324545324230343045394139383636394137353830303935383645463238443645324635443442393744363630363846394432313796021f8b08000000000002ff4590c14ec3301044eff98a28975c2089d36c6d2371a8407c000738543daced751bb5892d3b0920c4bfe388a29e7647f36635dabd477dc6231db21107ca1ff3f23da0f7649e5c3fbeb1325b28c4de8dabc3aaa66aca2cdb1bf2341a1a754ff190edfce4e24b48f10f17ce09fcce8ffd9466719a261f1fea3ac9d3ac2aed861a57f8fe822a5e57ed02550928eef2382bd38735f8670d6ea1dafe1fbef2379d128196156fbb162c5926511a02898635ba51a665241a295407a851b70a8bfc27b5476302c5b8567fa5e8e6a069a7b59bc7e999fcc57dd15aa16c3ea1458e1db700603ad842a7b9ddd84e6e3958c9416e180781063867c24a454272c698905aa050b24dbffb0591e73f6e5d010000010d57726170706564436f696e5631681f8b08000000000002ff4dc93d0a80300c40e1bda7c8155c45047f4ee0a07369030a6d53d26490d2bbab9b6f7b7c91bc06840d0b293b9c9c234db2620e7423f7fdc13667f40b5d69efa01a782bc2ea047e34e4d326a108dfccb6e008b599661ec281c0655e00000000000300000000000000000000000000000000000000000000000000000000000000010e4170746f734672616d65776f726b00000000000000000000000000000000000000000000000000000000000000010b4170746f735374646c696200000000000000000000000000000000000000000000000000000000000000010a4d6f76655374646c696200 \
hex:a11ceb0b0600000005010002020206070826082e200a4e0500000001000100010d57726170706564436f696e56310b57726170706564436f696e0b64756d6d795f6669656c6452a7a47f555d45654c7f3f49675f975931758ad57718f9be89711189c8a8b921000201020100 \
 --assume-yes

echo

# Step 3: ------------------- deploy other modules -------------------
echo "\033[35mPublish Oracle...\033[0m"
aptos move publish --package-dir $PWD/Oracle/  --assume-yes

echo "\033[35mPublish Cross...\033[0m"
aptos move publish --package-dir $PWD/Cross/  --assume-yes

echo "\033[35mFinish!\033[0m"

# echo 'Finish!'





