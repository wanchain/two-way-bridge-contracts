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
keystore=$workPath'/keystore/'

# change osm permission
sudo chown "$USER" $workPath

while true
do
	echo ""
	echo "================================================"

	# network
	echo '*********** Please select your storeman network(mainnet/testnet):'
	read network

	if [ "$network" == "mainnet" ]; then
		isTestnet=false
		mongocontainer=agentmongo_mainnet
		container=openstoreman_mainnet
		watchcontainer=watchtower_mainnet
		dockernet=storeman-net
		image='wanchain/openstoremanagent_mainnet:latest'
	elif [ "$network" == "testnet" ]; then
		isTestnet=true
		mongocontainer=agentmongo_testnet
		container=openstoreman_testnet
		watchcontainer=watchtower_testnet
		dockernet=storeman-net
		image='wanchain/openstoremanagent:latest'
	else
		echo "*********** Please make sure your select the right network!"
		continue
	fi

	echo "... Wait a while, docker image is updating! ..."
	sudo docker pull $image

	# agent waddress
	echo '*********** Please Enter your work address:'
	read waddress

	echo '*********** Please Enter your password of work address:'
	read -s PASSWD
	
	if [ ! -n "$waddress" ] || [ ! -n "$PASSWD" ]; then
		echo "*********** Please input the valid waddress and password"
		continue
	fi
	echo "... Wait a while, password is being checked! ..."

	result1=`sudo docker run -v $keystore:/osm/keystore --entrypoint="/osm/agent/wanchain-js-storeman-check" $image --waddress $waddress --password $PASSWD --keystore /osm/keystore`
	echo $result1
	
	if [[ $result1 =~ "Waddress password check: true" ]]; then
		echo 'Password match!'
		break
	else
		echo 'password did not match!'
	fi

	echo "================================================"
	echo ""

done

while true
do
	read -p "*********** Do you want to use KMS to encrypt/decrypt your storeman secret piece? (N/y): " KMS

	if [ "$KMS" == "Y" ] || [ "$KMS" == "y" ]; then
		echo "*********** You selected to use KMS, please provide your KMS_ACCESS_KID/KMS_SECRET_KEY/KMS_REGION/KMS_KEYID."
		read -p "KMS_ACCESS_KID: " accessKid
		read -p "KMS_SECRET_KEY: " secretKey
		read -p "KMS_REGION: " region
		read -p "KMS_KEYID: " keyId
		
		if [ ! -n "$accessKid" ] || [ ! -n "$secretKey" ] || [ ! -n "$region" ] || [ ! -n "$keyId" ]; then
			echo "*********** Please input the valid KMS_ACCESS_KID/KMS_SECRET_KEY/KMS_REGION/KMS_KEYID, should not be null"
			continue
		fi
		
		echo "... Wait a while, KMS is being checked! ..."
		
		result2=`sudo docker run -v $keystore:/osm/keystore --entrypoint="/osm/agent/wanchain-js-storeman-check" $image --kms --accid $accessKid --seckey $secretKey --region $region --keyid $keyId`
		echo $result2
		
		if [[ $result2 =~ "KMS check: true" ]]; then
			echo 'KMS match!'
			break
		else
			echo 'KMS did not match!'
		fi
	else
		accessKid=""
		secretKey=""
		region=""
		keyId=""
		break
	fi

	echo "================================================"
	echo ""

done

if [ "$KMS" == "Y" ] || [ "$KMS" == "y" ]; then
    savepasswd="N"
	autoupdate="N"
else
	read -p "*********** Do you want to save your password to disk for auto update storemanAgent? (N/y): " autoupdate
	if [ "$autoupdate" == "Y" ] || [ "$autoupdate" == "y" ]; then
		savepasswd="Y"
	else
		#read -p "*********** Do you want to save your password to disk for auto restart? (N/y): " savepasswd
		savepasswd="N"
		autoupdate="N"
	fi

fi


password=$workPath'/pwd.json'

if [ -d $password ] || [ -f $password ]; then
	sudo rm -rf $password
fi

pwdString='
{
  "WORKING_PWD": "'$PASSWD'",
  "KMS_ACCESS_KID": "'$accessKid'",
  "KMS_SECRET_KEY": "'$secretKey'",
  "KMS_REGION": "'$region'",
  "KMS_KEYID": "'$keyId'"
}
'
echo $pwdString > $password

# For storeman nodes
echo "================================================"
echo "storeman-"$waddress
echo "Start  : storeman agent"
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
# create docker network 
# ************************************************************************************************************
echo ""
echo "================================================"
echo "create docker network  "$dockernet
echo "================================================"

