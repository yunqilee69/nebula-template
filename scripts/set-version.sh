#!/usr/bin/env bash
#
# set-version.sh — 全仓版本号统一修改（CI-Friendly ${revision}）与发版收口。
#
# 用法:
#   scripts/set-version.sh <版本号>                 开发期升版（不发版）
#   scripts/set-version.sh <版本号> --release       发版：升版 + 收口 backend 引用 / SQL 目录 / CHANGELOG
#   scripts/set-version.sh <版本号> --with-backend  仅额外更新 backend 模板引用
#
# <版本号> 形如 0.1.1 或 0.2.0-SNAPSHOT；--release 不接受 -SNAPSHOT。
#
# 为什么区分两种模式（本脚本最重要的约定，别混用）:
#   开发期升版只推进主干开发版本，**不动 backend 模板引用**——模板引用必须停在最近一个
#   已发布版本，否则新版本尚未上架 Maven Central 时模板工程无法构建。
#   发版则要求本次 tag 的口径处处一致：tag 里的 backend/pom.xml 必须就是本次发布的版本，
#   否则会与 sync-template 写出的模板仓长期漂移（模板仓随 tag 写成新版本，主干与 tag 却
#   停在上一个版本）。--release 把「必须与版本号同一步完成」的机械动作固化下来：
#     1) backend/pom.xml 的 <nebula.version> -> 本版本
#     2) docs/sql/unreleased/ 非空时整体更名为 docs/sql/<版本号>/
#     3) docs/sql/README.md 的「当前版本为 ...」一行
#     4) CHANGELOG.md 的 [Unreleased] 段落定为 [<版本号>] - <今天>，并留出新的空 [Unreleased]
#
# 修改范围（开发期升版 / 发版共有）:
#   pom.xml 与 nebula-dependency/pom.xml 的 <revision>（全部模块经 ${revision} 继承）
#   docker/docker-compose.yml 与 docker/README.md / docker/Dockerfile.service 的默认版本
#   （与 revision 保持一致，否则 compose build 找不到新版本 jar）
#
# 发版流程:
#   0) 待发布改动已提交，CHANGELOG 的 [Unreleased] 已写好本版条目
#   1) scripts/set-version.sh X.Y.Z --release
#   2) 补 docs/sql/README.md 中新版本目录的脚本说明（脚本只能改「当前版本为」一行）
#   3) git diff 复核 backend/pom.xml、docs/sql/X.Y.Z/、CHANGELOG.md
#   4) git add -A && git commit -m "build: 发布 X.Y.Z"
#   5) git tag vX.Y.Z && git push origin master vX.Y.Z   # tag 触发 release.yml 发布到 Central
#
set -euo pipefail

print_usage() {
  echo "用法: $0 <新版本号> [--release | --with-backend]" >&2
  echo "示例: $0 0.1.1                  # 开发期升版（pom revision + docker 默认版本）" >&2
  echo "      $0 0.1.1 --release        # 发版：升版 + 收口 backend / SQL 目录 / CHANGELOG" >&2
  echo "      $0 0.1.1 --with-backend   # 仅额外更新 backend 模板引用（需该版本已发布）" >&2
}

die() { echo "ERROR: $*" >&2; exit 1; }

if [ $# -lt 1 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  print_usage
  exit 1
fi

NEW_VERSION="$1"
shift

MODE="dev"
WITH_BACKEND=""
for arg in "$@"; do
  case "$arg" in
    --release)      MODE="release" ;;
    --with-backend) WITH_BACKEND="1" ;;
    *) echo "ERROR: 未知参数 '$arg'" >&2; print_usage; exit 1 ;;
  esac
done
# 发版必然要把 backend 指到本版本，不再需要单独传 --with-backend。
[ "$MODE" = "release" ] && WITH_BACKEND="1"

echo "$NEW_VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-SNAPSHOT)?$' \
  || die "非法版本号 '$NEW_VERSION'（应为 x.y.z 或 x.y.z-SNAPSHOT）"

