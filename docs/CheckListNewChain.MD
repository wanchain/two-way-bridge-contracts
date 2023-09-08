# Deploy a new Chain, check list

# Introduction
Please follow this step to check.

# checklist

## 1.  the current chains's chainID
please contact with Miss Admin to get a BIP44 chainId, donot determine by yourself.

## 2. confirm the hash type.
Normally, we use sha256 as the hash function. 
But, some of L2 chains do not support sha256.
If you want to use keccak256, to set the hashType to 1, otherwise, do nothing.

## 3. confirm the curveId.
Normally, we use bn128 as the default curve.
But, some of L2 chains do not support bn128.
If you want to use secp256k1, to set the signCurveId to 0.

## 4.  make sure you have transfered the contract owner after you have finished the configuration.
1. groupApprove contract:  
2. tokenManager: use to configure tokenPair
3. oracle: use to sync GPK

## 5. to list the rpc,explorer for configuration.

## 6. list your contrct address here.

## 7. make sure send gas fee to agent leader and oracle operator.

## 8. verify the contract

# how to debug
chech the following    
1.  the used curveID configured in crossconfig 
2.  registed  curve ID and the verify contract address.
3.  leader gas Fee. and oracle gas Fee
4.  transfer owner.
5.  the peer chain oracle's GPK
6.  get the message Hash from logging and send to SC
