#!/usr/bin/env bash
# =============================================================================
# install-wp-tests.sh
#
# Downloads and configures a bare WordPress core installation inside the
# container. (The WP PHPUnit test library is no longer needed — tests run
# against a real wp-cli-installed site, see docker/integration/entrypoint.sh.)
#
# Usage:
#   install-wp-tests.sh <db-name> <db-user> <db-pass> <db-host> [wp-version]
#
# This mirrors the official WP plugin unit-test bootstrap script.
# =============================================================================

echo "===== NEW INSTALL SCRIPT ====="
set -euo pipefail

DB_NAME=${1:-wordpress_test}
DB_USER=${2:-wp_test}
DB_PASS=${3:-wp_test}
DB_HOST=${4:-localhost}
WP_VERSION=${5:-latest}

WP_CORE_DIR=${WP_CORE_DIR:-/tmp/wordpress}

# ---------------------------------------------------------------------------
# Resolve latest WP version from the API
# ---------------------------------------------------------------------------
if [[ "$WP_VERSION" == "latest" ]]; then
    echo "==> Resolving latest WP version from API..."

    api_res=""
    if command -v curl >/dev/null 2>&1; then
        api_res=$(curl -s --connect-timeout 5 https://api.wordpress.org/core/version-check/1.7/ 2>/dev/null || true)
    fi

    resolved_ver=""
    if [[ -n "$api_res" ]]; then
        resolved_ver=$(echo "$api_res" | grep -o '"current":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
    fi

    if [[ -n "$resolved_ver" ]]; then
        WP_VERSION="$resolved_ver"
        echo "Resolved latest WP version: $WP_VERSION"
    else
        WP_VERSION="6.7.1"
        echo "Failed to resolve version from API. Falling back to stable version: $WP_VERSION"
    fi
fi

WP_TAG="$WP_VERSION"

# ---------------------------------------------------------------------------
# Download WordPress core (only if not already present)
# ---------------------------------------------------------------------------
if [[ ! -d "$WP_CORE_DIR/wp-includes" ]]; then
    echo "==> Downloading WordPress $WP_VERSION core..."
    mkdir -p "$WP_CORE_DIR"
    svn co --quiet --non-interactive --trust-server-cert-from-improperly-configured-hosts \
        "https://develop.svn.wordpress.org/tags/${WP_TAG}/src/" \
        "$WP_CORE_DIR" \
        || svn co --quiet --non-interactive --trust-server-cert-from-improperly-configured-hosts \
            "https://develop.svn.wordpress.org/trunk/src/" \
            "$WP_CORE_DIR"
fi

echo "==> WordPress core ready at ${WP_CORE_DIR}."