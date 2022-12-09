#!/bin/sh

# deployer address
BridgeDeployer='0x0fed7b4e9b93c0373998b80cebee85010af2dea9cd5ddc754a01fb89fec291e4'
ResourceAccountDeployer='0x94bdaffa0d0bfde11de612c640071677c5f68f7721b407f83c738d4c1c05ce7d'
# BridgeDeployer is your account, you must have its private key
# ResourceAccountDeployer is derivatived by BridgeDeployer, you can refer to ResourceAccount::test_resource_account to get the exact address

# Step 1: ------------------- deploy prepare modules, get bytecode of resource account -------------------
# compile modules
aptos move compile --package-dir $PWD/CoinBase/
aptos move compile --package-dir $PWD/ResourceAccount/
aptos move compile --package-dir $PWD/Oracle/
aptos move compile --package-dir $PWD/WrappedCoin/
aptos move compile --package-dir $PWD/Cross/

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
# --args hex:0d57726170706564436f696e56310100000000000000004041383538453837343436463843303934323544344336463444444441313934313735304544333744303333463035463231453442453942433338354343443941f1011f8b08000000000002ff3d8db14ec3301086773f45374f2471d3b409124305e20118608832dcd97f5aab8d6dd94980b72781d2ed3eddf7ddb581f4854ee884a3019ba78dfc881402ccb3b7ee5d49312326ebddba5159911552b40601cec0698b941dc3e8d36b5ce24f1f2f9d38d97175cfe318d2639e2f789e38d37ec869351faec4e9366a1f912d821411f31a0d649d14696263e3ca7fdae067e4fdff875b7b6729444bc644a484d48937243f458da3d67e72e30bc2d57fe3f75af1b507aa3d784b35ea92eac6f4aa547543f5018a1b26a5771551afaa42f7ba01f3810ba3b92976a5e2ed96a5f8019b4bb93c2f010000010d57726170706564436f696e5631681f8b08000000000002ff4dc93d0a80300c40e1bda7c8155c45047f4ee0a07369030a6d53d26490d2bbab9b6f7b7c91bc06840d0b293b9c9c234db2620e7423f7fdc13667f40b5d69efa01a782bc2ea047e34e4d326a108dfccb6e008b599661ec281c0655e00000000000300000000000000000000000000000000000000000000000000000000000000010e4170746f734672616d65776f726b00000000000000000000000000000000000000000000000000000000000000010b4170746f735374646c696200000000000000000000000000000000000000000000000000000000000000010a4d6f76655374646c696200 \
# hex:a11ceb0b0500000005010002020206070826082e200a4e0500000001000100010d57726170706564436f696e56310b57726170706564436f696e0b64756d6d795f6669656c646ee56eb2a8e83a89df13189a87e1b9ba1c45aaf150cfc9ebb7b0dcb90431b22b000201020100

# Step 3: ------------------- deploy other modules -------------------
# aptos move publish --package-dir $PWD/Oracle/
# aptos move publish --package-dir $PWD/CoinBase/
# aptos move publish --package-dir $PWD/Cross/

echo 'Finish!'





