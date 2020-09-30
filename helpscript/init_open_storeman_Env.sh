#!/bin/bash

# Create the open-storeman project folders.
mkdir -p ~/osm/data/keystore

echo '*********** open-storeman init Env *********** Creat folders done!'

# Check mongo exist.
if command -v mongo; then 
  echo '*********** open-storeman init Env *********** Detect mongo OK!' 
else 
  echo '*********** open-storeman init Env *********** Detect mongo Failed! Try to install with apt-get...'
  if command -v apt-get; then 
    echo '*********** open-storeman init Env *********** Detect apt-get OK!' 

    output=`sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5  1>&2`
    echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list
    output=`sudo apt-get update 1>&2`
    output=`sudo apt-get install -y mongodb-org 1>&2`
    output=`sudo systemctl start mongod 1>&2`
    output=`sudo systemctl enable mongod 1>&2`
  else 
    echo '*********** open-storeman init Env *********** Detect apt-get Failed! Install failed!'
    exit 1; 
  fi
  echo '*********** open-storeman init Env *********** Detect mongo OK!' 
fi

# Check docker exist.
if command -v docker; then 
  echo '*********** open-storeman init Env *********** Detect docker OK!' 
else 
  echo '*********** open-storeman init Env *********** Detect docker Failed! Try to install with apt-get...'
  if command -v apt-get; then 
    echo '*********** open-storeman init Env *********** Detect apt-get OK!' 
    
    output=`sudo apt install -y docker.io 1>&2`
  else 
    echo '*********** open-storeman init Env *********** Detect apt-get Failed! Install failed!'
    exit 1; 
  fi
  echo '*********** open-storeman init Env *********** Detect docker OK!' 
fi

# Download docker image
output=`sudo docker pull wanchain/openstoremanagent:latest 1>&2`
echo '*********** open-storeman init Env *********** Download open-storeman docker image done!'

output=`sudo docker pull containrrr/watchtower 1>&2`
echo '*********** open-storeman init Env *********** Download containrrr/watchtower docker image done!'

echo '*********** open-storeman init Env *********** Init evn done!'