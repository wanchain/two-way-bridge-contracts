#!/bin/bash

# ------------------- 配置 -------------------
PROJECT_ROOT=$(pwd)        # 项目根目录，默认为脚本执行目录
OUTPUT_DIR="dist"          # TypeScript 编译输出目录
NPM_COMMAND="npm"          # npm 命令，如果你的环境不同可以修改
BUILD_COMMAND="npm run build" # 执行 TypeScript 编译的命令
TEST_COMMAND="npm run test"   # 执行测试的命令 (可选)
DRY_RUN=false              # 是否进行 npm publish 的 dry-run (模拟发布)
# --------------------------------------------

echo "开始自动编译和发布 TypeScript 项目..."
echo "项目根目录: $PROJECT_ROOT"
echo "输出目录: $OUTPUT_DIR"

# 切换到项目根目录
cd "$PROJECT_ROOT" || {
  echo "错误: 无法切换到项目根目录。"
  exit 1
}

echo "当前工作目录: $(pwd)"

# 检查 package.json 和 tsconfig.json 是否存在
if [ ! -f "package.json" ]; then
  echo "错误: package.json 文件不存在。"
  exit 1
fi

if [ ! -f "tsconfig.json" ]; then
  echo "错误: tsconfig.json 文件不存在。"
  exit 1
fi

echo "package.json 和 tsconfig.json 文件存在。"

# 执行构建命令
echo "执行构建命令: $BUILD_COMMAND"
if ! $BUILD_COMMAND; then
  echo "错误: TypeScript 编译失败。"
  exit 1
fi

echo "TypeScript 编译成功，文件输出到 $OUTPUT_DIR 目录。"

# 执行测试命令 (可选)
#if [ -n "$TEST_COMMAND" ]; then
#  echo "执行测试命令: $TEST_COMMAND"
#  if ! $TEST_COMMAND; then
#    echo "警告: 测试失败，但继续发布。"
#    # 如果你希望测试失败就停止发布，取消下一行的注释
#    # exit 1
#  fi
#  echo "测试通过。"
#fi

# 发布 npm 包
echo "准备发布 npm 包..."

if $DRY_RUN; then
  echo "执行 npm publish --dry-run (模拟发布)..."
  if ! $NPM_COMMAND publish --dry-run; then
    echo "错误: npm publish --dry-run 失败，请检查你的 npm 配置。"
    exit 1
  fi
  echo "npm publish --dry-run 成功。"
else
  echo "执行 npm publish..."
  if ! $NPM_COMMAND publish; then
    echo "错误: npm publish 失败，请检查你的 npm 配置和包版本。"
    exit 1
  fi
  echo "npm 包发布成功！"
fi

echo "脚本执行完毕。"

exit 0
