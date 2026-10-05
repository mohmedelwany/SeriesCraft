#!/usr/bin/env bash
# =============================================================================
# bin/test-integration-matrix.sh
#
# Runs the integration test suite against every PHP × WordPress version
# combination defined in the matrix below.
#
# Usage:
#   ./bin/test-integration-matrix.sh              # full dynamic matrix
#   PHP_VERSIONS="8.2" WP_VERSIONS="6.7" \
#     ./bin/test-integration-matrix.sh            # single cell override
#
# Options (env vars):
#   PHP_VERSIONS   – space-separated list  (default: 8.1 8.2 8.3)
#   WP_VERSIONS    – space-separated list  (default: dynamically fetched latest 3 stable WP versions)
#   BAIL_FAST      – set to "1" to stop on first failure (default: 0)
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker/integration/docker-compose.yml"

# Helper to fetch the 3 latest stable PHP versions
get_latest_php_versions() {
    local fetched=""

    # Attempt 1: Try PHP if available
    if command -v php >/dev/null 2>&1; then
        fetched=$(php -r '
            $urls = [
                "https://packagist.org/php-revisions.json",
                "https://endoflife.date/api/php.json",
                "https://www.php.net/releases/index.php?json"
            ];
            foreach ($urls as $url) {
                $json = @file_get_contents($url);
                if (!$json) continue;
                $data = json_decode($json, true);
                if (!$data) continue;
                $versions = [];
                if (isset($data["versions"]) && is_array($data["versions"])) {
                    foreach ($data["versions"] as $v) {
                        if (preg_match("/^(\d+\.\d+)/", $v, $m)) {
                            if (!in_array($m[1], $versions)) $versions[] = $m[1];
                        }
                    }
                } elseif (is_array($data)) {
                    foreach ($data as $key => $val) {
                        $v = is_array($val) ? ($val["cycle"] ?? $key) : $key;
                        if (preg_match("/^(\d+\.\d+)/", (string)$v, $m)) {
                            if (!in_array($m[1], $versions)) $versions[] = $m[1];
                        }
                    }
                }
                if (count($versions) >= 3) {
                    echo implode(" ", array_slice($versions, 0, 3));
                    exit(0);
                }
            }
            exit(1);
        ' 2>/dev/null || true)
    fi

    # Attempt 2: Try curl + jq if php attempt did not yield result
    if [[ -z "$fetched" ]] && command -v curl >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
        fetched=$(curl -s --connect-timeout 5 https://endoflife.date/api/php.json 2>/dev/null \
            | jq -r '.[].cycle' 2>/dev/null \
            | grep -E '^[0-9]+\.[0-9]+' \
            | head -n 3 \
            | tr '\n' ' ' \
            | sed 's/ $//' || true)
    fi

    # Attempt 3: Try curl + python3
    if [[ -z "$fetched" ]] && command -v curl >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
        fetched=$(python3 -c '
import urllib.request, json, re
for url in ["https://packagist.org/php-revisions.json", "https://endoflife.date/api/php.json"]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            versions = []
            if isinstance(data, list):
                for item in data:
                    c = item.get("cycle", "")
                    if c and c not in versions: versions.append(c)
            elif isinstance(data, dict):
                for k in data.get("versions", []):
                    m = re.match(r"^(\d+\.\d+)", k)
                    if m and m.group(1) not in versions: versions.append(m.group(1))
            if len(versions) >= 3:
                print(" ".join(versions[:3]))
                break
    except Exception:
        pass
' 2>/dev/null || true)
    fi

    # Fallback to standard stable versions if network/API is unreachable
    if [[ -z "$fetched" ]]; then
        fetched="8.1 8.2 8.3"
    fi

    echo "$fetched"
}

# Helper to fetch the latest 3 stable WordPress versions via official WP API
get_latest_wp_versions() {
    local fetched=""

    # Attempt 1: Try PHP if available
    if command -v php >/dev/null 2>&1; then
        fetched=$(php -r '
            $json = @file_get_contents("https://api.wordpress.org/core/version-check/1.7/");
            if ($json) {
                $data = json_decode($json, true);
                $versions = [];
                $seen_majors = [];
                foreach ($data["offers"] ?? [] as $offer) {
                    if (!empty($offer["version"]) && preg_match("/^(\d+\.\d+)/", $offer["version"], $m)) {
                        $major = $m[1];
                        if (!in_array($major, $seen_majors)) {
                            $seen_majors[] = $major;
                            $versions[] = $offer["version"];
                        }
                    }
                }
                if (count($versions) >= 3) {
                    echo implode(" ", array_slice($versions, 0, 3));
                    exit(0);
                }
            }
            exit(1);
        ' 2>/dev/null || true)
    fi

    # Attempt 2: Try curl + jq if php attempt did not yield result
    if [[ -z "$fetched" ]] && command -v curl >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
        fetched=$(curl -s --connect-timeout 5 https://api.wordpress.org/core/version-check/1.7/ 2>/dev/null \
            | jq -r '.offers[]?.version' 2>/dev/null \
            | grep -E '^[0-9]+\.[0-9]+' \
            | awk '{
                split($0, a, ".");
                major = a[1] "." a[2];
                if (!seen[major]++) {
                    print $0;
                }
            }' \
            | head -n 3 \
            | tr '\n' ' ' \
            | sed 's/ $//' || true)
    fi

    # Attempt 3: Try curl + python3
    if [[ -z "$fetched" ]] && command -v curl >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
        fetched=$(python3 -c '
import urllib.request, json, re
try:
    with urllib.request.urlopen("https://api.wordpress.org/core/version-check/1.7/", timeout=5) as response:
        data = json.loads(response.read().decode())
        versions = []
        seen_majors = []
        for offer in data.get("offers", []):
            v = offer.get("version", "")
            m = re.match(r"^(\d+\.\d+)", v)
            if m:
                major = m.group(1)
                if major not in seen_majors:
                    seen_majors.append(major)
                    versions.append(v)
        if len(versions) >= 3:
            print(" ".join(versions[:3]))
except Exception:
    pass
' 2>/dev/null || true)
    fi

    # Fallback to last known stable versions if network/API is unreachable
    if [[ -z "$fetched" ]]; then
        fetched="6.7.1 6.6.2 6.5.5"
    fi

    echo "$fetched"
}

PHP_VERSIONS="${PHP_VERSIONS:-$(get_latest_php_versions)}"
WP_VERSIONS="${WP_VERSIONS:-$(get_latest_wp_versions)}"
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