case "$NEW_VERSION" in
  *-SNAPSHOT) IS_SNAPSHOT="1" ;;
  *)          IS_SNAPSHOT="" ;;
esac
if [ "$MODE" = "release" ] && [ -n "$IS_SNAPSHOT" ]; then
  die "--release 不接受快照版本号 '$NEW_VERSION'（发布版本不会是 -SNAPSHOT）"
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

CURRENT="$(sed -n 's/.*<revision>\([^<]*\)<\/revision>.*/\1/p' "$ROOT/pom.xml" | head -1)"
BOM_CURRENT="$(sed -n 's/.*<revision>\([^<]*\)<\/revision>.*/\1/p' "$ROOT/nebula-dependency/pom.xml" | head -1)"
if [ -z "$CURRENT" ]; then
  die "未在 $ROOT/pom.xml 中找到 <revision> 属性"
fi
if [ -n "$BOM_CURRENT" ] && [ "$BOM_CURRENT" != "$CURRENT" ]; then
  die "根 pom 与 nebula-dependency 的 revision 不一致（${CURRENT} vs ${BOM_CURRENT}），请先手动修复"
fi

SAME_VERSION=""
if [ "$CURRENT" = "$NEW_VERSION" ]; then
  SAME_VERSION="1"
fi

# 什么都做不了的情况才提前退出：发版即使版本号已就位，也还有 backend / SQL / CHANGELOG 要收口。
if [ -n "$SAME_VERSION" ] && [ "$MODE" != "release" ] && [ -z "$WITH_BACKEND" ]; then
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

patch_backend() {
  patch_file "$ROOT/backend/pom.xml" "s|<nebula.version>[^<]*</nebula.version>|<nebula.version>$NEW_VERSION</nebula.version>|"
}

# --- 发版收口：以下三件事必须与版本号同一步完成，否则 tag 内口径不一致 -------------

# 本次发版是否更名了增量 SQL 目录（决定结束提示里要不要提醒补写脚本说明）。
SQL_DIR_RELEASED=""

# docs/sql/unreleased/ 非空时整体更名为版本目录（目录名即目标版本，见 docs/sql/README.md）。
release_sql_dir() {
  local version="$1"
  local src="$ROOT/docs/sql/unreleased"
  local dst="$ROOT/docs/sql/$version"
  if [ ! -d "$src" ]; then
    echo "  docs/sql/unreleased 不存在，跳过更名（本版无落库变更）"
    return 0
  fi
  if [ -e "$dst" ]; then
    echo "  docs/sql/$version 已存在，跳过更名（追加脚本请手动放入该目录）"
    return 0
  fi
  if ! find "$src" -type f -print -quit | grep -q .; then
    echo "  docs/sql/unreleased 为空，跳过更名（本版无落库变更）"
    return 0
  fi
  if ! (cd "$ROOT" && git mv docs/sql/unreleased "docs/sql/$version") 2>/dev/null; then
    mv "$src" "$dst"
  fi
  mkdir -p "$src/mysql" "$src/postgresql"
  SQL_DIR_RELEASED="1"
  echo "  已更名 docs/sql/unreleased -> docs/sql/$version"
}

# docs/sql/README.md 的「当前版本为 \`X\`。」一行（各版本目录的脚本说明仍需人工补写）。
release_sql_readme() {
  local version="$1"
  local file="$ROOT/docs/sql/README.md"
  if [ ! -f "$file" ]; then
    return 0
  fi
  if grep -q "当前版本为 \`$version\`。" "$file"; then
    echo "  docs/sql/README.md 已标注当前版本 $version"
    return 0
  fi
  if ! grep -q '当前版本为 `' "$file"; then
    echo "WARN: docs/sql/README.md 未找到「当前版本为」行，请手动更新" >&2
    return 0
  fi
  patch_file "$file" "s|当前版本为 \`[^\`]*\`。|当前版本为 \`$version\`。|"
}