netExist=`sudo docker network ls | grep $dockernet | awk '{ print $2 }'`
if [ "$netExist" == "" ]; then
	#echo "Plz ignore the error: 'network with name $dockernet already exists' if your already have the docker network"
	`sudo docker network create -d bridge $dockernet 1>&2`
fi

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
dbip=$mongocontainer
dbport=27017
dbdir=$workPath'/db/mongo/'
echo '*********** use db config ***********:  '$dbip":"$dbport

# mongo container name
# mongocontainer=openstoremanmongo
echo '*********** use mongocontainer name ***********:  '$mongocontainer
# echo "Please ignore the error 'Error: No such container: $mongocontainer' if your first start the script"
`sudo docker rm -f $mongocontainer > /dev/null 2>&1`

sudo docker run -itd --name $mongocontainer --network $dockernet -v $dbdir:/data/db --restart=always mongo:5.0

# ************************************************************************************************************ 
# storeman agent start 
# ************************************************************************************************************
echo ""
echo "================================================"
echo "Start storeman agent "$container
echo "================================================"

# mpc p2p port
p2pPort=37718
#threshold=17
#totalnodes=21

if [ "$isTestnet" == true ]; then
	# stormanAgent docker image
	# image='wanchain/openstoremanagent:latest'
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
		"args"        : "-i '$index' --loglevel '$loglevel' --testnet --waddress '$waddress' --chain1 '$chain1' --url1 '$url1' --chain2 '$chain2' --url2 '$url2' --password /osm/pwd.json --keystore /osm/keystore/ --dbip '$dbip' --dbport '$dbport' --mpc --mpcip '$mpcip' --mpcport 8545 --mpcipc /osm/schnorrmpc/data/gwan.ipc --mpcpath /osm/schnorrmpc/data",
		"log_date_format"  : "YYYY-MM-DD HH:mm Z",
		"env": {}
	  }]
	}
	'
else
	# stormanAgent docker image
	# image='wanchain/openstoremanagent_mainnet:latest'
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
		"args"        : "-i '$index' --loglevel '$loglevel' --waddress '$waddress' --chain1 '$chain1' --url1 '$url1' --chain2 '$chain2' --url2 '$url2' --password /osm/pwd.json --keystore /osm/keystore/ --dbip '$dbip' --dbport '$dbport' --mpc --mpcip '$mpcip' --mpcport 8545 --mpcipc /osm/schnorrmpc/data/gwan.ipc --mpcpath /osm/schnorrmpc/data",
		"log_date_format"  : "YYYY-MM-DD HH:mm Z",
		"env": {}
	  }]
	}
	'
fi

CRTDIR=$(pwd)
pm2ScriptPath=$workPath

if [ -d $pm2ScriptPath/storeman_pm2.json ] || [ -f $pm2ScriptPath/storeman_pm2.json ]; then
	sudo rm -rf $pm2ScriptPath/storeman_pm2.json
fi

echo $storemanPm2Json > $pm2ScriptPath/storeman_pm2.json

sleep 6

# echo "Please ignore the error: 'Error: No such container: $container' if your first start the script"
`sudo docker rm -f $container > /dev/null 2>&1`

if [ "$savepasswd" == "Y" ] || [ "$savepasswd" == "y" ]; then
	cmd="sudo docker run --log-opt max-size=200m --log-opt max-file=3 \
	--name $container \
	--network $dockernet \
	-p $p2pPort:$p2pPort -p $p2pPort:$p2pPort/udp -p $mpcport:8545 \
	-v $password:/osm/pwd.json \
	-v $keystore:/osm/keystore \
	-v $mpcpath:/osm/schnorrmpc/data \
	-v $pm2ScriptPath/storeman_pm2.json:/osm/storeman_pm2.json \
	-d --restart=always $image
	"
else
	cmd="sudo docker run --log-opt max-size=200m --log-opt max-file=3 \
	--name $container \
	--network $dockernet \
	-p $p2pPort:$p2pPort -p $p2pPort:$p2pPort/udp -p $mpcport:8545 \
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
	# echo "Please ignore the error: 'Error: No such container: $watchcontainer' if your first start the script"
	`sudo docker rm -f $watchcontainer > /dev/null 2>&1`

	sudo docker run --log-opt max-size=200m --log-opt max-file=3 \
	--name $watchcontainer \
	-v /var/run/docker.sock:/var/run/docker.sock \
	-d --restart=always containrrr/watchtower \
	--interval 300 \
	-c \
	$container
fi

if [ "$savepasswd" == "N" ] || [ "$savepasswd" == "n" ]; then

	echo 'Please wait a few seconds...'

	sleep 36

    sudo rm $password
	
	if [ $? -ne 0 ]; then
		echo "rm $password failed"
		exit 1
	fi
fi

echo ''
echo "Storeman Start Success";

