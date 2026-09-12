#!/usr/bin/env bash
#
# rename-project.sh — 一键改名脚本，用于 fork nebula-template 后快速定制项目。
#
# Usage: scripts/rename-project.sh [项目名] [Java包名]
#   项目名   新项目名称（如 OmniWMS），用于 Maven artifactId、应用名、容器名等
#   Java包名 新 Java 根包（如 cn.cloudomni.omni.wms），业务代码放此包下
#
# 示例：
#   scripts/rename-project.sh OmniWMS cn.cloudomni.omni.wms
#   scripts/rename-project.sh MyProject com.example.myproject
#
# 交互模式（不传参数时提示输入）：
#   scripts/rename-project.sh
#
# 改名范围：
#   - Maven: artifactId、name、description，版本升至 1.0.0-SNAPSHOT
#   - Java: 包路径物理移动，启动类改名，@MapperScan 更新
#   - Spring: application.name、数据源 URL 数据库名
#   - Docker Compose: 容器名、卷名、默认数据库名
#   - Web: package.json name 与 version
#   - README: 项目名占位符替换
#
# 幂等性：检测 backend/pom.xml artifactId 是否已非 nebula-template-backend，
#         若已改名则跳过（避免重复执行破坏自定义内容）。
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 检测是否在模板仓根目录（存在 backend/ 和 web/，且 backend/pom.xml 包含 nebula-template-backend）
if [ ! -d "$REPO_ROOT/backend" ] || [ ! -d "$REPO_ROOT/web" ] || [ ! -f "$REPO_ROOT/backend/pom.xml" ]; then
  echo "错误：请在 nebula-template 根目录或其 scripts/ 子目录下运行本脚本" >&2
  exit 1
fi

# 幂等检测：已改名则跳过
if ! grep -q '<artifactId>nebula-template-backend</artifactId>' "$REPO_ROOT/backend/pom.xml" 2>/dev/null; then
  echo "检测到 backend/pom.xml 已改名（artifactId 非 nebula-template-backend），跳过重复执行。" >&2
  echo "若需重新改名，请先恢复 nebula-template 原始状态或 fork 新副本。" >&2
  exit 0
fi

# ============================================================
# 1. 收集改名参数（CLI 或交互输入）
# ============================================================
PROJECT_NAME="${1:-}"
JAVA_PACKAGE="${2:-}"

if [ -z "$PROJECT_NAME" ]; then
  echo "=== 欢迎使用 Nebula Template 一键改名工具 ==="
  echo
  read -r -p "项目名（如 OmniWMS、MyProject）: " PROJECT_NAME
  if [ -z "$PROJECT_NAME" ]; then
    echo "错误：项目名不能为空" >&2
    exit 1
  fi
fi

if [ -z "$JAVA_PACKAGE" ]; then
  read -r -p "Java 根包名（如 cn.cloudomni.omni.wms、com.example.myproject）: " JAVA_PACKAGE
  if [ -z "$JAVA_PACKAGE" ]; then
    echo "错误：Java 包名不能为空" >&2
    exit 1
  fi
fi

# 规范化参数
# 项目名：首字母大写（PascalCase），移除空格与特殊字符
PROJECT_NAME_PASCAL="$(echo "$PROJECT_NAME" | sed 's/[^a-zA-Z0-9]//g' | sed 's/^\(.\)/\U\1/')"
# artifactId：小写 kebab-case
PROJECT_ARTIFACT="$(echo "$PROJECT_NAME" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]' | sed 's/^-*//;s/-*$//')"
# 应用名（Spring）：小写 kebab-case
APP_NAME="$PROJECT_ARTIFACT"
# 数据库名：小写蛇形，替换 - 为 _
DB_NAME="$(echo "$APP_NAME" | tr '-' '_')"
# 容器名前缀：与 artifactId 一致
CONTAINER_PREFIX="$PROJECT_ARTIFACT"

# Java 包路径（cn.cloudomni.omni.wms → cn/cloudomni/omni/wms）
JAVA_PATH="${JAVA_PACKAGE//./\/}"
# 启动类名（Java 包最后一段首字母大写 + Application，如 wms → WmsApplication）
LAST_SEGMENT="$(echo "$JAVA_PACKAGE" | rev | cut -d. -f1 | rev)"
STARTUP_CLASS="$(echo "$LAST_SEGMENT" | sed 's/^\(.\)/\U\1/')Application"

