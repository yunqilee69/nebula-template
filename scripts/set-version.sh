#!/usr/bin/env bash
#
# set-version.sh — 一键统一修改全仓版本号（CI-Friendly ${revision} 模式）。
#
# Usage: scripts/set-version.sh <新版本号> [--with-backend]
#   新版本号        形如 0.1.1 或 0.2.0-SNAPSHOT
#   --with-backend  同时更新 backend/ 模板工程引用的 <nebula.version>
#                   （仅在该版本已发布到 Maven Central 后使用，否则模板工程无法构建）
#
# 修改范围：
#   1. pom.xml 与 nebula-dependency/pom.xml 的 <revision>（全部模块经 ${revision} 继承）
#   2. docker/docker-compose.yml 与 docker/README.md 中的默认版本（保持与 revision 一致，
#      否则 compose build 找不到新版本 jar）
#   3. --with-backend 时：backend/pom.xml 的 <nebula.version>（默认不跟随主干开发版本）
#
# 常规用法（仅升版 master 开发版本，不发版）：
#   scripts/set-version.sh 0.1.1
#   git add -A && git commit -m "build: 版本号升至 0.1.1" && git push
#
# 发版（节奏由维护者决定；tag 必须与当前 revision 一致，否则 release.yml 校验失败）：
#   确认 master 的 revision 已是待发布版本 X.Y.Z，然后：
#   git tag vX.Y.Z && git push origin vX.Y.Z   # tag 触发 release.yml 发布到 Central
#   发布成功后，如需 backend 模板锁定该版本：
#   scripts/set-version.sh X.Y.Z --with-backend
#
set -euo pipefail

if [ $# -lt 1 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  echo "用法: $0 <新版本号> [--with-backend]" >&2
  echo "示例: $0 0.1.1        # 主干升版（pom revision + docker 默认版本）" >&2
  echo "      $0 0.1.1 --with-backend   # 同时更新 backend 模板引用（需该版本已发布）" >&2
  exit 1
fi

NEW_VERSION="$1"
WITH_BACKEND="${2:-}"

echo "$NEW_VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-SNAPSHOT)?$' || {
  echo "ERROR: 非法版本号 '$NEW_VERSION'（应为 x.y.z 或 x.y.z-SNAPSHOT）" >&2
  exit 1
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

CURRENT="$(sed -n 's/.*<revision>\([^<]*\)<\/revision>.*/\1/p' "$ROOT/pom.xml" | head -1)"
BOM_CURRENT="$(sed -n 's/.*<revision>\([^<]*\)<\/revision>.*/\1/p' "$ROOT/nebula-dependency/pom.xml" | head -1)"
if [ -z "$CURRENT" ]; then
  echo "ERROR: 未在 $ROOT/pom.xml 中找到 <revision> 属性" >&2
  exit 1
fi
if [ -n "$BOM_CURRENT" ] && [ "$BOM_CURRENT" != "$CURRENT" ]; then
  echo "ERROR: 根 pom 与 nebula-dependency 的 revision 不一致（${CURRENT} vs ${BOM_CURRENT}），请先手动修复" >&2
  exit 1
fi
if [ "$CURRENT" = "$NEW_VERSION" ]; then
  echo "当前版本已是 ${NEW_VERSION}，无需修改"
  exit 0
fi

# sed 模式中的版本号需转义点号
ESC_CUR="$(printf '%s' "$CURRENT" | sed 's/[.]/\\./g')"

# 便携原地替换（GNU/BSD sed 兼容：先写 .bak 再删除）
patch_file() {
  local file="$1" script="$2"
  if [ ! -f "$file" ]; then
    echo "WARN: 跳过不存在的文件 $file" >&2
    return 0
  fi
  sed -i.bak "$script" "$file" && rm -f "$file.bak"
  echo "  已更新 $file"
}

patch_version_global() {
  local file="$1" esc_old="$2" new="$3"
  if [ ! -f "$file" ]; then
    echo "WARN: 跳过不存在的文件 $file" >&2
    return 0
  fi
  if ! grep -q "$esc_old" "$file"; then
    echo "WARN: $file 中未找到旧版本 ${CURRENT}，默认版本可能已漂移，请手动检查" >&2
    return 0
  fi
  patch_file "$file" "s|$esc_old|$new|g"
}

echo "版本号: $CURRENT -> $NEW_VERSION"
echo

echo "[1/3] Maven 主干（\${revision}，全部模块继承）"
for pom in "$ROOT/pom.xml" "$ROOT/nebula-dependency/pom.xml"; do
  if ! grep -q "<revision>$CURRENT</revision>" "$pom"; then
    echo "ERROR: $pom 中未找到 <revision>$CURRENT</revision>，中止" >&2
    exit 1
  fi
done
patch_file "$ROOT/pom.xml" "s|<revision>$ESC_CUR</revision>|<revision>$NEW_VERSION</revision>|"
patch_file "$ROOT/nebula-dependency/pom.xml" "s|<revision>$ESC_CUR</revision>|<revision>$NEW_VERSION</revision>|"

echo "[2/3] Docker 默认版本（与 revision 保持一致）"
patch_version_global "$ROOT/docker/docker-compose.yml" "$ESC_CUR" "$NEW_VERSION"
patch_version_global "$ROOT/docker/README.md" "$ESC_CUR" "$NEW_VERSION"
patch_version_global "$ROOT/docker/Dockerfile.service" "$ESC_CUR" "$NEW_VERSION"

echo "[3/3] backend 模板工程引用"
if [ "$WITH_BACKEND" = "--with-backend" ]; then
  patch_file "$ROOT/backend/pom.xml" "s|<nebula.version>[^<]*</nebula.version>|<nebula.version>$NEW_VERSION</nebula.version>|"
else
  echo "  跳过（默认引用已发布版本；该版本发布到 Central 后可用 --with-backend 更新）"
fi

echo
echo "完成。后续步骤："
echo "  git add -A && git commit -m \"build: 版本号升至 $NEW_VERSION\" && git push"
echo "  （升版不等于发版；需要发布该版本时，再执行：git tag v${NEW_VERSION} && git push origin v${NEW_VERSION}）"
