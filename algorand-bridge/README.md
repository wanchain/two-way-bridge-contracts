# Algorand Bridge Contracts

This repository contains the smart contracts for the Algorand Bridge.

use venv to make a virtual environments and install dependencies
```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## use beaker to develop and test contracts

When using BoxMapping, it is necessary to specify the app_id and Key value of the box where the transaction is being sent, otherwise the transaction will fail.
