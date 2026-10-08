#!/usr/bin/env bash
# =============================================================================
# bin/test-integration-matrix.sh
#
# Runs the integration test suite against dynamic or specified combinations of
# PHP × WordPress versions.
#
# Usage:
#   ./bin/test-integration-matrix.sh              # full dynamic matrix
#   PHP_VERSIONS="latest-stable" WP_VERSIONS="latest" \
#     ./bin/test-integration-matrix.sh            # fastest single-cell PR run
#   PHP_VERSIONS="8.2 8.3 8.4" WP_VERSIONS="6.7.1" \
#     ./bin/test-integration-matrix.sh            # custom matrix override
#
# Options (env vars):
#   PHP_VERSIONS   – space-separated list or "latest-stable" (default: dynamic discovery >= 8.1)
#   WP_VERSIONS    – space-separated list or "latest" (default: 3 latest stable releases)
#   BAIL_FAST      – set to "1" to stop on first failure (default: 0)
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker/integration/docker-compose.yml"

# Minimum PHP version supported by the plugin
MIN_PHP_VERSION="8.1"
FALLBACK_PHP_VERSIONS="8.1 8.2 8.3 8.4"
FALLBACK_WP_VERSIONS="6.7.1 6.6.2 6.5.5"

# ---------------------------------------------------------------------------
# Docker Image Verification
# ---------------------------------------------------------------------------
# Verifies if the official Docker Hub image exists for a given PHP version.
is_php_docker_image_available() {
    local php_ver="$1"
    local tag="${php_ver}-cli"

    # Strategy 1: Check via Docker CLI if docker daemon is reachable
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        if docker manifest inspect "php:${tag}" >/dev/null 2>&1; then
            return 0
        fi
    fi

    # Strategy 2: Query Docker Hub Registry API
    if command -v curl >/dev/null 2>&1; then
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 -m 8 "https://hub.docker.com/v2/repositories/library/php/tags/${tag}" 2>/dev/null || true)
        if [[ "$http_code" == "200" ]]; then
            return 0
        elif [[ "$http_code" == "404" ]]; then
            return 1
        fi
    fi

    # If registry cannot be reached (e.g. offline/isolated environment), accept standard known versions
    return 0
}

