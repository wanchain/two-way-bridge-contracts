#!/bin/bash

# set -x
echo ''
echo ''
echo '=========================================='
echo '|  Welcome to testnet Work Deploy   |'
echo ''

if [ -d $HOME/osm ]; then
    echo "$HOME/osm exist, please rename it and try again"
    exit 1
fi

echo -e "\033[41;30m !!!!!! WARNING Please Remember Your Password !!!!!!!! \033[0m"
echo -e "\033[41;30m !!!!!!Otherwise You will lose all your assets!!!!!!!! \033[0m"
echo 'Enter your password of Work account:'
read -s PASSWD
echo 'Confirm your password of Work account:'
read -s PASSWD2
echo ''


DOCKERIMG=wanchain/openstoremanagent:latest

if [ ${PASSWD} != ${PASSWD2} ]
then
    echo 'Passwords mismatched'
    exit
fi


if [ !  `which docker` ]; then
    sudo wget -qO- https://get.docker.com/ | sh
    sudo usermod -aG docker ${USER}
    if [ $? -ne 0 ]; then
        echo "sudo usermod -aG docker ${USER} failed"
        exit 1
    fi

    #sudo service docker start
    if [ $? -ne 0 ]; then
        echo "service docker start failed"
        exit 1
    fi
fi




sudo docker pull ${DOCKERIMG}
if [ $? -ne 0 ]; then
    echo "docker pull failed"
    exit 1
fi

mpcipcDir=$HOME/osm/data
keystore=$HOME/osm/keystore


getAddr=$(sudo docker run -v $mpcipcDir:/osm/schnorrmpc/data -v $keystore:/osm/keystore  --entrypoint="/osm/schnorrmpc/bin/gwan" ${DOCKERIMG} --nodiscover --datadir=/osm/schnorrmpc/data --keystore=/osm/keystore console --exec "personal.newAccount('${PASSWD}')"  )

ADDR=$getAddr

echo $ADDR

getPK=$(sudo docker run -v $mpcipcDir:/osm/schnorrmpc/data -v $keystore:/osm/keystore  --entrypoint="/osm/schnorrmpc/bin/gwan" ${DOCKERIMG} --nodiscover --datadir=/osm/schnorrmpc/data --keystore=/osm/keystore console --exec "personal.showPublicKey(${ADDR},'${PASSWD}')[0].slice(4)")
PK=$getPK


KEYSTOREFILE=$(sudo ls $keystore)

KEYSTORE=$(sudo cat $keystore/${KEYSTOREFILE})

NODEKEY=$(sudo cat $mpcipcDir/gwan/nodekey)
EnodeId=$(sudo docker run -v $mpcipcDir:/osm/schnorrmpc/data -v $keystore:/osm/keystore  --entrypoint="/osm/schnorrmpc/bin/gwan" ${DOCKERIMG} --nodiscover --datadir=/osm/schnorrmpc/data --keystore=/osm/keystore console --exec "admin.nodeInfo.id")

sudo cp -rf ${mpcipcDir}/gwan/nodekey ${mpcipcDir}/nodekey
sudo rm -rf ${mpcipcDir}/gwan
sudo rm -rf ${mpcipcDir}/history

echo ''
echo ''
echo -e "\033[41;30m !!!!!!!!!!!!!!! Important !!!!!!!!!!!!!!! \033[0m"
echo '=================================================='
echo '      Please Backup Your Work Address'
echo '     ' ${ADDR}
echo '=================================================='
echo '      Please Backup Your Work Public Key'
echo "0x"${PK:1:-1}
echo '=================================================='
echo '      Please Backup Your Keystore JSON String'
echo ''
echo ${KEYSTORE}
echo ''
echo '=================================================='
echo '      Please Backup Your Nodekey String'
echo ''
echo ${NODEKEY}
echo ''
echo '=================================================='
echo '      Please Backup Your EnodeId String'
echo ''
echo "0x"${EnodeId:1:-1}
echo ''




