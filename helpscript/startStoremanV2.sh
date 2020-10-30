#！/bin/sh

function use() {
  echo "================================================"
  echo "USAGE:"
  echo "./start_storeman.sh.sh"
  echo "================================================"
}

echo $@

# agent work path
workPath="$HOME/osm"

# change osm permission
sudo chown "$USER" $workPath

while true
do

	echo "================================================"

	# network
	echo '*********** Please select your storeman network(mainnet/testnet):'
	read network

	if [ "$network" == "mainnet" ]; then
		isTestnet=false
		mongocontainer=agentmongo_mainnet
		container=openstoreman_mainnet
		watchcontainer=watchtower_mainnet
	elif [ "$network" == "testnet" ]; then
		isTestnet=true
		mongocontainer=agentmongo_testnet
		container=openstoreman
		watchcontainer=watchtower_testnet
	else
		echo "*********** Plz make sure your select the right network!"
		continue
	fi

	# agent waddress
	echo '*********** Please Enter your work address:'
	read waddress

	echo '*********** Please Enter your password of work address:'
	read -s PASSWD

	echo '*********** Please Confirm your password of work address:'
	read -s PASSWD2

	if [ "$PASSWD" = "$PASSWD2" ];then
	echo 'Password match!'
	break
	else
	echo 'password did not match!'
	fi

	echo "================================================"
	echo ""

done

read -p "*********** Do you want save your password to disk for auto update storemanAgent? (N/y): " autoupdate

if [ "$autoupdate" == "Y" ] || [ "$autoupdate" == "y" ]; then
    savepasswd="Y"
else
    read -p "*********** Do you want save your password to disk for auto restart? (N/y): " savepasswd
fi

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



# container name
# container=openstoreman
echo '*********** use container name ***********:  '$container

# url, use config node as default, if you don't want change it, ignore this as ''
# if url or add is configed, chain must be configed (Upper)
# example chain1='http://127.0.0.1:8545'
chain1='ETH'
url1=''

chain2='WAN'
url2=''

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

# ************************************************************************************************************ 
# mongo start 
# ************************************************************************************************************

# db config. dbip should be host docker IP
# INT="docker0"
# dbip=$(ifconfig $INT | grep "inet" | grep -v inet6 | awk '{ print $2}')
# dbip='172.17.0.1'
# dbip=$2
echo ""
echo "================================================"
echo "Start mongo "$mongocontainer
echo "================================================"
dbip='172.17.0.1'
dbport=27018
dbdir=$workPath'/db/mongo/'
echo '*********** use db config ***********:  '$dbip":"$dbport

# mongo container name
# mongocontainer=openstoremanmongo
echo '*********** use mongocontainer name ***********:  '$mongocontainer
echo "Plz ignore the error 'Error: No such container: $mongocontainer' if your first start the script"
`sudo docker rm -f $mongocontainer 1>&2`

sudo docker run -itd --name $mongocontainer -v $dbdir:/data/db -p 27018:27017 --restart=always mongo

# ************************************************************************************************************ 
# storeman agent start 
# ************************************************************************************************************
echo ""
echo "================================================"
echo "Start storeman agent "$container
echo "================================================"

password=$workPath'/pwd.json'
keystore=$workPath'/keystore/'

pwdString='
{
  "WORKING_PWD": "'$PASSWD'"
}
'
echo $pwdString > $password

# mpc p2p port
p2pPort=37718
#threshold=17
#totalnodes=21



if [ "$isTestnet" == true ]; then
	# stormanAgent docker image
	image='wanchain/openstoremanagent:latest'
	echo '*********** use docker image ***********:  '$image

	bootnodes="enode://0x40b32b294df00e42affb72ab159f66c88a682ade4504568f1dd3714196248801609e07a5e9481829127392920d9ce102696c6af87378ef6dc8fcf432a25b6b30@44.233.241.210:30000"

	storemanPm2Json='
	{
	  "apps" : [{
		"name"        : "schnorrmpc",
		"script"      : "schnorrmpc/startMpc.sh",
		"cwd"         : "schnorrmpc",
		"args"        : "'$bootnodes' '$p2pPort' 8545 '$index' '$isTestnet'",
		"log_date_format"  : "YYYY-MM-DD HH:mm Z",
		"env": {}
	  },{
		"name"       : "storeman_agent",
		"script"      : "wanchain-js-storeman-linux",
		"cwd"         : "agent",
		"args"        : "-i '$index' --loglevel '$loglevel' --testnet --waddress '$waddress' --chain1 '$chain1' --url1 '$url1' --chain2 '$chain2' --url2 '$url2' --password /osm/pwd.json --keystore /osm/keystore/ --dbip '$dbip' --dbport '$dbport' --mpc --mpcip '$mpcip' --mpcipc /osm/schnorrmpc/data/gwan.ipc --mpcpath /osm/schnorrmpc/data",
		"log_date_format"  : "YYYY-MM-DD HH:mm Z",
		"env": {}
	  }]
	}
	'
