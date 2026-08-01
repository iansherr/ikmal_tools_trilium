#!/usr/bin/env bash
#
# run_all.sh — runs every test suite in this repo.
#
# Usage:
#   ./run_all.sh
#
set -u

cd "$(dirname "$0")"

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
failed=0

printf "%b\n" "${CYAN}${BOLD}== notes-system (node) ==${NC}"
if (cd .. && npm test); then
    printf "%b\n" "${GREEN}PASS${NC} notes-system"
else
    printf "%b\n" "${RED}FAIL${NC} notes-system"
    failed=1
fi

printf "\n%b\n" "${CYAN}${BOLD}== etapi client (py, offline) ==${NC}"
if python3 -m unittest test_etapi 2>&1; then
    printf "%b\n" "${GREEN}PASS${NC} etapi client"
else
    printf "%b\n" "${RED}FAIL${NC} etapi client"
    failed=1
fi

printf "\n%b\n" "${CYAN}${BOLD}== live instance smoke tests (py, http://127.0.0.1:38080) ==${NC}"
if curl -sI http://127.0.0.1:38080 >/dev/null 2>&1; then
    if PYTHONPATH=.. python3 smoke_test_live_instance.py http://127.0.0.1:38080 test_smoke_token_12345 2>&1; then
        printf "%b\n" "${GREEN}PASS${NC} live instance smoke tests"
    else
        printf "%b\n" "${RED}FAIL${NC} live instance smoke tests"
        failed=1
    fi
else
    printf "%b\n" "${CYAN}SKIP${NC} live instance smoke tests (no instance on 38080)"
fi

printf "\n=========================================\n"
if [ "$failed" -eq 0 ]; then
    printf "%b\n" "  ${GREEN}${BOLD}ALL SUITES PASSED${NC}"
    printf "=========================================\n"
    exit 0
fi
printf "%b\n" "  ${RED}${BOLD}SOME SUITES FAILED${NC}"
printf "=========================================\n"
exit 1