# ---------------------------------------------------------------------------
# Helper: Fetch Supported PHP Versions Dynamically (>= 8.1)
# ---------------------------------------------------------------------------
get_supported_php_versions() {
    local raw_versions=""

    # Strategy 1: PHP runtime query
    if command -v php >/dev/null 2>&1; then
        raw_versions=$(php -r '
            $urls = [
                "https://endoflife.date/api/php.json",
                "https://packagist.org/php-revisions.json",
                "https://www.php.net/releases/index.php?json"
            ];
            foreach ($urls as $url) {
                $ctx = stream_context_create(["http" => ["timeout" => 5, "header" => "User-Agent: SeriesCraft-Matrix/1.0\r\n"]]);
                $json = @file_get_contents($url, false, $ctx);
                if (!$json) continue;
                $data = json_decode($json, true);
                if (!$data) continue;
                $found = [];
                if (is_array($data) && isset($data[0]["cycle"])) {
                    foreach ($data as $item) {
                        $c = (string)($item["cycle"] ?? "");
                        if (preg_match("/^(\d+\.\d+)$/", $c) && version_compare($c, "8.1", ">=")) {
                            if (!in_array($c, $found, true)) $found[] = $c;
                        }
                    }
                } elseif (isset($data["versions"]) && is_array($data["versions"])) {
                    foreach ($data["versions"] as $v) {
                        if (preg_match("/^(\d+\.\d+)/", $v, $m) && version_compare($m[1], "8.1", ">=")) {
                            if (!in_array($m[1], $found, true)) $found[] = $m[1];
                        }
                    }
                }
                if (!empty($found)) {
                    usort($found, "version_compare");
                    echo implode(" ", $found);
                    exit(0);
                }
            }
            exit(1);
        ' 2>/dev/null || true)
    fi

    # Strategy 2: Python 3 query
    if [[ -z "$raw_versions" ]] && command -v python3 >/dev/null 2>&1; then
        raw_versions=$(python3 -c '
import urllib.request, json, re

urls = ["https://endoflife.date/api/php.json", "https://packagist.org/php-revisions.json"]
found = []
for url in urls:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SeriesCraft-Matrix/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            if isinstance(data, list):
                for item in data:
                    c = str(item.get("cycle", ""))
                    if re.match(r"^\d+\.\d+$", c):
                        parts = [int(p) for p in c.split(".")]
                        if parts >= [8, 1] and c not in found:
                            found.append(c)
            elif isinstance(data, dict):
                for k in data.get("versions", []):
                    m = re.match(r"^(\d+\.\d+)", str(k))
                    if m:
                        c = m.group(1)
                        parts = [int(p) for p in c.split(".")]
                        if parts >= [8, 1] and c not in found:
                            found.append(c)
            if found:
                found.sort(key=lambda x: [int(p) for p in x.split(".")])
                print(" ".join(found))
                break
    except Exception:
        pass
' 2>/dev/null || true)
    fi

    # Strategy 3: curl + jq
    if [[ -z "$raw_versions" ]] && command -v curl >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
        raw_versions=$(curl -s --connect-timeout 5 -m 8 -H "User-Agent: SeriesCraft-Matrix/1.0" https://endoflife.date/api/php.json 2>/dev/null \
            | jq -r '.[].cycle' 2>/dev/null \
            | grep -E '^[0-9]+\.[0-9]+$' \
            | awk '$1 >= 8.1' \
            | sort -V \
            | tr '\n' ' ' \
            | sed 's/ $//' || true)
    fi

    # Fallback to predefined stable list if external services are unreachable
    if [[ -z "$raw_versions" ]]; then
        raw_versions="$FALLBACK_PHP_VERSIONS"
    fi

    # Filter versions against Docker Hub official PHP image availability
    local verified_versions=()
    for ver in $raw_versions; do
        if is_php_docker_image_available "$ver"; then
            verified_versions+=("$ver")
        fi
    done

    if [[ ${#verified_versions[@]} -gt 0 ]]; then
        echo "${verified_versions[*]}"
    else
        echo "$FALLBACK_PHP_VERSIONS"
    fi
}

# ---------------------------------------------------------------------------
# Helper: Fetch WordPress Versions Dynamically via Official WP API
# ---------------------------------------------------------------------------
get_latest_wp_versions() {
    local limit="${1:-3}"
    local raw_versions=""

    # Strategy 1: PHP runtime query
    if command -v php >/dev/null 2>&1; then
        raw_versions=$(php -r '
            $limit = (int)($argv[1] ?? 3);
            $ctx = stream_context_create(["http" => ["timeout" => 5, "header" => "User-Agent: SeriesCraft-Matrix/1.0\r\n"]]);
            $json = @file_get_contents("https://api.wordpress.org/core/version-check/1.7/", false, $ctx);
            if ($json) {
                $data = json_decode($json, true);
                $versions = [];
                $seen_majors = [];
                foreach ($data["offers"] ?? [] as $offer) {
                    $v = $offer["version"] ?? "";
                    if (preg_match("/^(\d+\.\d+)/", $v, $m)) {
                        $major = $m[1];
                        if (!in_array($major, $seen_majors, true)) {
                            $seen_majors[] = $major;
                            $versions[] = $v;
                        }
                    }
                    if (count($versions) >= $limit) break;
                }
                if (!empty($versions)) {
                    echo implode(" ", array_slice($versions, 0, $limit));
                    exit(0);
                }
            }
            exit(1);
        ' "$limit" 2>/dev/null || true)
    fi

    # Strategy 2: Python 3 query
    if [[ -z "$raw_versions" ]] && command -v python3 >/dev/null 2>&1; then
        raw_versions=$(python3 -c '
import urllib.request, json, re, sys

limit = int(sys.argv[1]) if len(sys.argv) > 1 else 3
try:
    req = urllib.request.Request("https://api.wordpress.org/core/version-check/1.7/", headers={"User-Agent": "SeriesCraft-Matrix/1.0"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode())
        versions = []
        seen_majors = set()
        for offer in data.get("offers", []):
            v = offer.get("version", "")
            m = re.match(r"^(\d+\.\d+)", v)
            if m:
                major = m.group(1)
                if major not in seen_majors:
                    seen_majors.add(major)
                    versions.append(v)
            if len(versions) >= limit:
                break
        if versions:
            print(" ".join(versions[:limit]))
except Exception:
    pass
' "$limit" 2>/dev/null || true)
    fi

    # Strategy 3: curl + jq
    if [[ -z "$raw_versions" ]] && command -v curl >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
        raw_versions=$(curl -s --connect-timeout 5 -m 8 https://api.wordpress.org/core/version-check/1.7/ 2>/dev/null \
            | jq -r '.offers[]?.version' 2>/dev/null \
            | grep -E '^[0-9]+\.[0-9]+' \
            | awk '{
                split($0, a, ".");
                major = a[1] "." a[2];
                if (!seen[major]++) {
                    print $0;
                }
            }' \
            | head -n "$limit" \
            | tr '\n' ' ' \
            | sed 's/ $//' || true)
    fi

    # Fallback to predefined stable list if API is unreachable
    if [[ -z "$raw_versions" ]]; then
        if [[ "$limit" -eq 1 ]]; then
            raw_versions="6.7.1"
        else
            raw_versions="$FALLBACK_WP_VERSIONS"
        fi
    fi

    echo "$raw_versions"
}

# ---------------------------------------------------------------------------
# Resolve PHP & WordPress Matrices
# ---------------------------------------------------------------------------
RESOLVED_PHP_LIST="$(get_supported_php_versions)"

if [[ "${PHP_VERSIONS:-}" == "latest-stable" ]]; then
    # Dynamically pick ONLY the highest stable PHP version
    PHP_VERSIONS="$(echo "$RESOLVED_PHP_LIST" | tr ' ' '\n' | sort -V | tail -n 1)"
elif [[ -z "${PHP_VERSIONS:-}" ]]; then
    # Default: Full dynamic matrix across all discovered supported versions
    PHP_VERSIONS="$RESOLVED_PHP_LIST"
fi

if [[ "${WP_VERSIONS:-}" == "latest" ]]; then
    # Dynamically pick ONLY the single newest stable WordPress release
    WP_VERSIONS="$(get_latest_wp_versions 1)"
elif [[ -z "${WP_VERSIONS:-}" ]]; then
    # Default: Top 3 latest stable releases
    WP_VERSIONS="$(get_latest_wp_versions 3)"
fi

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

    # Pre-flight check for PHP docker image availability
    if ! is_php_docker_image_available "$php"; then
        warn "Docker image for PHP ${php} is not available on Docker Hub. Skipping $label."
        return 0
    fi

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
# Main Execution
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}SeriesCraft — Integration Test Matrix${RESET}"
echo -e "Resolved PHP versions : ${RESOLVED_PHP_LIST}"
echo -e "Target PHP versions   : ${PHP_VERSIONS}"
echo -e "Target WP versions    : ${WP_VERSIONS}"
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
