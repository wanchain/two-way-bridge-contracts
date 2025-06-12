#!/bin/bash
# 在联网机器运行

SIGNED_TX_FILE="$1"

if [ $# -ne 1 ]; then
    echo "用法: $0 <signed_tx_file>"
    exit 1
fi

echo "📡 准备广播交易..."

# 从文件中读取交易数据和签名
TX_BYTES=$(grep "TX_BYTES:" $SIGNED_TX_FILE | cut -d' ' -f2-)
SIGNATURE=$(grep "SIGNATURE:" $SIGNED_TX_FILE | cut -d' ' -f2-)

echo "🔍 交易数据: ${TX_BYTES:0:50}..."
echo "🔑 签名: ${SIGNATURE:0:50}..."

# 广播交易 - 使用正确的参数格式
echo "📡 开始广播交易..."

RESULT=$(sui client execute-signed-tx \
    --tx-bytes "$TX_BYTES" \
    --signatures "$SIGNATURE" \
    --json)

echo "✅ 交易已广播"
echo "📋 交易结果:"
echo $RESULT | jq '.'

# 提取重要信息
TX_DIGEST=$(echo $RESULT | jq -r '.digest')
echo "🔗 交易哈希: $TX_DIGEST"

# 如果是发布交易，提取 Package ID
PACKAGE_ID=$(echo $RESULT | jq -r '.objectChanges[]? | select(.type=="published") | .packageId')
if [ "$PACKAGE_ID" != "null" ] && [ -n "$PACKAGE_ID" ]; then
    echo "📦 Package ID: $PACKAGE_ID"
fi

