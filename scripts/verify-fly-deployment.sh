#!/bin/bash

# ==============================================================================
# Fly.io Deployment Verification Script
# ==============================================================================
# Verifies system accessibility, health check, public site content,
# admin authentication, session persistence (Redis), and protected endpoints.
# ==============================================================================

set -u

# Usage / Help Instructions
show_usage() {
  cat << EOF
Fly.io Deployment Verification Script

Usage:
  $0 <APP_URL> [ADMIN_PASSWORD]
  $0 -h | --help

Parameters:
  APP_URL          Target URL of the deployed application (e.g., https://allseeingowl-329-website.fly.dev)
  ADMIN_PASSWORD   Optional admin password for authentication tests.
                   If not specified, uses \$ADMIN_PASSWORD environment variable, or falls back to 'admin'.

Examples:
  $0 https://allseeingowl-329-website.fly.dev
  $0 http://localhost:3000 custom-admin-password
  ADMIN_PASSWORD=secret $0 https://allseeingowl-329-website.fly.dev

EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ] || [ -z "${1:-}" ]; then
  show_usage
  exit 1
fi

# Normalize BASE_URL (strip trailing slash)
BASE_URL="${1%/}"
ADMIN_PASSWORD="${2:-${ADMIN_PASSWORD:-admin}}"

# Script variables and temporary storage
COOKIE_JAR=$(mktemp)
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Clean up temporary files on exit
cleanup() {
  rm -f "$COOKIE_JAR"
}
trap cleanup EXIT

# Formatting colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}=================================================="${NC}
echo -e "${BLUE}    FLY.IO DEPLOYMENT VERIFICATION SUITE         "${NC}
echo -e "${BLUE}=================================================="${NC}
echo -e "Target URL    : ${YELLOW}${BASE_URL}${NC}"
echo -e "Admin Password: ${YELLOW}****${NC}"
echo -e "Timestamp     : $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo -e "${BLUE}--------------------------------------------------"${NC}
echo ""

# Global state for last request
LAST_STATUS=""
LAST_TIME=""
LAST_BODY=""
LAST_HEADERS=""

# HTTP Request Helper Function
# Usage: http_request METHOD ENDPOINT [JSON_DATA] [USE_COOKIES: true/false]
http_request() {
  local method="$1"
  local endpoint="$2"
  local post_data="${3:-}"
  local use_cookies="${4:-false}"

  local url="${BASE_URL}${endpoint}"
  local body_file
  body_file=$(mktemp)
  local header_file
  header_file=$(mktemp)

  local curl_opts=(-s -S -w "%{http_code}\n%{time_total}" -X "$method")

  if [ -n "$post_data" ]; then
    curl_opts+=(-H "Content-Type: application/json" -d "$post_data")
  fi

  if [ "$use_cookies" = "true" ]; then
    curl_opts+=(-c "$COOKIE_JAR" -b "$COOKIE_JAR")
  fi

  local res
  res=$(curl "${curl_opts[@]}" -D "$header_file" -o "$body_file" "$url" 2>/dev/null)
  local exit_code=$?

  if [ $exit_code -ne 0 ] || [ -z "$res" ]; then
    LAST_STATUS="000"
    LAST_TIME="0.000"
    LAST_BODY="Connection failed (curl exit code: $exit_code)"
    LAST_HEADERS=""
  else
    LAST_STATUS=$(echo "$res" | head -n 1)
    LAST_TIME=$(echo "$res" | tail -n 1)
    LAST_BODY=$(cat "$body_file")
    LAST_HEADERS=$(cat "$header_file")
  fi

  rm -f "$body_file" "$header_file"
}

# Test Result Helper Function
record_test_result() {
  local name="$1"
  local pass="$2"
  local detail="$3"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if [ "$pass" = "true" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "[ ${GREEN}PASS${NC} ] ${name} (${LAST_TIME}s)"
    if [ -n "$detail" ]; then
      echo -e "         ${YELLOW}↳ ${detail}${NC}"
    fi
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "[ ${RED}FAIL${NC} ] ${name} (${LAST_TIME}s)"
    echo -e "         ${RED}↳ HTTP Status: ${LAST_STATUS}${NC}"
    if [ -n "$detail" ]; then
      echo -e "         ${RED}↳ Details: ${detail}${NC}"
    fi
  fi
}

# ------------------------------------------------------------------------------
# Test 1: GET / (Public site accessibility and HTML content check)
# ------------------------------------------------------------------------------
http_request "GET" "/"
if [ "$LAST_STATUS" = "200" ] && (echo "$LAST_BODY" | grep -qi -e "<html" -e "<!DOCTYPE html>"); then
  record_test_result "GET / returns HTTP 200 and valid HTML content" "true" "Root endpoint loaded public site successfully"
else
  record_test_result "GET / returns HTTP 200 and valid HTML content" "false" "Expected HTTP 200 and HTML content"
fi

# ------------------------------------------------------------------------------
# Test 2: GET /health (Health check endpoint check)
# ------------------------------------------------------------------------------
http_request "GET" "/health"
if [ "$LAST_STATUS" = "200" ] && echo "$LAST_BODY" | grep -q '"status":"ok"\|"status": "ok"'; then
  record_test_result "GET /health returns HTTP 200 and { status: 'ok' }" "true" "Response: ${LAST_BODY}"
else
  record_test_result "GET /health returns HTTP 200 and { status: 'ok' }" "false" "Body: ${LAST_BODY}"
fi

# ------------------------------------------------------------------------------
# Test 3: POST /api/admin/authenticate (Invalid Password returns HTTP 401)
# ------------------------------------------------------------------------------
http_request "POST" "/api/admin/authenticate" '{"password":"invalid_test_password_999"}'
if [ "$LAST_STATUS" = "401" ]; then
  record_test_result "POST /api/admin/authenticate with wrong password returns 401" "true" "Rejected invalid credentials as expected"
else
  record_test_result "POST /api/admin/authenticate with wrong password returns 401" "false" "Expected 401 Unauthorized but received ${LAST_STATUS}"
fi

# ------------------------------------------------------------------------------
# Test 4: POST /api/admin/authenticate (Valid Password returns HTTP 200)
# ------------------------------------------------------------------------------
http_request "POST" "/api/admin/authenticate" "{\"password\":\"${ADMIN_PASSWORD}\"}" "true"
if [ "$LAST_STATUS" = "200" ] && echo "$LAST_BODY" | grep -q '"success":true\|"Authenticated"'; then
  record_test_result "POST /api/admin/authenticate with correct password returns 200" "true" "Session token and auth cookie issued successfully"
else
  record_test_result "POST /api/admin/authenticate with correct password returns 200" "false" "Response: ${LAST_BODY}"
fi

# ------------------------------------------------------------------------------
# Test 5: Verify Redis / Session Store (Authenticated request to protected route)
# ------------------------------------------------------------------------------
http_request "GET" "/api/admin/phases" "" "true"
if [ "$LAST_STATUS" = "200" ] && echo "$LAST_BODY" | grep -q '"phases"\|"success":true'; then
  record_test_result "Redis session validation (indirect session store test)" "true" "Authenticated session cookie verified by server backend"
else
  record_test_result "Redis session validation (indirect session store test)" "false" "Session validation failed on /api/admin/phases. Response: ${LAST_BODY}"
fi

# ------------------------------------------------------------------------------
# Test 6: GET /admin/index.html (Admin retro-terminal dashboard file loads)
# ------------------------------------------------------------------------------
http_request "GET" "/admin/index.html"
if [ "$LAST_STATUS" = "200" ] && echo "$LAST_BODY" | grep -qi -e "<html" -e "<!DOCTYPE html>"; then
  record_test_result "Admin dashboard page (/admin/index.html) exists and loads" "true" "Admin retro-terminal HTML served successfully"
else
  record_test_result "Admin dashboard page (/admin/index.html) exists and loads" "false" "Expected HTTP 200 and HTML content"
fi

# ------------------------------------------------------------------------------
# Test 7: Email export endpoint protection (Unauthenticated returns 401/403)
# ------------------------------------------------------------------------------
http_request "GET" "/api/admin/emails/export" "" "false"
if [ "$LAST_STATUS" = "401" ] || [ "$LAST_STATUS" = "403" ]; then
  record_test_result "GET /api/admin/emails/export is protected (returns 401/403 without auth)" "true" "Unauthenticated request blocked (HTTP ${LAST_STATUS})"
else
  record_test_result "GET /api/admin/emails/export is protected (returns 401/403 without auth)" "false" "Expected HTTP 401 or 403 but received ${LAST_STATUS}"
fi

# ------------------------------------------------------------------------------
# Test 8: Phase management endpoints protection (Unauthenticated returns 401/403)
# ------------------------------------------------------------------------------
http_request "GET" "/api/admin/phases" "" "false"
if [ "$LAST_STATUS" = "401" ] || [ "$LAST_STATUS" = "403" ]; then
  record_test_result "Phase management endpoint /api/admin/phases is protected" "true" "Unauthenticated request blocked (HTTP ${LAST_STATUS})"
else
  record_test_result "Phase management endpoint /api/admin/phases is protected" "false" "Expected HTTP 401 or 403 but received ${LAST_STATUS}"
fi

# ------------------------------------------------------------------------------
# Summary Report
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}=================================================="${NC}
echo -e "${BLUE}             VERIFICATION REPORT                  "${NC}
echo -e "${BLUE}=================================================="${NC}
echo -e "Total Executed Tests : ${TOTAL_TESTS}"
echo -e "Passed               : ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed               : ${RED}${FAILED_TESTS}${NC}"
echo -e "${BLUE}=================================================="${NC}

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}SUCCESS: Deployment verification passed all tests!${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}FAILURE: Deployment verification failed on ${FAILED_TESTS} test(s).${NC}"
  echo ""
  exit 1
fi
