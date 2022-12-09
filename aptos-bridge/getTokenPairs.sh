#!/bin/sh

curl --request GET \
  --url https://fullnode.devnet.aptoslabs.com/v1/accounts/0xf53320936356d3f21a17aa42ae09b9d9e0a48053641bac69bbb1f7e20d3cb706/events/10 \
  --header 'Content-Type: application/json' |jq
  

