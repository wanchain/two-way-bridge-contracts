#!/bin/sh

# deployer address
BridgeDeployer='0x0f97d720564154bcb9fab1392f6ff8d4ca9333f6f4ff66a5da8cce493953e645'
ResourceAccountDeployer='0x6ee56eb2a8e83a89df13189a87e1b9ba1c45aaf150cfc9ebb7b0dcb90431b22b'
# BridgeDeployer is your account, you must have its private key
# ResourceAccountDeployer is derivatived by BridgeDeployer, you can refer to ResourceAccount::test_resource_account to get the exact address

# compile modules
aptos move compile --package-dir $PWD/CoinBase/
aptos move compile --package-dir $PWD/ResourceAccount/
aptos move compile --package-dir $PWD/Oracle/
aptos move compile --package-dir $PWD/WrappedCoin/
# aptos move compile --package-dir $PWD/TokenManager/
aptos move compile --package-dir $PWD/Cross/

# publish modules
# aptos move publish --package-dir $PWD/CoinBase/
# aptos move publish --package-dir $PWD/ResourceAccount/

# create resource account & publish WrappedCoin
# aptos move compile --package-dir $PWD/WrappedCoin/ --save-metadata
# get the first arg
# hexdump -ve '1/1 "%02x"' $PWD/WrappedCoin/build/WrappedCoin/package-metadata.bcs

# echo
# echo

# get the second arg
# hexdump -ve '1/1 "%02x"' $PWD/WrappedCoin/build/WrappedCoin/bytecode_modules/WrappedCoin.mv

# This command is to publish WrappedCoin contract, using ResourceAccountDeployer address. Note: replace two args with the above two hex
# aptos move run --function-id 0x0f97d720564154bcb9fab1392f6ff8d4ca9333f6f4ff66a5da8cce493953e645::ResourceAccount::initialize_lp_account \
# --args hex:0b57726170706564436f696e0100000000000000004042314238453831353633453331344546393630433238373641353532334146353935463134454534384239323641303735323635413943453841454539424239ee011f8b08000000000002ff3d8db172833010447b7d853baa8004c686cca4f024930f489382a1b893169bb191341290e4ef831227ddedcd7bbb9d277da5337a6169c2ee6997bd07f21ee6d98d36132b421c9d4d7f95cb5c66a233f0b006568f88f9c9cf2ebe864dfd70e1da8bf33827f632cf3e3e16c5162f0be7da4d0525f2e1461cefa77601f9066422604dd24469312e6cc690f22f36b915c5f0b77077ff73264447c604c488d88b3744b7048d93d66eb1f30bfccd7de1a74d7e1e80fa002ea9415351d39a4155aa69a9394271cba4f4be261a542df5a05b301f591acdaddc578acb9233f10d290539b52d010000010b57726170706564436f696e651f8b08000000000002ff4dc9410a80201040d1bda798734804512788a0b5e840813a83ce2c44bc7bb5ebef3e2f51d088b063252d1e17ef49b36cc8911a166bcfe29831ac7467e806deaa14f5023f98f8725928c13747639ca10f33cc03c5d0c8f35c00000000000300000000000000000000000000000000000000000000000000000000000000010e4170746f734672616d65776f726b00000000000000000000000000000000000000000000000000000000000000010b4170746f735374646c696200000000000000000000000000000000000000000000000000000000000000010a4d6f76655374646c696200 \
# hex:a11ceb0b05000000050100020202060708180820200a400500000000000100010b57726170706564436f696e0b64756d6d795f6669656c646ee56eb2a8e83a89df13189a87e1b9ba1c45aaf150cfc9ebb7b0dcb90431b22b000201010100



