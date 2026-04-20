#!/usr/bin/env bash
# Shared helpers for curl-based API tests.
# Sourced by run.sh and each suite.

set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP="$HERE/.tmp"
mkdir -p "$TMP"

if [[ -f "$HERE/.env" ]]; then
  set -a; . "$HERE/.env"; set +a
fi
: "${BASE_URL:=http://localhost:3000}"

RESULTS="$TMP/results.tsv"
BODIES="$TMP/bodies"
mkdir -p "$BODIES"

C_RED=$'\033[0;31m'; C_GRN=$'\033[0;32m'; C_YLW=$'\033[0;33m'; C_DIM=$'\033[2m'; C_RST=$'\033[0m'

# Reset run-level state (called once by run.sh before suites execute).
reset_results() {
  : > "$RESULTS"
  rm -rf "$BODIES" && mkdir -p "$BODIES"
}

# Auth: perform NextAuth credentials login and populate a cookie jar.
# Usage: login <jar_path> <email> <password>
login() {
  local jar="$1" email="$2" pass="$3"
  rm -f "$jar"
  local csrf
  csrf="$(curl -sS -c "$jar" "$BASE_URL/api/auth/csrf" | jq -r .csrfToken)" || return 1
  [[ -z "$csrf" || "$csrf" == "null" ]] && { echo "login: no csrf"; return 1; }
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' \
    -b "$jar" -c "$jar" \
    -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "csrfToken=$csrf" \
    --data-urlencode "email=$email" \
    --data-urlencode "password=$pass" \
    --data-urlencode "callbackUrl=$BASE_URL" \
    --data-urlencode "json=true")" || return 1
  # NextAuth returns 302 on success, 200 with error query on failure.
  if [[ "$code" != "302" && "$code" != "200" ]]; then
    echo "login: http=$code"; return 1
  fi
  grep -q authjs.session-token "$jar" || { echo "login: no session cookie"; return 1; }
  return 0
}

# Core request helper.
# Usage: req <label> <jar> <method> <path> [expected_status] [body_json] [--ct <content-type>]
# Records: label \t method \t path \t expected \t actual \t body_file \t pass
req() {
  local label="$1" jar="$2" method="$3" path="$4"
  local expected="${5:-200}"
  local body="${6:-}"
  local ct="application/json"
  shift $(( $# > 6 ? 6 : $# ))
  while (( $# )); do
    case "$1" in
      --ct) ct="$2"; shift 2;;
      *) shift;;
    esac
  done

  local safe="${label// /_}"
  safe="${safe//\//_}"
  local out="$BODIES/${safe}.json"

  local -a args=(-sS -o "$out" -w '%{http_code}' -X "$method" -b "$jar"
    -H "Accept: application/json")
  if [[ -n "$body" ]]; then
    args+=(-H "Content-Type: $ct" --data-raw "$body")
  fi
  local actual
  actual="$(curl "${args[@]}" "$BASE_URL$path" 2>/dev/null || echo 000)"

  local pass="no"
  [[ "$actual" == "$expected" ]] && pass="yes"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$label" "$method" "$path" "$expected" "$actual" "$out" "$pass" >> "$RESULTS"

  local color="$C_RED"; [[ "$pass" == "yes" ]] && color="$C_GRN"
  printf '%s[%s]%s %-5s %-55s exp=%s got=%s  %s\n' \
    "$color" "$pass" "$C_RST" "$method" "$path" "$expected" "$actual" "$label"
}

# Read a field from the last body of a given label (for chaining tests).
# Usage: last_field <label> <jq_expr>
last_field() {
  local label="$1" expr="$2"
  local safe="${label// /_}"
  safe="${safe//\//_}"
  jq -r "$expr" "$BODIES/${safe}.json" 2>/dev/null
}

banner() {
  printf '\n%s== %s ==%s\n' "$C_YLW" "$*" "$C_RST"
}

# Print the final summary table and exit code.
print_summary() {
  local total pass fail
  total=$(wc -l < "$RESULTS" | tr -d ' ')
  pass=$(awk -F'\t' '$7=="yes"' "$RESULTS" | wc -l | tr -d ' ')
  fail=$(( total - pass ))
  echo
  echo "================ SUMMARY ================"
  printf 'total=%s  %spass=%s%s  %sfail=%s%s\n' \
    "$total" "$C_GRN" "$pass" "$C_RST" "$C_RED" "$fail" "$C_RST"
  if (( fail > 0 )); then
    echo
    echo "Failures:"
    awk -F'\t' '$7=="no" { printf "  %-6s %-55s exp=%s got=%s  [%s]\n", $2, $3, $4, $5, $1 }' "$RESULTS"
  fi
  echo "========================================="
  return $fail
}
