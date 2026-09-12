#!/usr/bin/env bash
#
# sync-template.sh — 本地生成模板内容（等价于 .github/workflows/sync-template.yml，用于发布前验证或离线同步）。
#
# Usage: scripts/sync-template.sh [框架版本] [目标目录]
#   框架版本   写入目标 backend/pom.xml 的 <nebula.version>，默认取主仓 <revision>
#   目标目录   输出目录，默认 /tmp/nebula-template-sync（会被清空重建）
#
# 输出结构：{ backend/ + web/ + docs/ + .agents/ }，与模板仓 yunqilee69/nebula-template 一致。
# 顶层 README.md / .gitignore 由模板仓手工维护，本脚本不生成。
#
# 发布流程：先用本脚本在本地验证「一键启动」，再打 v* tag —— CI 会用同一套规则
# 把内容同步到模板仓，并把 <nebula.version> 锁定为 tag 版本。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

VERSION="${1:-$(sed -n 's|.*<revision>\([^<]*\)</revision>.*|\1|p' "$ROOT/pom.xml" | head -1)}"
DEST="${2:-/tmp/nebula-template-sync}"

if [ -z "$VERSION" ]; then
  echo "无法确定框架版本：主仓 pom.xml 缺少 <revision>，请显式传入版本号" >&2
  exit 1
fi

echo "框架版本: $VERSION"
echo "输出目录: $DEST"

rm -rf "$DEST"
mkdir -p "$DEST"

for dir in web backend docs .agents scripts; do
  if [ ! -d "$ROOT/$dir" ]; then
    echo "跳过不存在的目录: $dir" >&2
    continue
  fi
  cp -r "$ROOT/$dir" "$DEST/$dir"
done

# 构建产物与依赖不进模板
rm -rf "$DEST/web/node_modules" "$DEST/web/dist" "$DEST/backend/target"

# 锁定框架版本（便携写法：GNU/BSD sed 兼容）
if [ -f "$DEST/backend/pom.xml" ]; then
  sed "s|<nebula.version>[^<]*</nebula.version>|<nebula.version>$VERSION</nebula.version>|" \
    "$DEST/backend/pom.xml" > "$DEST/backend/pom.xml.tmp"
  mv "$DEST/backend/pom.xml.tmp" "$DEST/backend/pom.xml"
  grep -q "<nebula.version>$VERSION</nebula.version>" "$DEST/backend/pom.xml" || {
    echo "锁定版本失败：$DEST/backend/pom.xml" >&2
    exit 1
  }
  echo "已锁定 backend/pom.xml -> <nebula.version>$VERSION</nebula.version>"
fi

echo
echo "完成。本地验证："
echo "  cd $DEST/backend && docker compose up -d && mvn spring-boot:run"
echo "同步到模板仓：把本目录内容提交到 yunqilee69/nebula-template（或直接打 tag 由 CI 同步）。"
