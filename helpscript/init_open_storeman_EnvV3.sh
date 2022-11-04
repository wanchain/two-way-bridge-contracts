#!/bin/bash

# Create the open-storeman project folders.
# mkdir -p ~/osm/data/keystore

echo '*********** open-storeman init Env *********** Creat folders done!'

# Check docker exist.
if command -v docker; then 
  echo '*********** open-storeman init Env *********** Detect docker OK!' 
else 
  echo '*********** open-storeman init Env *********** Detect docker Failed! Try to install with apt-get...'
  if command -v apt-get; then 
    echo '*********** open-storeman init Env *********** Detect apt-get OK!' 
    output=`sudo apt-get update 1>&2`
    output=`sudo apt install -y docker.io 1>&2`
  else 
    echo '*********** open-storeman init Env *********** Detect apt-get Failed! Install failed!'
    exit 1; 
  fi
  echo '*********** open-storeman init Env *********** Detect docker OK!' 
fi

# Download docker image
output=`sudo docker pull mongo:5.0 1>&2`
echo '*********** open-storeman init Env *********** Download mongo docker image done!'

output=`sudo docker pull wanchain/openstoremanagent_mainnet:latest 1>&2`
echo '*********** open-storeman init Env *********** Download open-storeman docker image done!'

output=`sudo docker pull containrrr/watchtower 1>&2`
echo '*********** open-storeman init Env *********** Download containrrr/watchtower docker image done!'

echo '*********** open-storeman init Env *********** Init evn done!'