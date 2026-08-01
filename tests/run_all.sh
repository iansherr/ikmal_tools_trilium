#!/usr/bin/env bash
#
# run_all.sh — runs the Trilium extension test suite.
#
# Tests run against the dev instance and clean up after themselves. They skip
# rather than fail if no instance is reachable, so this is safe to run anywhere.
#
# Usage:
#   ./run_all.sh
#
set -u

cd "$(dirname "$0")"

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

printf "%b\n" "${CYAN}${BOLD}== trilium extension (py) ==${NC}"

if ! curl -s -o /dev/null --max-time 3 http://localhost:8080/ 2>/dev/null; then
    printf "%b\n" "${CYAN}no instance at :8080 — start it with:${NC}"
    printf "  cd ../dev && docker compose up -d\n"
fi

if python3 -m unittest test_etapi test_extension 2>&1; then
    printf "%b\n" "${GREEN}PASS${NC} trilium extension"
    printf "\n=========================================\n"
    printf "%b\n" "  ${GREEN}${BOLD}ALL SUITES PASSED${NC}"
    printf "=========================================\n"
    exit 0
fi

printf "%b\n" "${RED}FAIL${NC} trilium extension"
exit 1