echo
echo "检测到改名参数："
echo "  项目名（PascalCase）: $PROJECT_NAME_PASCAL"
echo "  Maven artifactId:     $PROJECT_ARTIFACT-backend"
echo "  应用名（Spring）:     $APP_NAME"
echo "  数据库名:             $DB_NAME"
echo "  容器前缀:             $CONTAINER_PREFIX"
echo "  Java 根包:            $JAVA_PACKAGE"
echo "  启动类:               ${STARTUP_CLASS}"
echo
read -r -p "确认执行改名？[y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "已取消。"
  exit 0
fi

# ============================================================
# 2. Maven 改名（backend/pom.xml）
# ============================================================
echo
echo "==> 更新 backend/pom.xml ..."
POM="$REPO_ROOT/backend/pom.xml"
sed -i.bak \
  -e "s|<artifactId>nebula-template-backend</artifactId>|<artifactId>${PROJECT_ARTIFACT}-backend</artifactId>|" \
  -e "s|<name>nebula-template-backend</name>|<name>${PROJECT_NAME_PASCAL} Backend</name>|" \
  -e "s|<description>Nebula 中台后端模板工程（基于 nebula-app-starter）</description>|<description>${PROJECT_NAME_PASCAL} 后端（基于 Nebula 框架）</description>|" \
  -e "s|<version>0.1.0-SNAPSHOT</version>|<version>1.0.0-SNAPSHOT</version>|" \
  "$POM"
rm -f "$POM.bak"

# ============================================================
# 3. Spring 应用配置（backend/src/main/resources/application.yml）
# ============================================================
echo "==> 更新 application.yml ..."
APP_YML="$REPO_ROOT/backend/src/main/resources/application.yml"
sed -i.bak \
  -e "s|name: nebula-template-backend|name: ${APP_NAME}|" \
  -e "s|jdbc:mysql://localhost:3306/nebula\?|jdbc:mysql://localhost:3306/${DB_NAME}?|" \
  "$APP_YML"
rm -f "$APP_YML.bak"

# ============================================================
# 4. Docker Compose 改名（backend/docker-compose.yml）
# ============================================================
echo "==> 更新 docker-compose.yml ..."
COMPOSE="$REPO_ROOT/backend/docker-compose.yml"
sed -i.bak \
  -e "s|container_name: nebula-template-mysql|container_name: ${CONTAINER_PREFIX}-mysql|" \
  -e "s|container_name: nebula-template-redis|container_name: ${CONTAINER_PREFIX}-redis|" \
  -e "s|MYSQL_DATABASE: \"\${NEBULA_LOCAL_MYSQL_DATABASE:-nebula}\"|MYSQL_DATABASE: \"\${NEBULA_LOCAL_MYSQL_DATABASE:-${DB_NAME}}\"|" \
  -e "s|nebula-mysql-data|${CONTAINER_PREFIX}-mysql-data|g" \
  -e "s|nebula-redis-data|${CONTAINER_PREFIX}-redis-data|g" \
  "$COMPOSE"
rm -f "$COMPOSE.bak"

# ============================================================
# 5. Java 包改名与启动类重命名
# ============================================================
echo "==> 移动 Java 包并重命名启动类 ..."
JAVA_SRC="$REPO_ROOT/backend/src/main/java"
OLD_PACKAGE_PATH="cn/cloudomni/nebula/template"
OLD_STARTUP="$JAVA_SRC/$OLD_PACKAGE_PATH/NebulaTemplateApplication.java"

if [ ! -f "$OLD_STARTUP" ]; then
  echo "警告：未找到 $OLD_STARTUP，跳过 Java 包改名" >&2
