#处理数据(原始数据-> schnorr_e)
cat mainnet | grep -w r | grep "bytes" | awk '{print $4}' | cut -c 1-66 | uniq > mainnet_e

