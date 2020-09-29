#！/bin/sh

function use() {
  echo "================================================"
  echo "USAGE:"
  echo "./start_storeman.sh.sh [waddress] [hostip]"
  echo " e.g.: $0 [waddress] 172.17.0.1"
  echo "================================================"
}

if [[ $# -gt 2 ]] || [[ $# -eq 0 ]]; then
  use
  exit
fi

echo $@

# agent work path
workPath="$HOME/osm"

# agent waddress
waddress=$1

# For follower nodes
echo "================================================"
echo "storeman-"$waddress
echo "Start as a follower  : storeman agent"
echo "================================================"

# agent index, index default can be empty
# index=$3
index=1

# loglevel, debug as default
loglevel='debug'

# stormanAgent docker image
image='wanchain/openstoremanagent:latest'
echo '*********** use docker image ***********:  '$image

# container name
container=openstoreman
echo '*********** use container name ***********:  '$container

# url, use config node as default, if you don't want change it, ignore this as ''
# if url or add is configed, chain must be configed (Upper)
# example chain1='http://127.0.0.1:8545'
chain1='ETH'
url1='http://52.34.91.48:36892'

chain2='WAN'
url2='http://35.162.176.235:36891'

chain3='EOS'
url3=''
# add3=''

# mpc use rpc
mpcip='127.0.0.1'
mpcport=8545

# mpc use ipc
mpcipcDir=$workPath'/data/'
mpcipcFile=$mpcipcDir'gwan.ipc'
mpcpath=$mpcipcDir
echo '*********** use mpc ipc ***********:  '$mpcipcFile

#db config. dbip should be host docker IP
# INT="docker0"
# dbip=$(ifconfig $INT | grep "inet" | grep -v inet6 | awk '{ print $2}')
dbip=$2
#dbip='172.17.0.1'
dbport=27017
echo '*********** use db config ***********:  '$dbip":"$dbport

password=$workPath'/pwd.json'
keystore=$workPath'/keystore/'

# mpc p2p port
p2pPort=37718
#threshold=17
#totalnodes=21

bootnodes="enode://0x40b32b294df00e42affb72ab159f66c88a682ade4504568f1dd3714196248801609e07a5e9481829127392920d9ce102696c6af87378ef6dc8fcf432a25b6b30@44.233.241.210:30000"

storemanPm2Json='
{
  "apps" : [{
    "name"       : "storeman_agent",
    "script"      : "wanchain-js-storeman-linux",
    "cwd"         : "agent",
    "args"        : "-i '$index' --loglevel '$loglevel' --testnet --waddress '$waddress' --chain1 '$chain1' --url1 '$url1' --chain2 '$chain2' --url2 '$url2' --password /osm/pwd.json --keystore /osm/keystore/ --dbip '$dbip' --dbport '$dbport' --mpc --mpcip '$mpcip' --mpcport 8545 --mpcipc /osm/schnorrmpc/data/gwan.ipc --mpcpath /osm/schnorrmpc/data",
    "log_date_format"  : "YYYY-MM-DD HH:mm Z",
    "env": {}
  },{
    "name"        : "schnorrmpc",
    "script"      : "schnorrmpc/startMpc.sh",
    "cwd"         : "schnorrmpc",
    "args"        : "'$bootnodes' '$p2pPort' 8545 '$index'",
    "log_date_format"  : "YYYY-MM-DD HH:mm Z",
    "env": {}
  }]
}
'
CRTDIR=$(pwd)
pm2ScriptPath=$workPath
echo $storemanPm2Json > $pm2ScriptPath/storeman_pm2.json

sudo docker rm -f $container

# cmd="sudo docker run --log-opt max-size=200m --log-opt max-file=3 \
# --name $container \
# -p $p2pPort:17717 -p $p2pPort:17717/udp -p $mpcport:8545 \
# -v $password:/osm/pwd.json \
# -v $keystore:/osm/keystore \
# -v $mpcpath:/osm/schnorrmpc/data \
# $image -- -i $index \
# --loglevel $loglevel \
# --testnet \
# --waddress $waddress \
# --chain1 $chain1 --url1 $url1 --add1 $add1 \
# --chain2 $chain2 --url2 $url2 --add2 $add2 \
# --password /osm/pwd.json \
# --keystore /osm/keystore/ \
# --dbip $dbip --dbport $dbport --replica \
# --mpc --mpcip $mpcip --mpcport 8545 \
# --mpcipc /osm/schnorrmpc/data/gwan.ipc \
# --mpcpath /osm/schnorrmpc/data \
# --p2pPort 17717 \
# --threshold $threshold \
# --totalnodes $totalnodes \
# "

cmd="sudo docker run --log-opt max-size=200m --log-opt max-file=3 \
--name $container \
-p $p2pPort:$p2pPort -p $p2pPort:$p2pPort/udp -p $mpcport:8545 \
-v $password:/osm/pwd.json \
-v $keystore:/osm/keystore \
-v $mpcpath:/osm/schnorrmpc/data \
-v $pm2ScriptPath/storeman_pm2.json:/osm/storeman_pm2.json \
-d $image
"

echo $cmd

#exec $cmd

sudo docker run --log-opt max-size=200m --log-opt max-file=3 \
--name $container \
-p $p2pPort:$p2pPort -p $p2pPort:$p2pPort/udp -p $mpcport:8545 \
-v $password:/osm/pwd.json \
-v $keystore:/osm/keystore \
-v $mpcpath:/osm/schnorrmpc/data \
-v $pm2ScriptPath/storeman_pm2.json:/osm/storeman_pm2.json \
-d $image

echo "================================================"
echo "DockerWatch"
echo "Docker watchtower will auto update your storemanAgent"
echo "================================================"

sudo docker rm -f watchtower

sudo docker run --log-opt max-size=200m --log-opt max-file=3 \
--name watchtower \
-v /var/run/docker.sock:/var/run/docker.sock \
-d containrrr/watchtower \
-c \
$container
