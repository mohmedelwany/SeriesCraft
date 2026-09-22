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
# Download WordPress core (only if not already present)
# ---------------------------------------------------------------------------
if [[ ! -d "$WP_CORE_DIR/wp-includes" ]]; then
    echo "==> Downloading WordPress $WP_VERSION core..."
    mkdir -p "$WP_CORE_DIR"
    if [[ "$WP_VERSION" == "latest" ]]; then
        php -d memory_limit=-1 /usr/local/bin/wp core download --path="$WP_CORE_DIR" --allow-root --force
    else
        php -d memory_limit=-1 /usr/local/bin/wp core download --path="$WP_CORE_DIR" --version="$WP_VERSION" --allow-root --force
    fi
fi

echo "==> WordPress core ready at ${WP_CORE_DIR}."