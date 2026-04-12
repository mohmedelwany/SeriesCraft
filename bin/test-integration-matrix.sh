#!/usr/bin/env bash
# =============================================================================
# bin/test-integration-matrix.sh
#
# Runs the integration test suite against every PHP × WordPress version
# combination defined in the matrix below.
#
# Usage:
#   ./bin/test-integration-matrix.sh              # full matrix
#   PHP_VERSIONS="8.2" WP_VERSIONS="6.7" \
#     ./bin/test-integration-matrix.sh            # single cell
#
# Options (env vars):
#   PHP_VERSIONS   – space-separated list  (default: 7.4 8.1 8.2 8.3)
#   WP_VERSIONS    – space-separated list  (default: 6.2 6.4 6.7)
#   BAIL_FAST      – set to "1" to stop on first failure (default: 0)
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker/integration/docker-compose.yml"

PHP_VERSIONS="${PHP_VERSIONS:-7.4 8.1 8.2 8.3}"
WP_VERSIONS="${WP_VERSIONS:-6.2 6.4 6.7}"
BAIL_FAST="${BAIL_FAST:-0}"

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

pass() { echo -e "${GREEN}✔${RESET} $*"; }
fail() { echo -e "${RED}✘${RESET} $*"; }
info() { echo -e "${CYAN}▶${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET} $*"; }

# ---------------------------------------------------------------------------
# Result tracking
# ---------------------------------------------------------------------------
declare -a PASSED=()
declare -a FAILED=()

run_matrix_cell() {
    local php="$1"
    local wp="$2"
    local label="PHP ${php} / WP ${wp}"
    local project_name="sc_php${php//./}_wp${wp//./}"  # unique Compose project name

    info "Running: $label"
    echo "────────────────────────────────────────────────────────────"

    if PHP_VERSION="$php" WP_VERSION="$wp" \
        docker compose \
            -f "$COMPOSE_FILE" \
            -p "$project_name" \
            up \
            --build \
            --abort-on-container-exit \
            --exit-code-from wordpress-test \
            --remove-orphans \
            2>&1; then

        pass "$label"
        PASSED+=("$label")
    else
        fail "$label"
        FAILED+=("$label")

        if [[ "$BAIL_FAST" == "1" ]]; then
            warn "Bailing fast (BAIL_FAST=1)."
            print_summary
            exit 1
        fi
    fi

    # Always tear down containers (images are cached for speed)
    PHP_VERSION="$php" WP_VERSION="$wp" \
        docker compose -f "$COMPOSE_FILE" -p "$project_name" down --volumes --remove-orphans \
        2>/dev/null || true

    echo ""
}

print_summary() {
    echo ""
    echo -e "${BOLD}════════════════════════════════════════════════════════════${RESET}"
    echo -e "${BOLD}  Integration Test Matrix — Summary${RESET}"
    echo -e "${BOLD}════════════════════════════════════════════════════════════${RESET}"

    if [[ ${#PASSED[@]} -gt 0 ]]; then
        for label in "${PASSED[@]}"; do
            pass "$label"
        done
    fi

    if [[ ${#FAILED[@]} -gt 0 ]]; then
        for label in "${FAILED[@]}"; do
            fail "$label"
        done
    fi

    echo ""
    echo -e "  Passed: ${GREEN}${#PASSED[@]}${RESET}  |  Failed: ${RED}${#FAILED[@]}${RESET}"
    echo -e "${BOLD}════════════════════════════════════════════════════════════${RESET}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}SeriesCraft — Integration Test Matrix${RESET}"
echo -e "PHP versions : $PHP_VERSIONS"
echo -e "WP versions  : $WP_VERSIONS"
echo ""

for php in $PHP_VERSIONS; do
    for wp in $WP_VERSIONS; do
        run_matrix_cell "$php" "$wp"
    done
done

print_summary

if [[ ${#FAILED[@]} -gt 0 ]]; then
    exit 1
fi