# CHANGELOG.md：把 [Unreleased] 定为 [X.Y.Z] - 今天，并插入新的空 [Unreleased]。
release_changelog() {
  local version="$1"
  local file="$ROOT/CHANGELOG.md"
  if [ ! -f "$file" ]; then
    echo "WARN: 未找到 CHANGELOG.md，跳过" >&2
    return 0
  fi
  if grep -q "^## \[$version\]" "$file"; then
    echo "  CHANGELOG 已有 [$version] 段落，跳过"
    return 0
  fi
  if ! grep -q '^## \[Unreleased\]$' "$file"; then
    die "CHANGELOG.md 缺少 '## [Unreleased]' 段落，无法收口本版本"
  fi
  local today
  today="$(date +%F)"
  awk -v ver="$version" -v day="$today" '
    !done && $0 == "## [Unreleased]" {
      print "## [Unreleased]"
      print ""
      print "## [" ver "] - " day
      done = 1
      next
    }
    { print }
  ' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
  echo "  已把 [Unreleased] 定为 [$version] - ${today}，并留出新的空 [Unreleased]"
}

# --- 主流程 ----------------------------------------------------------------------

if [ -z "$SAME_VERSION" ]; then
  echo "版本号: ${CURRENT} -> ${NEW_VERSION}"
  echo

  echo "[1/3] Maven 主干（\${revision}，全部模块继承）"
  for pom in "$ROOT/pom.xml" "$ROOT/nebula-dependency/pom.xml"; do
    if ! grep -q "<revision>$CURRENT</revision>" "$pom"; then
      die "$pom 中未找到 <revision>$CURRENT</revision>，中止"
    fi
  done
  patch_file "$ROOT/pom.xml" "s|<revision>$ESC_CUR</revision>|<revision>$NEW_VERSION</revision>|"
  patch_file "$ROOT/nebula-dependency/pom.xml" "s|<revision>$ESC_CUR</revision>|<revision>$NEW_VERSION</revision>|"

  echo "[2/3] Docker 默认版本（与 revision 保持一致）"
  patch_version_global "$ROOT/docker/docker-compose.yml" "$ESC_CUR" "$NEW_VERSION"
  patch_version_global "$ROOT/docker/README.md" "$ESC_CUR" "$NEW_VERSION"
  patch_version_global "$ROOT/docker/Dockerfile.service" "$ESC_CUR" "$NEW_VERSION"
else
  echo "版本号已是 ${NEW_VERSION}"
fi

echo "[3/3] backend 模板工程引用"
if [ -n "$WITH_BACKEND" ]; then
  patch_backend
else
  echo "  跳过（开发期升版不动 backend：模板引用需停在最近一个已发布版本）"
fi

if [ "$MODE" = "release" ]; then
  echo
  echo "[release] 发版收口（必须与版本号同一步完成）"
  release_sql_dir "$NEW_VERSION"
  release_sql_readme "$NEW_VERSION"
  release_changelog "$NEW_VERSION"
fi

echo
if [ "$MODE" = "release" ]; then
  echo "完成。后续步骤："
  step=1
  if [ -n "$SQL_DIR_RELEASED" ]; then
    echo "  ${step}) 补写 docs/sql/README.md 中新版本目录（docs/sql/${NEW_VERSION}/）的脚本说明"
    step=$((step + 1))
  fi
  echo "  ${step}) 复核改动：git diff -- backend/pom.xml docs/sql CHANGELOG.md"
  step=$((step + 1))
  echo "  ${step}) git add -A && git commit -m \"build: 发布 ${NEW_VERSION}\""
  step=$((step + 1))
  echo "  ${step}) git tag v${NEW_VERSION} && git push origin master v${NEW_VERSION}"
  echo "     （tag 触发 release.yml 发布到 Central；backend 引用已在本次提交内，无需发布后回填）"
else
  echo "完成。后续步骤："
  echo "  git add -A && git commit -m \"build: 版本号升至 ${NEW_VERSION}\" && git push"
  echo "  （升版不等于发版；需要发布该版本时，改跑：$0 ${NEW_VERSION} --release）"
fi