else
	# stormanAgent docker image
	image='wanchain/openstoremanagent_mainnet:latest'
	echo '*********** use docker image ***********:  '$image

	bootnodes="enode://0x2a828927833ec0e41eacff8892b3c9c26a83d0baf2170b6db57635bd0f5ac29160138f322a0dc4b997f26c4ab6b8e8bf96d1d9841660e37320cc98e85013ed9f@44.236.229.6:30000"

	storemanPm2Json='
	{
	  "apps" : [{
		"name"        : "schnorrmpc",
		"script"      : "schnorrmpc/startMpc.sh",
		"cwd"         : "schnorrmpc",
		"args"        : "'$bootnodes' '$p2pPort' 8545 '$index'",
		"log_date_format"  : "YYYY-MM-DD HH:mm Z",
		"env": {}
	  },{
		"name"       : "storeman_agent",
		"script"      : "wanchain-js-storeman-linux",
		"cwd"         : "agent",
		"args"        : "-i '$index' --loglevel '$loglevel' --waddress '$waddress' --chain1 '$chain1' --url1 '$url1' --chain2 '$chain2' --url2 '$url2' --password /osm/pwd.json --keystore /osm/keystore/ --dbip '$dbip' --dbport '$dbport' --mpc --mpcip '$mpcip' --mpcipc /osm/schnorrmpc/data/gwan.ipc --mpcpath /osm/schnorrmpc/data",
		"log_date_format"  : "YYYY-MM-DD HH:mm Z",
		"env": {}
	  }]
	}
	'
fi

CRTDIR=$(pwd)
pm2ScriptPath=$workPath
echo $storemanPm2Json > $pm2ScriptPath/storeman_pm2.json
echo "Plz ignore the error: 'Error: No such container: $container' if your first start the script"
`sudo docker rm -f $container 1>&2`

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

if [ "$savepasswd" == "Y" ] || [ "$savepasswd" == "y" ]; then
	cmd="sudo docker run --log-opt max-size=200m --log-opt max-file=3 \
	--name $container \
	-p $p2pPort:$p2pPort -p $p2pPort:$p2pPort/udp \
	-v $password:/osm/pwd.json \
	-v $keystore:/osm/keystore \
	-v $mpcpath:/osm/schnorrmpc/data \
	-v $pm2ScriptPath/storeman_pm2.json:/osm/storeman_pm2.json \
	-d --restart=always $image
	"
else
	cmd="sudo docker run --log-opt max-size=200m --log-opt max-file=3 \
	--name $container \
	-p $p2pPort:$p2pPort -p $p2pPort:$p2pPort/udp \
	-v $password:/osm/pwd.json \
	-v $keystore:/osm/keystore \
	-v $mpcpath:/osm/schnorrmpc/data \
	-v $pm2ScriptPath/storeman_pm2.json:/osm/storeman_pm2.json \
	-d $image
	"
fi

echo $cmd
`$cmd 1>&2`

if [ "$autoupdate" == "Y" ] || [ "$autoupdate" == "y" ]; then
	echo ""
	echo "================================================"
	echo "start DockerWatch "$watchcontainer
	echo "Docker watchtower will auto update your storemanAgent"
	echo "================================================"
	echo "Plz ignore the error: 'Error: No such container: $watchcontainer' if your first start the script"
	`sudo docker rm -f $watchcontainer 1>&2`

	sudo docker run --log-opt max-size=200m --log-opt max-file=3 \
	--name $watchcontainer \
	-v /var/run/docker.sock:/var/run/docker.sock \
	-d --restart=always containrrr/watchtower \
	-c \
	$container
fi

if [ "$savepasswd" == "N" ] || [ "$savepasswd" == "n" ]; then
    sudo rm $password
fi



