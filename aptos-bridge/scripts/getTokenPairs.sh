#!/bin/sh

# curl --request GET \
#   --url https://fullnode.testnet.aptoslabs.com/v1/accounts/0x0fed7b4e9b93c0373998b80cebee85010af2dea9cd5ddc754a01fb89fec291e4/events/10 \
#   --header 'Content-Type: application/json' |jq
  
curl --request GET \
  --url http://192.168.1.183:8080/v1/accounts/0x0fed7b4e9b93c0373998b80cebee85010af2dea9cd5ddc754a01fb89fec291e4/events/10 \
  --header 'Content-Type: application/json' |jq
  