else
  # 创建新包目录
  NEW_PACKAGE_DIR="$JAVA_SRC/$JAVA_PATH"
  mkdir -p "$NEW_PACKAGE_DIR"

  # 移动并重命名启动类文件
  NEW_STARTUP="$NEW_PACKAGE_DIR/${STARTUP_CLASS}.java"
  mv "$OLD_STARTUP" "$NEW_STARTUP"

  # 更新启动类文件内容
  sed -i.bak \
    -e "s|package cn.cloudomni.nebula.template;|package ${JAVA_PACKAGE};|" \
    -e "s|@MapperScan(\"cn.cloudomni.nebula.template.\*\*.mapper\")|@MapperScan(\"${JAVA_PACKAGE}.\*\*.mapper\")|" \
    -e "s|cn.cloudomni.nebula.template.<模块>.mapper|${JAVA_PACKAGE}.<模块>.mapper|g" \
    -e "s|cn.cloudomni.nebula.template.wms.supplier.mapper.SupplierMapper|${JAVA_PACKAGE}.wms.supplier.mapper.SupplierMapper|g" \
    -e "s|模板工程启动类|${PROJECT_NAME_PASCAL} 启动类|" \
    -e "s|public class NebulaTemplateApplication|public class ${STARTUP_CLASS}|" \
    -e "s|SpringApplication.run(NebulaTemplateApplication.class|SpringApplication.run(${STARTUP_CLASS}.class|" \
    "$NEW_STARTUP"
  rm -f "$NEW_STARTUP.bak"

  # 删除旧包目录（若为空）
  OLD_PACKAGE_ROOT="$JAVA_SRC/cn/cloudomni/nebula"
  if [ -d "$OLD_PACKAGE_ROOT" ]; then
    find "$OLD_PACKAGE_ROOT" -depth -type d -empty -delete 2>/dev/null || true
    # 若整个 cn/cloudomni/nebula 已空，删除上层空目录
    rmdir "$JAVA_SRC/cn/cloudomni/nebula" 2>/dev/null || true
    rmdir "$JAVA_SRC/cn/cloudomni" 2>/dev/null || true
    rmdir "$JAVA_SRC/cn" 2>/dev/null || true
  fi
fi

# ============================================================
# 6. Web 前端改名（web/package.json）
# ============================================================
echo "==> 更新 web/package.json ..."
PKG_JSON="$REPO_ROOT/web/package.json"
if [ -f "$PKG_JSON" ]; then
  sed -i.bak \
    -e "s|\"name\": \"nebula-web\"|\"name\": \"${APP_NAME}-web\"|" \
    -e "s|\"version\": \"0.1.0\"|\"version\": \"1.0.0\"|" \
    "$PKG_JSON"
  rm -f "$PKG_JSON.bak"
fi

# ============================================================
# 7. README 改名（占位符替换）
# ============================================================
echo "==> 更新 README.md ..."
README="$REPO_ROOT/backend/README.md"
if [ -f "$README" ]; then
  # 替换标题、快速开始、docker 容器名等占位符
  sed -i.bak \
    -e "s|# Nebula 后端模板|# ${PROJECT_NAME_PASCAL} 后端|" \
    -e "s|nebula-template|${CONTAINER_PREFIX}|g" \
    -e "s|cn.cloudomni.nebula.template|${JAVA_PACKAGE}|g" \
    "$README"
  rm -f "$README.bak"
fi

# ============================================================
# 8. 验证编译
# ============================================================
echo
echo "==> 验证改名后编译 ..."
cd "$REPO_ROOT/backend"
if mvn -B -q compile; then
  echo "✓ 编译通过"
else
  echo "✗ 编译失败，请检查改名后的代码" >&2
  exit 1
fi

# ============================================================
# 9. 完成提示
# ============================================================
echo
echo "========================================"
echo "✓ 改名完成！"
echo
echo "项目信息："
echo "  名称:       ${PROJECT_NAME_PASCAL}"
echo "  artifactId: ${PROJECT_ARTIFACT}-backend"
echo "  应用名:     ${APP_NAME}"
echo "  数据库:     ${DB_NAME}"
echo "  Java 包:    ${JAVA_PACKAGE}"
echo "  启动类:     ${STARTUP_CLASS}"
echo
echo "启动命令："
echo "  cd backend"
echo "  docker compose up -d"
echo "  mvn spring-boot:run"
echo
echo "建议："
echo "  1. git init 初始化新仓库（当前仍链接到 nebula-template）"
echo "  2. 删除或修改 .agents/ 目录中的 AI 辅助配置（可选）"
echo "  3. 根据业务需求在 ${JAVA_PACKAGE}.<模块> 下开发功能模块"
echo "========================================"
