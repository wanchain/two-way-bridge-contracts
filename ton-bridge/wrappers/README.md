# content of the sub directory
## client: used for get random http endpoint
## code  : decode encode emit event
## contractAccess: used for read cross contract
## event: interface for get event
## sign: used hash data for mpc signature
## wallet: interface about wallet contract. (currently support version4)

# interface of the contract (same as the ABI of the contract)
## Bridge.ts : include all the read and write interface of Bridge contract
## GroupApprove.ts:   include all the interface of groupApprove

# example (file name end with *-ex)
## getTokenPair-ex.ts:  example of read contract
## addTokenPair-ex.ts:  example of write contract
## getEvent-ex.ts:      example of scan blockchain to get the event list.

# how to start?
## step 1: npm i wan-ton-bridge
## step 2: reference of the example directory.

# Attention
## This SDK only support contract v4 of wallet.
## If you need more version of wallet contract, you can reference TonWeb SDK.