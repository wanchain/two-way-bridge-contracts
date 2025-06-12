#!/bin/bash
# 在离线机器运行

UNSIGNED_TX_FILE="$1"
SIGNER_ADDRESS="$2"
OUTPUT_FILE="$3"

if [ $# -ne 3 ]; then
    echo "用法: $0 <unsigned_tx_file> <signer_address> <output_file>"
    exit 1
fi

echo "🔐 开始离线签名..."

# 签名交易
SIGNATURE_OUTPUT=$(sui keytool sign \
    --address $SIGNER_ADDRESS \
    --data $(cat $UNSIGNED_TX_FILE))

echo "✅ 签名完成"
echo "📝 签名结果:"
echo "$SIGNATURE_OUTPUT"

# 提取签名字符串（从输出中提取 suiSignature）
SIGNATURE=$(echo "$SIGNATURE_OUTPUT" | grep "suiSignature" | awk '{print $4}')

echo "🔑 提取的签名: $SIGNATURE"

# 生成完整签名交易 - 使用正确的参数格式
echo "📦 生成签名交易文件..."

# 方法1：直接使用签名和原始交易数据
echo "TX_BYTES: $(cat $UNSIGNED_TX_FILE)" > $OUTPUT_FILE
echo "SIGNATURE: $SIGNATURE" >> $OUTPUT_FILE

echo "💾 签名交易已保存到: $OUTPUT_FILE"
echo "📋 文件内容:"
cat $OUTPUT_FILE

