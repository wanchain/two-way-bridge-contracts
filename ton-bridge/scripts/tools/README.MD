# Ton tools for configure and admin

## 1. how to generate Mnemonic
run the following command:  node createAccount.js
``` bash
➜  tools git:(dev/ton-v0.1) ✗ node createAccount.js 
mnemonic: dash fragile yellow man hire plastic later bike satisfy prison document cricket man lyrics couple rocket food empower cute parrot mind alone laundry obvious
Please backup it
address: EQBQ6NcSgJWA47DfaYixUH4akYqUuWnIN27dUHPMReNatFGd
➜  tools git:(dev/ton-v0.1) ✗ 
```

## 2. how to generate account from Mnemonic
export your Mnemonic to environment variable "MNEMONIC" and run command "node createAccount.js" again.  
``` bash
➜  tools git:(dev/ton-v0.1) ✗ export MNEMONIC='dash fragile yellow man hire plastic later bike satisfy prison document cricket man lyrics couple rocket food empower cute parrot mind alone laundry obvious' 
➜  tools git:(dev/ton-v0.1) ✗ node createAccount.js
address: EQBQ6NcSgJWA47DfaYixUH4akYqUuWnIN27dUHPMReNatFGd
➜  tools git:(dev/ton-v0.1) ✗ 
```

## 3. how to deploy bridge and groupApprove
export your Mnemonic to environment variable "MNEMONIC"

## 3. how to add tokenPair(for developer)

## 4. how to transfer bridge owner to groupApprove

## 5. how to configure cross Fee.

## 6. how to proposol
