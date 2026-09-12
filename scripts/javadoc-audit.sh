#!/usr/bin/env bash
#
# javadoc-audit.sh — Scan Java sources for missing class-level Javadoc on public types.
#
# Usage: scripts/javadoc-audit.sh [REPO_ROOT]
#   REPO_ROOT  Root of the Maven multi-module project (default: .)
#
# Output:
#   target/javadoc-audit/summary.tsv   — tab-separated: module  total_public_types  missing_class_javadoc
#   target/javadoc-audit/<module>.txt   — per-module list of files with missing class Javadoc
#
set -euo pipefail

REPO_ROOT="${1:-.}"
if [ ! -d "$REPO_ROOT" ]; then
  echo "ERROR: $REPO_ROOT is not a directory" >&2
  exit 1
fi

OUT_DIR="$REPO_ROOT/target/javadoc-audit"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

find "$REPO_ROOT" -path '*/src/main/java/*.java' -type f | sort > "$TMP_DIR/java_files.txt"

if [ ! -s "$TMP_DIR/java_files.txt" ]; then
  echo "WARNING: No Java source files found under $REPO_ROOT" >&2
  printf "module\ttotal_public_types\tmissing_class_javadoc\n" > "$OUT_DIR/summary.tsv"
  exit 0
fi

# Per-module raw records: each line = "module|TOTAL" or "module|MISSING|rel:lineno: line"
touch "$TMP_DIR/records.txt"

while IFS= read -r f; do
  rel="${f#$REPO_ROOT/}"
  top_module="${rel%%/*}"

  # grep -En for extended regex to handle + quantifier
  hits_file="$TMP_DIR/hits_${top_module}_$$_${RANDOM}.txt"
  grep -En '^[[:space:]]*public[[:space:]]+(abstract[[:space:]]+|final[[:space:]]+)*((class|interface|enum|record)[[:space:]]+|@interface[[:space:]]+)' "$f" > "$hits_file" 2>/dev/null || true

  [ ! -s "$hits_file" ] && continue

  while IFS= read -r hit; do
    lineno="${hit%%:*}"
    rest="${hit#*:}"

    printf "%s\tTOTAL\n" "$top_module" >> "$TMP_DIR/records.txt"

    start=$((lineno - 80))
    [ "$start" -lt 1 ] && start=1
    preceding=$(sed -n "${start},$((lineno - 1))p" "$f" 2>/dev/null || true)

    if ! echo "$preceding" | grep -q '/\*\*'; then
      printf "%s\tMISSING\t%s:%d: %s\n" "$top_module" "$rel" "$lineno" "$rest" >> "$TMP_DIR/records.txt"
    fi
  done < "$hits_file"

  rm -f "$hits_file"
done < "$TMP_DIR/java_files.txt"

# Aggregate by module
printf "module\ttotal_public_types\tmissing_class_javadoc\n" > "$OUT_DIR/summary.tsv"

modules=$(cut -f1 "$TMP_DIR/records.txt" | sort -u)

for mod in $modules; do
  total=$(grep "^${mod}" "$TMP_DIR/records.txt" | grep -c 'TOTAL' || true)
  missing=$(grep "^${mod}" "$TMP_DIR/records.txt" | grep -c 'MISSING' || true)
  printf "%s\t%s\t%s\n" "$mod" "$total" "$missing" >> "$OUT_DIR/summary.tsv"

  detail_file="$OUT_DIR/${mod}.txt"
  grep "^${mod}$(printf '\t')MISSING$(printf '\t')" "$TMP_DIR/records.txt" | cut -f3- | sort > "$detail_file" 2>/dev/null || true
  [ ! -s "$detail_file" ] && rm -f "$detail_file"
done

echo "=== Javadoc Audit Complete ==="
echo "Output: $OUT_DIR/"
column -t -s "$(printf '\t')" "$OUT_DIR/summary.tsv"
echo ""
total_types=0
total_missing=0
while IFS="$(printf '\t')" read -r mod total missing; do
  [ "$mod" = "module" ] && continue
  total_types=$((total_types + total))
  total_missing=$((total_missing + missing))
done < "$OUT_DIR/summary.tsv"
echo "TOTAL: ${total_types} public types, ${total_missing} missing class Javadoc"
