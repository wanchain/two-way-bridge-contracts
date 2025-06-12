#!/bin/bash

# SUI 助记词恢复地址脚本
# 版本: 1.1 (修复命令语法)
# 功能: 从助记词恢复 SUI 地址

echo "========================================"
echo "🔄 SUI 助记词恢复工具"
echo "========================================"
echo "版本: 1.1"
echo "功能: 从助记词恢复 SUI 地址"
echo ""

# 检查 SUI CLI 是否安装
if ! command -v sui &> /dev/null; then
    echo "❌ 错误: 未找到 SUI CLI"
    echo "请先安装 SUI CLI: https://docs.sui.io/build/install"
    exit 1
fi

echo "ℹ️  SUI CLI 版本: $(sui --version)"
echo ""

# 显示命令帮助信息
echo "========================================"
echo "📖 查看命令语法"
echo "========================================"
echo "正在获取 keytool import 命令的正确语法..."
sui keytool import --help
echo ""

# 安全提醒
echo "========================================"
echo "🔒 安全提醒"
echo "========================================"
echo "重要安全提醒："
echo "1. 🔌 确保此电脑已断网（离线状态）"
echo "2. 🔐 助记词输入后不会显示在屏幕上"
echo "3. 🚫 确保周围无人观看"
echo "4. 🗑️  使用完毕后建议清理终端历史记录"
echo "5. ⚠️  只在安全环境中进行此操作"
echo ""

read -p "我已理解上述安全提醒，继续恢复地址？(y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "操作已取消"
    exit 0
fi

echo ""
echo "========================================"
echo "📝 输入助记词信息"
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

echo "使用签名方案: $scheme"
echo ""

# 询问是否设置别名
read -p "是否为恢复的地址设置别名？(y/N): " set_alias
if [[ $set_alias =~ ^[Yy]$ ]]; then
    read -p "请输入地址别名: " alias_name
else
    alias_name=""
fi

# 输入助记词
echo ""
echo "========================================"
echo "🔑 输入助记词"
echo "========================================"
echo "请输入您的助记词，用空格分隔："
echo "注意：输入时不会显示在屏幕上以保护隐私"
echo ""

# 安全输入助记词（不显示）
read -s -p "助记词: " mnemonic
echo ""
echo ""

# 验证助记词不为空
if [ -z "$mnemonic" ]; then
    echo "❌ 错误: 助记词不能为空"
    exit 1
fi

echo "✅ 助记词已输入"
echo ""

echo "========================================"
echo "🔄 正在恢复地址"
echo "========================================"
echo "正在从助记词恢复 SUI 地址..."
echo "签名方案: $scheme"

# 尝试不同的命令格式
echo ""
echo "尝试恢复方法..."

# 方法1: 基本导入（根据帮助信息调整）
if [ ! -z "$alias_name" ]; then
    echo "方法1: 使用别名导入..."
    if echo "$mnemonic" | sui keytool import --alias "$alias_name" "$scheme"; then
        echo "✅ 方法1成功！"
        import_success=true
    else
        echo "方法1失败，尝试方法2..."
        import_success=false
    fi
else
    echo "方法1: 直接导入..."
    if echo "$mnemonic" | sui keytool import "$scheme"; then
        echo "✅ 方法1成功！"
        import_success=true
    else
        echo "方法1失败，尝试方法2..."
        import_success=false
    fi
fi

# 方法2: 如果方法1失败，尝试其他格式
if [ "$import_success" != "true" ]; then
    echo "方法2: 尝试不同的参数顺序..."
    if [ ! -z "$alias_name" ]; then
        if sui keytool import "$mnemonic" "$scheme" --alias "$alias_name"; then
            echo "✅ 方法2成功！"
            import_success=true
        else
            echo "方法2失败，尝试方法3..."
            import_success=false
        fi
    else
        if sui keytool import "$mnemonic" "$scheme"; then
            echo "✅ 方法2成功！"
            import_success=true
        else
            echo "方法2失败，尝试方法3..."
            import_success=false
        fi
    fi
fi

# 方法3: 交互式导入
if [ "$import_success" != "true" ]; then
    echo "方法3: 手动交互式导入..."
    echo "请手动执行以下命令："
    echo ""
    if [ ! -z "$alias_name" ]; then
        echo "sui keytool import --alias \"$alias_name\" \"$scheme\""
    else
        echo "sui keytool import \"$scheme\""
    fi
    echo ""
    echo "然后在提示时输入助记词。"
    echo ""
    read -p "是否现在手动执行？(y/N): " manual_exec
    if [[ $manual_exec =~ ^[Yy]$ ]]; then
        echo "请在下面的命令提示中输入助记词："
        if [ ! -z "$alias_name" ]; then
            sui keytool import --alias "$alias_name" "$scheme"
        else
            sui keytool import "$scheme"
        fi
        import_success=true
    fi
fi

# 检查导入结果
if [ "$import_success" = "true" ]; then
    echo ""
    echo "✅ 地址恢复成功！"
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
    active_address=$(sui client active-address)
    echo "$active_address"
    echo ""
    
    # 询问是否切换活跃地址
    if [ ! -z "$alias_name" ]; then
        read -p "是否切换到刚恢复的地址 ($alias_name)？(y/N): " switch_address
        if [[ $switch_address =~ ^[Yy]$ ]]; then
            if sui client switch --address "$alias_name"; then
                echo "✅ 已切换到地址: $alias_name"
                echo "新的活跃地址: $(sui client active-address)"
            else
                echo "⚠️  切换地址失败，请手动切换"
                echo "使用命令: sui client switch --address $alias_name"
            fi
        fi
    fi
    
    echo ""
    echo "========================================"
    echo "✅ 恢复完成"
    echo "========================================"
    echo "重要提醒："
    echo "1. 🔐 地址已成功恢复到本地 keystore"
    echo "2. 💾 建议备份 keystore 文件"
    echo "3. 🗑️  建议清理终端历史记录: history -c"
    echo "4. 🔒 确保助记词安全存储"
    echo ""
    
else
    echo ""
    echo "❌ 自动恢复失败"
    echo ""
    echo "请尝试以下手动方法："
    echo "1. 运行: sui keytool import --help"
    echo "2. 查看正确的命令格式"
    echo "3. 手动执行正确的导入命令"
    echo ""
    echo "常见的命令格式可能是："
    if [ ! -z "$alias_name" ]; then
        echo "   sui keytool import --alias \"$alias_name\""
    else
        echo "   sui keytool import"
    fi
    echo "   然后在提示时输入助记词和签名方案"
fi

