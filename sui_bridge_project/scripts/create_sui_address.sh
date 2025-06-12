#!/bin/bash

# SUI 离线地址创建脚本
# 版本: 1.1 (无颜色版本)
# 功能: 在离线环境中安全创建 SUI 地址

echo "========================================"
echo "🚀 SUI 离线地址创建工具"
echo "========================================"
echo "版本: 1.1"
echo "功能: 在离线环境中安全创建 SUI 地址"
echo ""

# 检查 SUI CLI 是否安装
if ! command -v sui &> /dev/null; then
    echo "❌ 错误: 未找到 SUI CLI"
    echo "请先安装 SUI CLI: https://docs.sui.io/build/install"
    exit 1
fi

echo "ℹ️  SUI CLI 版本: $(sui --version)"
echo ""

# 安全提醒
echo "========================================"
echo "🔒 安全提醒"
echo "========================================"
echo "重要安全提醒："
echo "1. 🔌 确保此电脑已断网（离线状态）"
echo "2. 📝 请准备纸笔记录助记词"
echo "3. 🚫 不要截图或拍照助记词"
echo "4. 🔐 助记词是恢复钱包的唯一方式，请妥善保管"
echo "5. 🗑️  使用完毕后建议清理终端历史记录"
echo ""

read -p "我已理解上述安全提醒，继续创建地址？(y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "操作已取消"
    exit 0
fi

echo ""
echo "========================================"
echo "📍 创建新的 SUI 地址"
echo "========================================"

# 选择签名方案
echo "请选择签名方案："
echo "1) ed25519 (推荐)"
echo "2) secp256k1"
echo "3) secp256r1"
read -p "请输入选择 (1-3，默认为1): " scheme_choice

case $scheme_choice in
    2)
        scheme="secp256k1"
        ;;
    3)
        scheme="secp256r1"
        ;;
    *)
        scheme="ed25519"
        ;;
esac

echo ""
echo "使用签名方案: $scheme"
echo "正在创建地址..."
echo ""

# 创建新地址
if sui client new-address $scheme; then
    echo ""
    echo "✅ 地址创建成功！"
    echo ""
    
    # 显示所有地址
    echo "========================================"
    echo "📋 当前所有地址"
    echo "========================================"
    sui client addresses
    echo ""
    
    # 显示活跃地址
    echo "========================================"
    echo "🎯 当前活跃地址"
    echo "========================================"
    sui client active-address
    echo ""
    
    # 备份 keystore
    echo ""
    echo "========================================"
    echo "💾 备份 Keystore"
    echo "========================================"
    echo "建议备份 keystore 文件到安全的离线存储设备"
    
    # 查找 keystore 位置
    if [ -d "$HOME/.sui/sui_config" ]; then
        keystore_path="$HOME/.sui/sui_config"
    elif [ -d "$HOME/.config/sui/sui_config" ]; then
        keystore_path="$HOME/.config/sui/sui_config"
    else
        echo "⚠️  未找到 keystore 目录"
        keystore_path=""
    fi
    
    if [ ! -z "$keystore_path" ]; then
        echo "Keystore 位置: $keystore_path"
        read -p "是否创建 keystore 备份？(y/N): " backup_choice
        if [[ $backup_choice =~ ^[Yy]$ ]]; then
            backup_dir="$HOME/sui_backup_$(date +%Y%m%d_%H%M%S)"
            mkdir -p "$backup_dir"
            cp -r "$keystore_path"/* "$backup_dir/"
            echo "✅ 备份已创建: $backup_dir"
            echo "请将此目录复制到安全的离线存储设备"
        fi
    fi
    
    echo ""
    echo "========================================"
    echo "✅ 操作完成"
    echo "========================================"
    echo "重要提醒："
    echo "1. 📝 请确保已手写记录助记词"
    echo "2. 💾 建议备份 keystore 文件"
    echo "3. 🔐 妥善保管所有备份信息"
    echo "4. 🗑️  建议清理终端历史记录: history -c"
    echo ""
    
else
    echo "❌ 地址创建失败"
    echo "请检查 SUI CLI 是否正确安装和配置"
    exit 1
fi

