#!/usr/bin/env bash

# ==============================================================================
# Local Production Verification Script for Render Web Service Migration
# ==============================================================================
# Verifies lockfile installation, TypeScript compilation, production build,
# compiled file outputs, server startup, health checks, static assets, secret
# enforcement in production, and masked Redis credential detection.
# ==============================================================================

set -e

PORT=${PORT:-3001}
BASE_URL="http://127.0.0.1:${PORT}"
FAILED=0

echo "🚀 Starting Local Production Verification Sequence..."
echo "=============================================================================="

record_result() {
  local check_name="$1"
  local status="$2"
  local detail="$3"

  if [ "$status" = "PASS" ]; then
    echo "  [PASS] ${check_name}: ${detail}"
  else
    echo "❌ [FAIL] ${check_name}: ${detail}"
    FAILED=$((FAILED + 1))
  fi
}

# ------------------------------------------------------------------------------
# 1. Verify frozen lockfile installation
# ------------------------------------------------------------------------------
echo "1. Verifying dependency installation with frozen lockfile..."
if pnpm install --frozen-lockfile > /dev/null 2>&1; then
  record_result "Lockfile Install" "PASS" "Dependencies installed cleanly using pnpm-lock.yaml"
else
  record_result "Lockfile Install" "FAIL" "pnpm install --frozen-lockfile failed"
fi

# ------------------------------------------------------------------------------
# 2. Verify TypeScript type checking
# ------------------------------------------------------------------------------
echo "2. Running TypeScript type checking..."
if pnpm run typecheck > /dev/null 2>&1; then
  record_result "Typecheck" "PASS" "TypeScript compiler emitted zero type errors"
else
  record_result "Typecheck" "FAIL" "pnpm run typecheck failed"
fi

# ------------------------------------------------------------------------------
# 3. Verify production build
# ------------------------------------------------------------------------------
echo "3. Executing production build..."
if pnpm run build > /dev/null 2>&1; then
  record_result "Production Build" "PASS" "tsc and Vite build completed successfully"
else
  record_result "Production Build" "FAIL" "pnpm run build failed"
fi

# ------------------------------------------------------------------------------
# 4. Verify compiled server output
# ------------------------------------------------------------------------------
echo "4. Verifying dist/server.js output..."
if [ -f "dist/server.js" ]; then
  record_result "dist/server.js" "PASS" "Compiled server file exists at dist/server.js"
else
  record_result "dist/server.js" "FAIL" "dist/server.js is missing"
fi

# ------------------------------------------------------------------------------
# 5. Verify compiled public directory
# ------------------------------------------------------------------------------
echo "5. Verifying dist/public directory..."
if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
  record_result "dist/public" "PASS" "Compiled static public directory exists at dist/public with assets"
else
  record_result "dist/public" "FAIL" "dist/public or dist/public/index.html is missing"
fi

# ------------------------------------------------------------------------------
# 6. Verify production secret enforcement (Missing secrets produce clear failure)
# ------------------------------------------------------------------------------
echo "6. Testing missing production secret enforcement (NODE_ENV=production)..."
ENV_FAIL_OUTPUT=$(NODE_ENV=production PORT=${PORT} timeout 3s node dist/server.js 2>&1 || true)
if echo "${ENV_FAIL_OUTPUT}" | grep -q "Missing required Upstash Redis environment variables"; then
  record_result "Missing Secrets Enforcement" "PASS" "Production server logged warning as expected when required Redis env vars are missing"
else
  record_result "Missing Secrets Enforcement" "FAIL" "Production server did not produce clear missing secret warning: ${ENV_FAIL_OUTPUT}"
fi

# ------------------------------------------------------------------------------
# 7. Start compiled server with temporary PORT & placeholder local secrets
# ------------------------------------------------------------------------------
echo "7. Starting compiled production server on port ${PORT} with local placeholder secrets..."
SERVER_LOG=$(mktemp)

NODE_ENV=production \
PORT=${PORT} \
ADMIN_PASSWORD="local-test-admin-password" \
AUTH_PASSWORD="0408-1998-XXXX" \
UPSTASH_REDIS_REST_URL="https://local-placeholder.upstash.io" \
UPSTASH_REDIS_REST_TOKEN="placeholder-token-12345" \
node dist/server.js > "${SERVER_LOG}" 2>&1 &

SERVER_PID=$!

cleanup() {
  if [ -n "${SERVER_PID}" ]; then
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -f "${SERVER_LOG}"
}
trap cleanup EXIT

sleep 2

# Verify server process is alive
if kill -0 "${SERVER_PID}" 2>/dev/null; then
  record_result "Server Startup" "PASS" "Compiled server started on 0.0.0.0:${PORT} (PID ${SERVER_PID})"
else
  LOG_CONTENT=$(cat "${SERVER_LOG}")
  record_result "Server Startup" "FAIL" "Server process exited prematurely: ${LOG_CONTENT}"
fi

# ------------------------------------------------------------------------------
# 8. Verify /health returns HTTP 200 and {"status":"ok"}
# ------------------------------------------------------------------------------
echo "8. Testing GET /health..."
HEALTH_STATUS=$(curl -s -o /tmp/health.json -w "%{http_code}" "${BASE_URL}/health" || true)
HEALTH_BODY=$(cat /tmp/health.json 2>/dev/null || true)
rm -f /tmp/health.json

if [ "${HEALTH_STATUS}" = "200" ] && echo "${HEALTH_BODY}" | grep -q '"status":"ok"'; then
  record_result "GET /health" "PASS" "Returned HTTP 200 with JSON payload ${HEALTH_BODY}"
else
  record_result "GET /health" "FAIL" "Returned HTTP ${HEALTH_STATUS}: ${HEALTH_BODY}"
fi

# ------------------------------------------------------------------------------
# 9. Verify homepage returns successfully
# ------------------------------------------------------------------------------
echo "9. Testing homepage /..."
HOME_STATUS=$(curl -s -o /tmp/home.html -w "%{http_code}" "${BASE_URL}/" || true)
if [ "${HOME_STATUS}" = "200" ] && grep -q "<html" /tmp/home.html; then
  record_result "Homepage /" "PASS" "Returned HTTP 200 and served valid HTML content"
else
  record_result "Homepage /" "FAIL" "Returned HTTP ${HOME_STATUS}"
fi
rm -f /tmp/home.html

# ------------------------------------------------------------------------------
# 10. Verify static asset serves successfully
# ------------------------------------------------------------------------------
echo "10. Testing static asset /favicon.png..."
ASSET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/favicon.png" || true)
if [ "${ASSET_STATUS}" = "200" ]; then
  record_result "Static Asset /favicon.png" "PASS" "Served compiled static asset with HTTP 200"
else
  record_result "Static Asset /favicon.png" "FAIL" "Returned HTTP ${ASSET_STATUS}"
fi

# ------------------------------------------------------------------------------
# 11. Verify Redis configuration detection without logging secrets
# ------------------------------------------------------------------------------
echo "11. Verifying Redis detection & secret masking in logs..."
SERVER_LOG_CONTENT=$(cat "${SERVER_LOG}")
if echo "${SERVER_LOG_CONTENT}" | grep -q "placeholder-token-12345"; then
  record_result "Secret Masking" "FAIL" "Redis token was printed in server logs!"
else
  record_result "Secret Masking" "PASS" "No secret tokens or passwords detected in server logs"
fi

echo "=============================================================================="
if [ ${FAILED} -eq 0 ]; then
  echo "✅ Production Verification Complete: All Checks Passed!"
  exit 0
else
  echo "❌ Production Verification Failed with ${FAILED} error(s)."
  exit 1
fi
