# Algorand Contracts

This repository contains the smart contracts for the Algorand Bridge/GroupApprove.

use venv to make a virtual environments and install dependencies
```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=.
```

## use beaker to develop and test contracts

When using BoxMapping, it is necessary to specify the app_id and Key value of the box where the transaction is being sent, otherwise the transaction will fail.

## Contracts Introduction
Thers are 2 contracts in the project.
### The Bridge contract
Bridge is the main contract. there are 3 module  
1. cross bridge   
This module handle userlock, smgRelease, fee, admin configure etc.

2. oracle
This module handle the storeman configure sync.

3. tokenManager
This module handle tokenpairs

### The groupApprove contract
This contract is the owner of Bridge.
GroupApprove manage the bridge contract owner privilege functions, for example:
add/remove/update tokenpair
halt/unhalt
add/remove admin address
update bridge contract.

### The contract update.
1. Bridge contract update.
There is an address named updateOwner. 
Only this address can sign the transaction to update bridge.

2. GroupApprove contract update
The groupApprove contract can not update
If the contract change, we need deploy a new groupApprove contract
Then transfer the owner of Bridge to the new groupApprove.

### cross step
1. user invoke the interface 'userLock' and lock the coin/token in this contract.
2. storeman invoke  the interface 'smgRelease' to transfer the coin/token from this contract to user address.

## how to setup unit test environment
1. install algokit
```
pipx install algokit
```
2. start algokit
```
algokit localnet start
```
3. run testcase
```
pytest test
```
Note: To change 'SchedualDelay' before UT.